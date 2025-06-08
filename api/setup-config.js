// Setup Config API - Inicjalizacja konfiguracji AI
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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Domyślna konfiguracja
    const defaultConfig = [
      { config_key: 'openai_api_key', config_value: process.env.OPENAI_API_KEY || '' },
      { config_key: 'groq_api_key', config_value: process.env.GROQ_API_KEY || '' },
      { config_key: 'assistant_id', config_value: process.env.ASSISTANT_ID || 'asst_whKO6qzN1Aypy48U1tjnsPv9' },
      { config_key: 'active_model', config_value: 'openai' },
      { config_key: 'temperature', config_value: '0.7' },
      { config_key: 'max_tokens', config_value: '1000' }
    ]

    // Upsert konfiguracji
    for (const item of defaultConfig) {
      const { error } = await supabase
        .from('app_config')
        .upsert({
          ...item,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'config_key'
        })
      
      if (error) {
        console.error(`Error upserting ${item.config_key}:`, error)
      }
    }

    res.json({ 
      success: true, 
      message: 'Konfiguracja została zainicjalizowana',
      config: defaultConfig.map(item => ({
        key: item.config_key,
        hasValue: !!item.config_value
      }))
    })

  } catch (error) {
    console.error('Setup config error:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}