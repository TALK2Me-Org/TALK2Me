/**
 * Zep Cloud Configuration Setup
 * 
 * Dodaje credentials Zep Cloud do app_config table
 * Umożliwia wybór Zep jako memory provider
 * 
 * @author Claude (AI Assistant) - Sesja #27
 * @date 03.07.2025
 * @purpose Zep Cloud Integration - Phase 1.1
 */

-- Dodaj Zep Cloud Account ID
INSERT INTO app_config (config_key, config_value, description, updated_at)
VALUES (
  'zep_account_id', 
  '3149abeb-26b6-48e7-838d-0d9a8be09bba',
  'Zep Cloud Account ID for memory provider',
  NOW()
) ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Dodaj Zep Cloud API Key
INSERT INTO app_config (config_key, config_value, description, updated_at)
VALUES (
  'zep_api_key', 
  'z_1dWlkIjoiMjhhODE4YTgtOGNjNi00Y2Q3LWJkNDItNDYxNDRjZTcwMDZkIn0.B-8YIHiLJiWoadR0FbwUPx0XB-vQ3lnHuIiCx8uAMeMT4-iNsDvADXk80eAzImKv9ficj9tTGfU3NNszm2Q2qA',
  'Zep Cloud API Key for authentication',
  NOW()
) ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Opcjonalnie: ustaw Zep jako domyślny provider (później dla testów)
-- INSERT INTO app_config (config_key, config_value, description, updated_at)
-- VALUES (
--   'default_memory_provider', 
--   'zep',
--   'Default memory provider: local, mem0, or zep',
--   NOW()
-- ) ON CONFLICT (config_key) DO UPDATE SET
--   config_value = EXCLUDED.config_value,
--   description = EXCLUDED.description,
--   updated_at = NOW();

-- Sprawdź czy wszystko zostało dodane
SELECT config_key, config_value, description, updated_at 
FROM app_config 
WHERE config_key LIKE 'zep_%' OR config_key = 'default_memory_provider'
ORDER BY config_key;