// TALK2Me Conversations API - System konwersacji (FAZA 2)
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
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
    
    const userId = decoded.id

    // Routing based on URL structure  
    const conversationId = req.params.id || req.query.conversationId
    console.log('🔍 Debugging conversations API:');
    console.log('   Method:', req.method);
    console.log('   URL:', req.url);
    console.log('   req.params:', req.params);
    console.log('   req.query:', req.query);
    console.log('   Extracted conversationId:', conversationId);

    // GET /api/conversations - lista konwersacji
    if (req.method === 'GET' && !conversationId) {
      const limit = parseInt(req.query.limit) || 20
      const offset = parseInt(req.query.offset) || 0
      const includeArchived = req.query.includeArchived === 'true'

      let query = supabase
        .from('conversation_summary')
        .select('*')
        .eq('user_id', userId)
        .order('last_message_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (!includeArchived) {
        query = query.eq('is_archived', false)
      }

      const { data: conversations, error } = await query

      if (error) {
        return res.status(500).json({ error: 'Database error', details: error })
      }

      return res.json({
        success: true,
        conversations: conversations || [],
        hasMore: conversations?.length === limit
      })
    }

    // POST /api/conversations - nowa konwersacja
    if (req.method === 'POST' && !conversationId) {
      const { title, firstMessage } = req.body

      // Rozpocznij transakcję
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          title: title || 'Nowa rozmowa',
          last_message_at: new Date().toISOString()
        })
        .select()
        .single()

      if (convError) {
        return res.status(500).json({ error: 'Failed to create conversation', details: convError })
      }

      // Jeśli podano pierwszą wiadomość, dodaj ją
      if (firstMessage) {
        const { error: msgError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            user_id: userId,
            role: 'user',
            content: firstMessage
          })

        if (msgError) {
          // Rollback - usuń konwersację
          await supabase.from('conversations').delete().eq('id', conversation.id)
          return res.status(500).json({ error: 'Failed to create message', details: msgError })
        }

        // Jeśli nie podano tytułu, wygeneruj go z pierwszej wiadomości
        if (!title) {
          const generatedTitle = firstMessage.substring(0, 50) + 
            (firstMessage.length > 50 ? '...' : '')
          
          await supabase
            .from('conversations')
            .update({ title: generatedTitle })
            .eq('id', conversation.id)
          
          conversation.title = generatedTitle
        }
      }

      return res.json({
        success: true,
        conversation
      })
    }

    // GET /api/conversations/[id]/messages - wiadomości z konwersacji
    if (req.method === 'GET' && conversationId && req.url.includes('/messages')) {
      const limit = parseInt(req.query.limit) || 50
      const before = req.query.before // UUID ostatniej wiadomości dla paginacji

      // Sprawdź czy użytkownik ma dostęp do konwersacji
      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single()

      if (!conv) {
        return res.status(404).json({ error: 'Conversation not found' })
      }

      let query = supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (before) {
        const { data: beforeMsg } = await supabase
          .from('messages')
          .select('created_at')
          .eq('id', before)
          .single()
        
        if (beforeMsg) {
          query = query.lt('created_at', beforeMsg.created_at)
        }
      }

      const { data: messages, error } = await query

      if (error) {
        return res.status(500).json({ error: 'Database error', details: error })
      }

      // Odwróć kolejność dla właściwego wyświetlania (najstarsze pierwsze)
      const orderedMessages = (messages || []).reverse()

      return res.json({
        success: true,
        messages: orderedMessages,
        hasMore: messages?.length === limit
      })
    }

    // PUT /api/conversations/[id] - aktualizacja konwersacji
    if (req.method === 'PUT' && conversationId) {
      console.log('🔄 PUT /api/conversations/:id - conversationId:', conversationId);
      console.log('👤 userId:', userId);
      console.log('📋 body:', req.body);
      
      const { title, is_archived, is_favorite } = req.body

      // Sprawdź czy użytkownik ma dostęp
      console.log('🔍 Sprawdzam dostęp do konwersacji...');
      const { data: conv, error: findError } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single()

      if (findError) {
        console.error('❌ Błąd podczas wyszukiwania konwersacji:', findError);
        return res.status(500).json({ error: 'Database error while finding conversation', details: findError })
      }

      if (!conv) {
        console.error('❌ Konwersacja nie znaleziona dla conversationId:', conversationId, 'userId:', userId);
        return res.status(404).json({ error: 'Conversation not found' })
      }

      console.log('✅ Konwersacja znaleziona:', conv);

      const updates = {}
      if (title !== undefined) updates.title = title
      if (is_archived !== undefined) updates.is_archived = is_archived
      if (is_favorite !== undefined) updates.is_favorite = is_favorite

      console.log('🔄 Aktualizuję konwersację z:', updates);

      const { data: updated, error } = await supabase
        .from('conversations')
        .update(updates)
        .eq('id', conversationId)
        .select()
        .single()

      if (error) {
        console.error('❌ Błąd podczas aktualizacji konwersacji:', error);
        return res.status(500).json({ error: 'Update failed', details: error })
      }

      console.log('✅ Konwersacja zaktualizowana:', updated);

      return res.json({
        success: true,
        conversation: updated
      })
    }

    // DELETE /api/conversations/[id] - usuwanie konwersacji
    if (req.method === 'DELETE' && conversationId) {
      // Sprawdź czy użytkownik ma dostęp
      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single()

      if (!conv) {
        return res.status(404).json({ error: 'Conversation not found' })
      }

      // Cascade delete automatycznie usunie wszystkie wiadomości
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)

      if (error) {
        return res.status(500).json({ error: 'Delete failed', details: error })
      }

      return res.json({
        success: true,
        message: 'Conversation deleted successfully'
      })
    }

    // Nieobsługiwana metoda/ścieżka
    return res.status(400).json({ error: 'Invalid request' })

  } catch (error) {
    console.error('Conversations API error:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}

// Eksportuj konfigurację dla Vercel
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}