// Chat history API endpoint - Custom JWT Version
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization required' })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const token = authHeader.split(' ')[1]
    
    // Get JWT secret from config
    const { data: config } = await supabase
      .from('app_config')
      .select('config_value')
      .eq('config_key', 'jwt_secret')
      .single()
    
    const jwtSecret = config?.config_value
    if (!jwtSecret) {
      console.error('❌ JWT secret not configured in database')
      return res.status(500).json({ error: 'Authentication system misconfigured' })
    }
    
    // Verify custom JWT token
    let decoded
    try {
      decoded = jwt.verify(token, jwtSecret)
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    const limit = parseInt(req.query.limit) || 20

    // Read from new conversations table instead of legacy chat_history
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        id,
        title,
        created_at,
        last_message_at,
        messages!inner(
          content,
          role,
          created_at
        )
      `)
      .eq('user_id', decoded.id)
      .order('last_message_at', { ascending: false })
      .limit(limit)

    if (error) {
      return res.status(500).json({ error: 'Database error', details: error })
    }

    // Transform to show full conversation history instead of just first message pair
    const chats = conversations?.map(conv => {
      // Get all messages sorted by creation time
      const sortedMessages = conv.messages?.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)) || []
      
      // Get first user message for preview
      const firstUserMessage = sortedMessages.find(m => m.role === 'user')?.content || ''
      
      // Get last assistant message for preview
      const lastAssistantMessage = sortedMessages.filter(m => m.role === 'assistant').pop()?.content || ''
      
      // Create conversation preview with full context
      return {
        id: conv.id,
        conversation_id: conv.id,
        title: conv.title,
        message: firstUserMessage,
        response: lastAssistantMessage,
        created_at: conv.created_at,
        last_message_at: conv.last_message_at,
        message_count: sortedMessages.length,
        full_conversation: sortedMessages.map(msg => ({
          role: msg.role,
          content: msg.content,
          created_at: msg.created_at
        })),
        is_favorite: false
      }
    }) || []

    // FALLBACK: Jeśli nowa tabela conversations jest pusta, użyj starej tabeli chat_history
    if (chats.length === 0) {
      console.log('⚠️ Tabela conversations pusta, używam fallback na chat_history')
      
      const { data: legacyChats, error: legacyError } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', decoded.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (legacyError) {
        console.error('Error reading legacy chat_history:', legacyError)
      } else if (legacyChats && legacyChats.length > 0) {
        console.log(`📚 Znaleziono ${legacyChats.length} starych czatów w chat_history`)
        
        // Grupuj stare czaty po conversation_id żeby unikać duplikatów
        const groupedLegacyChats = new Map()
        
        legacyChats.forEach(chat => {
          const convId = chat.conversation_id || chat.id
          
          if (!groupedLegacyChats.has(convId)) {
            // Nowa konwersacja
            groupedLegacyChats.set(convId, {
              id: convId,
              conversation_id: convId,
              title: chat.message.substring(0, 50) + (chat.message.length > 50 ? '...' : ''),
              message: chat.message,
              response: chat.response,
              created_at: chat.created_at,
              last_message_at: chat.created_at,
              message_count: 2,
              full_conversation: [
                {
                  role: 'user',
                  content: chat.message,
                  created_at: chat.created_at
                },
                {
                  role: 'assistant',
                  content: chat.response,
                  created_at: chat.created_at
                }
              ],
              is_favorite: false
            })
          } else {
            // Dodaj do istniejącej konwersacji
            const existing = groupedLegacyChats.get(convId)
            existing.full_conversation.push(
              {
                role: 'user',
                content: chat.message,
                created_at: chat.created_at
              },
              {
                role: 'assistant',
                content: chat.response,
                created_at: chat.created_at
              }
            )
            existing.message_count = existing.full_conversation.length
            existing.last_message_at = chat.created_at
            existing.response = chat.response // Aktualizuj na najnowszą odpowiedź
          }
        })
        
        const transformedLegacyChats = Array.from(groupedLegacyChats.values())
          .sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at))
        
        chats = transformedLegacyChats
      }
    }

    res.json({
      success: true,
      chats: chats
    })

  } catch (error) {
    console.error('History API error:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}