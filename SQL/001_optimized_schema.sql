-- TALK2Me Optimized Database Schema
-- Version: 2.0
-- Date: 2025-01-15
-- Description: Production-ready schema with improvements

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users table (enhanced)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- renamed for clarity
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true, -- soft delete
    deleted_at TIMESTAMPTZ, -- soft delete timestamp
    
    -- Auth providers
    auth_provider VARCHAR(50) DEFAULT 'email' CHECK (auth_provider IN ('email', 'google', 'apple')),
    google_id VARCHAR(255) UNIQUE,
    apple_id VARCHAR(255) UNIQUE,
    
    -- Subscription
    subscription_type VARCHAR(50) DEFAULT 'free' CHECK (subscription_type IN ('free', 'premium', 'family')),
    subscription_expires_at TIMESTAMPTZ,
    
    -- Metadata
    preferences JSONB DEFAULT '{}', -- user preferences
    metadata JSONB DEFAULT '{}' -- extensible data
);

-- Create indexes for users
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_auth_provider ON users(auth_provider, google_id, apple_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_active ON users(is_active, deleted_at);

-- Sessions table (enhanced)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL, -- hashed for security
    refresh_token_hash VARCHAR(255) UNIQUE,
    device_info JSONB DEFAULT '{}', -- browser, OS, etc
    ip_address INET,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ -- for logout tracking
);

CREATE INDEX idx_sessions_token ON sessions(token_hash) WHERE revoked_at IS NULL;
CREATE INDEX idx_sessions_user ON sessions(user_id, expires_at) WHERE revoked_at IS NULL;
CREATE INDEX idx_sessions_cleanup ON sessions(expires_at) WHERE revoked_at IS NULL;

-- Conversations table (enhanced)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT,
    summary TEXT, -- AI-generated summary
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    message_count INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ, -- soft delete
    
    -- Metadata
    context JSONB DEFAULT '{}', -- permanent context for this conversation
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_conversations_user_active ON conversations(user_id, last_message_at DESC) 
    WHERE deleted_at IS NULL AND is_archived = false;
CREATE INDEX idx_conversations_user_archived ON conversations(user_id, last_message_at DESC) 
    WHERE deleted_at IS NULL AND is_archived = true;
CREATE INDEX idx_conversations_pinned ON conversations(user_id, is_pinned, last_message_at DESC) 
    WHERE deleted_at IS NULL;

-- Messages table (enhanced)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'function')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    edited_at TIMESTAMPTZ, -- track edits
    deleted_at TIMESTAMPTZ, -- soft delete
    
    -- AI metadata
    ai_model VARCHAR(50),
    tokens_used INTEGER,
    generation_time_ms INTEGER,
    
    -- Features
    is_favorite BOOLEAN DEFAULT false,
    is_hidden BOOLEAN DEFAULT false, -- for filtering
    
    -- Function calling
    function_name VARCHAR(100), -- if role = 'function'
    function_args JSONB, -- function arguments
    function_result JSONB, -- function result
    
    -- Metadata
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_favorites ON messages(user_id, is_favorite, created_at DESC) 
    WHERE deleted_at IS NULL AND is_favorite = true;
CREATE INDEX idx_messages_search ON messages USING gin(to_tsvector('english', content)) WHERE deleted_at IS NULL;

-- =====================================================
-- MEMORY SYSTEM TABLES
-- =====================================================

-- Memories table (production-ready)
CREATE TABLE IF NOT EXISTS memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    
    -- Content
    content TEXT NOT NULL, -- original text
    content_encrypted TEXT, -- for future E2E encryption
    summary TEXT NOT NULL, -- AI summary
    
    -- Embeddings
    embedding vector(1536) NOT NULL,
    embedding_model VARCHAR(50) DEFAULT 'text-embedding-ada-002',
    
    -- Classification
    memory_type VARCHAR(50) NOT NULL CHECK (memory_type IN (
        'identity', -- names, relationships
        'preference', -- likes, dislikes
        'experience', -- events, stories
        'emotion', -- feelings, reactions
        'routine', -- habits, schedules
        'goal', -- aspirations, plans
        'boundary' -- limits, triggers
    )),
    importance INTEGER NOT NULL DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
    confidence FLOAT DEFAULT 1.0 CHECK (confidence BETWEEN 0 AND 1),
    
    -- Temporal
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    accessed_at TIMESTAMPTZ DEFAULT NOW(),
    access_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ, -- for temporary memories
    deleted_at TIMESTAMPTZ, -- soft delete
    
    -- Entities and metadata
    entities JSONB DEFAULT '{}', -- extracted entities
    relationships JSONB DEFAULT '[]', -- links to other memories
    metadata JSONB DEFAULT '{}'
);

