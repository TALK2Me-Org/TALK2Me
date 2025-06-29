// TALK2Me Register API - Custom JWT Version (Fixed)
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
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

    // Walidacja
    if (password.length < 6) {
      return res.status(400).json({ error: 'Hasło musi mieć co najmniej 6 znaków' })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Sprawdź czy email już istnieje
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingUser) {
      return res.status(400).json({ error: 'Ten email jest już zarejestrowany' })
    }

    // Hashuj hasło
    const hashedPassword = await bcrypt.hash(password, 10)

    // Utwórz użytkownika
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name,
        subscription_type: 'free',
        is_verified: false,
        auth_provider: 'email'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return res.status(500).json({ error: 'Błąd podczas tworzenia konta' })
    }

    // Pobierz JWT secret
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

    // Generuj token dla automatycznego logowania
    const token = jwt.sign(
      { 
        id: newUser.id, 
        email: newUser.email,
        name: newUser.name 
      },
      jwtSecret,
      { expiresIn: '7d' }
    )

    // Zwróć dane (bez hasła)
    const { password: _, ...userWithoutPassword } = newUser

    res.json({
      success: true,
      token,
      user: userWithoutPassword,
      message: 'Konto utworzone pomyślnie!'
    })

  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ 
      error: 'Błąd serwera podczas rejestracji',
      details: error.message 
    })
  }
}