-- Create Test User for Memory System Testing
-- 
-- Run this in Supabase SQL Editor if the test endpoint cannot create user automatically
-- Test endpoint: https://talk2me.up.railway.app/api/test-memory

-- Test user with standard UUID format
INSERT INTO users (
    id,
    email,
    password,
    name,
    created_at,
    subscription_type,
    is_verified,
    auth_provider
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'test@talk2me.app',
    '$2a$10$PJcPrkUeFBGXHvjrfRFQa.vFMOVxdcH8K1CS2lZFlGqmoH3Sq0wl.', -- password: test123
    'Test User',
    NOW(),
    'free',
    true,
    'email'
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    is_verified = true;

-- Verify user was created
SELECT id, email, name, created_at 
FROM users 
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Optional: Create a test memory to verify system works
INSERT INTO memories (
    user_id,
    content,
    summary,
    embedding,
    importance,
    memory_type,
    entities,
    created_at
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Test memory created via SQL',
    'Manual test memory',
    ARRAY[]::float4[], -- Empty embedding for manual test
    5,
    'personal',
    '{"test": true}'::jsonb,
    NOW()
);

-- Verify memory was created
SELECT id, user_id, summary, importance, memory_type 
FROM memories 
WHERE user_id = '11111111-1111-1111-1111-111111111111'
ORDER BY created_at DESC
LIMIT 5;