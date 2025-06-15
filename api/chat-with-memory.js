/**
 * TALK2Me Chat API v6.0 - Z systemem pamięci LangChain
 * 
 * Główne funkcjonalności:
 * - Streaming odpowiedzi przez SSE (Server-Sent Events)
 * - Function calling dla zapisywania wspomnień
 * - Integracja z MemoryManager dla personalizacji
 * - Fallback na Groq gdy OpenAI nie działa
 * - Obsługa konwersacji (conversations/messages)
 * 
 * @author Claude (AI Assistant) - Sesja 10
 * @date 14.01.2025
 * 
 * TODO: Debug dlaczego function calling nie jest wywoływane
 * TODO: Naprawić Railway deployment issues
 */
import { createClient } from '@supabase/supabase-js'
import { Groq } from 'groq-sdk'
import OpenAI from 'openai'
import MemoryManager from '../lib/memory-manager.js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Cache dla promptu Assistant API
export const promptCache = {
  prompt: null,
  timestamp: 0,
  source: 'none'
}

// Singleton instance of MemoryManager
let memoryManager = null
let memorySystemEnabled = false

// Function definition for remember_this
const MEMORY_FUNCTION = {
  name: "remember_this",
  description: "Zapisz ważne informacje o użytkowniku do długoterminowej pamięci",
  parameters: {
    type: "object",
    properties: {
      summary: { 
        type: "string", 
        description: "Krótkie, konkretne podsumowanie informacji do zapamiętania (max 100 znaków)" 
      },
      importance: { 
        type: "number", 
        minimum: 1, 
        maximum: 10,
        description: "Ważność informacji: 1-4 (niska), 5-6 (średnia), 7-8 (wysoka), 9-10 (krytyczna)"
      },
      type: { 
        type: "string", 
        enum: ["personal", "relationship", "preference", "event"],
        description: "Typ pamięci: personal (dane osobowe), relationship (relacje), preference (preferencje), event (wydarzenia)"
      }
    },
    required: ["summary", "importance", "type"]
  }
}

