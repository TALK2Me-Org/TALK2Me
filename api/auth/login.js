// TALK2Me Login API - Vercel Serverless Function
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
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email i hasło są wymagane' })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Znajdź użytkownika po emailu
    const { data: users, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single()

    if (findError || !users) {
      return res.status(401).json({ error: 'Nieprawidłowy email lub hasło' })
    }

    // Sprawdź hasło
    const isValidPassword = await bcrypt.compare(password, users.password)
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Nieprawidłowy email lub hasło' })
    }

    // Generuj JWT token
    const token = jwt.sign(
      { id: users.id, email: users.email },
      process.env.JWT_SECRET || 'talk2me-secret-key-2024',
      { expiresIn: '7d' }
    )

    // Zwróć dane użytkownika (bez hasła)
    const { password: _, ...userWithoutPassword } = users

    res.json({
      success: true,
      token,
      user: userWithoutPassword
    })

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ 
      error: 'Błąd serwera podczas logowania',
      details: error.message 
    })
  }
}