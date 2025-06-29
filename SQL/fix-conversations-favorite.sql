-- FIX: Dodaje pole is_favorite do tabeli conversations
-- Wykonaj w Supabase SQL Editor

-- Krok 1: Dodaj kolumnę is_favorite do tabeli
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- Krok 2: Dodaj indeks dla szybkiego filtrowania
CREATE INDEX IF NOT EXISTS idx_conversations_favorite 
  ON conversations(user_id, is_favorite) 
  WHERE is_favorite = true;

-- Krok 3: Usuń stary widok
DROP VIEW IF EXISTS conversation_summary;

-- Krok 4: Utwórz nowy widok z kolumną is_favorite
CREATE VIEW conversation_summary AS
SELECT 
  c.id,
  c.user_id,
  c.title,
  c.created_at,
  c.last_message_at,
  c.is_archived,
  c.is_favorite,
  COUNT(m.id) as message_count,
  MAX(CASE WHEN m.role = 'assistant' THEN m.ai_model END) as last_ai_model
FROM conversations c
LEFT JOIN messages m ON c.id = m.conversation_id
GROUP BY c.id, c.user_id, c.title, c.created_at, c.last_message_at, c.is_archived, c.is_favorite;

-- Krok 5: Grant dostęp do widoku
GRANT SELECT ON conversation_summary TO authenticated;

-- Krok 6: Sprawdź czy kolumna została dodana
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'conversations' AND column_name = 'is_favorite';