// Memory rules to append to system prompt
const MEMORY_RULES = `

### ZASADY ZARZĄDZANIA PAMIĘCIĄ:

1. **ZAWSZE używaj funkcji remember_this() gdy dowiadujesz się czegoś ważnego**, szczególnie:
   - Imiona bliskich osób (partner, dzieci, rodzice, przyjaciele)
   - Ważne daty (rocznice, urodziny, święta rodzinne)
   - Traumatyczne wydarzenia lub trudne doświadczenia
   - Preferencje komunikacyjne użytkownika
   - Informacje o pracy, hobby, zainteresowaniach

2. **Priorytetyzacja ważności (importance 1-10)**:
   - 9-10: Kluczowe relacje (imię partnera, dzieci), traumy, ważne rocznice
   - 7-8: Ważne preferencje, hobby, praca, przyjaciele
   - 5-6: Codzienne fakty, zwyczaje, rutyny
   - 1-4: Mniej istotne szczegóły, tymczasowe preferencje

3. **Typy pamięci (type)**:
   - personal: dane osobowe, wiek, miejsce zamieszkania, praca
   - relationship: informacje o bliskich, relacjach rodzinnych i romantycznych
   - preference: to co lubi/nie lubi, jak woli być traktowany
   - event: ważne wydarzenia z przeszłości, plany na przyszłość

4. **NIE zapisuj**:
   - Danych poufnych (hasła, numery kart, PIN-y)
   - Chwilowych stanów emocjonalnych (chyba że to wzorzec)
   - Szczegółów pojedynczej kłótni (chyba że to ważny punkt zwrotny)

5. **Przykłady użycia remember_this()**:
   - Użytkownik: "Mój mąż Maciej często pracuje do późna"
     → remember_this("Mąż ma na imię Maciej i często pracuje do późna", 9, "relationship")
   
   - Użytkownik: "Nie lubię gdy ktoś podnosi na mnie głos"
     → remember_this("Nie lubi gdy się na nią/niego krzyczy", 8, "preference")
   
   - Użytkownik: "W przyszłym miesiącu mamy 10 rocznicę ślubu"
     → remember_this("10 rocznica ślubu w przyszłym miesiącu", 10, "event")

6. **Używaj zapisanych wspomnień** do personalizacji odpowiedzi - odnosij się do tego co już wiesz o użytkowniku.
`

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
    console.log('🔍 Auth header:', authHeader ? 'Present' : 'Missing')
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      console.log('🔐 Token received:', token.substring(0, 20) + '...')
      
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
        console.log('✅ Token verified, userId:', userId)
      } catch (error) {
        console.log('❌ Invalid token:', error.message)
        // Kontynuuj jako gość jeśli token nieprawidłowy
      }
    } else {
      console.log('⚠️ No auth header or invalid format')
    }

    // Jeśli brak userId, nie możemy obsługiwać konwersacji ani pamięci
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
    
    // Initialize MemoryManager if needed
    if (!memoryManager && userId) {
      const openaiKey = configMap.openai_api_key
      try {
        // Create MemoryManager instance (will work even without OpenAI key)
        memoryManager = new MemoryManager(supabaseUrl, supabaseServiceKey, openaiKey)
        await memoryManager.initialize()
        memorySystemEnabled = memoryManager.enabled
        
        if (memorySystemEnabled) {
          console.log('✅ MemoryManager initialized with full features for user:', userId)
        } else {
          console.log('⚠️ MemoryManager initialized without memory features (no OpenAI key)')
        }
      } catch (error) {
        console.error('❌ Failed to initialize MemoryManager:', error.message)
        // Continue without memory system
        memoryManager = null
        memorySystemEnabled = false
      }
    } else {
      console.log('🔍 MemoryManager status:', {
        exists: !!memoryManager,
        userId: userId,
        reason: !memoryManager && !userId ? 'No user logged in' : 'Already initialized'
      })
    }

    // Pobierz relevantne wspomnienia dla użytkownika
    let memoryContext = ''
    if (memoryManager && userId) {
      try {
        const relevantMemories = await memoryManager.getRelevantMemories(userId, message, 5, 0.7)
        if (relevantMemories.length > 0) {
          memoryContext = memoryManager.formatMemoriesForContext(relevantMemories)
          console.log(`📚 Found ${relevantMemories.length} relevant memories`)
        }
      } catch (error) {
        console.error('Failed to retrieve memories:', error)
      }
    }
    
    // Przygotuj streaming response
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    
    let fullResponse = ''
    let streamSuccess = false

    // Przygotuj wiadomości dla AI (z kontekstem konwersacji i pamięci)
    const aiMessages = []

    // 1. Próbuj OpenAI z streamingiem i function calling
    const openaiKey = configMap.openai_api_key
    const assistantId = configMap.assistant_id
    
    if (activeModel === 'openai' && openaiKey) {
      try {
        const openai = new OpenAI({ apiKey: openaiKey })
        
        // Pobierz prompt z cache lub Assistant API
        let systemPrompt = 'You are a helpful AI assistant.'
        
        if (promptCache.prompt && Date.now() - promptCache.timestamp < 3600000) {
          systemPrompt = promptCache.prompt
          console.log('📋 Using cached prompt (length:', systemPrompt.length, 'chars)')
        } else if (assistantId) {
          try {
            console.log('🔄 Fetching prompt from Assistant API, ID:', assistantId)
            const assistant = await openai.beta.assistants.retrieve(assistantId)
            systemPrompt = assistant.instructions || systemPrompt
            
            promptCache.prompt = systemPrompt
            promptCache.timestamp = Date.now()
            promptCache.source = 'Assistant API'
            console.log('✅ Prompt fetched successfully (length:', systemPrompt.length, 'chars)')
          } catch (err) {
            console.error('❌ Failed to fetch assistant:', err.message)
            console.error('Using default prompt instead')
          }
        } else {
          console.log('⚠️ No assistant_id configured, using default prompt')
        }

        // Dodaj memory rules do system prompt
        systemPrompt += memoryContext + (userId ? MEMORY_RULES : '')

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
          const chatOptions = {
            model: openaiModel,
            messages: aiMessages,
            temperature: parseFloat(configMap.temperature) || 0.7,
            max_tokens: parseInt(configMap.max_tokens) || 1000,
            stream: true
          }

          // Dodaj function calling tylko dla zalogowanych użytkowników
          if (userId && memoryManager) {
            chatOptions.functions = [MEMORY_FUNCTION]
            chatOptions.function_call = 'auto'
            console.log('🔧 Function calling enabled for memory system')
          }

          stream = await openai.chat.completions.create(chatOptions)
        } catch (modelError) {
          if (modelError.code === 'model_not_found' && openaiModel.includes('gpt-4')) {
            console.log('Model not available, falling back to gpt-3.5-turbo')
            const chatOptions = {
              model: 'gpt-3.5-turbo',
              messages: aiMessages,
              temperature: parseFloat(configMap.temperature) || 0.7,
              max_tokens: parseInt(configMap.max_tokens) || 1000,
              stream: true
            }

            if (userId && memoryManager) {
              chatOptions.functions = [MEMORY_FUNCTION]
              chatOptions.function_call = 'auto'
              console.log('🔧 Function calling enabled for memory system (fallback)')
            }

            stream = await openai.chat.completions.create(chatOptions)
          } else {
            throw modelError
          }
        }
        
        // Stream chunks do klienta
        let functionCall = null
        let functionName = ''
        let functionArgs = ''

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta
          
          // Handle function calls
          if (delta?.function_call) {
            if (delta.function_call.name) {
              functionName = delta.function_call.name
              console.log('🎯 Function call detected:', functionName)
            }
            if (delta.function_call.arguments) {
              functionArgs += delta.function_call.arguments
            }
          }
          
          // Handle regular content
          const content = delta?.content || ''
          if (content) {
            fullResponse += content
            res.write(`data: ${JSON.stringify({ content })}\n\n`)
          }

          // Check if function call is complete
          if (chunk.choices[0]?.finish_reason === 'function_call') {
            console.log('✅ Function call completed, processing...')
            try {
              const args = JSON.parse(functionArgs)
              console.log(`🔧 Function call: ${functionName}`, args)
              
              if (functionName === 'remember_this') {
                console.log('📝 Processing remember_this function', {
                  hasMemoryManager: !!memoryManager,
                  hasUserId: !!userId,
                  userId: userId
                })
                
                if (memoryManager && userId) {
                  console.log('💾 Saving memory...')
                  await memoryManager.saveMemory(
                    userId,
                    message, // original content
                    args.summary,
                    args.importance,
                    args.type,
                    activeConversationId
                  )
                  console.log(`✅ Memory saved: "${args.summary}" (importance: ${args.importance})`)
                } else {
                  console.log('⚠️ Cannot save memory:', {
                    memoryManager: !!memoryManager,
                    userId: userId
                  })
                }
              }
            } catch (error) {
              console.error('❌ Failed to process function call:', error)
            }
          }
        }
        
        streamSuccess = true
        console.log('✅ OpenAI streaming completed')
        
      } catch (error) {
        console.log('❌ OpenAI streaming failed:', error.message)
        res.write(`data: ${JSON.stringify({ error: 'OpenAI failed, trying fallback...' })}\n\n`)
      }
    }

    // 2. Fallback: Groq (bez function calling i memory)
    const groqEnabled = configMap.groq_enabled === 'true'
    if (!streamSuccess && groqEnabled && configMap.groq_api_key) {
      try {
        const groq = new Groq({ apiKey: configMap.groq_api_key })
        
        // Groq nie obsługuje system messages ani function calling
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

      // Aktualizuj last_message_at w konwersacji
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', activeConversationId)
    }

    // Zapisz także do starej tabeli chat_history dla kompatybilności
    if (userId && fullResponse) {
      await supabase.from('chat_history').insert({
        user_id: userId,
        message: message,
        response: fullResponse,
        ai_model: activeModel,
        conversation_id: activeConversationId
      })
    }

    // Wyślij zakończenie streamingu
    res.write(`data: [DONE]\n\n`)
    res.end()
    
  } catch (error) {
    console.error('Chat API error:', error)
    
    // Jeśli jeszcze nie rozpoczęto streamingu, wyślij JSON
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: 'Internal server error', 
        details: error.message 
      })
    } else {
      // Jeśli streaming już się rozpoczął, wyślij błąd jako event
      res.write(`data: ${JSON.stringify({ 
        error: 'Wystąpił błąd podczas przetwarzania: ' + error.message 
      })}\n\n`)
      res.end()
    }
  }
}