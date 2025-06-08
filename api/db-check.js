// Database Check v2 - sprawdza status bazy danych
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cfnrhwgaevbltaflrvpz.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmbnJod2dhZXZibHRhZmxydnB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzUxMDU3MywiZXhwIjoyMDQ5MDg2NTczfQ.qUcT_KJZLp4TlJC0gTMpBwT7T1Bkx_5Qh5h4Vt2VsN0'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const results = {
      supabase_url: supabaseUrl,
      tables: {},
      errors: []
    }

    // Sprawdź tabelę users
    try {
      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
      
      if (!error) {
        results.tables.users = { exists: true, count }
      } else {
        results.tables.users = { exists: false, error: error.message }
      }
    } catch (e) {
      results.errors.push(`Users table: ${e.message}`)
    }

    // Sprawdź tabelę chat_history
    try {
      const { count, error } = await supabase
        .from('chat_history')
        .select('*', { count: 'exact', head: true })
      
      if (!error) {
        results.tables.chat_history = { exists: true, count }
      } else {
        results.tables.chat_history = { exists: false, error: error.message }
      }
    } catch (e) {
      results.errors.push(`Chat history table: ${e.message}`)
    }

    // Sprawdź tabelę app_config
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('*')
      
      if (!error) {
        results.tables.app_config = { 
          exists: true, 
          count: data?.length || 0,
          configs: data?.map(item => item.config_key) || []
        }
      } else {
        results.tables.app_config = { exists: false, error: error.message }
      }
    } catch (e) {
      results.errors.push(`App config table: ${e.message}`)
    }

    // Podsumowanie
    const allTablesExist = results.tables.users?.exists && 
                          results.tables.chat_history?.exists && 
                          results.tables.app_config?.exists

    res.json({
      success: allTablesExist,
      message: allTablesExist ? '✅ Wszystkie tabele istnieją' : '❌ Brakuje niektórych tabel',
      ...results,
      recommendation: !allTablesExist ? 'Uruchom SQL schema w Supabase SQL Editor' : null
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Database check failed',
      details: error.message
    })
  }
}