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
    
    // 1. Create users table
    const { error: usersError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          subscription_type VARCHAR(50) DEFAULT 'free',
          is_verified BOOLEAN DEFAULT false
        );
      `
    })
    
    // 2. Create chat_history table
    const { error: chatError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS chat_history (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          message TEXT NOT NULL,
          response TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          is_favorite BOOLEAN DEFAULT false
        );
      `
    })
    
    // 3. Create app_config table
    const { error: configError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS app_config (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          config_key VARCHAR(100) UNIQUE NOT NULL,
          config_value TEXT,
          config_type VARCHAR(50) DEFAULT 'string',
          description TEXT,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })

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
        config_key: 'system_prompt', 
        config_value: 'Jesteś Jamie z TALK2Me – wysoce wykwalifikowanym, emocjonalnie inteligentnym agentem konwersacyjnym specjalizującym się w relacjach...', 
        description: 'System prompt for AI responses' 
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