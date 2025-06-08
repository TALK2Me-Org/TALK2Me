// TALK2Me Register API - Supabase Auth Version
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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
    const { email, password, name } = req.body

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Wszystkie pola są wymagane' })
    }

    // Walidacja hasła
    if (password.length < 6) {
      return res.status(400).json({ error: 'Hasło musi mieć co najmniej 6 znaków' })
    }

    // Użyj anon key dla rejestracji
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Rejestracja przez Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password: password,
      options: {
        data: {
          name: name
        }
      }
    })

    if (authError) {
      console.error('Registration auth error:', authError)
      if (authError.message.includes('already registered')) {
        return res.status(400).json({ error: 'Ten email jest już zarejestrowany' })
      }
      return res.status(400).json({ 
        error: 'Błąd podczas rejestracji',
        details: authError.message 
      })
    }

    // Użyj service key do utworzenia wpisu w tabeli users
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Dodaj użytkownika do naszej tabeli users
    const { error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email: email.toLowerCase(),
        name: name,
        password: 'supabase_auth', // Placeholder - hasło jest zarządzane przez Supabase Auth
        subscription_type: 'free',
        is_verified: false,
        auth_provider: 'email'
      })

    if (insertError) {
      console.error('User insert error:', insertError)
      // Nie zwracaj błędu - użytkownik jest już zarejestrowany w Auth
    }

    // Automatyczne logowanie po rejestracji
    if (authData.session) {
      res.json({
        success: true,
        token: authData.session.access_token,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name: name,
          subscription_type: 'free'
        }
      })
    } else {
      // Jeśli wymagana weryfikacja emaila
      res.json({
        success: true,
        message: 'Rejestracja pomyślna! Sprawdź email aby potwierdzić konto.',
        requiresEmailVerification: true
      })
    }

  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ 
      error: 'Błąd serwera podczas rejestracji',
      details: error.message 
    })
  }
}