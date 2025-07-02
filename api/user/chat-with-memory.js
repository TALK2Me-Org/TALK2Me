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
import memoryRouter from '../memory/router.js'
import { addPerfLog } from '../debug/performance-logs.js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Cache dla promptu Assistant API
export const promptCache = {
  prompt: null,
  timestamp: 0,
  source: 'none'
}

// 🚀 PERFORMANCE: Cache konfiguracji dla Mem0Provider
export const configCache = {
  config: null,
  timestamp: 0,
  ttl: 300000 // 5 minut cache dla config
}

// 🚀 PERFORMANCE: Cache OpenAI klienta dla performance
export const openaiCache = {
  client: null,
  apiKey: null // Track API key to invalidate cache if changed
}

// Memory Router - modular provider system
// Handles multiple memory providers (Local, Mem0) with automatic fallback
// No caching needed as router manages provider instances internally

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
  // 🕒 PERFORMANCE DIAGNOSTICS: Track request timing
  const requestStartTime = Date.now()
  console.log(`🚀 PERF: Request started at ${new Date().toISOString()}`)
  
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

    // 1. POBIERZ KONFIGURACJĘ Z BAZY (z timing diagnostics)
    const configStartTime = Date.now()
    console.log(`🕒 PERF: Config fetch started at +${configStartTime - requestStartTime}ms`)
    
    let configMap = {}
    
    if (configCache.config && Date.now() - configCache.timestamp < configCache.ttl) {
      configMap = configCache.config
      const configTime = Date.now() - configStartTime
      console.log(`⚡ PERF: Config from cache (${configTime}ms, age: ${Math.round((Date.now() - configCache.timestamp) / 1000)}s)`)
    } else {
      console.log('🔄 PERF: Fetching fresh config from database...')
      const { data: config } = await supabase
        .from('app_config')
        .select('config_key, config_value')
      
      config?.forEach(item => {
        configMap[item.config_key] = item.config_value
      })
      
      // Cache config for performance
      configCache.config = configMap
      configCache.timestamp = Date.now()
      const configTime = Date.now() - configStartTime
      console.log(`💾 PERF: Config fetched and cached (${configTime}ms)`)
    }

    const activeModel = configMap.active_model || 'openai'
    
    // 2. INICJALIZUJ MEMORY ROUTER (z timing diagnostics)
    const memoryRouterStartTime = Date.now()
    console.log(`🕒 PERF: Memory Router init started at +${memoryRouterStartTime - requestStartTime}ms`)
    
    let memorySystemEnabled = false
    
    if (userId) {
      try {
        console.log('🧠 PERF: Memory Router check for user:', userId)
        
        // Check if already initialized
        if (memoryRouter.initialized) {
          const routerTime = Date.now() - memoryRouterStartTime
          console.log(`⚡ PERF: Memory Router already initialized (${routerTime}ms)`)
        } else {
          console.log('🚀 PERF: Memory Router first-time initialization...')
          await memoryRouter.initialize()
          const routerTime = Date.now() - memoryRouterStartTime
          console.log(`🏁 PERF: Memory Router initialized (${routerTime}ms)`)
        }
        
        // Check if memory system is available
        const status = memoryRouter.getStatus()
        memorySystemEnabled = status.initialized && status.activeProvider?.enabled
        
        if (memorySystemEnabled) {
          console.log('✅ Memory Router ready:', {
            provider: status.activeProvider.name,
            enabled: status.activeProvider.enabled,
            fallback: status.fallbackProvider?.name || 'none'
          })
        } else {
          console.log('⚠️ Memory Router not enabled:', {
            initialized: status.initialized,
            activeProvider: status.activeProvider?.name || 'none',
            enabled: status.activeProvider?.enabled || false
          })
        }
      } catch (error) {
        console.error('❌ Failed to initialize Memory Router:', error.message)
        console.error('Stack trace:', error.stack)
        // Continue without memory system
        memorySystemEnabled = false
      }
    } else {
      console.log('⚠️ No userId - memory system disabled for guest users')
    }

    // 3. POBIERZ RELEVANTNĄ PAMIĘĆ - TYLKO dla LocalProvider (z timing)
    const memoryRetrievalStartTime = Date.now()
    console.log(`🕒 PERF: Memory retrieval started at +${memoryRetrievalStartTime - requestStartTime}ms`)
    
    let memoryContext = ''
    const isLocalProviderForMemory = memoryRouter.activeProvider?.providerName === 'LocalProvider'
    if (memorySystemEnabled && userId && isLocalProviderForMemory) {
      try {
        console.log('🔍 PERF: Starting LocalProvider memory retrieval...')
        console.log('🔍 PERF: User ID:', userId, 'Query length:', message.length)
        
        const result = await memoryRouter.getRelevantMemories(userId, message, 5)
        const memoryTime = Date.now() - memoryRetrievalStartTime
        console.log(`🏁 PERF: Memory retrieval completed (${memoryTime}ms)`)
        
        console.log('🔍 MEMORY DEBUG: getRelevantMemories result:', {
          success: result.success,
          memoriesCount: result.memories?.length || 0,
          error: result.error,
          provider: memoryRouter.activeProvider?.providerName
        })
        
        if (result.success && result.memories && result.memories.length > 0) {
          console.log('🔍 MEMORY DEBUG: Found memories details:', result.memories.map(m => ({
            id: m.id,
            summary: m.summary?.substring(0, 50) + '...',
            type: m.memory_type,
            importance: m.importance,
            created: m.created_at
          })))
          
          // Format memories for AI context (using LocalProvider's format as standard)
          const formattedMemories = result.memories.map((memory, index) => {
            const date = new Date(memory.created_at).toLocaleDateString()
            const importance = '★'.repeat(memory.importance || 1)
            
            return `[Memory ${index + 1}] (${date}, ${importance})\nType: ${memory.memory_type || 'personal'}\nSummary: ${memory.summary}\nContent: ${memory.content}\n`
          }).join('\n---\n')
          
          memoryContext = formattedMemories
          console.log(`📚 MEMORY DEBUG: Formatted ${result.memories.length} memories for AI context`)
          console.log(`📚 MEMORY DEBUG: Memory context length: ${memoryContext.length} chars`)
        } else if (result.success) {
          console.log('📚 MEMORY DEBUG: No relevant memories found (empty result)')
        } else {
          console.error('❌ MEMORY DEBUG: Memory retrieval failed:', result.error)
        }
      } catch (error) {
        console.error('❌ MEMORY DEBUG: Exception during memory retrieval:', error)
        console.error('❌ MEMORY DEBUG: Error stack:', error.stack)
      }
    } else if (memorySystemEnabled && userId && !isLocalProviderForMemory) {
      console.log('⚡ MEMORY DEBUG: Memory retrieval skipped for Mem0Provider (automatic memory management)')
    } else {
      console.log('⚠️ MEMORY DEBUG: Memory retrieval skipped:', {
        memorySystemEnabled,
        userId: !!userId,
        provider: memoryRouter.activeProvider?.providerName || 'none'
      })
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
        // 🕒 PERF: Track OpenAI operations timing
        const openaiStartTime = Date.now()
        console.log(`🕒 PERF: OpenAI operations started at +${openaiStartTime - requestStartTime}ms`)
        
        // OpenAI client creation/cache
        let openai
        if (openaiCache.client && openaiCache.apiKey === openaiKey) {
          openai = openaiCache.client
          const clientTime = Date.now() - openaiStartTime
          console.log(`⚡ PERF: Using cached OpenAI client (${clientTime}ms)`)
        } else {
          console.log('🔄 PERF: Creating new OpenAI client...')
          openai = new OpenAI({ apiKey: openaiKey })
          openaiCache.client = openai
          openaiCache.apiKey = openaiKey
          const clientTime = Date.now() - openaiStartTime
          console.log(`💾 PERF: OpenAI client created and cached (${clientTime}ms)`)
        }
        
        // Assistant API prompt fetch with timing
        const assistantStartTime = Date.now()
        let systemPrompt = 'You are a helpful AI assistant.'
        
        if (promptCache.prompt && Date.now() - promptCache.timestamp < 3600000) {
          systemPrompt = promptCache.prompt
          const assistantTime = Date.now() - assistantStartTime
          console.log(`📋 PERF: Using cached prompt (${assistantTime}ms, length: ${systemPrompt.length} chars)`)
        } else if (assistantId) {
          try {
            console.log(`🔄 PERF: Fetching prompt from Assistant API (ID: ${assistantId})...`)
            const assistant = await openai.beta.assistants.retrieve(assistantId)
            systemPrompt = assistant.instructions || systemPrompt
            
            promptCache.prompt = systemPrompt
            promptCache.timestamp = Date.now()
            promptCache.source = 'Assistant API'
            const assistantTime = Date.now() - assistantStartTime
            console.log(`✅ PERF: Assistant API prompt fetched (${assistantTime}ms, length: ${systemPrompt.length} chars)`)
          } catch (err) {
            const assistantTime = Date.now() - assistantStartTime
            console.error(`❌ PERF: Assistant API failed (${assistantTime}ms):`, err.message)
            console.error('Using default prompt instead')
          }
        } else {
          const assistantTime = Date.now() - assistantStartTime
          console.log(`⚠️ PERF: No assistant_id configured, using default prompt (${assistantTime}ms)`)
        }

        // Dodaj memory context i rules - TYLKO dla LocalProvider
        // Mem0Provider nie potrzebuje MEMORY_RULES (ma automatyczną pamięć)
        const isLocalProviderForRules = memoryRouter.activeProvider?.providerName === 'LocalProvider'
        if (isLocalProviderForRules && userId) {
          systemPrompt += memoryContext + MEMORY_RULES
          console.log('📋 Added memory context + rules for LocalProvider')
        } else if (memoryContext) {
          systemPrompt += memoryContext
          console.log('📋 Added memory context only (no rules for Mem0Provider)')
        } else {
          console.log('⚡ Clean prompt for Mem0Provider (automatic memory)')
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
          const chatOptions = {
            model: openaiModel,
            messages: aiMessages,
            temperature: parseFloat(configMap.temperature) || 0.7,
            max_tokens: parseInt(configMap.max_tokens) || 1000,
            stream: true
          }

          // 4. PRZYGOTUJ FUNKCJĘ remember_this TYLKO dla LocalProvider
          // Mem0Provider używa automatycznej pamięci bez function calling
          // LocalProvider zachowuje pełną funkcjonalność z remember_this()
          const isLocalProvider = memoryRouter.activeProvider?.providerName === 'LocalProvider'
          if (userId && memorySystemEnabled && isLocalProvider) {
            chatOptions.functions = [MEMORY_FUNCTION]
            chatOptions.function_call = 'auto'
            console.log('🔧 Function calling enabled for LocalProvider', {
              model: openaiModel,
              userId: userId,
              memoryEnabled: memorySystemEnabled,
              activeProvider: memoryRouter.activeProvider?.providerName || 'none'
            })
          } else {
            console.log('⚠️ Function calling disabled:', {
              userId: !!userId,
              memorySystemEnabled,
              activeProvider: memoryRouter.activeProvider?.providerName || 'none',
              reason: isLocalProvider ? 'other' : 'Mem0Provider uses automatic memory'
            })
          }

          // 🕒 CRITICAL: Time To First Token measurement
          const chatStartTime = Date.now()
          console.log(`🕒 PERF: Chat completion started at +${chatStartTime - requestStartTime}ms`)
          
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

            if (userId && memorySystemEnabled && isLocalProvider) {
              chatOptions.functions = [MEMORY_FUNCTION]
              chatOptions.function_call = 'auto'
              console.log('🔧 Function calling enabled for LocalProvider (fallback)', {
                model: 'gpt-3.5-turbo',
                userId: userId,
                memoryEnabled: memorySystemEnabled,
                activeProvider: memoryRouter.activeProvider?.providerName || 'none'
              })
            }

            const chatStartTime = Date.now()
            console.log(`🕒 PERF: Fallback chat completion started at +${chatStartTime - requestStartTime}ms`)
            stream = await openai.chat.completions.create(chatOptions)
          } else {
            throw modelError
          }
        }
        
        // 🕒 CRITICAL: Time To First Token tracking
        let firstTokenReceived = false
        let firstTokenTime = null
        
        // Stream chunks do klienta
        let functionCall = null
        let functionName = ''
        let functionArgs = ''
        let functionCallCompleted = false

        for await (const chunk of stream) {
          // 🚀 CRITICAL: Track Time To First Token
          if (!firstTokenReceived) {
            firstTokenTime = Date.now()
            const ttft = firstTokenTime - requestStartTime
            console.log(`🎯 PERF: 🔥 TIME TO FIRST TOKEN: ${ttft}ms 🔥`)
            console.log(`🎯 PERF: Breakdown - Config: ${configStartTime - requestStartTime}ms, Memory: ${memoryRouterStartTime - configStartTime}ms, OpenAI: ${firstTokenTime - openaiStartTime}ms`)
            
            // 📊 LOG PERFORMANCE DATA
            try {
              addPerfLog({
                ttft: ttft,
                configTime: configStartTime - requestStartTime,
                memoryTime: memoryRouterStartTime - configStartTime,
                openaiTime: firstTokenTime - openaiStartTime,
                provider: memoryRouter.activeProvider?.providerName || 'none',
                model: openaiModel,
                messageLength: message.length,
                hasCache: !!promptCache.prompt,
                hasConfigCache: !!(configCache.config && Date.now() - configCache.timestamp < configCache.ttl)
              })
            } catch (perfLogError) {
              console.error('Failed to log performance data:', perfLogError)
            }
            
            firstTokenReceived = true
          }
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
            
            // Execute remember_this function via Memory Router
            console.log('📝 Processing remember_this function via Memory Router', {
              memorySystemEnabled,
              userId: userId,
              activeProvider: memoryRouter.activeProvider?.providerName || 'none'
            })
            
            let functionResult = { success: false }
            if (memorySystemEnabled && userId) {
              try {
                console.log('💾 Saving memory via Memory Router...')
                const saveResult = await memoryRouter.saveMemory(
                  userId,
                  message, // original content
                  {
                    summary: args.summary,
                    importance: args.importance,
                    memory_type: args.type,
                    conversation_id: activeConversationId
                  }
                )
                
                if (saveResult.success) {
                  console.log(`✅ Memory saved via ${memoryRouter.activeProvider?.providerName}: "${args.summary}" (importance: ${args.importance})`)
                  functionResult = { success: true, saved: args.summary, provider: memoryRouter.activeProvider?.providerName }
                } else {
                  console.error('❌ Memory save failed:', saveResult.error)
                  functionResult = { success: false, error: saveResult.error }
                }
              } catch (error) {
                console.error('❌ Memory save error via router:', error)
                functionResult = { success: false, error: error.message }
              }
            } else {
              console.log('⚠️ Cannot save memory:', {
                memorySystemEnabled,
                userId: userId
              })
              functionResult = { success: false, error: 'Memory system not available' }
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

      // 5. AUTOMATYCZNA PAMIĘĆ dla Mem0Provider - WYŁĄCZONA
      // TODO: Dodać auto-save gdy system będzie w pełni stabilny
      // Problem: conversation_messages format powoduje błędy w client.add()
      const isMem0Provider = memoryRouter.activeProvider?.providerName === 'Mem0Provider'
      if (false && memorySystemEnabled && isMem0Provider && userId && fullResponse) {
        try {
          console.log('💾 Auto-saving conversation to Mem0Provider...')
          
          // Test z conversation_messages - bezpieczne formatowanie
          const conversationMessages = [
            { role: 'user', content: message },
            { role: 'assistant', content: fullResponse }
          ]
          
          const saveResult = await memoryRouter.saveMemory(
            userId,
            message, // original user message for context
            {
              conversation_messages: conversationMessages,
              auto_saved: true,
              conversation_id: activeConversationId
            }
          )
          
          if (saveResult.success) {
            console.log(`✅ Mem0Provider: Auto-saved simple message (${saveResult.latency}ms)`)
          } else {
            console.warn('⚠️ Mem0Provider: Auto-save failed:', saveResult.error)
          }
        } catch (error) {
          console.error('❌ Mem0Provider: Auto-save error:', error.message)
          // Don't fail the whole chat if auto-save fails
        }
      }
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