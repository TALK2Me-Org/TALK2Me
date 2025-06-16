# CHANGELOG - TALK2Me

Wszystkie istotne zmiany w projekcie będą dokumentowane w tym pliku.

Format bazuje na [Keep a Changelog](https://keepachangelog.com/pl/1.0.0/),
a projekt używa [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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