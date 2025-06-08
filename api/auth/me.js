// TALK2Me User Profile API - Vercel Serverless Function
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

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
    
    // Pobierz JWT secret z konfiguracji
    const { data: config } = await supabase
      .from('app_config')
      .select('config_value')
      .eq('config_key', 'jwt_secret')
      .single()
    
    const jwtSecret = config?.config_value
    if (!jwtSecret) {
      return res.status(500).json({ error: 'Brak konfiguracji JWT secret' })
    }
    
    // Weryfikuj token
    let decoded
    try {
      decoded = jwt.verify(token, jwtSecret)
    } catch (error) {
      return res.status(401).json({ error: 'Nieprawidłowy token' })
    }

    // Pobierz dane użytkownika
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, email, name, subscription_type, is_verified, created_at')
      .eq('id', decoded.id)
      .single()

    if (findError || !user) {
      return res.status(404).json({ error: 'Użytkownik nie znaleziony' })
    }

    res.json({
      success: true,
      user
    })

  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ 
      error: 'Błąd serwera',
      details: error.message 
    })
  }
}