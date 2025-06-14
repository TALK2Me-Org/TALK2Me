# CHANGELOG - TALK2Me

Wszystkie istotne zmiany w projekcie będą dokumentowane w tym pliku.

Format bazuje na [Keep a Changelog](https://keepachangelog.com/pl/1.0.0/),
a projekt używa [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] - 2025-01-14

### 🚀 Added
- System pamięci AI z LangChain i pgvector
  - Schemat bazy danych `supabase-memory-schema.sql`
  - MemoryManager w `lib/memory-manager.js`
  - Function calling `remember_this()` w chat API
  - Embeddings OpenAI text-embedding-ada-002 (1536D)
  - Similarity search z pgvector
- Strona testowa `/test-memory.html` do debugowania pamięci
- Rozbudowane logowanie dla troubleshootingu
- Health check endpoints dla Railway

### 🔧 Changed
- Chat API zaktualizowane do `chat-with-memory.js`
- Format function calling z `tools` na `functions` (legacy OpenAI)
- Railway config - zwiększony timeout healthcheck do 60s
- Server bindowany do 0.0.0.0 dla Railway
- package.json - LangChain dependencies v0.3.x

### 🐛 Fixed
- Naprawiono nazwę zmiennej MEMORY_TOOL → MEMORY_FUNCTION
- Dodano error handling dla MemoryManager initialization
- Usunięto problematyczny SupabaseVectorStore

### 🗑️ Removed
- package-lock.json (dodany do .gitignore)
- Tymczasowo usunięto semantic search (SupabaseVectorStore)

### ⚠️ Known Issues
- Railway deployment failing (healthcheck timeout)
- Memory system nie zapisuje wspomnień
- LangChain dependencies conflicts
- Function calling nie jest triggerowane przez AI

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