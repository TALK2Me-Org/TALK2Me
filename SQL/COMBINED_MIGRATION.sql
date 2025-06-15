-- TALK2Me Combined Migration Script
-- Generated: 2025-01-15
-- 
-- INSTRUKCJA:
-- 1. Wykonaj w Supabase SQL Editor: https://app.supabase.com/project/hpxzhbubvdgxdvwxmhzo/sql
-- 2. Najpierw wykonaj CZĘŚĆ 1 (Backup)
-- 3. Sprawdź wyniki backupu
-- 4. Następnie wykonaj CZĘŚĆ 2 (Migracja)
-- 5. Na końcu wykonaj CZĘŚĆ 3 (Weryfikacja)
--
-- =====================================================
-- CZĘŚĆ 1: BACKUP (Wykonaj to najpierw!)
-- =====================================================

-- Tworzenie schematu backupu
CREATE SCHEMA IF NOT EXISTS backup_20250115;

-- Backup wszystkich krytycznych tabel
CREATE TABLE backup_20250115.users AS 
SELECT * FROM public.users;

CREATE TABLE backup_20250115.chat_history AS 
SELECT * FROM public.chat_history;

CREATE TABLE backup_20250115.conversations AS 
SELECT * FROM public.conversations;

CREATE TABLE backup_20250115.messages AS 
SELECT * FROM public.messages;

CREATE TABLE backup_20250115.memories AS 
SELECT * FROM public.memories;

CREATE TABLE backup_20250115.sessions AS 
SELECT * FROM public.sessions;

CREATE TABLE backup_20250115.app_config AS 
SELECT * FROM public.app_config;

-- Weryfikacja backupów
SELECT 
    'Backup completed!' as status,
    (SELECT COUNT(*) FROM backup_20250115.users) as users_backed_up,
    (SELECT COUNT(*) FROM backup_20250115.chat_history) as chat_history_backed_up,
    (SELECT COUNT(*) FROM backup_20250115.conversations) as conversations_backed_up,
    (SELECT COUNT(*) FROM backup_20250115.messages) as messages_backed_up,
    (SELECT COUNT(*) FROM backup_20250115.memories) as memories_backed_up,
    (SELECT COUNT(*) FROM backup_20250115.sessions) as sessions_backed_up,
    (SELECT COUNT(*) FROM backup_20250115.app_config) as config_backed_up;

-- =====================================================
-- CZĘŚĆ 2: MIGRACJA (Wykonaj po sprawdzeniu backupu)
-- =====================================================

-- Włącz rozszerzenia
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- KROK 1: Dodaj nowe kolumny do istniejących tabel

-- App config table (najpierw, bo jest używana później)
ALTER TABLE app_config
ADD COLUMN IF NOT EXISTS is_sensitive BOOLEAN DEFAULT false;

-- Users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

UPDATE users SET password_hash = password WHERE password_hash IS NULL;

-- Sessions table
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS token_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS refresh_token_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS device_info JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

UPDATE sessions SET token_hash = token WHERE token_hash IS NULL;

-- Conversations table
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS context JSONB DEFAULT '{}';

-- Update message counts
UPDATE conversations c
SET message_count = (
    SELECT COUNT(*) 
    FROM messages m 
    WHERE m.conversation_id = c.id
);

-- Messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tokens_used INTEGER,
ADD COLUMN IF NOT EXISTS generation_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS function_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS function_args JSONB,
ADD COLUMN IF NOT EXISTS function_result JSONB;

-- Memories table
ALTER TABLE memories
ADD COLUMN IF NOT EXISTS message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS content_encrypted TEXT,
ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(50) DEFAULT 'text-embedding-ada-002',
ADD COLUMN IF NOT EXISTS confidence FLOAT DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS accessed_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS access_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS relationships JSONB DEFAULT '[]';

-- Add constraints
ALTER TABLE memories
DROP CONSTRAINT IF EXISTS check_importance;
ALTER TABLE memories
ADD CONSTRAINT check_importance CHECK (importance BETWEEN 1 AND 10);

ALTER TABLE memories
DROP CONSTRAINT IF EXISTS check_confidence;
ALTER TABLE memories
ADD CONSTRAINT check_confidence CHECK (confidence BETWEEN 0 AND 1);

-- Update memory types
UPDATE memories 
SET memory_type = CASE 
    WHEN memory_type = 'personal' THEN 'identity'
    WHEN memory_type = 'relationship' THEN 'experience'
    ELSE memory_type
END
WHERE memory_type IN ('personal', 'relationship');

-- KROK 2: Utwórz nowe tabele

-- Memory patterns table
CREATE TABLE IF NOT EXISTS memory_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pattern_type VARCHAR(50) NOT NULL CHECK (pattern_type IN (
        'communication_style',
        'emotional_triggers', 
        'conflict_patterns',
        'love_language',
        'stress_response'
    )),
    pattern_data JSONB NOT NULL,
    confidence FLOAT DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
    occurrence_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, pattern_type)
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate limits table
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier VARCHAR(255) NOT NULL,
    endpoint VARCHAR(100) NOT NULL,
    count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    blocked_until TIMESTAMPTZ
);

