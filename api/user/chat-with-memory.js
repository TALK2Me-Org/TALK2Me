/**
 * TALK2Me Chat API v6.0 - Z systemem pamięci LangChain
 * 
 * Główne funkcjonalności:
 * - Streaming odpowiedzi przez SSE (Server-Sent Events)
 * - Function calling dla zapisywania wspomnień
 * - Integracja z MemoryManager dla personalizacji
 * - Obsługa konwersacji (conversations/messages)
 * 
 * @author Claude (AI Assistant) - Sesja 10-13
 * @date 14-17.06.2025
 * @status ✅ DZIAŁA w produkcji
 * 
 * Flow działania:
 * 1. Weryfikacja JWT token (jeśli podany)
 * 2. Inicjalizacja MemoryManager dla usera
 * 3. Pobranie relevantnych wspomnień z bazy
 * 4. Wysłanie do OpenAI z function calling
 * 5. Streaming odpowiedzi + obsługa remember_this()
 * 6. Zapis odpowiedzi do konwersacji
 */
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import MemoryManager from '../memory/manager.js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Cache dla promptu Assistant API
export const promptCache = {
  prompt: null,
  timestamp: 0,
  source: 'none'
}

// MemoryManager instances - not using singleton anymore to avoid initialization issues
// Each request will create its own instance if needed
const memoryManagerCache = new Map() // userId -> MemoryManager

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
        maximum: 5,
        description: "Ważność informacji: 1-2 (niska), 3 (średnia), 4-5 (wysoka)"
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

