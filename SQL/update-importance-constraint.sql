-- Update importance constraint in memories_v2 table
-- Changes the allowed range from 1-10 to 1-5
--
-- INSTRUKCJA:
-- 1. Zaloguj się do Supabase Dashboard
-- 2. Wybierz swój projekt
-- 3. Przejdź do SQL Editor
-- 4. Wklej całą zawartość tego pliku
-- 5. Kliknij "RUN"
--

-- Krok 1: Sprawdź aktualne wspomnienia które mają importance > 5
SELECT 
    id,
    user_id,
    summary,
    importance,
    created_at
FROM memories_v2
WHERE importance > 5
ORDER BY importance DESC, created_at DESC;

-- Krok 2: Zaktualizuj istniejące wspomnienia z importance > 5
-- Skalujemy wartości 6-10 do zakresu 4-5
UPDATE memories_v2
SET importance = CASE
    WHEN importance = 6 THEN 4
    WHEN importance = 7 THEN 4
    WHEN importance = 8 THEN 5
    WHEN importance = 9 THEN 5
    WHEN importance = 10 THEN 5
    ELSE importance
END
WHERE importance > 5;

-- Krok 3: Usuń stary constraint i dodaj nowy
ALTER TABLE memories_v2
  DROP CONSTRAINT IF EXISTS memories_v2_importance_check,
  ADD CONSTRAINT memories_v2_importance_check CHECK (importance >= 1 AND importance <= 5);

-- Krok 4: Weryfikacja - sprawdź czy constraint został zaktualizowany
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'memories_v2'::regclass
AND conname LIKE '%importance%';

-- Krok 5: Sprawdź czy nie ma już wspomnień z importance > 5
SELECT 
    COUNT(*) as count_above_5,
    MAX(importance) as max_importance,
    MIN(importance) as min_importance
FROM memories_v2;

-- Podsumowanie
SELECT 
    'Constraint updated successfully!' as status,
    'importance must be between 1 and 5' as new_rule,
    COUNT(*) as total_memories,
    AVG(importance)::numeric(3,2) as avg_importance
FROM memories_v2;