// Assistant Info API - pobiera informacje o OpenAI Assistant
import OpenAI from 'openai'
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
    
    // Pobierz konfigurację
    const { data: config } = await supabase
      .from('app_config')
      .select('config_key, config_value')
      .in('config_key', ['openai_api_key', 'assistant_id', 'assistant_name'])
    
    const configMap = {}
    config?.forEach(item => {
      configMap[item.config_key] = item.config_value
    })
    
    // Sprawdź czy mamy cache nazwy asystenta
    if (configMap.assistant_name) {
      return res.json({
        success: true,
        assistant: {
          id: configMap.assistant_id,
          name: configMap.assistant_name,
          cached: true
        }
      })
    }
    
    // Jeśli nie ma cache, pobierz z OpenAI
    const openaiKey = configMap.openai_api_key
    const assistantId = configMap.assistant_id
    
    if (!openaiKey || !assistantId) {
      return res.json({
        success: false,
        error: 'Brak konfiguracji OpenAI'
      })
    }
    
    try {
      const openai = new OpenAI({ apiKey: openaiKey })
      const assistant = await openai.beta.assistants.retrieve(assistantId)
      
      // Zapisz nazwę do cache
      await supabase
        .from('app_config')
        .upsert({
          config_key: 'assistant_name',
          config_value: assistant.name || 'Unnamed Assistant',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'config_key'
        })
      
      return res.json({
        success: true,
        assistant: {
          id: assistant.id,
          name: assistant.name || 'Unnamed Assistant',
          description: assistant.description,
          model: assistant.model,
          created_at: new Date(assistant.created_at * 1000).toISOString()
        }
      })
      
    } catch (error) {
      console.error('OpenAI API error:', error)
      return res.json({
        success: false,
        error: 'Nie udało się pobrać informacji o asystencie',
        details: error.message
      })
    }
    
  } catch (error) {
    console.error('Assistant info error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    })
  }
}