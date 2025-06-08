// TALK2Me Chat API - Vercel Serverless Function v3.0 - Assistant API
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'
import { Groq } from 'groq-sdk'
import OpenAI from 'openai'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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

    // Assistant ID z konfiguracji
    const assistantId = configMap.assistant_id
    if (!assistantId) {
      return res.status(503).json({
        error: 'Brak konfiguracji Assistant ID',
        details: 'Skonfiguruj Assistant ID w panelu administracyjnym'
      })
    }

    const userMessage = message
    
    let aiResponse = null
    const activeModel = configMap.active_model || 'openai'

    // 1. Próbuj OpenAI Assistant API
    const openaiKey = configMap.openai_api_key
    if (activeModel === 'openai' && openaiKey) {
      try {
        const openai = new OpenAI({ apiKey: openaiKey })
        
        // Stwórz thread
        const thread = await openai.beta.threads.create()
        
        // Dodaj wiadomość do threadu
        await openai.beta.threads.messages.create(thread.id, {
          role: "user",
          content: userMessage
        })
        
        // Uruchom asystenta
        const run = await openai.beta.threads.runs.create(thread.id, {
          assistant_id: assistantId
        })
        
        // Czekaj na zakończenie
        let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id)
        const maxWaitTime = 30000 // 30 sekund
        const startTime = Date.now()
        
        while (runStatus.status !== 'completed' && runStatus.status !== 'failed') {
          if (Date.now() - startTime > maxWaitTime) {
            throw new Error('Assistant API timeout')
          }
          await new Promise(resolve => setTimeout(resolve, 1000))
          runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id)
        }
        
        if (runStatus.status === 'completed') {
          // Pobierz odpowiedź
          const messages = await openai.beta.threads.messages.list(thread.id)
          const assistantMessage = messages.data.find(msg => msg.role === 'assistant')
          
          if (assistantMessage && assistantMessage.content[0]?.text?.value) {
            aiResponse = assistantMessage.content[0].text.value
            console.log('✅ OpenAI Assistant response successful')
          }
        } else {
          throw new Error(`Assistant run failed: ${runStatus.status}`)
        }
        
      } catch (error) {
        console.log('❌ OpenAI Assistant failed, trying Groq:', error.message)
      }
    }

    // 2. Fallback: Groq (darmowy, szybki) - tylko jeśli włączony
    const groqEnabled = configMap.groq_enabled === 'true'
    if (!aiResponse && groqEnabled && configMap.groq_api_key) {
      console.log('🔄 OpenAI failed, trying Groq fallback...')
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

        aiResponse = completion.choices[0].message.content
        console.log('✅ Groq response successful (fallback)')
        
      } catch (error) {
        console.log('❌ Groq failed:', error.message)
      }
    } else if (!aiResponse && !groqEnabled) {
      console.log('⚠️ Groq is disabled, skipping fallback')
    }

    // 3. Jeśli nic nie zadziałało, zwróć błąd z debug info
    if (!aiResponse) {
      return res.status(503).json({
        error: 'Nie udało się uzyskać odpowiedzi od AI',
        details: 'Sprawdź konfigurację kluczy API w panelu administracyjnym',
        debug: {
          hasOpenAIKey: !!openaiKey,
          hasGroqKey: !!configMap.groq_api_key,
          activeModel: activeModel,
          assistantId: assistantId
        }
      })
    }

    // Zapisz historię jeśli user zalogowany
    let chatId = null
    if (userId) {
      const { data: chatData, error: chatError } = await supabase
        .from('chat_history')
        .insert({
          user_id: userId,
          message: message,
          response: aiResponse
        })
        .select('id')
        .single()
      
      if (!chatError) {
        chatId = chatData.id
      }
    }

    res.json({
      success: true,
      response: aiResponse,
      provider: activeModel,
      chatId: chatId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Chat API error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      timestamp: new Date().toISOString()
    })
  }
}