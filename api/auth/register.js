// TALK2Me Register API - Vercel Serverless Function
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
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Wszystkie pola są wymagane' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Hasło musi mieć minimum 6 znaków' })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Sprawdź czy użytkownik już istnieje
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingUser) {
      return res.status(400).json({ error: 'Użytkownik z tym emailem już istnieje' })
    }

    // Hashuj hasło
    const hashedPassword = await bcrypt.hash(password, 10)

    // Stwórz użytkownika
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        subscription_type: 'free',
        is_verified: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('Create user error:', createError)
      return res.status(500).json({ error: 'Błąd tworzenia konta' })
    }

    // Generuj JWT token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      process.env.JWT_SECRET || 'talk2me-secret-key-2024',
      { expiresIn: '7d' }
    )

    // Zwróć dane użytkownika (bez hasła)
    const { password: _, ...userWithoutPassword } = newUser

    res.json({
      success: true,
      token,
      user: userWithoutPassword
    })

  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ 
      error: 'Błąd serwera podczas rejestracji',
      details: error.message 
    })
  }
}