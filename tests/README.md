# 🧪 Tests & Development Scripts

## 📋 O folderze
Folder zawiera skrypty testowe i narzędzia deweloperskie przeniesione z głównego katalogu dla lepszej organizacji.

## 📁 Zawartość

### 🔗 Testy połączeń
- **test-db-connection.js** - Test połączenia z Supabase
- **test-memory-local.js** - Lokalny test systemu pamięci

### 🧠 Testy API Memory Management  
- **test-save-memory.js** - Test endpointu POST /api/save-memory
- **test-update-profile.js** - Test endpointu POST /api/update-profile  
- **test-summarize-memories.js** - Test endpointu POST /api/summarize-memories

### 🔄 Skrypty migracji
- **migrate.js** - Skrypt migracji bazy danych
- **verify-migration.js** - Weryfikacja migracji
- **test-migration-success.js** - Test powodzenia migracji

## 🚀 Jak używać

### Testy lokalne:
```bash
cd tests
node test-db-connection.js
node test-memory-local.js
```

### Testy produkcyjne (Railway):
```bash
node test-save-memory.js
node test-update-profile.js
node test-summarize-memories.js
```

### Migracje:
```bash
node migrate.js
node verify-migration.js
```

## ⚠️ Uwagi
- Wszystkie skrypty wymagają zmiennych środowiskowych z .env
- Testy API działają na https://talk2me.up.railway.app
- Test user UUID: `11111111-1111-1111-1111-111111111111`