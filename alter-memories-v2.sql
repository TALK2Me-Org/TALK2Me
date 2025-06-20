-- TASK 1: Aktualizacja tabeli memories_v2
-- Dodanie nowych kolumn do istniejącej tabeli

-- Sprawdź obecną strukturę przed zmianami
\d memories_v2;

-- Dodaj nowe kolumny
ALTER TABLE memories_v2
ADD COLUMN memory_layer text,
ADD COLUMN date date,
ADD COLUMN location text,
ADD COLUMN repeat text,
ADD COLUMN actor text,
ADD COLUMN visible_to_user boolean DEFAULT false;

-- Sprawdź strukturę po zmianach
\d memories_v2;

-- Sprawdź czy kolumny zostały dodane
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'memories_v2' 
ORDER BY ordinal_position;