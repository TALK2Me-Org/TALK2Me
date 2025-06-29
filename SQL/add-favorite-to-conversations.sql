-- Dodaje pole is_favorite do tabeli conversations
-- Wykonaj w Supabase SQL Editor

-- Dodaj kolumnę is_favorite
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- Dodaj indeks dla szybkiego filtrowania ulubionych konwersacji
CREATE INDEX IF NOT EXISTS idx_conversations_favorite 
  ON conversations(user_id, is_favorite) 
  WHERE is_favorite = true;

-- Zaktualizuj widok conversation_summary
CREATE OR REPLACE VIEW conversation_summary AS
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
GROUP BY c.id;

-- Grant dostęp do widoku
GRANT SELECT ON conversation_summary TO authenticated;