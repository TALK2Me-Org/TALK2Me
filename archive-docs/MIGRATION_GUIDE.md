# 📋 TALK2Me - Przewodnik Migracji Bazy Danych

## ⚠️ WAŻNE PRZED ROZPOCZĘCIEM

1. **Wykonaj tę migrację w czasie niskiej aktywności** (najlepiej w nocy)
2. **Poinformuj użytkowników** o planowanej przerwie technicznej
3. **Miej dostęp do Supabase Dashboard** przez cały proces

## 🔄 KROKI MIGRACJI

### KROK 1: Przygotowanie (5 min)

1. **Otwórz Supabase Dashboard**
   - Zaloguj się na https://app.supabase.com
   - Wybierz projekt TALK2Me
   - Przejdź do **SQL Editor**

2. **Zatrzymaj aplikację** (opcjonalnie ale zalecane)
   ```bash
   # W Railway dashboard - wyłącz deployment
   # LUB zmień zmienną środowiskową:
   MAINTENANCE_MODE=true
   ```

### KROK 2: Backup (10 min)

1. **W SQL Editor wklej i wykonaj** `000_backup_script.sql`:
   ```sql
   -- Skopiuj całą zawartość pliku SQL/000_backup_script.sql
   ```

2. **Sprawdź wyniki**:
   - Wszystkie tabele powinny pokazać "✅ Match"
   - Zapisz screenshot wyniku dla bezpieczeństwa

3. **Alternatywny backup** (opcjonalnie):
   - Settings → Backups → Download backup

### KROK 3: Migracja struktury (15-20 min)

1. **Wykonaj migrację częściami** (bezpieczniej):
   
   **Część A - Nowe kolumny (5 min):**
   ```sql
   -- Skopiuj STEP 2 z pliku 002_migration_script.sql
   -- (ALTER TABLE statements)
   ```
   
   **Część B - Nowe tabele (3 min):**
   ```sql
   -- Skopiuj STEP 3 z pliku 002_migration_script.sql
   -- (CREATE TABLE statements)
   ```
   
   **Część C - Indeksy (5-10 min):**
   ```sql
   -- Skopiuj STEP 4 i 5 z pliku 002_migration_script.sql
   -- (CREATE INDEX statements)
   ```

2. **Po każdej części sprawdź błędy**:
   - Jeśli są błędy, zatrzymaj się i zgłoś

### KROK 4: Migracja danych (10 min)

1. **Migruj chat_history do conversations**:
   ```sql
   -- Skopiuj STEP 7 z pliku 002_migration_script.sql
   SELECT migrate_chat_history();
   ```

2. **Zaktualizuj konfigurację**:
   ```sql
   -- Skopiuj STEP 8 z pliku 002_migration_script.sql
   ```

### KROK 5: Weryfikacja (5 min)

1. **Sprawdź strukturę**:
   ```sql
   -- Sprawdź czy wszystkie kolumny istnieją
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'memories' 
   ORDER BY ordinal_position;
   ```

2. **Sprawdź dane**:
   ```sql
   -- Verify migration status
   SELECT 
       'Users' as table_name, COUNT(*) as count FROM users
   UNION ALL SELECT 
       'Conversations', COUNT(*) FROM conversations
   UNION ALL SELECT 
       'Messages', COUNT(*) FROM messages
   UNION ALL SELECT 
       'Memories', COUNT(*) FROM memories;
   ```

3. **Test zapytań**:
   ```sql
   -- Test vector search
   SELECT COUNT(*) FROM memories WHERE embedding IS NOT NULL;
   
   -- Test new indexes
   EXPLAIN (ANALYZE, BUFFERS) 
   SELECT * FROM messages 
   WHERE conversation_id = (SELECT id FROM conversations LIMIT 1)
   ORDER BY created_at DESC LIMIT 10;
   ```

### KROK 6: Włączenie aplikacji (5 min)

1. **Zaktualizuj zmienne środowiskowe** (jeśli potrzeba):
   ```bash
   MAINTENANCE_MODE=false
   DB_SCHEMA_VERSION=2.0
   ```

2. **Restart aplikacji**:
   - W Railway: Deploy → Restart
   - Lub git push aby trigger nowy deployment

3. **Test funkcjonalności**:
   - [ ] Logowanie działa
   - [ ] Chat działa
   - [ ] Historia się ładuje
   - [ ] Admin panel działa

## 🚨 PLAN AWARYJNY

### Jeśli coś pójdzie nie tak:

1. **Natychmiastowy rollback** (5 min):
   ```sql
   -- Wykonaj SQL/003_rollback_script.sql
   ```

2. **Restore z backup schema**:
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   
   -- Przywróć tabele
   CREATE TABLE public.users AS 
   SELECT * FROM backup_20250115.users;
   -- Powtórz dla pozostałych tabel
   ```

3. **Restore z Supabase backup**:
   - Settings → Backups → Restore

## 📊 MONITORING PO MIGRACJI

### Pierwsze 24h:
- [ ] Sprawdzaj logi błędów co godzinę
- [ ] Monitoruj wydajność zapytań
- [ ] Sprawdź Railway metrics
- [ ] Zbieraj feedback od użytkowników

### Metryki do śledzenia:
```sql
-- Query performance
SELECT 
    query,
    calls,
    mean_exec_time,
    total_exec_time
FROM pg_stat_statements
WHERE query LIKE '%memories%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## ✅ CHECKLIST

- [ ] Backup wykonany i zweryfikowany
- [ ] Migracja struktury bez błędów
- [ ] Dane zmigrowane poprawnie
- [ ] Indeksy utworzone
- [ ] Aplikacja działa
- [ ] Użytkownicy poinformowani
- [ ] Monitoring ustawiony

## 📞 KONTAKT W RAZIE PROBLEMÓW

1. **Pierwsza linia wsparcia**: Claude (AI) - opisz dokładnie błąd
2. **Supabase Support**: support@supabase.io
3. **Railway Support**: Przez dashboard

---

**Czas całkowity**: ~45-60 minut
**Poziom ryzyka**: Średni (mamy pełny backup)
**Zalecany czas**: Wieczór/noc (mało użytkowników)