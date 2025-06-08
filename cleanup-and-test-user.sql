-- TALK2Me - Czyszczenie bazy i dodanie testowego użytkownika
-- 
-- UWAGA: Ten skrypt usunie WSZYSTKIE dane!
-- Uruchom tylko jeśli chcesz zacząć od zera.
--
-- Instrukcja:
-- 1. Zaloguj się do Supabase
-- 2. SQL Editor
-- 3. Wklej i uruchom

-- KROK 1: Wyczyść dane (w odpowiedniej kolejności ze względu na klucze obce)
TRUNCATE TABLE messages CASCADE;
TRUNCATE TABLE conversations CASCADE;
TRUNCATE TABLE sessions CASCADE;
TRUNCATE TABLE chat_history CASCADE;
TRUNCATE TABLE migration_tracking CASCADE;
TRUNCATE TABLE users CASCADE;

-- KROK 2: Dodaj testowego użytkownika
-- Email: test@example.com
-- Hasło: test123
INSERT INTO users (
  email, 
  password, 
  name, 
  subscription_type, 
  is_verified,
  auth_provider
) VALUES (
  'test@example.com',
  '$2b$10$YGpGZ1a8r5f5vAaW5hPcUOqC0jL3LqAVKQBPZqW2L7KgYEY4jKJbS', -- hash dla "test123"
  'Test User',
  'free',
  true,
  'email'
);

-- KROK 3: Wyświetl utworzonego użytkownika
SELECT id, email, name, created_at FROM users;

-- PODSUMOWANIE:
-- ✅ Baza wyczyszczona
-- ✅ Testowy użytkownik utworzony
-- 
-- Dane do logowania:
-- Email: test@example.com
-- Hasło: test123