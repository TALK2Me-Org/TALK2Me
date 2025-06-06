-- TALK2Me Supabase Schema
-- Uruchom to w Supabase SQL Editor

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

-- 3. Tabela sesji (dla JWT backup)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela konfiguracji (dla admin panelu)
CREATE TABLE IF NOT EXISTS app_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    config_type VARCHAR(50) DEFAULT 'string',
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Wstaw domyślną konfigurację
INSERT INTO app_config (config_key, config_value, config_type, description) VALUES
('openai_api_key', '', 'secret', 'OpenAI API Key'),
('groq_api_key', '', 'secret', 'Groq API Key'),
('claude_api_key', '', 'secret', 'Claude API Key (disabled)'),
('active_model', 'openai', 'string', 'Currently active AI model'),
('system_prompt', 'Jesteś Jamie z TALK2Me – wysoce wykwalifikowanym, emocjonalnie inteligentnym agentem konwersacyjnym specjalizującym się w relacjach...', 'text', 'System prompt for AI'),
('max_tokens', '1000', 'number', 'Maximum tokens for AI response'),
('temperature', '0.7', 'number', 'AI creativity level'),
('claude_enabled', 'false', 'boolean', 'Enable Claude model')
ON CONFLICT (config_key) DO NOTHING;

-- 6. Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- 7. Polityki RLS
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own chat history" ON chat_history
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own sessions" ON sessions
    FOR ALL USING (auth.uid() = user_id);

-- 8. Publiczny dostęp do konfiguracji (dla admin panelu)
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access to config" ON app_config
    FOR SELECT USING (true);

CREATE POLICY "Admin can update config" ON app_config
    FOR UPDATE USING (true);

-- 9. Funkcje pomocnicze
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID)
RETURNS JSON AS $$
BEGIN
    RETURN json_build_object(
        'total_chats', (SELECT COUNT(*) FROM chat_history WHERE user_id = user_uuid),
        'favorite_chats', (SELECT COUNT(*) FROM chat_history WHERE user_id = user_uuid AND is_favorite = true),
        'joined_date', (SELECT created_at FROM users WHERE id = user_uuid)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;