-- TALK2Me Supabase Schema - KOMPLETNA KONFIGURACJA
-- 
-- INSTRUKCJA:
-- 1. Zaloguj się do Supabase (https://app.supabase.com)
-- 2. Wybierz swój projekt
-- 3. Kliknij "SQL Editor" w menu po lewej
-- 4. Wklej CAŁĄ zawartość tego pliku
-- 5. Kliknij "RUN" (zielony przycisk)
-- 

-- KROK 1: Usuń stare tabele (jeśli istnieją)
DROP TABLE IF EXISTS app_config CASCADE;
DROP TABLE IF EXISTS chat_history CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- KROK 2: Utwórz tabele

-- Tabela użytkowników
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    subscription_type VARCHAR(50) DEFAULT 'free',
    is_verified BOOLEAN DEFAULT false,
    auth_provider VARCHAR(50) DEFAULT 'email',
    google_id VARCHAR(255) UNIQUE,
    apple_id VARCHAR(255) UNIQUE,
    avatar_url TEXT,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Tabela historii czatów
CREATE TABLE chat_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    ai_model VARCHAR(50) DEFAULT 'openai',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_favorite BOOLEAN DEFAULT false
);

-- Tabela sesji
CREATE TABLE sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela konfiguracji aplikacji
CREATE TABLE app_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    config_type VARCHAR(50) DEFAULT 'string',
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- KROK 3: Wstaw KOMPLETNĄ konfigurację z działającymi kluczami
INSERT INTO app_config (config_key, config_value, config_type, description) VALUES
-- API Keys (z działającymi wartościami!)
('openai_api_key', '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', 'secret', 'OpenAI API Key'),
('groq_api_key', '', 'secret', 'Groq API Key for fallback'),
('claude_api_key', '', 'secret', 'Claude API Key (currently disabled)'),

-- Assistant Configuration
('assistant_id', 'asst_whKO6qzN1Aypy48U1tjnsPv9', 'string', 'OpenAI Assistant ID'),
('assistant_name', '', 'string', 'Cached assistant name'),

-- Model Settings
('active_model', 'openai', 'string', 'Currently active AI model'),
('openai_model', 'gpt-4o', 'string', 'Specific OpenAI model to use'),
('groq_enabled', 'false', 'boolean', 'Enable Groq as fallback'),
('claude_enabled', 'false', 'boolean', 'Enable Claude model'),

-- AI Parameters
('max_tokens', '1000', 'number', 'Maximum tokens for AI response'),
('temperature', '0.7', 'number', 'AI creativity level (0-1)'),

-- Security Settings
('admin_password', 'qwe123', 'secret', 'Admin panel password'),
('jwt_secret', 'talk2me-secret-key-2024', 'secret', 'JWT signing secret')
ON CONFLICT (config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value,
    updated_at = NOW();

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