-- Indexes for memories
CREATE INDEX idx_memories_user ON memories(user_id, memory_type, importance DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_memories_temporal ON memories(user_id, accessed_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_memories_importance ON memories(user_id, importance DESC, confidence DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_memories_type ON memories(memory_type, user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_memories_expires ON memories(expires_at) WHERE deleted_at IS NULL AND expires_at IS NOT NULL;

-- Vector similarity search index (IVFFlat)
CREATE INDEX idx_memories_embedding ON memories 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100)
WHERE deleted_at IS NULL;

-- Memory patterns table (for learning user patterns)
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

-- =====================================================
-- CONFIGURATION & ADMIN TABLES
-- =====================================================

-- App configuration (enhanced)
CREATE TABLE IF NOT EXISTS app_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    config_type VARCHAR(50) DEFAULT 'string' CHECK (config_type IN (
        'string', 'number', 'boolean', 'json', 'secret'
    )),
    is_sensitive BOOLEAN DEFAULT false,
    description TEXT,
    valid_values JSONB, -- for validation
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Audit log table
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

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);

-- Rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier VARCHAR(255) NOT NULL, -- user_id or ip_address
    endpoint VARCHAR(100) NOT NULL,
    count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    blocked_until TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_rate_limits_unique ON rate_limits(identifier, endpoint);
CREATE INDEX idx_rate_limits_cleanup ON rate_limits(window_start);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to all relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_memories_updated_at BEFORE UPDATE ON memories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_memory_patterns_updated_at BEFORE UPDATE ON memory_patterns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_app_config_updated_at BEFORE UPDATE ON app_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update conversation message count and last_message_at
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

CREATE TRIGGER update_conversation_stats_trigger
    AFTER INSERT OR DELETE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_stats();

-- Memory access tracking
CREATE OR REPLACE FUNCTION track_memory_access()
RETURNS TRIGGER AS $$
BEGIN
    NEW.accessed_at = NOW();
    NEW.access_count = OLD.access_count + 1;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Vector similarity search function
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

-- Get user statistics
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

-- =====================================================
-- VIEWS
-- =====================================================

-- Active conversations view
CREATE OR REPLACE VIEW active_conversations AS
SELECT 
    c.*,
    u.name as user_name,
    COUNT(m.id) as unread_count,
    MAX(m.created_at) as last_message_time,
    COALESCE(
        SUBSTRING(
            (SELECT content FROM messages 
             WHERE conversation_id = c.id 
             AND deleted_at IS NULL 
             ORDER BY created_at DESC 
             LIMIT 1), 
            1, 100
        ), 
        'No messages yet'
    ) as last_message_preview
FROM conversations c
JOIN users u ON c.user_id = u.id
LEFT JOIN messages m ON c.id = m.conversation_id AND m.deleted_at IS NULL
WHERE c.deleted_at IS NULL 
    AND c.is_archived = false
    AND u.deleted_at IS NULL
GROUP BY c.id, u.id, u.name;

-- Memory statistics view
CREATE OR REPLACE VIEW memory_statistics AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    COUNT(m.id) as total_memories,
    COUNT(m.id) FILTER (WHERE m.memory_type = 'identity') as identity_memories,
    COUNT(m.id) FILTER (WHERE m.memory_type = 'preference') as preference_memories,
    COUNT(m.id) FILTER (WHERE m.memory_type = 'experience') as experience_memories,
    COUNT(m.id) FILTER (WHERE m.memory_type = 'emotion') as emotion_memories,
    AVG(m.importance) as avg_importance,
    MAX(m.created_at) as last_memory_created,
    SUM(m.access_count) as total_accesses
FROM users u
LEFT JOIN memories m ON u.id = m.user_id AND m.deleted_at IS NULL
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.name;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY users_select_own ON users FOR SELECT USING (id = current_setting('app.user_id')::UUID);
CREATE POLICY users_update_own ON users FOR UPDATE USING (id = current_setting('app.user_id')::UUID);

-- Sessions policies
CREATE POLICY sessions_own ON sessions FOR ALL USING (user_id = current_setting('app.user_id')::UUID);

-- Conversations policies
CREATE POLICY conversations_own ON conversations FOR ALL USING (user_id = current_setting('app.user_id')::UUID);

-- Messages policies
CREATE POLICY messages_own ON messages FOR ALL USING (user_id = current_setting('app.user_id')::UUID);

-- Memories policies
CREATE POLICY memories_own ON memories FOR ALL USING (user_id = current_setting('app.user_id')::UUID);

-- Memory patterns policies
CREATE POLICY memory_patterns_own ON memory_patterns FOR ALL USING (user_id = current_setting('app.user_id')::UUID);

-- Audit logs policies (read only for users)
CREATE POLICY audit_logs_read_own ON audit_logs FOR SELECT USING (user_id = current_setting('app.user_id')::UUID);

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default configuration
INSERT INTO app_config (config_key, config_value, config_type, is_sensitive, description) VALUES
    ('openai_api_key', '', 'secret', true, 'OpenAI API key for chat completions'),
    ('groq_api_key', '', 'secret', true, 'Groq API key for fallback chat'),
    ('jwt_secret', '', 'secret', true, 'Secret for JWT token signing'),
    ('admin_password', '', 'secret', true, 'Admin panel password'),
    ('active_model', 'openai', 'string', false, 'Active AI model provider'),
    ('temperature', '0.7', 'number', false, 'AI response temperature'),
    ('max_tokens', '2000', 'number', false, 'Maximum tokens per response'),
    ('memory_importance_threshold', '5', 'number', false, 'Minimum importance to save memory'),
    ('memory_max_per_conversation', '50', 'number', false, 'Max memories per conversation'),
    ('rate_limit_chat', '100', 'number', false, 'Chat requests per hour'),
    ('rate_limit_memory', '50', 'number', false, 'Memory saves per hour'),
    ('session_duration_days', '7', 'number', false, 'Session duration in days')
ON CONFLICT (config_key) DO NOTHING;

-- =====================================================
-- MIGRATION HELPERS
-- =====================================================

-- Migration from chat_history to conversations/messages
CREATE OR REPLACE FUNCTION migrate_chat_history()
RETURNS void AS $$
DECLARE
    history_record RECORD;
    conv_id UUID;
BEGIN
    FOR history_record IN 
        SELECT DISTINCT user_id, DATE(created_at) as chat_date 
        FROM chat_history 
        WHERE NOT EXISTS (
            SELECT 1 FROM migration_tracking WHERE chat_history_id = chat_history.id
        )
        ORDER BY user_id, chat_date
    LOOP
        -- Create conversation for each day
        INSERT INTO conversations (user_id, title, created_at)
        VALUES (
            history_record.user_id, 
            'Imported from ' || history_record.chat_date::TEXT,
            history_record.chat_date
        )
        RETURNING id INTO conv_id;
        
        -- Insert messages
        INSERT INTO messages (conversation_id, user_id, role, content, created_at, ai_model)
        SELECT 
            conv_id,
            ch.user_id,
            'user',
            ch.message,
            ch.created_at,
            ch.ai_model
        FROM chat_history ch
        WHERE ch.user_id = history_record.user_id 
            AND DATE(ch.created_at) = history_record.chat_date;
            
        INSERT INTO messages (conversation_id, user_id, role, content, created_at, ai_model, is_favorite)
        SELECT 
            conv_id,
            ch.user_id,
            'assistant',
            ch.response,
            ch.created_at + INTERVAL '1 second',
            ch.ai_model,
            ch.is_favorite
        FROM chat_history ch
        WHERE ch.user_id = history_record.user_id 
            AND DATE(ch.created_at) = history_record.chat_date;
            
        -- Track migration
        INSERT INTO migration_tracking (chat_history_id)
        SELECT id FROM chat_history ch
        WHERE ch.user_id = history_record.user_id 
            AND DATE(ch.created_at) = history_record.chat_date;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM sessions WHERE expires_at < NOW() AND revoked_at IS NULL;
    DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PERMISSIONS GRANTS (for app user)
-- =====================================================

-- Grant necessary permissions to the app user
-- Replace 'app_user' with your actual application database user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_user;