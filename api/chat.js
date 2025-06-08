// TALK2Me Chat API v5.0 - Z obsługą konwersacji (FAZA 2)
import { createClient } from '@supabase/supabase-js'
import { Groq } from 'groq-sdk'
import OpenAI from 'openai'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Cache dla promptu Assistant API (współdzielony z poprzednią wersją)
export const promptCache = {
  prompt: null,
  timestamp: 0,
  source: 'none'
}

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
    const { message, userContext, conversationId } = req.body
    const authHeader = req.headers.authorization
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Sprawdź czy user jest zalogowany
    let userId = null
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      
      // Weryfikuj JWT token
      try {
        // Pobierz JWT secret
        const { data: config } = await supabase
          .from('app_config')
          .select('config_value')
          .eq('config_key', 'jwt_secret')
          .single()
        
        const jwtSecret = config?.config_value || 'talk2me-secret-key-2024'
        
        // Import jwt dynamically
        const jwt = await import('jsonwebtoken')
        const decoded = jwt.default.verify(token, jwtSecret)
        userId = decoded.id
      } catch (error) {
        console.log('Invalid token:', error.message)
        // Kontynuuj jako gość jeśli token nieprawidłowy
      }
    }

    // Jeśli brak userId, nie możemy obsługiwać konwersacji
    if (!userId && conversationId) {
      return res.status(401).json({ error: 'Login required for conversations' })
    }

    // Obsługa konwersacji
    let activeConversationId = conversationId
    let conversationMessages = []

    if (userId) {
      // Jeśli podano conversationId, sprawdź czy należy do użytkownika
      if (activeConversationId) {
        const { data: conv } = await supabase
          .from('conversations')
          .select('id')
          .eq('id', activeConversationId)
          .eq('user_id', userId)
          .single()

        if (!conv) {
          return res.status(404).json({ error: 'Conversation not found' })
        }

        // Pobierz historię konwersacji (ostatnie 20 wiadomości)
        const { data: messages } = await supabase
          .from('messages')
          .select('role, content')
          .eq('conversation_id', activeConversationId)
          .order('created_at', { ascending: true })
          .limit(20)

        conversationMessages = messages || []
      } else {
        // Utwórz nową konwersację
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            user_id: userId,
            title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
            last_message_at: new Date().toISOString()
          })
          .select()
          .single()

        if (convError) {
          console.error('Failed to create conversation:', convError)
          // Kontynuuj bez konwersacji
        } else {
          activeConversationId = newConv.id
        }
      }

      // Zapisz wiadomość użytkownika do konwersacji
      if (activeConversationId) {
        const { error: msgError } = await supabase
          .from('messages')
          .insert({
            conversation_id: activeConversationId,
            user_id: userId,
            role: 'user',
            content: message
          })

        if (msgError) {
          console.error('Failed to save user message:', msgError)
        }
      }
    }

    // Pobierz konfigurację AI
    const { data: config } = await supabase
      .from('app_config')
      .select('config_key, config_value')
    
    const configMap = {}
    config?.forEach(item => {
      configMap[item.config_key] = item.config_value
    })

    const activeModel = configMap.active_model || 'openai'
    
    // Przygotuj streaming response
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    
    let fullResponse = ''
    let streamSuccess = false

    // Przygotuj wiadomości dla AI (z kontekstem konwersacji)
    const aiMessages = []

    // 1. Próbuj OpenAI z streamingiem
    const openaiKey = configMap.openai_api_key
    const assistantId = configMap.assistant_id
    
    if (activeModel === 'openai' && openaiKey) {
      try {
        const openai = new OpenAI({ apiKey: openaiKey })
        
        // Pobierz prompt z cache lub Assistant API
        let systemPrompt = 'You are a helpful AI assistant.'
        
        if (promptCache.prompt && Date.now() - promptCache.timestamp < 3600000) {
          systemPrompt = promptCache.prompt
        } else if (assistantId) {
          try {
            const assistant = await openai.beta.assistants.retrieve(assistantId)
            systemPrompt = assistant.instructions || systemPrompt
            
            promptCache.prompt = systemPrompt
            promptCache.timestamp = Date.now()
            promptCache.source = 'Assistant API'
          } catch (err) {
            console.error('Failed to fetch assistant:', err)
          }
        }

        // Buduj wiadomości
        aiMessages.push({ role: 'system', content: systemPrompt })
        
        // Dodaj kontekst konwersacji
        if (conversationMessages.length > 0) {
          aiMessages.push(...conversationMessages)
        }
        
        // Dodaj aktualną wiadomość
        aiMessages.push({ role: 'user', content: message })

        const openaiModel = configMap.openai_model || 'gpt-3.5-turbo'
        
        let stream
        try {
          stream = await openai.chat.completions.create({
            model: openaiModel,
            messages: aiMessages,
            temperature: parseFloat(configMap.temperature) || 0.7,
            max_tokens: parseInt(configMap.max_tokens) || 1000,
            stream: true
          })
        } catch (modelError) {
          if (modelError.code === 'model_not_found' && openaiModel.includes('gpt-4')) {
            console.log('Model not available, falling back to gpt-3.5-turbo')
            stream = await openai.chat.completions.create({
              model: 'gpt-3.5-turbo',
              messages: aiMessages,
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

    // 2. Fallback: Groq
    const groqEnabled = configMap.groq_enabled === 'true'
    if (!streamSuccess && groqEnabled && configMap.groq_api_key) {
      try {
        const groq = new Groq({ apiKey: configMap.groq_api_key })
        
        // Groq nie obsługuje system messages, więc użyj tylko user message
        const groqMessages = conversationMessages.length > 0 
          ? [...conversationMessages, { role: 'user', content: message }]
          : [{ role: 'user', content: message }]
        
        const completion = await groq.chat.completions.create({
          messages: groqMessages,
          model: 'llama3-8b-8192',
          temperature: parseFloat(configMap.temperature) || 0.7,
          max_tokens: parseInt(configMap.max_tokens) || 1000
        })

        fullResponse = completion.choices[0].message.content
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

    // Zapisz odpowiedź AI do konwersacji
    if (userId && fullResponse && activeConversationId) {
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeConversationId,
          user_id: userId,
          role: 'assistant',
          content: fullResponse,
          ai_model: activeModel
        })

      if (msgError) {
        console.error('Failed to save AI response:', msgError)
      }
    }

    // Zapisz także do starej tabeli chat_history dla kompatybilności
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

    // Zwróć ID konwersacji w odpowiedzi
    if (activeConversationId) {
      res.write(`data: ${JSON.stringify({ conversationId: activeConversationId })}\n\n`)
    }

    // Zakończ stream
    res.write(`data: [DONE]\n\n`)
    res.end()

  } catch (error) {
    console.error('Chat API error:', error)
    res.write(`data: ${JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    })}\n\n`)
    res.write(`data: [DONE]\n\n`)
    res.end()
  }
}