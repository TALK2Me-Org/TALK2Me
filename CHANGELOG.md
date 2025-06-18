# CHANGELOG - TALK2Me

Wszystkie istotne zmiany w projekcie będą dokumentowane w tym pliku.

Format bazuje na [Keep a Changelog](https://keepachangelog.com/pl/1.0.0/),
a projekt używa [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.9.0] - 2025-06-18

### Sesja 15 - Backend API dla Memory & Profile Management (18.06.2025, 22:00-02:00)
**Developer**: Claude (AI Assistant)

### 🚀 KOMPLETNY BACKEND DLA ZARZĄDZANIA PAMIĘCIĄ I PROFILAMI! 🧠✅

#### 📦 **Nowe endpointy API utworzone:**

##### **1. TASK 1 - Rozszerzenie tabeli memories_v2**
- **SQL**: `/alter-memories-v2.sql` - dodaje nowe kolumny do tabeli
- **API**: `POST /api/alter-memories-v2` - endpoint informacyjny
- **API**: `GET /api/execute-alter-table` - executor dla ALTER TABLE
- **Nowe kolumny**:
  - `memory_layer` (text) - warstwa pamięci: short_term/long_term/core
  - `date` (date) - data zdarzenia
  - `location` (text) - lokalizacja
  - `repeat` (text) - powtarzalność
  - `actor` (text) - kto dodał: user/ai/system
  - `visible_to_user` (boolean) - widoczność dla użytkownika

##### **2. TASK 2 - Tabela user_profile**
- **SQL**: `/create-user-profile.sql` - kompletny schemat tabeli
- **API**: `POST /api/create-user-profile-table` - tworzy tabelę
- **API**: `GET/POST /api/test-user-profile` - testowanie tabeli
- **Struktura tabeli**:
  ```sql
  user_id (UUID PK)
  attachment_style (TEXT)
  dominujące_schematy (TEXT[])
  język_miłości (TEXT[])
  styl_komunikacji (TEXT)
  rola (TEXT)
  dzieciństwo (TEXT)
  aktualne_wyzywania (TEXT)
  cykliczne_wzorce (TEXT[])
  last_updated (TIMESTAMP)
  ```

##### **3. TASK 3 - Zapisywanie wspomnień**
- **API**: `POST /api/save-memory` - zapisuje wspomnienie do memories_v2
- **Test**: `/test-save-memory.js` - skrypt testowy
- **Funkcjonalności**:
  - Walidacja wszystkich pól (UUID, długość summary, typy)
  - Generowanie embeddings OpenAI (text-embedding-ada-002)
  - Obsługa metadanych (tags, actor, status)
  - Mapowanie typów (schemat → personal)
  - Error handling z detalami

##### **4. TASK 4 - Aktualizacja profilu**
- **API**: `POST /api/update-profile` - UPSERT profilu użytkownika
- **Test**: `/test-update-profile.js` - skrypt testowy
- **Funkcjonalności**:
  - Logika UPSERT (update lub insert)
  - Walidacja typów pól (arrays, strings)
  - Walidacja wartości (attachment_style, styl_komunikacji)
  - Automatyczne last_updated
  - Obsługa wszystkich pól user_profile

##### **5. TASK 5 - AI analiza wspomnień**
- **API**: `POST /api/summarize-memories` - generuje profil z AI
- **Test**: `/test-summarize-memories.js` - rozbudowany test
- **Funkcjonalności**:
  - Pobiera wszystkie wspomnienia użytkownika
  - Grupuje po typach (personal, relationship, preference, event)
  - Generuje prompt dla OpenAI GPT-3.5
  - Parsuje odpowiedź AI do JSON
  - UPSERT profilu z dodanymi polami
  - Analiza dzieciństwa, wyzwań, wzorców

#### 🛠️ **Technologie użyte:**
- **Node.js 18+** - ES modules, built-in fetch
- **Express.js** - routing i middleware
- **Supabase** - PostgreSQL + pgvector
- **OpenAI API**:
  - GPT-3.5-turbo - analiza psychologiczna
  - text-embedding-ada-002 - embeddings 1536D
- **UUID validation** - regex pattern matching
- **JSON parsing** - structured AI responses

#### 📊 **Stan bazy danych:**
- **memories_v2** - rozszerzona o 6 nowych kolumn
- **user_profile** - nowa tabela z profilem psychologicznym
- **Indeksy** - dodane dla wydajności
- **Triggery** - auto-update timestamps
- **Komentarze** - dokumentacja kolumn

#### 🔧 **Narzędzia użyte:**
- **Git** - version control, systematyczne commity
- **curl** - testowanie API endpoints
- **VS Code** - edycja kodu z AI assistance
- **Railway logs** - monitoring deploymentu
- **Supabase Dashboard** - weryfikacja tabel

#### ✅ **Wszystkie zadania ukończone:**
1. ✅ TASK 1 - ALTER TABLE memories_v2
2. ✅ TASK 2 - CREATE TABLE user_profile  
3. ✅ TASK 3 - POST /api/save-memory
4. ✅ TASK 4 - POST /api/update-profile
5. ✅ TASK 5 - POST /api/summarize-memories

#### 📝 **Dokumentacja dodana:**
- JSDoc komentarze w każdym endpoint
- Opisy parametrów i zwracanych wartości
- Przykłady użycia w skryptach testowych
- Zaktualizowane README i CLAUDE.md

---

## [1.8.0] - 2025-06-17

### Sesja 14 - PWA Implementation (17.06.2025, 23:00-23:30)
**Developer**: Claude (AI Assistant)

### 🚀 PROGRESSIVE WEB APP KOMPLETNIE ZAIMPLEMENTOWANA! 📱✅

#### 📦 **Nowe pliki utworzone:**

##### **1. PWA Manifest (`/public/manifest.json`)**
- **Funkcja**: Konfiguracja aplikacji dla Web App Store
- **Zawartość**:
  - Nazwa: "TALK2Me - Bo miłość potrzebuje zrozumienia"
  - Display mode: "standalone" (pełnoekranowy)
  - Theme color: "#FF69B4" (różowy akcent)
  - 8 ikon w różnych rozmiarach (72px-512px)
  - Kategorie: "lifestyle", "social", "productivity"
  - Język: polski ("pl")

##### **2. Service Worker (`/public/sw.js`)**
- **Funkcja**: Offline cache i background operations
- **Strategia cache**: Network-first z fallback na cache
- **Cachowane pliki**: index.html, login.html, admin.html, manifest.json, ikony
- **Funkcjonalności**:
  - Auto-cleanup starych cache'ów
  - Fallback dla offline navigation (→ index.html)
  - Skip API calls (nie cache'uje `/api/*`)
  - Support dla push notifications (przygotowane)
  - Background sync support (przygotowane)

##### **3. Ikony PWA (`/public/icons/`)**
- **8 rozmiarów PNG**: 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512
- **Design**: Placeholder - różowy gradient + białe kółko + tekst "T2M"
- **Źródło SVG**: `/public/icons/icon.svg` (radial gradient)
- **Generator**: `/public/generate-icons.html` (HTML + Canvas API)
- **Python script**: Tworzenie PNG z minimalnym base64 data

##### **4. Generator ikon (`/public/generate-icons.html`)**
- **Funkcja**: Narzędzie do tworzenia lepszych ikon
- **Technologia**: HTML5 Canvas API
- **Automatyczne**: Generuje wszystkie 8 rozmiarów
- **Download**: Bezpośrednie pobieranie PNG

#### 🔧 **Modyfikacje istniejących plików:**

##### **1. HTML Head Modifications (`/public/index.html`)**
```html
<!-- PWA Manifest -->
<link rel="manifest" href="/manifest.json">

<!-- Apple Touch Icons -->
<link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png">
<link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png">

<!-- Standard favicon -->
<link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-128x128.png">
<link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-72x72.png">

<!-- Apple PWA meta -->
<meta name="apple-mobile-web-app-title" content="TALK2Me">
```

##### **2. PWA JavaScript (`/public/index.html` - koniec pliku)**
- **Service Worker Registration**: Auto-rejestracja przy ładowaniu strony
- **Install Prompt (Android/Desktop)**:
  - Przycisk "📱 Zainstaluj aplikację"
  - Auto-hide po 10 sekundach
  - Event handling dla `beforeinstallprompt`
- **iOS Install Instructions**:
  - Detekcja iOS (`/iPad|iPhone|iPod/`)
  - Modal z instrukcjami: "Udostępnij ⬆️ → Dodaj do ekr. głównego ➕"
  - Auto-show po 3 sekundach, auto-hide po 15 sekundach

#### 🛠️ **Technologie użyte:**
- **PWA Standards**: Web App Manifest, Service Workers API
- **Canvas API**: Generowanie ikon (HTML5)
- **Python 3**: Base64 PNG generation dla placeholder ikon
- **Bash**: Automatyzacja tworzenia katalogów i plików
- **JavaScript ES6+**: Async/await, template literals, destructuring
- **CSS Custom Properties**: Dynamiczne kolory theme

#### ✅ **Funkcjonalności PWA:**
1. **Instalacja**:
   - Android Chrome: Auto-prompt + "Dodaj do ekranu głównego"
   - iOS Safari: Instrukcje manualne (Udostępnij → Dodaj do ekr. głównego)
   - Desktop Chrome: Install icon w address bar
   
2. **Offline Support**:
   - Główne pliki HTML cache'owane
   - Fallback navigation → index.html
   - API calls omijają cache (real-time data)
   
3. **Native Experience**:
   - Pełnoekranowy mode (bez browser UI)
   - Własna ikona w app drawer/home screen
   - Splash screen z theme colors
   - Status bar styling (iOS)

#### 📊 **Stan projektu po implementacji:**
- **Kompletność**: 85% → **90%** ✅
- **PWA Audit**: Wszystkie kryteria spełnione
- **Mobile-First**: W pełni responsywne i instalowalne
- **Offline-Ready**: Podstawowa funkcjonalność bez internetu

#### 🔍 **Testowanie:**
- **Local**: `python3 -m http.server 8000` → `http://localhost:8000`
- **Production**: `https://talk2me.up.railway.app`
- **DevTools**: Application tab → Manifest, Service Workers, Cache Storage
- **Install Test**: Ikona instalacji w browser, instrukcje iOS

#### ⚠️ **TODO dla kolejnych sesji:**
- **Design ikon**: Zastąpić placeholder profesjonalnymi ikonami
- **Offline UX**: Lepszy messaging gdy brak internetu
- **Push Notifications**: Implementacja notyfikacji (Service Worker ready)
- **Background Sync**: Wysyłanie wiadomości offline (Service Worker ready)

---

## [1.7.0] - 2025-06-17

### Sesja 13 - Naprawienie i uruchomienie systemu pamięci (17.06.2025, 10:00-15:15)
**Developer**: Claude (AI Assistant)

### 🚀 SYSTEM PAMIĘCI DZIAŁA W PEŁNI! ✅

#### 🔧 **Główne naprawy wykonane:**

##### **1. Diagnoza i naprawa MemoryManager**
- **Problem**: `MemoryManager.enabled = false` mimo obecności OpenAI key
- **Przyczyna**: Klucz nie był przekazywany z environment variables
- **Rozwiązanie**: 
  - Dodano fallback `process.env.OPENAI_API_KEY` w `test-memory.js`
  - Dodano fallback `process.env.OPENAI_API_KEY` w `chat-with-memory.js`
  - Dodano logowanie klucza OpenAI w `server.js` startup

##### **2. Stworzenie tabeli memories_v2 w Supabase**
- **Problem**: Tabela `memories_v2` nie istniała w bazie danych
- **Błąd**: `"relation \"public.memories_v2\" does not exist"`
- **Rozwiązanie**:
  - Utworzono `create-memories-v2.sql` - kompletny schema dla produkcji
  - Uruchomiono SQL w Supabase SQL Editor
  - Utworzono funkcje: `match_memories_v2()`, `get_memories_by_type_v2()`
  - Zaktualizowano MemoryManager do używania nowych funkcji

##### **3. Naprawiono admin panel**
- **Problem**: `column users.full_name does not exist`
- **Rozwiązanie**: Zmieniono `full_name` → `name` w queries i UI

#### 🛠️ **Endpointy debug utworzone:**
- `/api/debug-tables` - sprawdzanie istnienia tabel w Supabase
- `/api/test-memories-v2` - bezpośredni test dostępu do `memories_v2`
- `/api/create-test-user` - tworzenie test usera
- `/api/setup-openai-key` - zapisywanie env key do config

#### ✅ **Rezultaty końcowe:**
- **MemoryManager**: `enabled: true`, `initialized: true`
- **Test endpoint**: `status: "ok"`, wszystkie testy przechodzą
- **Memory system**: Zapisuje i odczytuje wspomnienia z similarity search
- **Admin panel**: Pokazuje użytkowników z pamięcią, inline editing działa
- **Function calling**: AI automatycznie zapisuje ważne informacje

#### 🔍 **Narzędzia debug użyte:**
- **curl** - testowanie API endpoints w produkcji
- **Railway logs** - diagnostyka błędów deployment
- **Supabase SQL Editor** - tworzenie tabel i funkcji
- **Git commits** - systematyczne śledzenie zmian (8 commitów)

#### 📦 **Technologie użyte:**
- **LangChain 0.3.6** - orchestracja AI workflows
- **OpenAI Embeddings** - text-embedding-ada-002 (1536D vectors)
- **pgvector** - PostgreSQL extension dla wektorów semantycznych
- **Supabase** - PostgreSQL database z pgvector
- **Railway** - hosting z auto-deploy z GitHub
- **Express.js** - backend server
- **Vanilla JavaScript** - frontend admin panel

#### 🧪 **Testy wykonane:**
1. **Memory system test**: `/api/test-memory` - ✅ PASS
2. **Table access test**: `/api/test-memories-v2` - ✅ PASS  
3. **Admin API test**: `/api/admin/memory?action=users` - ✅ PASS
4. **UI test**: Memory Viewer w admin panelu - ✅ PASS
5. **Function calling test**: AI zapisuje wspomnienia - ✅ PASS

### 📊 **Stan projektu po sesji 13:**
**Projekt jest w ~85% gotowy** - system pamięci w pełni funkcjonalny!

#### ✅ **Co działa:**
- Chat z AI + streaming
- System pamięci z function calling
- Memory Viewer w admin panelu  
- Autoryzacja użytkowników
- Historia rozmów i ulubione
- Railway deployment
- Admin panel z konfiguracją

#### 🔄 **Co zostało (15%):**
- UI systemu konwersacji (sidebar)
- UI sekcji "Co o mnie wiesz?"
- OAuth (Google/Apple login)
- PWA (instalacja mobilna)
- Testy jednostkowe

### 🎯 **Następne kroki:**
1. **Test function calling** w prawdziwym czacie z userem
2. **UI konwersacji** - sidebar z listą konwersacji
3. **UI pamięci** - sekcja "Co o mnie wiesz?" dla userów
4. **PWA features** - instalacja mobilna

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