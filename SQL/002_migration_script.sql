-- TALK2Me Migration Script
-- From: Current schema
-- To: Optimized schema v2.0
-- Date: 2025-01-15

-- =====================================================
-- STEP 1: BACKUP CRITICAL DATA
-- =====================================================
-- Run these commands in Supabase SQL Editor to create backups:
/*
CREATE TABLE users_backup AS SELECT * FROM users;
CREATE TABLE chat_history_backup AS SELECT * FROM chat_history;
CREATE TABLE conversations_backup AS SELECT * FROM conversations;
CREATE TABLE messages_backup AS SELECT * FROM messages;
CREATE TABLE memories_backup AS SELECT * FROM memories;
*/

-- =====================================================
-- STEP 2: ADD NEW COLUMNS TO EXISTING TABLES
-- =====================================================

-- Users table enhancements
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Migrate password to password_hash
UPDATE users SET password_hash = password WHERE password_hash IS NULL;
-- Later: ALTER TABLE users DROP COLUMN password;

-- Sessions table enhancements
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS token_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS refresh_token_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS device_info JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

-- Migrate token to token_hash
UPDATE sessions SET token_hash = token WHERE token_hash IS NULL;
-- Later: ALTER TABLE sessions DROP COLUMN token;

-- Conversations table enhancements
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

-- Messages table enhancements
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tokens_used INTEGER,
ADD COLUMN IF NOT EXISTS generation_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS function_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS function_args JSONB,
ADD COLUMN IF NOT EXISTS function_result JSONB;

-- Memories table enhancements
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

-- Add check constraints
ALTER TABLE memories
ADD CONSTRAINT check_importance CHECK (importance BETWEEN 1 AND 10),
ADD CONSTRAINT check_confidence CHECK (confidence BETWEEN 0 AND 1);

-- Update memory types to new categories
UPDATE memories 
SET memory_type = CASE 
    WHEN memory_type = 'personal' THEN 'identity'
    WHEN memory_type = 'relationship' THEN 'experience'
    ELSE memory_type
END
WHERE memory_type IN ('personal', 'relationship');

-- =====================================================
-- STEP 3: CREATE NEW TABLES
-- =====================================================

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

-- =====================================================
-- STEP 4: CREATE NEW INDEXES
-- =====================================================

-- Drop old indexes if they exist
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_sessions_token;
DROP INDEX IF EXISTS idx_conversations_user_active;
DROP INDEX IF EXISTS idx_messages_conversation;
DROP INDEX IF EXISTS idx_memories_user;

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider, google_id, apple_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active, deleted_at);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, expires_at) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_cleanup ON sessions(expires_at) WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_user_active ON conversations(user_id, last_message_at DESC) 
    WHERE deleted_at IS NULL AND is_archived = false;
CREATE INDEX IF NOT EXISTS idx_conversations_user_archived ON conversations(user_id, last_message_at DESC) 
    WHERE deleted_at IS NULL AND is_archived = true;
CREATE INDEX IF NOT EXISTS idx_conversations_pinned ON conversations(user_id, is_pinned, last_message_at DESC) 
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_favorites ON messages(user_id, is_favorite, created_at DESC) 
    WHERE deleted_at IS NULL AND is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_messages_search ON messages USING gin(to_tsvector('english', content)) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id, memory_type, importance DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_memories_temporal ON memories(user_id, accessed_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(user_id, importance DESC, confidence DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(memory_type, user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_memories_expires ON memories(expires_at) WHERE deleted_at IS NULL AND expires_at IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_unique ON rate_limits(identifier, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup ON rate_limits(window_start);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);

-- =====================================================
-- STEP 5: RECREATE VECTOR INDEX
-- =====================================================

-- Drop old vector index if exists
DROP INDEX IF EXISTS memories_embedding_idx;

-- Create new IVFFlat index (more efficient for large datasets)
CREATE INDEX IF NOT EXISTS idx_memories_embedding ON memories 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100)
WHERE deleted_at IS NULL;

-- =====================================================
-- STEP 6: UPDATE FUNCTIONS
-- =====================================================

-- Drop old functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_conversation_stats() CASCADE;
DROP FUNCTION IF EXISTS search_memories(vector(1536), uuid, float, int);

-- Recreate with new signatures (copy from 001_optimized_schema.sql)
-- [Functions are already in the optimized schema file]

-- =====================================================
-- STEP 7: MIGRATE CHAT HISTORY TO CONVERSATIONS
-- =====================================================

-- Create migration tracking if not exists
CREATE TABLE IF NOT EXISTS migration_tracking (
    chat_history_id UUID PRIMARY KEY,
    message_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Run migration function
-- This is safe to run multiple times - it only migrates unmigrated records
SELECT migrate_chat_history();

-- =====================================================
-- STEP 8: UPDATE APP CONFIG
-- =====================================================

-- Add new configuration values
INSERT INTO app_config (config_key, config_value, config_type, is_sensitive, description) VALUES
    ('memory_importance_threshold', '5', 'number', false, 'Minimum importance to save memory'),
    ('memory_max_per_conversation', '50', 'number', false, 'Max memories per conversation'),
    ('rate_limit_chat', '100', 'number', false, 'Chat requests per hour'),
    ('rate_limit_memory', '50', 'number', false, 'Memory saves per hour'),
    ('session_duration_days', '7', 'number', false, 'Session duration in days')
ON CONFLICT (config_key) DO NOTHING;

-- Update existing config to mark as sensitive
UPDATE app_config 
SET is_sensitive = true 
WHERE config_key IN ('openai_api_key', 'groq_api_key', 'jwt_secret', 'admin_password');

-- =====================================================
-- STEP 9: ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE memory_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policies (copy from 001_optimized_schema.sql)
-- [Policies are already in the optimized schema file]

-- =====================================================
-- STEP 10: FINAL CLEANUP
-- =====================================================

-- Analyze tables for query planner
ANALYZE users;
ANALYZE sessions;
ANALYZE conversations;
ANALYZE messages;
ANALYZE memories;

-- Create scheduled job for cleanup (if pg_cron is available)
-- SELECT cron.schedule('cleanup-sessions', '0 * * * *', 'SELECT cleanup_expired_sessions();');

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check migration status
SELECT 
    'Users' as table_name, COUNT(*) as count FROM users
UNION ALL SELECT 
    'Conversations', COUNT(*) FROM conversations
UNION ALL SELECT 
    'Messages', COUNT(*) FROM messages
UNION ALL SELECT 
    'Memories', COUNT(*) FROM memories
UNION ALL SELECT 
    'Migrated from chat_history', COUNT(DISTINCT chat_history_id) FROM migration_tracking;

-- Check for any errors
SELECT 
    c.relname AS table_name,
    a.attname AS column_name,
    pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type
FROM pg_catalog.pg_attribute a
JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
WHERE c.relname IN ('users', 'sessions', 'conversations', 'messages', 'memories')
    AND a.attnum > 0
    AND NOT a.attisdropped
ORDER BY c.relname, a.attnum;

-- =====================================================
-- ROLLBACK PLAN (IF NEEDED)
-- =====================================================
/*
-- To rollback:
1. Restore from backups:
   DROP TABLE users CASCADE;
   ALTER TABLE users_backup RENAME TO users;
   
2. Or use pg_dump backup:
   psql -U postgres -d your_database < backup_before_migration.sql
*/