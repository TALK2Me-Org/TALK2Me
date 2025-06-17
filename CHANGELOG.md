# CHANGELOG - TALK2Me

Wszystkie istotne zmiany w projekcie będą dokumentowane w tym pliku.

Format bazuje na [Keep a Changelog](https://keepachangelog.com/pl/1.0.0/),
a projekt używa [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.6.1] - 2025-01-17

### Sesja 12b - Migracja systemu pamięci do memories_v2 (17.01.2025)
**Developer**: Claude (AI Assistant)

### 🎯 Migration to memories_v2 - Unified Memory System
- **lib/memory-manager.js**: migracja z `memories` → `memories_v2`
- **supabase-memory-schema.sql**: funkcje SQL zaktualizowane do `memories_v2`
- **Legacy files**: oznaczone jako DEPRECATED z komentarzami
- **Single source of truth**: `memories_v2` to jedyna aktywna tabela pamięci

### 🔧 Technical Changes
- **saveMemory()**: `.from('memories')` → `.from('memories_v2')`
- **match_memories()**: `FROM memories m` → `FROM memories_v2 m`
- **get_memories_by_type()**: `FROM memories m` → `FROM memories_v2 m`
- **memory_statistics**: `FROM memories` → `FROM memories_v2`

### 🚫 Deprecated Files
- `test-memory-local.js` - legacy local tests
- `migrate.js` - legacy migration script  
- `test-migration-success.js` - legacy migration test
- All marked with `// DEPRECATED: replaced by memories_v2`

### ✅ Expected Results
- `/api/test-memory` zapisuje do `memories_v2`
- Admin panel czyta z `memories_v2`
- `GET /api/admin/memory?action=users` powinien działać poprawnie
- `memories` tabela pozostaje jako archiwum/backup

---

## [1.6.0] - 2025-01-17

### Sesja 12 - Memory Viewer w panelu admina (17.01.2025)
**Developer**: Claude (AI Assistant)

### 🚀 Added
- **Memory Management Panel** w admin.html - profesjonalny interfejs do zarządzania wspomnieniami
- **Backend API** `/api/admin/memory.js` - CRUD operations dla wspomnień
- **User Selector** - dropdown z użytkownikami posortowanymi alfabetycznie (max 100)
- **Memory Table** - responsywna tabela z kolumnami: summary, type, importance, created_at, actions
- **Inline Editing** - edycja summary i importance bezpośrednio w tabeli
- **Type Filtering** - filtrowanie wspomnień po typach (personal, relationship, preference, event)
- **Memory Statistics** - licznik wspomnień per user w selektorze
- **Confirmation Dialogs** - przed usunięciem wspomnienia
- **Loading States** - animowane loading podczas API calls
- **Type Badges** - kolorowe oznaczenia typów wspomnień

### 🎨 UI/UX Features
- **Editable Summary** - kliknij aby edytować, Enter/Escape shortcuts
- **Importance Slider** - wizualny editor importance (1-10) ze słupkami ★
- **Real-time Updates** - optymistyczne updates w UI
- **Error Handling** - profesjonalne komunikaty błędów używając `showStatus()`
- **Responsive Design** - działa na desktop i mobile
- **Profesjonalne Style** - konsystentne z obecnym admin panelem

### 🔧 Technical Implementation
- **Express.js Routes** - GET/PUT/DELETE endpoints w server.js
- **Supabase Integration** - używa tabeli `memories_v2` z service role key
- **Data Validation** - backend walidacja importance (1-10) i summary
- **Security** - admin-only access, RLS policies
- **Performance** - pagination ready, memory count optimization

### 📋 API Endpoints
- `GET /api/admin/memory?action=users` - lista użytkowników ze wspomnieniami
- `GET /api/admin/memory?user_id=xxx` - wspomnienia dla usera
- `PUT /api/admin/memory?id=xxx` - edycja wspomnienia (summary/importance)
- `DELETE /api/admin/memory?id=xxx` - usuwanie wspomnienia

### 🔍 Tested
- Memory viewer ładuje się poprawnie w panelu admina
- Backend API endpoints działają (GET/PUT/DELETE)
- Server.js poprawnie importuje i rejestruje memory handler
- Wszystkie handlery ładują się bez błędów

### 📋 Ready for Production
Panel Memory Viewer jest gotowy do użycia produkcyjnego:
- ✅ Bezpieczny backend z walidacją
- ✅ Profesjonalny UI zgodny z obecnym designem
- ✅ Obsługa błędów i loading states
- ✅ Responsywny design
- ✅ Inline editing z keyboard shortcuts

---

## [1.5.0] - 2025-01-16

### Sesja 11 - Naprawienie Railway deployment i systemu pamięci (16.01.2025, 05:00-08:00)
**Developer**: Claude (AI Assistant)

### 🚀 Added
- Test endpoint `/api/test-memory` do weryfikacji systemu pamięci
- Endpoint `/api/memory-status` do sprawdzania statusu handlerów
- Endpoint `/api/routes` do debugowania zarejestrowanych route'ów
- Plik `nixpacks.toml` dla lepszej kontroli Railway build process
- Plik `SQL/create-test-user.sql` do ręcznego tworzenia test usera
- Per-user cache dla MemoryManager (zamiast singleton)
- Szczegółowe logowanie krok po kroku w test endpoint

### 🔧 Changed
- MemoryManager zmieniony z singleton pattern na per-user cache
- Railway config: zmniejszony healthcheck timeout z 120s na 30s
- Railway build command: usunięto `npm ci`, używamy tylko `npm install --legacy-peer-deps`
- Test user ID zmieniony na prawidłowy UUID format: `11111111-1111-1111-1111-111111111111`
- Rozbudowane logowanie w MemoryManager constructor
- Ulepszona obsługa błędów w test-memory endpoint

### 🐛 Fixed
- Brakująca zależność `@langchain/core` dodana do package.json
- Test user creation: zmiana `password_hash` na `password` (zgodnie ze schemą DB)
- Test user creation: dodane wymagane pole `name`
- Railway deployment issues - healthcheck działa poprawnie
- MemoryManager inicjalizacja - problem z singleton naprawiony
- Function calling działa w test endpoint (zapisuje i odczytuje pamięć)

### 🔍 Tested
- `/api/test-memory` - wszystkie testy przechodzą (status: ok)
- System pamięci zapisuje i odczytuje wspomnienia z similarity search
- OpenAI embeddings działają poprawnie (text-embedding-ada-002)
- Railway auto-deploy działa z branch `railway-migration`

### 📋 TODO na następną sesję
1. Test function calling w prawdziwym czacie (nie tylko test endpoint)
2. UI konwersacji - sidebar z listą konwersacji
3. UI pamięci - "Co o mnie wiesz?" sekcja
4. Integracja pamięci z UI czatu
5. PWA - instalacja jako aplikacja mobilna

---

## [1.4.1] - 2025-01-14

### Poprzednie wersje
Szczegółowa historia zmian znajduje się w:
- `CLAUDE.md` - główna dokumentacja z historią sesji
- `archive/` - stare pliki dokumentacji

### Kluczowe kamienie milowe:
- **Sesja 1-5**: Migracja z localhost na cloud (Vercel + Supabase)
- **Sesja 6**: Integracja Assistant API i cache promptu
- **Sesja 7**: System konwersacji (backend ready)
- **Sesja 8**: Planowanie migracji na Railway
- **Sesja 9**: Migracja na Railway z brancha `railway-migration`
- **Sesja 10**: Implementacja systemu pamięci z LangChain
- **Sesja 11**: Naprawienie Railway deployment i systemu pamięci

---

## Zasady prowadzenia CHANGELOG

### Dla kolejnych developerów:
1. **ZAWSZE** dodawaj wpis po każdej sesji pracy
2. Używaj kategorii:
   - 🚀 **Added** - nowe funkcjonalności
   - 🔧 **Changed** - zmiany w istniejących funkcjach
   - 🐛 **Fixed** - naprawione błędy
   - 🗑️ **Removed** - usunięte funkcje
   - 🔒 **Security** - poprawki bezpieczeństwa
   - ⚠️ **Known Issues** - znane problemy

3. Format wpisu:
   ```markdown
   ## [Version] - YYYY-MM-DD
   ### Category
   - Opis zmiany (plik/moduł jeśli istotne)
   ```

4. Commituj zmiany z odpowiednimi emoji:
   - 🔧 Fix
   - ✨ Feature
   - 📝 Docs
   - 🐛 Bug
   - ♻️ Refactor

---

**Maintainer**: Natalia Rybarczyk
**Current Branch**: `railway-migration`
**Production**: https://talk2me.up.railway.app