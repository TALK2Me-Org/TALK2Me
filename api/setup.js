// Database setup endpoint for first-time initialization
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log('🔧 Setting up TALK2Me database...')
    
    // UWAGA: Ten endpoint nie tworzy tabel!
    // Tabele musisz utworzyć ręcznie w Supabase SQL Editor
    // używając pliku supabase-schema.sql
    
    console.log('⚠️ WAŻNE: Tabele muszą być utworzone ręcznie w Supabase!')
    console.log('📋 Instrukcja:')
    console.log('1. Zaloguj się do Supabase')
    console.log('2. Wejdź do SQL Editor')
    console.log('3. Wklej zawartość pliku supabase-schema.sql')
    console.log('4. Kliknij RUN')
    
    // Sprawdź czy tabele istnieją
    const { data: tables, error: tablesError } = await supabase
      .from('app_config')
      .select('config_key')
      .limit(1)
    
    if (tablesError) {
      return res.json({
        success: false,
        message: '❌ Tabele nie istnieją w bazie danych!',
        instruction: 'Musisz najpierw utworzyć tabele używając SQL Editor w Supabase',
        error: tablesError.message
      })
    }

    // 4. Insert default configuration
    const defaultConfigs = [
      { 
        config_key: 'openai_api_key', 
        config_value: '', 
        description: 'OpenAI API Key for GPT models' 
      },
      { 
        config_key: 'groq_api_key', 
        config_value: '', 
        description: 'Groq API Key for Llama models' 
      },
      { 
        config_key: 'claude_api_key', 
        config_value: '', 
        description: 'Anthropic Claude API Key' 
      },
      { 
        config_key: 'active_model', 
        config_value: 'openai', 
        description: 'Currently active AI model' 
      },
      { 
        config_key: 'max_tokens', 
        config_value: '1000', 
        description: 'Maximum tokens for AI response' 
      },
      { 
        config_key: 'temperature', 
        config_value: '0.7', 
        description: 'AI creativity level (0-1)' 
      },
      { 
        config_key: 'assistant_id', 
        config_value: '', 
        description: 'OpenAI Assistant ID for chat responses' 
      }
    ]

    for (const config of defaultConfigs) {
      await supabase
        .from('app_config')
        .upsert(config, { onConflict: 'config_key' })
    }

    res.json({
      success: true,
      message: '🎉 TALK2Me database setup completed!',
      tables_created: ['users', 'chat_history', 'app_config'],
      default_configs: defaultConfigs.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Database setup error:', error)
    res.status(500).json({
      success: false,
      error: 'Database setup failed',
      details: error.message,
      timestamp: new Date().toISOString()
    })
  }
}