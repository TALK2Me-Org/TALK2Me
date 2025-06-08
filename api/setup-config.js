// Setup Config API - Inicjalizacja konfiguracji AI
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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Domyślna konfiguracja z działającymi kluczami
    const defaultConfig = [
      { config_key: 'openai_api_key', config_value: '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' },
      { config_key: 'groq_api_key', config_value: '' },
      { config_key: 'assistant_id', config_value: 'asst_whKO6qzN1Aypy48U1tjnsPv9' },
      { config_key: 'active_model', config_value: 'openai' },
      { config_key: 'openai_model', config_value: 'gpt-4o' },
      { config_key: 'temperature', config_value: '0.7' },
      { config_key: 'max_tokens', config_value: '1000' },
      { config_key: 'admin_password', config_value: 'qwe123' },
      { config_key: 'jwt_secret', config_value: 'talk2me-secret-key-2024' },
      { config_key: 'groq_enabled', config_value: 'false' },
      { config_key: 'claude_enabled', config_value: 'false' },
      { config_key: 'assistant_name', config_value: '' }
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