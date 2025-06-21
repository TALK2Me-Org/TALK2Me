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
    
    const jwtSecret = config?.config_value || 'talk2me-secret-key-2024'
    
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

    // Transform to match expected chat history format
    const chats = conversations?.map(conv => {
      const lastMessage = conv.messages?.[conv.messages.length - 1]
      return {
        id: conv.id,
        conversation_id: conv.id,
        title: conv.title,
        message: conv.messages?.find(m => m.role === 'user')?.content || '',
        response: conv.messages?.find(m => m.role === 'assistant')?.content || '',
        created_at: conv.created_at,
        last_message_at: conv.last_message_at,
        is_favorite: false // TODO: implement favorites in new system
      }
    }) || []

    res.json({
      success: true,
      chats: chats
    })

  } catch (error) {
    console.error('History API error:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}