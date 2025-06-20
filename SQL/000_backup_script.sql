-- TALK2Me Backup Script
-- Execute this FIRST before running migration
-- Date: 2025-01-15

-- =====================================================
-- CRITICAL: RUN THIS IN SUPABASE SQL EDITOR
-- =====================================================

-- Step 1: Create backup schema
CREATE SCHEMA IF NOT EXISTS backup_20250115;

-- Step 2: Backup all critical tables
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

-- Step 3: Verify backups
SELECT 
    'Backup completed!' as status,
    (SELECT COUNT(*) FROM backup_20250115.users) as users_backed_up,
    (SELECT COUNT(*) FROM backup_20250115.chat_history) as chat_history_backed_up,
    (SELECT COUNT(*) FROM backup_20250115.conversations) as conversations_backed_up,
    (SELECT COUNT(*) FROM backup_20250115.messages) as messages_backed_up,
    (SELECT COUNT(*) FROM backup_20250115.memories) as memories_backed_up,
    (SELECT COUNT(*) FROM backup_20250115.sessions) as sessions_backed_up,
    (SELECT COUNT(*) FROM backup_20250115.app_config) as config_backed_up;

-- Step 4: Grant permissions (if needed)
GRANT USAGE ON SCHEMA backup_20250115 TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA backup_20250115 TO postgres;

-- =====================================================
-- TO RESTORE FROM BACKUP (if needed):
-- =====================================================
/*
-- Drop current tables and restore from backup
DROP TABLE IF EXISTS public.users CASCADE;
CREATE TABLE public.users AS SELECT * FROM backup_20250115.users;

DROP TABLE IF EXISTS public.chat_history CASCADE;
CREATE TABLE public.chat_history AS SELECT * FROM backup_20250115.chat_history;

-- Repeat for other tables...
*/

-- =====================================================
-- BACKUP VERIFICATION QUERIES
-- =====================================================

-- Check if all backups are identical to originals
SELECT 'users' as table_name,
    (SELECT COUNT(*) FROM public.users) as original_count,
    (SELECT COUNT(*) FROM backup_20250115.users) as backup_count,
    CASE 
        WHEN (SELECT COUNT(*) FROM public.users) = (SELECT COUNT(*) FROM backup_20250115.users) 
        THEN '✅ Match' 
        ELSE '❌ Mismatch' 
    END as status
UNION ALL
SELECT 'chat_history',
    (SELECT COUNT(*) FROM public.chat_history),
    (SELECT COUNT(*) FROM backup_20250115.chat_history),
    CASE 
        WHEN (SELECT COUNT(*) FROM public.chat_history) = (SELECT COUNT(*) FROM backup_20250115.chat_history) 
        THEN '✅ Match' 
        ELSE '❌ Mismatch' 
    END
UNION ALL
SELECT 'conversations',
    (SELECT COUNT(*) FROM public.conversations),
    (SELECT COUNT(*) FROM backup_20250115.conversations),
    CASE 
        WHEN (SELECT COUNT(*) FROM public.conversations) = (SELECT COUNT(*) FROM backup_20250115.conversations) 
        THEN '✅ Match' 
        ELSE '❌ Mismatch' 
    END
UNION ALL
SELECT 'messages',
    (SELECT COUNT(*) FROM public.messages),
    (SELECT COUNT(*) FROM backup_20250115.messages),
    CASE 
        WHEN (SELECT COUNT(*) FROM public.messages) = (SELECT COUNT(*) FROM backup_20250115.messages) 
        THEN '✅ Match' 
        ELSE '❌ Mismatch' 
    END
UNION ALL
SELECT 'memories',
    (SELECT COUNT(*) FROM public.memories),
    (SELECT COUNT(*) FROM backup_20250115.memories),
    CASE 
        WHEN (SELECT COUNT(*) FROM public.memories) = (SELECT COUNT(*) FROM backup_20250115.memories) 
        THEN '✅ Match' 
        ELSE '❌ Mismatch' 
    END;