-- FIX dla brakującej kolumny is_sensitive
-- Wykonaj to PRZED główną migracją

-- Dodaj brakującą kolumnę do app_config
ALTER TABLE app_config
ADD COLUMN IF NOT EXISTS is_sensitive BOOLEAN DEFAULT false;

-- Sprawdź czy kolumna została dodana
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'app_config'
ORDER BY ordinal_position;

-- Oznacz wrażliwe dane
UPDATE app_config 
SET is_sensitive = true 
WHERE config_key IN ('openai_api_key', 'groq_api_key', 'jwt_secret', 'admin_password', 'assistant_id');

-- Weryfikacja
SELECT config_key, config_type, is_sensitive 
FROM app_config 
ORDER BY config_key;