-- Migration tracking table
CREATE TABLE IF NOT EXISTS migration_tracking (
    chat_history_id UUID PRIMARY KEY,
    message_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- KROK 3: Utwórz indeksy

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider, google_id, apple_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active, deleted_at);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, expires_at) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_cleanup ON sessions(expires_at) WHERE revoked_at IS NULL;

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user_active ON conversations(user_id, last_message_at DESC) 
    WHERE deleted_at IS NULL AND is_archived = false;
CREATE INDEX IF NOT EXISTS idx_conversations_user_archived ON conversations(user_id, last_message_at DESC) 
    WHERE deleted_at IS NULL AND is_archived = true;
CREATE INDEX IF NOT EXISTS idx_conversations_pinned ON conversations(user_id, is_pinned, last_message_at DESC) 
    WHERE deleted_at IS NULL;

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_favorites ON messages(user_id, is_favorite, created_at DESC) 
    WHERE deleted_at IS NULL AND is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_messages_search ON messages USING gin(to_tsvector('english', content)) WHERE deleted_at IS NULL;

-- Memories indexes
CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id, memory_type, importance DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_memories_temporal ON memories(user_id, accessed_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(user_id, importance DESC, confidence DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(memory_type, user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_memories_expires ON memories(expires_at) WHERE deleted_at IS NULL AND expires_at IS NOT NULL;

-- Other indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_unique ON rate_limits(identifier, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup ON rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);

-- KROK 4: Utwórz vector index
DROP INDEX IF EXISTS memories_embedding_idx;
CREATE INDEX IF NOT EXISTS idx_memories_embedding ON memories 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100)
WHERE deleted_at IS NULL;

-- KROK 5: Utwórz funkcje

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_memories_updated_at ON memories;
CREATE TRIGGER update_memories_updated_at BEFORE UPDATE ON memories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_memory_patterns_updated_at ON memory_patterns;
CREATE TRIGGER update_memory_patterns_updated_at BEFORE UPDATE ON memory_patterns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_app_config_updated_at ON app_config;
CREATE TRIGGER update_app_config_updated_at BEFORE UPDATE ON app_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Conversation stats trigger
CREATE OR REPLACE FUNCTION update_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE conversations 
        SET message_count = message_count + 1,
            last_message_at = NEW.created_at
        WHERE id = NEW.conversation_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE conversations 
        SET message_count = message_count - 1
        WHERE id = OLD.conversation_id;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_conversation_stats_trigger ON messages;
CREATE TRIGGER update_conversation_stats_trigger
    AFTER INSERT OR DELETE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_stats();

-- Search memories function
CREATE OR REPLACE FUNCTION search_memories(
    query_embedding vector(1536),
    query_user_id UUID,
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    summary TEXT,
    memory_type VARCHAR,
    importance INT,
    similarity FLOAT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.content,
        m.summary,
        m.memory_type,
        m.importance,
        1 - (m.embedding <=> query_embedding) AS similarity,
        m.created_at
    FROM memories m
    WHERE m.user_id = query_user_id
        AND m.deleted_at IS NULL
        AND 1 - (m.embedding <=> query_embedding) > match_threshold
    ORDER BY 
        m.importance DESC,
        similarity DESC,
        m.accessed_at DESC
    LIMIT match_count;
END;
$$ language 'plpgsql';

-- Get user stats function
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    stats JSON;
BEGIN
    SELECT json_build_object(
        'total_conversations', COUNT(DISTINCT c.id),
        'total_messages', COUNT(DISTINCT m.id),
        'total_memories', COUNT(DISTINCT mem.id),
        'favorite_messages', COUNT(DISTINCT m.id) FILTER (WHERE m.is_favorite = true),
        'active_conversations', COUNT(DISTINCT c.id) FILTER (WHERE c.is_archived = false),
        'last_activity', MAX(m.created_at)
    ) INTO stats
    FROM users u
    LEFT JOIN conversations c ON u.id = c.user_id AND c.deleted_at IS NULL
    LEFT JOIN messages m ON c.id = m.conversation_id AND m.deleted_at IS NULL
    LEFT JOIN memories mem ON u.id = mem.user_id AND mem.deleted_at IS NULL
    WHERE u.id = user_uuid
    GROUP BY u.id;
    
    RETURN stats;
END;
$$ language 'plpgsql';

-- Migration function
CREATE OR REPLACE FUNCTION migrate_chat_history()
RETURNS void AS $$
DECLARE
    history_record RECORD;
    conv_id UUID;
    msg_id UUID;
BEGIN
    FOR history_record IN 
        SELECT DISTINCT ch.user_id, DATE(ch.created_at) as chat_date 
        FROM chat_history ch
        WHERE NOT EXISTS (
            SELECT 1 FROM migration_tracking mt WHERE mt.chat_history_id = ch.id
        )
        ORDER BY ch.user_id, chat_date
    LOOP
        -- Create conversation for each day
        INSERT INTO conversations (user_id, title, created_at)
        VALUES (
            history_record.user_id, 
            'Imported from ' || history_record.chat_date::TEXT,
            history_record.chat_date
        )
        RETURNING id INTO conv_id;
        
        -- Insert user messages and assistant responses
        FOR history_record IN
            SELECT * FROM chat_history ch
            WHERE ch.user_id = history_record.user_id 
                AND DATE(ch.created_at) = history_record.chat_date
            ORDER BY ch.created_at
        LOOP
            -- Insert user message
            INSERT INTO messages (conversation_id, user_id, role, content, created_at, ai_model)
            VALUES (
                conv_id,
                history_record.user_id,
                'user',
                history_record.message,
                history_record.created_at,
                history_record.ai_model
            )
            RETURNING id INTO msg_id;
            
            -- Insert assistant response
            INSERT INTO messages (conversation_id, user_id, role, content, created_at, ai_model, is_favorite)
            VALUES (
                conv_id,
                history_record.user_id,
                'assistant',
                history_record.response,
                history_record.created_at + INTERVAL '1 second',
                history_record.ai_model,
                history_record.is_favorite
            );
            
            -- Track migration
            INSERT INTO migration_tracking (chat_history_id, message_id)
            VALUES (history_record.id, msg_id);
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- KROK 6: Włącz RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- KROK 7: Zaktualizuj konfigurację
INSERT INTO app_config (config_key, config_value, config_type, is_sensitive, description) VALUES
    ('memory_importance_threshold', '5', 'number', false, 'Minimum importance to save memory'),
    ('memory_max_per_conversation', '50', 'number', false, 'Max memories per conversation'),
    ('rate_limit_chat', '100', 'number', false, 'Chat requests per hour'),
    ('rate_limit_memory', '50', 'number', false, 'Memory saves per hour'),
    ('session_duration_days', '7', 'number', false, 'Session duration in days'),
    ('schema_version', '2.0', 'string', false, 'Database schema version')
ON CONFLICT (config_key) DO UPDATE
SET config_value = EXCLUDED.config_value,
    updated_at = NOW();

UPDATE app_config 
SET is_sensitive = true 
WHERE config_key IN ('openai_api_key', 'groq_api_key', 'jwt_secret', 'admin_password');

-- KROK 8: Migruj dane z chat_history
SELECT migrate_chat_history();

-- KROK 9: Analizuj tabele
ANALYZE users;
ANALYZE sessions;
ANALYZE conversations;
ANALYZE messages;
ANALYZE memories;

-- =====================================================
-- CZĘŚĆ 3: WERYFIKACJA (Wykonaj na końcu)
-- =====================================================

-- Sprawdź status migracji
SELECT 
    'Migration Status' as report,
    '================' as separator;

SELECT 
    'Users' as table_name, 
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_count
FROM users
UNION ALL
SELECT 
    'Conversations', 
    COUNT(*),
    COUNT(*) FILTER (WHERE deleted_at IS NULL)
FROM conversations
UNION ALL
SELECT 
    'Messages', 
    COUNT(*),
    COUNT(*) FILTER (WHERE deleted_at IS NULL)
FROM messages
UNION ALL
SELECT 
    'Memories', 
    COUNT(*),
    COUNT(*) FILTER (WHERE deleted_at IS NULL)
FROM memories
UNION ALL
SELECT 
    'Chat History (legacy)', 
    COUNT(*),
    COUNT(*)
FROM chat_history
UNION ALL
SELECT 
    'Migrated from chat_history', 
    COUNT(DISTINCT chat_history_id),
    COUNT(DISTINCT chat_history_id)
FROM migration_tracking;

-- Sprawdź nowe tabele
SELECT 
    'New Tables Status' as report,
    '================' as separator;

SELECT 
    'memory_patterns' as table_name,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'memory_patterns') as exists,
    (SELECT COUNT(*) FROM memory_patterns) as count
UNION ALL
SELECT 
    'audit_logs',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs'),
    (SELECT COUNT(*) FROM audit_logs)
UNION ALL
SELECT 
    'rate_limits',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rate_limits'),
    (SELECT COUNT(*) FROM rate_limits);

-- Sprawdź indeksy
SELECT 
    'Indexes Status' as report,
    '================' as separator;

SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('users', 'conversations', 'messages', 'memories')
ORDER BY tablename, indexname;

-- Sprawdź wersję schematu
SELECT 
    'Schema Version' as info,
    config_value as version
FROM app_config
WHERE config_key = 'schema_version';

-- =====================================================
-- GRATULACJE! Migracja zakończona.
-- 
-- Następne kroki:
-- 1. Sprawdź wyniki weryfikacji powyżej
-- 2. Przetestuj aplikację
-- 3. Monitoruj logi przez pierwsze 24h
-- =====================================================