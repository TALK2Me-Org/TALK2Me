// Debug endpoint - sprawdza co jest w bazie
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Sprawdź co jest w app_config
    const { data: config, error: configError } = await supabase
      .from('app_config')
      .select('*')
      .order('config_key')
    
    // Sprawdź liczbę użytkowników
    const { count: userCount, error: userError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
    
    // Sprawdź liczbę chatów
    const { count: chatCount, error: chatError } = await supabase
      .from('chat_history')
      .select('*', { count: 'exact', head: true })

    res.json({
      success: true,
      database: {
        url: supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      },
      app_config: {
        error: configError?.message,
        count: config?.length || 0,
        data: config || []
      },
      users: {
        error: userError?.message,
        count: userCount || 0
      },
      chat_history: {
        error: chatError?.message,
        count: chatCount || 0
      }
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    })
  }
}