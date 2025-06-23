/**
 * Admin Memory API - zarządzanie wspomnieniami użytkowników w panelu admina
 * 
 * Główne funkcje:
 * - GET ?action=users - pobiera listę użytkowników z licznikiem wspomnień
 * - GET ?user_id=xxx - pobiera wspomnienia konkretnego użytkownika
 * - PUT ?id=xxx - edytuje wspomnienie (summary/importance)
 * - DELETE ?id=xxx - usuwa wspomnienie
 * 
 * Bezpieczeństwo:
 * - Używa Supabase Service Role Key (pełne uprawnienia)
 * - Tylko dla panelu admina (nie ma autoryzacji user-level)
 * 
 * @author Claude (AI Assistant) - Sesja 12-13
 * @date 17.06.2025
 * @status ✅ DZIAŁA w produkcji
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (req.method === 'GET') {
      const { user_id, action } = req.query

      // Pobierz listę użytkowników z licznikiem wspomnień
      // Używane w Memory Viewer dropdown do selekcji użytkownika
      if (action === 'users') {
        console.log('🔍 Admin Memory: Fetching users...')
        const { data: users, error } = await supabase
          .from('users')
          .select('id, email, name, created_at')
          .order('email')
          .limit(100)

        if (error) {
          console.error('❌ Failed to fetch users:', error)
          return res.status(500).json({ error: 'Failed to fetch users', details: error })
        }

        console.log(`📊 Found ${users.length} users total`)

        // Dodaj licznik wspomnień dla każdego użytkownika
        // To pozwala pokazać tylko userów którzy mają zapisane wspomnienia
        console.log('🧠 Checking memory counts for each user...')
        const usersWithMemoryCount = await Promise.all(
          users.map(async (user) => {
            const { count, error: countError } = await supabase
              .from('memories_v2')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id)
            
            if (countError) {
              console.error(`❌ Error counting memories for user ${user.email}:`, countError)
            } else {
              console.log(`📝 User ${user.email}: ${count || 0} memories`)
            }
            
            return {
              ...user,
              memory_count: count || 0
            }
          })
        )

        const usersWithMemories = usersWithMemoryCount.filter(u => u.memory_count > 0)
        console.log(`✅ Found ${usersWithMemories.length} users with memories`)
        
        return res.json({ 
          success: true, 
          users: usersWithMemories,
          debug: {
            totalUsers: users.length,
            usersWithMemories: usersWithMemories.length,
            allUsers: usersWithMemoryCount.map(u => ({ email: u.email, memoryCount: u.memory_count }))
          }
        })
      }

      // Pobierz wspomnienia dla konkretnego użytkownika
      // Sortowane od najnowszych, z pełnymi danymi do wyświetlenia w tabeli
      if (user_id) {
        const { data: memories, error } = await supabase
          .from('memories_v2')
          .select(`
            id,
            content,
            summary,
            importance,
            memory_type,
            entities,
            created_at,
            updated_at
          `)
          .eq('user_id', user_id)
          .order('created_at', { ascending: false })

        if (error) {
          return res.status(500).json({ error: 'Failed to fetch memories', details: error })
        }

        // Pobierz też dane użytkownika
        const { data: user } = await supabase
          .from('users')
          .select('email, name')
          .eq('id', user_id)
          .single()

        return res.json({ 
          success: true, 
          memories,
          user: user || null,
          total_count: memories.length
        })
      }

      return res.status(400).json({ error: 'user_id or action=users is required' })

    } else if (req.method === 'PUT') {
      // Aktualizuj wspomnienie - używane przez inline editing w Memory Viewer
      // Pozwala edytować summary i importance bezpośrednio w tabeli
      const { id } = req.query
      const { summary, importance } = req.body

      if (!id) {
        return res.status(400).json({ error: 'Memory ID is required' })
      }

      // Walidacja
      if (importance && (importance < 1 || importance > 5)) {
        return res.status(400).json({ error: 'Importance must be between 1 and 5' })
      }

      const updateData = {}
      if (summary !== undefined) updateData.summary = summary
      if (importance !== undefined) updateData.importance = parseInt(importance)
      updateData.updated_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('memories_v2')
        .update(updateData)
        .eq('id', id)
        .select()

      if (error) {
        return res.status(500).json({ error: 'Failed to update memory', details: error })
      }

      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Memory not found' })
      }

      return res.json({ 
        success: true, 
        message: 'Memory updated successfully',
        memory: data[0]
      })

    } else if (req.method === 'DELETE') {
      // Usuń wspomnienie - używane przez przycisk Delete w Memory Viewer
      // Wymaga potwierdzenia w UI przed wykonaniem
      const { id } = req.query

      if (!id) {
        return res.status(400).json({ error: 'Memory ID is required' })
      }

      const { error } = await supabase
        .from('memories_v2')
        .delete()
        .eq('id', id)

      if (error) {
        return res.status(500).json({ error: 'Failed to delete memory', details: error })
      }

      return res.json({ 
        success: true, 
        message: 'Memory deleted successfully'
      })

    } else {
      res.status(405).json({ error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('Memory Admin API error:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}