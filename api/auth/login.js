// TALK2Me Login API - Supabase Auth Version
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email i hasło są wymagane' })
    }

    // Użyj anon key dla auth operacji
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Zaloguj przez Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password: password
    })

    if (error) {
      console.error('Login error:', error)
      return res.status(401).json({ 
        error: 'Nieprawidłowy email lub hasło',
        details: error.message 
      })
    }

    if (!data.session) {
      return res.status(401).json({ error: 'Nie udało się utworzyć sesji' })
    }

    // Pobierz dodatkowe dane użytkownika z tabeli users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single()

    // Zwróć token i dane użytkownika
    res.json({
      success: true,
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: userData?.name || data.user.email.split('@')[0],
        subscription_type: userData?.subscription_type || 'free',
        created_at: data.user.created_at
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ 
      error: 'Błąd serwera podczas logowania',
      details: error.message 
    })
  }
}