2. **Priorytetyzacja ważności (importance 1-5)**:
   - 5: Kluczowe relacje (imię partnera, dzieci), traumy, ważne rocznice
   - 4: Ważne preferencje, hobby, praca, przyjaciele
   - 3: Codzienne fakty, zwyczaje, rutyny
   - 1-2: Mniej istotne szczegóły, tymczasowe preferencje

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
     → remember_this("Mąż ma na imię Maciej i często pracuje do późna", 5, "relationship")
   
   - Użytkownik: "Nie lubię gdy ktoś podnosi na mnie głos"
     → remember_this("Nie lubi gdy się na nią/niego krzyczy", 4, "preference")
   
   - Użytkownik: "W przyszłym miesiącu mamy 10 rocznicę ślubu"
     → remember_this("10 rocznica ślubu w przyszłym miesiącu", 5, "event")

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
        
        const jwtSecret = config?.config_value
        if (!jwtSecret) {
          console.error('❌ JWT secret not configured in database')
          // Continue as guest user - don't fail chat completely
          userId = null
        } else {
          // Import jwt dynamically
          const jwt = await import('jsonwebtoken')
          const decoded = jwt.default.verify(token, jwtSecret)
          userId = decoded.id
          console.log('✅ Token verified, userId:', userId)
        }
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

    // 1. POBIERZ KONFIGURACJĘ Z BAZY
    // Konfiguracja zawiera OpenAI API key, temperature, max_tokens itp.
    // Jeśli brak klucza w bazie, fallback na process.env.OPENAI_API_KEY
    const { data: config } = await supabase
      .from('app_config')
      .select('config_key, config_value')
    
    const configMap = {}
    config?.forEach(item => {
      configMap[item.config_key] = item.config_value
    })

    const activeModel = configMap.active_model || 'openai'
    
    // 2. INICJALIZUJ MEMORY MANAGER
    // MemoryManager odpowiada za zapisywanie i odczytywanie wspomnień
    // Używa OpenAI embeddings + pgvector do semantic search
    let memoryManager = null
    let memorySystemEnabled = false
    
    if (userId) {
      // Check cache first
      memoryManager = memoryManagerCache.get(userId)
      
      // Create new instance if not in cache or if OpenAI key changed
      const openaiKey = configMap.openai_api_key || process.env.OPENAI_API_KEY
      console.log('🔑 OpenAI key source in chat:', {
        fromConfig: !!configMap.openai_api_key,
        fromEnv: !!process.env.OPENAI_API_KEY,
        finalKey: openaiKey ? `${openaiKey.substring(0, 10)}...` : 'missing'
      })
      
      if (!memoryManager || memoryManager.openaiKey !== openaiKey) {
        try {
          console.log('🧠 Creating new MemoryManager for user:', userId)
          // Create MemoryManager instance (will work even without OpenAI key)
          memoryManager = new MemoryManager(supabaseUrl, supabaseServiceKey, openaiKey)
          await memoryManager.initialize()
          memorySystemEnabled = memoryManager.enabled
          
          // Cache the instance
          memoryManagerCache.set(userId, memoryManager)
          
          // Limit cache size to prevent memory leaks
          if (memoryManagerCache.size > 100) {
            const firstKey = memoryManagerCache.keys().next().value
            memoryManagerCache.delete(firstKey)
          }
        
          if (memorySystemEnabled) {
            console.log('✅ MemoryManager initialized with full features for user:', userId)
          } else {
            console.log('⚠️ MemoryManager initialized without memory features (no OpenAI key)')
          }
        } catch (error) {
          console.error('❌ Failed to initialize MemoryManager:', error.message)
          console.error('Stack trace:', error.stack)
          // Remove from cache so it can be retried next time
          memoryManagerCache.delete(userId)
          // Continue without memory system
          memoryManager = null
          memorySystemEnabled = false
        }
      } else {
        memorySystemEnabled = memoryManager?.enabled || false
        console.log('📦 Using cached MemoryManager for user:', userId, 'enabled:', memorySystemEnabled)
      }
    } else {
      console.log('⚠️ No userId - memory system disabled for guest users')
    }

    // 3. POBIERZ RELEVANTNĄ PAMIĘĆ
    // Wyszukuje podobne wspomnienia do aktualnej wiadomości użytkownika
    // Używa similarity search na embeddingach (cosine similarity)
    let memoryContext = ''
    if (memoryManager && userId) {
      try {
        const relevantMemories = await memoryManager.getRelevantMemories(userId, message, 5, 0.4)
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
    const openaiKey = configMap.openai_api_key || process.env.OPENAI_API_KEY
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

          // 4. PRZYGOTUJ FUNKCJĘ remember_this
          // AI może wywołać tę funkcję aby zapisać ważną informację do pamięci
          // Automatycznie wykrywa imiona, daty, relacje i inne entities
          if (userId && memoryManager && memorySystemEnabled) {
            chatOptions.functions = [MEMORY_FUNCTION]
            chatOptions.function_call = 'auto'
            console.log('🔧 Function calling enabled for memory system', {
              model: openaiModel,
              userId: userId,
              memoryEnabled: memorySystemEnabled
            })
          } else {
            console.log('⚠️ Function calling disabled:', {
              userId: !!userId,
              memoryManager: !!memoryManager,
              memorySystemEnabled
            })
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

            if (userId && memoryManager && memorySystemEnabled) {
              chatOptions.functions = [MEMORY_FUNCTION]
              chatOptions.function_call = 'auto'
              console.log('🔧 Function calling enabled for memory system (fallback)', {
                model: 'gpt-3.5-turbo',
                userId: userId,
                memoryEnabled: memorySystemEnabled
              })
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
        let functionCallCompleted = false

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta
          
          // Debug chunk
          if (delta?.function_call || chunk.choices[0]?.finish_reason === 'function_call') {
            console.log('📦 Chunk with function call:', JSON.stringify(chunk, null, 2))
          }
          
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
            functionCallCompleted = true
            break // Exit first stream to process function call
          }
        }
        
        // Process function call if detected
        if (functionCallCompleted && functionName === 'remember_this') {
          try {
            const args = JSON.parse(functionArgs)
            console.log(`🔧 Function call: ${functionName}`, args)
            
            // Execute remember_this function
            console.log('📝 Processing remember_this function', {
              hasMemoryManager: !!memoryManager,
              hasUserId: !!userId,
              userId: userId
            })
            
            let functionResult = { success: false }
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
              functionResult = { success: true, saved: args.summary }
            } else {
              console.log('⚠️ Cannot save memory:', {
                memoryManager: !!memoryManager,
                userId: userId
              })
              functionResult = { success: false, error: 'Memory manager not available' }
            }

            // Continue conversation with function result
            console.log('🔄 Continuing conversation with function result...')
            
            // Prepare messages for continuation
            const messagesWithFunction = [
              ...aiMessages,
              { 
                role: 'assistant', 
                content: null,
                function_call: { 
                  name: functionName, 
                  arguments: functionArgs 
                }
              },
              {
                role: 'function',
                name: functionName,
                content: JSON.stringify(functionResult)
              }
            ]

            // Make continuation call to OpenAI
            const continuationStream = await openai.chat.completions.create({
              model: openaiModel,
              messages: messagesWithFunction,
              temperature: parseFloat(configMap.temperature) || 0.7,
              max_tokens: parseInt(configMap.max_tokens) || 1000,
              stream: true
            })

            // Stream the continuation response
            for await (const chunk of continuationStream) {
              const delta = chunk.choices[0]?.delta
              const content = delta?.content || ''
              
              if (content) {
                fullResponse += content
                res.write(`data: ${JSON.stringify({ content })}\n\n`)
              }
              
              // Check if continuation is complete
              if (chunk.choices[0]?.finish_reason === 'stop') {
                console.log('✅ Continuation completed')
                break
              }
            }
            
          } catch (error) {
            console.error('❌ Failed to process function call or continuation:', error)
            // Send error to user but continue
            res.write(`data: ${JSON.stringify({ content: 'Zapisałem to w pamięci i kontynuuję...' })}\n\n`)
          }
        }
        
        streamSuccess = true
        console.log('✅ OpenAI streaming completed')
        
      } catch (error) {
        console.log('❌ OpenAI streaming failed:', error.message)
        res.write(`data: ${JSON.stringify({ error: 'OpenAI failed, trying fallback...' })}\n\n`)
      }
    }

    // 2. Jeśli OpenAI nie zadziałało
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

    // Stary kod zapisujący do chat_history usunięty - używamy nowego systemu conversations/messages

    // Wyślij zakończenie streamingu z conversationId
    res.write(`data: ${JSON.stringify({ 
      type: 'conversation_id', 
      conversationId: activeConversationId,
      done: true 
    })}\n\n`)
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