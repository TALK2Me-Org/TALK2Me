-- TASK 1: ALTER TABLE memories_v2
-- Wykonaj to w Supabase SQL Editor

-- Sprawdź obecną strukturę
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'memories_v2' 
ORDER BY ordinal_position;

-- Dodaj nowe kolumny (IF NOT EXISTS zapobiega błędom jeśli kolumny już istnieją)
ALTER TABLE memories_v2
ADD COLUMN IF NOT EXISTS memory_layer text,
ADD COLUMN IF NOT EXISTS date date,
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS repeat text,
ADD COLUMN IF NOT EXISTS actor text,
ADD COLUMN IF NOT EXISTS visible_to_user boolean DEFAULT false;

-- Sprawdź strukturę po zmianach
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'memories_v2' 
ORDER BY ordinal_position;

-- Sprawdź czy tabela działa poprawnie
SELECT COUNT(*) as total_records FROM memories_v2;