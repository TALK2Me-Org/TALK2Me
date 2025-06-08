// TALK2Me User Profile API - Supabase Auth Version
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  // CORS headers
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
      return res.status(401).json({ error: 'Brak autoryzacji' })
    }

    const token = authHeader.split(' ')[1]
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Weryfikuj token przez Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Nieprawidłowy token' })
    }

    // Pobierz dodatkowe dane z tabeli users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: userData?.name || user.email.split('@')[0],
        subscription_type: userData?.subscription_type || 'free',
        is_verified: userData?.is_verified || false,
        created_at: user.created_at
      }
    })

  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ 
      error: 'Błąd serwera',
      details: error.message 
    })
  }
}