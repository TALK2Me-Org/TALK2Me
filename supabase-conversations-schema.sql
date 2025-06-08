-- TALK2Me - FAZA 2: System Konwersacji
-- Ten plik zawiera schemat dla nowych tabel conversations i messages
-- 
-- INSTRUKCJA INSTALACJI:
-- 1. Zaloguj się do Supabase (https://app.supabase.com/project/hpxzhbubvdgxdvwxmhzo)
-- 2. Przejdź do SQL Editor
-- 3. Wklej zawartość tego pliku
-- 4. Kliknij RUN
--
-- UWAGA: Ten skrypt NIE usuwa istniejących danych!

-- ========================================
-- KROK 1: Utworzenie nowych tabel
-- ========================================

-- Tabela konwersacji
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Tabela wiadomości
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant', 'system', 'function')) NOT NULL,
  content TEXT NOT NULL,
  ai_model VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_favorite BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- ========================================
-- KROK 2: Indeksy dla wydajności
-- ========================================

-- Indeks dla szybkiego pobierania wiadomości z konwersacji
CREATE INDEX IF NOT EXISTS idx_messages_conversation 
  ON messages(conversation_id, created_at);

-- Indeks dla listy konwersacji użytkownika
CREATE INDEX IF NOT EXISTS idx_conversations_user 
  ON conversations(user_id, last_message_at DESC);

-- Indeks dla ulubionych wiadomości
CREATE INDEX IF NOT EXISTS idx_messages_favorite 
  ON messages(user_id, is_favorite) 
  WHERE is_favorite = true;

-- ========================================
-- KROK 3: Row Level Security (RLS)
-- ========================================

-- Włącz RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Polityki dla conversations
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON conversations
  FOR DELETE USING (auth.uid() = user_id);

-- Polityki dla messages
CREATE POLICY "Users can view messages in own conversations" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own conversations" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE USING (auth.uid() = user_id);

-- ========================================
-- KROK 4: Funkcje pomocnicze
-- ========================================

-- Funkcja do automatycznego generowania tytułu konwersacji
CREATE OR REPLACE FUNCTION generate_conversation_title(conv_id UUID)
RETURNS TEXT AS $$
DECLARE
  first_message TEXT;
BEGIN
  SELECT content INTO first_message
  FROM messages
  WHERE conversation_id = conv_id
  AND role = 'user'
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF first_message IS NULL THEN
    RETURN 'Nowa rozmowa';
  END IF;
  
  -- Zwróć pierwsze 50 znaków pierwszej wiadomości
  RETURN LEFT(first_message, 50) || 
    CASE WHEN LENGTH(first_message) > 50 THEN '...' ELSE '' END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcja do aktualizacji last_message_at
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger dla automatycznej aktualizacji last_message_at
CREATE TRIGGER update_conversation_timestamp_trigger
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();

-- ========================================
-- KROK 5: Migracja danych z chat_history
-- ========================================

-- UWAGA: Ta migracja jest BEZPIECZNA i może być uruchomiona wielokrotnie
-- Tworzy konwersacje tylko dla wiadomości, które jeszcze nie mają konwersacji

-- Najpierw utwórz tymczasową tabelę do śledzenia migracji
CREATE TABLE IF NOT EXISTS migration_tracking (
  chat_history_id UUID PRIMARY KEY,
  message_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Procedura migracji
DO $$
DECLARE
  ch RECORD;
  conv_id UUID;
  user_msg_id UUID;
  ai_msg_id UUID;
  conv_date DATE;
  user_id UUID;
  conv_count INT := 0;
  msg_count INT := 0;
BEGIN
  -- Iteruj przez wszystkich użytkowników
  FOR user_id IN SELECT DISTINCT ch_user.user_id FROM chat_history ch_user LOOP
    conv_date := NULL;
    
    -- Iteruj przez historię czatu użytkownika
    FOR ch IN 
      SELECT * FROM chat_history ch_hist
      WHERE ch_hist.user_id = user_id
      AND ch_hist.id NOT IN (SELECT chat_history_id FROM migration_tracking)
      ORDER BY ch_hist.created_at ASC
    LOOP
      -- Sprawdź czy potrzebujemy nowej konwersacji (nowy dzień)
      IF conv_date IS NULL OR DATE(ch.created_at) != conv_date THEN
        conv_date := DATE(ch.created_at);
        
        -- Utwórz nową konwersację
        INSERT INTO conversations (user_id, created_at, last_message_at)
        VALUES (user_id, ch.created_at, ch.created_at)
        RETURNING id INTO conv_id;
        
        conv_count := conv_count + 1;
      END IF;
      
      -- Dodaj wiadomość użytkownika
      INSERT INTO messages (conversation_id, user_id, role, content, created_at)
      VALUES (conv_id, user_id, 'user', ch.message, ch.created_at)
      RETURNING id INTO user_msg_id;
      
      -- Dodaj odpowiedź AI
      INSERT INTO messages (
        conversation_id, user_id, role, content, 
        ai_model, created_at, is_favorite
      )
      VALUES (
        conv_id, user_id, 'assistant', ch.response, 
        ch.ai_model, ch.created_at + INTERVAL '1 second', ch.is_favorite
      )
      RETURNING id INTO ai_msg_id;
      
      -- Zapisz w tracking table
      INSERT INTO migration_tracking (chat_history_id, message_id)
      VALUES (ch.id, user_msg_id);
      
      msg_count := msg_count + 2;
    END LOOP;
  END LOOP;
  
  -- Zaktualizuj tytuły konwersacji
  UPDATE conversations SET title = generate_conversation_title(id)
  WHERE title IS NULL;
  
  RAISE NOTICE 'Migracja zakończona: % konwersacji, % wiadomości', conv_count, msg_count;
END $$;

-- ========================================
-- KROK 6: Widoki pomocnicze
-- ========================================

-- Widok z podsumowaniem konwersacji
CREATE OR REPLACE VIEW conversation_summary AS
SELECT 
  c.id,
  c.user_id,
  c.title,
  c.created_at,
  c.last_message_at,
  c.is_archived,
  COUNT(m.id) as message_count,
  MAX(CASE WHEN m.role = 'assistant' THEN m.ai_model END) as last_ai_model
FROM conversations c
LEFT JOIN messages m ON c.id = m.conversation_id
GROUP BY c.id;

-- Grant dostęp do widoku
GRANT SELECT ON conversation_summary TO authenticated;

-- ========================================
-- PODSUMOWANIE
-- ========================================
-- Utworzono:
-- ✅ Tabela conversations - przechowuje konwersacje
-- ✅ Tabela messages - przechowuje wiadomości
-- ✅ Indeksy dla wydajności
-- ✅ RLS policies dla bezpieczeństwa
-- ✅ Automatyczna migracja z chat_history
-- ✅ Funkcje pomocnicze (tytuły, timestampy)
-- ✅ Widok conversation_summary

-- Następny krok: utworzenie API endpoints w /api/conversations.js