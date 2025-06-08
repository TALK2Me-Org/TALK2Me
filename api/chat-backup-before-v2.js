// TALK2Me Chat API - Vercel Serverless Function v4.0 - Chat Completions z Streamingiem
import { createClient } from '@supabase/supabase-js'
import { Groq } from 'groq-sdk'
import OpenAI from 'openai'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Cache dla promptu Assistant API
export const promptCache = {
  prompt: null,
  timestamp: 0,
  source: 'none'
}

// Vercel nie wspiera prawdziwego streamingu w serverless functions
// Ale możemy symulować streaming przez chunked responses
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { message, userContext } = req.body
    const authHeader = req.headers.authorization
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Sprawdź czy user jest zalogowany
    let userId = null
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const { data: { user } } = await supabase.auth.getUser(token)
      userId = user?.id
    }

    // Pobierz konfigurację AI
    const { data: config } = await supabase
      .from('app_config')
      .select('config_key, config_value')
    
    const configMap = {}
    config?.forEach(item => {
      configMap[item.config_key] = item.config_value
    })

    const userMessage = message
    const activeModel = configMap.active_model || 'openai'
    
    // Przygotuj streaming response
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no') // Wyłącz buforowanie nginx
    
    let fullResponse = ''
    let streamSuccess = false

    // 1. Próbuj OpenAI z streamingiem
    const openaiKey = configMap.openai_api_key
    const assistantId = configMap.assistant_id
    
    if (activeModel === 'openai' && openaiKey) {
      try {
        const openai = new OpenAI({ apiKey: openaiKey })
        
        // Pobierz prompt z cache lub Assistant API
        let systemPrompt = 'You are a helpful AI assistant.'
        
        // Sprawdź cache w pamięci
        if (promptCache.prompt && Date.now() - promptCache.timestamp < 3600000) { // 1h
          systemPrompt = promptCache.prompt
          console.log('📋 Używam promptu z cache (source: ' + promptCache.source + ')')
        } else if (assistantId) {
          // Pobierz świeży prompt z Assistant API
          try {
            console.log('📥 Pobieram prompt z Assistant API...')
            const assistant = await openai.beta.assistants.retrieve(assistantId)
            systemPrompt = assistant.instructions || systemPrompt
            
            // Zapisz do cache
            promptCache.prompt = systemPrompt
            promptCache.timestamp = Date.now()
            promptCache.source = 'Assistant API'
            
            console.log('✅ Prompt pobrany i zapisany do cache (długość: ' + systemPrompt.length + ' znaków)')
          } catch (err) {
            console.log('⚠️ Nie udało się pobrać promptu z Assistant API:', err.message)
          }
        }
        
        // Wybierz model z konfiguracji (domyślnie gpt-4o)
        const modelName = configMap.openai_model || 'gpt-4o';
        console.log('🤖 Używam modelu:', modelName);
        console.log('📊 Pełna konfiguracja:', {
          model: modelName,
          temperature: configMap.temperature,
          max_tokens: configMap.max_tokens,
          promptSource: promptCache.source,
          promptLength: systemPrompt.length
        });
        
        // Stream response
        let stream;
        try {
          stream = await openai.chat.completions.create({
            model: modelName,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage }
            ],
            temperature: parseFloat(configMap.temperature) || 0.7,
            max_tokens: parseInt(configMap.max_tokens) || 1000,
            stream: true
          })
        } catch (modelError) {
          // Jeśli model nie istnieje, spróbuj z gpt-4o
          if (modelError.message?.includes('model') || modelError.status === 404) {
            console.log(`⚠️ Model ${modelName} niedostępny, używam gpt-4o`)
            stream = await openai.chat.completions.create({
              model: 'gpt-4o',
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage }
              ],
              temperature: parseFloat(configMap.temperature) || 0.7,
              max_tokens: parseInt(configMap.max_tokens) || 1000,
              stream: true
            })
          } else {
            throw modelError
          }
        }
        
        // Stream chunks do klienta
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || ''
          if (content) {
            fullResponse += content
            // Wyślij chunk do klienta
            res.write(`data: ${JSON.stringify({ content })}\n\n`)
          }
        }
        
        streamSuccess = true
        console.log('✅ OpenAI streaming completed')
        
      } catch (error) {
        console.log('❌ OpenAI streaming failed:', error.message)
        res.write(`data: ${JSON.stringify({ error: 'OpenAI failed, trying fallback...' })}\n\n`)
      }
    }

    // 2. Fallback: Groq (bez streamingu - wyślij całość na raz)
    const groqEnabled = configMap.groq_enabled === 'true'
    if (!streamSuccess && groqEnabled && configMap.groq_api_key) {
      try {
        const groq = new Groq({ apiKey: configMap.groq_api_key })
        
        const completion = await groq.chat.completions.create({
          messages: [
            { role: 'user', content: userMessage }
          ],
          model: 'llama3-8b-8192',
          temperature: parseFloat(configMap.temperature) || 0.7,
          max_tokens: parseInt(configMap.max_tokens) || 1000
        })

        fullResponse = completion.choices[0].message.content
        // Wyślij całą odpowiedź jako jeden chunk
        res.write(`data: ${JSON.stringify({ content: fullResponse })}\n\n`)
        streamSuccess = true
        console.log('✅ Groq response successful (fallback)')
        
      } catch (error) {
        console.log('❌ Groq failed:', error.message)
      }
    }

    // 3. Jeśli nic nie zadziałało
    if (!streamSuccess) {
      res.write(`data: ${JSON.stringify({ 
        error: 'Nie udało się uzyskać odpowiedzi od AI. Sprawdź konfigurację kluczy API w panelu administracyjnym.' 
      })}\n\n`)
    }

    // Zapisz historię jeśli user zalogowany i mamy odpowiedź
    if (userId && fullResponse) {
      await supabase
        .from('chat_history')
        .insert({
          user_id: userId,
          message: message,
          response: fullResponse,
          ai_model: activeModel
        })
    }

    // Zakończ stream
    res.write(`data: [DONE]\n\n`)
    res.end()

  } catch (error) {
    console.error('Chat API error:', error)
    // W przypadku błędu też musimy zakończyć jako event stream
    res.write(`data: ${JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    })}\n\n`)
    res.write(`data: [DONE]\n\n`)
    res.end()
  }
}