// Automatyczne tworzenie tabel w Supabase
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // SQL do utworzenia wszystkich tabel
    const createTablesSQL = `
    -- 1. Tabela użytkowników
    CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        subscription_type VARCHAR(50) DEFAULT 'free',
        is_verified BOOLEAN DEFAULT false
    );

    -- 2. Tabela historii czatów
    CREATE TABLE IF NOT EXISTS chat_history (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        response TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_favorite BOOLEAN DEFAULT false
    );

    -- 3. Tabela konfiguracji (dla admin panelu)
    CREATE TABLE IF NOT EXISTS app_config (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        config_key VARCHAR(100) UNIQUE NOT NULL,
        config_value TEXT,
        config_type VARCHAR(50) DEFAULT 'string',
        description TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `
    
    // Wykonaj SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: createTablesSQL })
    
    if (error) {
      console.error('Database setup error:', error)
      return res.status(500).json({ error: 'Database setup failed', details: error })
    }

    // Dodaj domyślną konfigurację
    const defaultConfig = [
      { config_key: 'openai_api_key', config_value: '', description: 'OpenAI API Key' },
      { config_key: 'groq_api_key', config_value: '', description: 'Groq API Key' },
      { config_key: 'active_model', config_value: 'openai', description: 'Active AI model' },
      { config_key: 'max_tokens', config_value: '1000', description: 'Max tokens' },
      { config_key: 'temperature', config_value: '0.7', description: 'AI temperature' }
    ]

    for (const config of defaultConfig) {
      await supabase
        .from('app_config')
        .upsert(config, { onConflict: 'config_key' })
    }

    res.json({ 
      success: true, 
      message: 'Database setup completed!',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Setup error:', error)
    res.status(500).json({ error: 'Setup failed', details: error.message })
  }
}