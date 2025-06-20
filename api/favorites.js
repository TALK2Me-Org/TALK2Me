// Favorites API endpoint - Custom JWT Version
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
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

    if (req.method === 'GET') {
      // Get favorite messages from new messages table
      const { data: favoriteMessages, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          role,
          ai_model,
          created_at,
          conversation_id,
          conversations!inner(
            title,
            user_id
          )
        `)
        .eq('user_id', decoded.id)
        .eq('is_favorite', true)
        .order('created_at', { ascending: false })

      if (error) {
        return res.status(500).json({ error: 'Database error', details: error })
      }

      // Transform to match expected format
      const chats = favoriteMessages?.map(msg => ({
        id: msg.id,
        conversation_id: msg.conversation_id,
        title: msg.conversations?.title || 'Untitled Chat',
        message: msg.role === 'user' ? msg.content : '',
        response: msg.role === 'assistant' ? msg.content : '',
        created_at: msg.created_at,
        is_favorite: true,
        ai_model: msg.ai_model
      })) || []

      res.json({
        success: true,
        chats: chats
      })

    } else if (req.method === 'POST') {
      // Toggle favorite status for message
      const { messageId } = req.body
      
      if (!messageId) {
        return res.status(400).json({ error: 'messageId required' })
      }

      // First get current status
      const { data: currentMessage } = await supabase
        .from('messages')
        .select('is_favorite')
        .eq('id', messageId)
        .eq('user_id', decoded.id)
        .single()

      if (!currentMessage) {
        return res.status(404).json({ error: 'Message not found' })
      }

      // Toggle favorite
      const { error } = await supabase
        .from('messages')
        .update({ is_favorite: !currentMessage.is_favorite })
        .eq('id', messageId)
        .eq('user_id', decoded.id)

      if (error) {
        return res.status(500).json({ error: 'Update failed', details: error })
      }

      res.json({
        success: true,
        message: 'Favorite status updated',
        is_favorite: !currentMessage.is_favorite
      })

    } else {
      res.status(405).json({ error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('Favorites API error:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}