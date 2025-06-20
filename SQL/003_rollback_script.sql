-- TALK2Me Rollback Script
-- Use this if migration fails and you need to revert
-- Date: 2025-01-15

-- =====================================================
-- EMERGENCY ROLLBACK PROCEDURE
-- =====================================================

-- Step 1: Disable new connections
-- Run in Supabase dashboard: Settings > Database > Connection Pooling > Disable

-- Step 2: Kill active connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = current_database() 
  AND pid <> pg_backend_pid();

-- Step 3: Restore tables from backups
BEGIN;

-- Restore users
DROP TABLE IF EXISTS users CASCADE;
ALTER TABLE users_backup RENAME TO users;

-- Restore chat_history
DROP TABLE IF EXISTS chat_history CASCADE;
ALTER TABLE chat_history_backup RENAME TO chat_history;

-- Restore conversations
DROP TABLE IF EXISTS conversations CASCADE;
ALTER TABLE conversations_backup RENAME TO conversations;

-- Restore messages  
DROP TABLE IF EXISTS messages CASCADE;
ALTER TABLE messages_backup RENAME TO messages;

-- Restore memories
DROP TABLE IF EXISTS memories CASCADE;
ALTER TABLE memories_backup RENAME TO memories;

-- Drop new tables
DROP TABLE IF EXISTS memory_patterns CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS rate_limits CASCADE;
DROP TABLE IF EXISTS migration_tracking CASCADE;

COMMIT;

-- Step 4: Recreate original indexes
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS conversations_user_id_idx ON conversations(user_id);
CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS memories_user_id_idx ON memories(user_id);

-- Step 5: Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- Step 6: Verify rollback
SELECT 
    'Rollback completed. Table counts:' as status,
    (SELECT COUNT(*) FROM users) as users,
    (SELECT COUNT(*) FROM chat_history) as chat_history,
    (SELECT COUNT(*) FROM conversations) as conversations,
    (SELECT COUNT(*) FROM messages) as messages,
    (SELECT COUNT(*) FROM memories) as memories;

-- Step 7: Re-enable connections
-- Run in Supabase dashboard: Settings > Database > Connection Pooling > Enable