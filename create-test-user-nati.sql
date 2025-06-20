-- Create Test User for Natalia
-- 
-- Ten skrypt tworzy testowego użytkownika z pustym profilem psychologicznym
-- do testowania endpointów API
--
-- INSTRUKCJA:
-- 1. Zaloguj się do Supabase Dashboard
-- 2. Wybierz swój projekt
-- 3. Przejdź do SQL Editor (po lewej stronie)
-- 4. Wklej całą zawartość tego pliku
-- 5. Kliknij "RUN" (zielony przycisk)
--

-- Krok 1: Utwórz testowego użytkownika w tabeli users
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
    '00000000-0000-0000-0000-000000000001'::uuid,
    'test-nati@example.com',
    '$2a$10$PJcPrkUeFBGXHvjrfRFQa.vFMOVxdcH8K1CS2lZFlGqmoH3Sq0wl.', -- password: test123
    'Test Nati',
    NOW(),
    'tester', -- używamy subscription_type jako role
    true,
    'email'
)
ON CONFLICT (id) DO NOTHING; -- Nie twórz duplikatu jeśli już istnieje

-- Krok 2: Utwórz pusty profil psychologiczny dla tego użytkownika
INSERT INTO user_profile (
    user_id,
    attachment_style,
    dominujące_schematy,
    język_miłości,
    styl_komunikacji,
    rola,
    dzieciństwo,
    aktualne_wyzywania,
    cykliczne_wzorce,
    last_updated
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    NULL, -- pusty attachment_style
    NULL, -- puste dominujące_schematy
    NULL, -- puste język_miłości
    NULL, -- pusty styl_komunikacji
    NULL, -- pusta rola
    NULL, -- puste dzieciństwo
    NULL, -- puste aktualne_wyzywania
    NULL, -- puste cykliczne_wzorce
    NOW()
)
ON CONFLICT (user_id) DO NOTHING; -- Nie twórz duplikatu jeśli profil już istnieje

-- Krok 3: Weryfikacja - sprawdź czy użytkownik został utworzony
SELECT 
    id as user_id,
    email,
    name,
    subscription_type as role,
    created_at,
    is_verified
FROM users 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Krok 4: Weryfikacja - sprawdź czy profil został utworzony
SELECT 
    user_id,
    attachment_style,
    dominujące_schematy,
    język_miłości,
    styl_komunikacji,
    rola,
    last_updated
FROM user_profile 
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- Krok 5: Dodaj przykładowe wspomnienie (opcjonalne - odkomentuj jeśli chcesz)
/*
INSERT INTO memories_v2 (
    user_id,
    content,
    summary,
    embedding,
    importance,
    memory_type,
    entities,
    metadata,
    memory_layer,
    visible_to_user,
    created_at
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Testowe wspomnienie dla Natalii',
    'Test memory dla sprawdzenia API',
    -- Puste embedding (1536 wymiarów) - będzie zastąpione przez API
    ARRAY(SELECT 0::real FROM generate_series(1, 1536)),
    5,
    'personal',
    '{"test": true}'::jsonb,
    '{"source": "manual_sql"}'::jsonb,
    'long_term',
    true,
    NOW()
);
*/

-- Podsumowanie
SELECT 
    'Test user created successfully!' as status,
    '00000000-0000-0000-0000-000000000001' as user_id,
    'test-nati@example.com' as email,
    'Use this user_id to test API endpoints' as note;