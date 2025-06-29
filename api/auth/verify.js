// TALK2Me Token Verification API
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ valid: false, error: 'No token provided' })
    }

    const token = authHeader.split(' ')[1]
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Pobierz JWT secret
    const { data: config } = await supabase
      .from('app_config')
      .select('config_value')
      .eq('config_key', 'jwt_secret')
      .single()
    
    // SECURITY FIX (Sesja 21): Usunięto hardcoded fallback 'talk2me-secret-key-2024'
    // Teraz system fail-secure zamiast używać znanego hasła
    const jwtSecret = config?.config_value
    if (!jwtSecret) {
      console.error('❌ JWT secret not configured in database')
      return res.status(500).json({ error: 'Authentication system misconfigured' })
    }
    
    // Weryfikuj token
    try {
      const decoded = jwt.verify(token, jwtSecret)
      
      // Sprawdź czy użytkownik istnieje
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('id', decoded.id)
        .single()
      
      if (!user) {
        return res.json({ valid: false, error: 'User not found' })
      }
      
      return res.json({ 
        valid: true, 
        userId: decoded.id,
        email: decoded.email 
      })
      
    } catch (error) {
      return res.json({ valid: false, error: 'Invalid token' })
    }

  } catch (error) {
    console.error('Verify error:', error)
    res.status(500).json({ 
      valid: false,
      error: 'Server error' 
    })
  }
}