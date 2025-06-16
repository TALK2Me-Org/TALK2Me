# TALK2Me - Stan Projektu & Historia

## 📋 O Projekcie
**TALK2Me** - Aplikacja mobilna AI do pomocy w komunikacji w związkach
- **Właściciel**: Natalia Rybarczyk (Nat-thelifecreator)
- **Współpracownik**: Maciej (narzeczony Natalii)
- **Repo GitHub**: https://github.com/Nat-thelifecreator/TALK2Me

## 🚀 AKTUALNE ŚRODOWISKA (Styczeń 2025)

### 🔴 PRODUKCJA (Railway) - GŁÓWNE
- **URL**: https://talk2me.up.railway.app
- **Branch**: `railway-migration` ⚠️ (NIE main!)
- **Platforma**: Railway.app (Express.js server)
- **Deploy**: Auto-deploy przy każdym push na `railway-migration`
- **Status**: ⚠️ Deployment issues - healthcheck failing

### 🟡 BACKUP (Vercel) - STARE
- **URL**: https://tk2me.vercel.app
- **Branch**: `main`
- **Platforma**: Vercel (Serverless Functions)
- **Deploy**: Auto-deploy z main (obecnie nieużywane)
- **Status**: ✅ Działa jako backup

## 🎯 Aktualny Stan (16 Stycznia 2025, 08:00)
Projekt jest **~80% gotowy** - podstawowe funkcje działają + system pamięci AI DZIAŁA! 🎉

### ✅ Co Działa
1. **Chat z AI** - streaming odpowiedzi w czasie rzeczywistym
2. **Autoryzacja** - logowanie/rejestracja użytkowników (custom JWT)
3. **Admin Panel** - zarządzanie konfiguracją (/admin, hasło: qwe123)
4. **Historia rozmów** - zapisywanie czatów w bazie
5. **Ulubione** - oznaczanie ważnych wiadomości
6. **System konwersacji** - backend gotowy, frontend w trakcie
7. **System pamięci AI** - LangChain + pgvector ✅ DZIAŁA!
   - Embeddings OpenAI text-embedding-ada-002
   - Similarity search z pgvector
   - Function calling `remember_this()`
   - Test endpoint: `/api/test-memory`
8. **Railway deployment** - ✅ Naprawiony i działa

### 🆕 Naprawione w Sesji 11
1. **Railway deployment** - healthcheck działa, auto-deploy OK
2. **Memory system** - zapisuje i odczytuje wspomnienia
3. **LangChain dependencies** - dodano @langchain/core
4. **Test endpoint** - pełny test systemu pamięci

### ❌ Czego Brakuje (20% projektu)
1. **UI konwersacji** - frontend dla systemu konwersacji
2. **UI pamięci** - "Co o mnie wiesz?" sekcja
3. **OAuth** - logowanie przez Google/Apple
4. **PWA** - instalacja jako aplikacja mobilna
5. **Testy jednostkowe** - zero coverage
6. **Function calling w prawdziwym czacie** - do przetestowania

## 🏗️ ARCHITEKTURA PROJEKTU

### 📁 Struktura Katalogów - PEŁNA (Stan na 16.01.2025)
```
/Users/nataliarybarczyk/TALK2Me/
│
├── 🔧 PLIKI KONFIGURACYJNE
│   ├── 📄 server.js                    # Express.js server dla Railway (główny plik)
│   ├── 📄 railway.json                 # Railway deployment config (healthcheck, build)
│   ├── 📄 nixpacks.toml               # Railway build process config (Node 18)
│   ├── 📄 package.json                 # Dependencies (LangChain, OpenAI, Supabase)
│   ├── 📄 vercel.json                  # Stara konfiguracja Vercel (backup)
│   └── 📄 .gitignore                   # Ignorowane pliki (package-lock.json)
│
├── 📚 DOKUMENTACJA
│   ├── 📄 CLAUDE.md                    # 🔥 GŁÓWNA DOKUMENTACJA (TEN PLIK)
│   ├── 📄 CHANGELOG.md                 # Historia zmian po sesjach
│   ├── 📄 README.md                    # Podstawowy opis projektu
│   ├── 📄 DEVELOPER_GUIDE.md           # Przewodnik dla developerów
│   ├── 📄 TECH_STACK.md                # Opis technologii
│   ├── 📄 PROJECT_STRUCTURE.md         # Struktura projektu
│   ├── 📄 MEMORY_ARCHITECTURE.md       # Architektura systemu pamięci
│   └── 📄 MIGRATION_GUIDE.md           # Przewodnik migracji
│
├── 📁 public/                          # FRONTEND (Static Files)
│   ├── 📄 index.html                   # Główna aplikacja czatu (SPA)
│   ├── 📄 login.html                   # Strona logowania/rejestracji
│   ├── 📄 admin.html                   # Panel administratora
│   ├── 📄 test-memory.html             # Strona testowa systemu pamięci
│   ├── 📄 styles.css                   # Główne style (CSS Variables)
│   ├── 📄 manifest.json                # PWA manifest
│   ├── 📁 icons/                       # Ikony aplikacji (PWA)
│   └── 📄 index-*.html                 # Backup/wersje developerskie
│
├── 📁 api/                             # BACKEND HANDLERS (Express.js)
│   ├── 📄 chat.js                      # Podstawowy chat (fallback)
│   ├── 📄 chat-with-memory.js          # 🔥 Chat z pamięcią (LangChain)
│   ├── 📄 history.js                   # Historia rozmów (legacy)
│   ├── 📄 favorites.js                 # Ulubione wiadomości
│   ├── 📄 conversations.js             # System konwersacji
│   ├── 📄 test-memory.js               # Test endpoint systemu pamięci
│   │
│   ├── 📁 auth/                        # AUTORYZACJA
│   │   ├── 📄 login.js                 # Login endpoint (JWT)
│   │   ├── 📄 register.js              # Rejestracja użytkowników
│   │   ├── 📄 me.js                    # Dane zalogowanego usera
│   │   └── 📄 verify.js                # Weryfikacja email (TODO)
│   │
│   └── 📁 admin/                       # PANEL ADMINA
│       ├── 📄 config.js                # Zarządzanie konfiguracją
│       └── 📄 debug.js                 # Debug info & stats
│
├── 📁 lib/                             # BIBLIOTEKI POMOCNICZE
│   └── 📄 memory-manager.js            # 🔥 Manager pamięci AI (LangChain)
│
├── 📁 SQL/                             # SCHEMATY BAZY DANYCH
│   ├── 📄 create-test-user.sql         # Tworzenie test usera (UUID)
│   ├── 📄 001_optimized_schema.sql     # Zoptymalizowany schemat
│   ├── 📄 002_migration_script.sql     # Skrypt migracji
│   ├── 📄 003_rollback_script.sql      # Rollback migracji
│   └── 📄 COMBINED_MIGRATION.sql       # Kompletna migracja
│
├── 📁 ROOT SQL FILES                   # Schematy w głównym katalogu
│   ├── 📄 supabase-schema.sql          # Podstawowy schemat DB
│   ├── 📄 supabase-conversations.sql   # System konwersacji
│   ├── 📄 supabase-memory-schema.sql   # 🔥 System pamięci (pgvector)
│   └── 📄 cleanup-and-test-user.sql    # Czyszczenie + test data
│
├── 📁 mobile/                          # PROTOTYPY MOBILNE (archiwum)
│   ├── 📄 prototype-*.html             # Różne wersje prototypów
│   └── 📄 login.html                   # Mobilny login
│
├── 📁 backend/                         # STARY BACKEND (nieużywany)
│   └── 📄 *.js                         # Legacy pliki
│
├── 📁 archive/                         # ARCHIWUM
│   ├── 📄 README_legacy.md             # Stara dokumentacja
│   └── 📄 PROJECT_DOCUMENTATION_*.md   # Historie projektu
│
├── 📁 design/                          # DESIGN
│   └── 📄 ui-concept.md                # Koncepcja UI
│
├── 📁 .claude/                         # CLAUDE AI CONFIG
│   └── 📄 settings.local.json          # Lokalne ustawienia Claude
│
└── 📄 PLIKI POMOCNICZE
    ├── 📄 migrate.js                   # Skrypt migracji DB
    ├── 📄 test-db-connection.js        # Test połączenia z DB
    ├── 📄 test-memory-local.js         # Lokalny test pamięci
    └── 📄 verify-migration.js          # Weryfikacja migracji
```

### 🔑 Najważniejsze pliki:
1. **server.js** - główny serwer Express.js
2. **api/chat-with-memory.js** - chat z systemem pamięci
3. **lib/memory-manager.js** - zarządzanie pamięcią AI
4. **public/index.html** - główny UI aplikacji
5. **CLAUDE.md** - ta dokumentacja

## 🛠️ STACK TECHNOLOGICZNY

### Frontend
- **Framework**: Vanilla JavaScript (SPA)
- **Styling**: Custom CSS z CSS Variables
- **API Communication**: Fetch API z Server-Sent Events (SSE)
- **State Management**: LocalStorage + in-memory
- **Auth**: JWT tokens w localStorage

### Backend
- **Server**: Express.js na Railway
- **Database**: Supabase (PostgreSQL)
- **AI Models**: 
  - OpenAI GPT-3.5/4 (primary)
  - Groq Llama3 (fallback)
- **Memory System**: 
  - LangChain 0.3.6
  - pgvector dla embeddings
  - OpenAI text-embedding-ada-002
- **Auth**: Custom JWT implementation
- **Streaming**: Server-Sent Events (SSE)

### External Services & APIs

#### 🌐 Usługi produkcyjne:
1. **Supabase** (https://supabase.com)
   - PostgreSQL database z pgvector extension
   - Przechowywanie: users, messages, memories, conversations
   - Service Role Key dla backend operations
   - Anon Key dla frontend (nieużywany obecnie)

2. **OpenAI API** (https://platform.openai.com)
   - Chat completions: GPT-3.5/GPT-4
   - Embeddings: text-embedding-ada-002 (1536D vectors)
   - Assistant API: przechowywanie system prompt
   - Function calling: `remember_this()`

3. **Groq API** (https://groq.com) - FALLBACK
   - Model: llama3-8b-8192
   - Używany gdy OpenAI nie działa
   - Brak wsparcia dla function calling

4. **Railway** (https://railway.app) - GŁÓWNY HOSTING
   - Auto-deploy z branch `railway-migration`
   - Health checks co 10s
   - Region: europe-west4
   - URL: https://talk2me.up.railway.app

5. **Vercel** (https://vercel.com) - BACKUP
   - Stary hosting (serverless functions)
   - URL: https://tk2me.vercel.app
   - Branch: main (nieaktywny)

6. **GitHub** (https://github.com/Nat-thelifecreator/TALK2Me)
   - Version control
   - Webhooks dla auto-deploy
   - Branch strategy: `railway-migration` (prod), `main` (legacy)

#### 🔑 Klucze API (przechowywane w Supabase app_config):
- `openai_api_key` - klucz OpenAI
- `groq_api_key` - klucz Groq
- `assistant_id` - ID asystenta OpenAI
- `jwt_secret` - sekret dla tokenów JWT

## 📊 DATABASE SCHEMA

### Główne Tabele
1. **users** - dane użytkowników
2. **chat_history** - historia czatów (legacy)
3. **conversations** - konwersacje (nowy system)
4. **messages** - wiadomości w konwersacjach
5. **memories** - wspomnienia AI z embeddings (pgvector)
6. **app_config** - konfiguracja aplikacji
7. **sessions** - sesje użytkowników

### pgvector Setup
```sql
-- Extension dla semantic search
CREATE EXTENSION vector;

-- Tabela memories z 1536-wymiarowymi embeddings
CREATE TABLE memories (
  embedding VECTOR(1536),
  -- ... inne kolumny
);
```

## 🔧 KONFIGURACJA

### Zmienne Środowiskowe
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://hpxzhbubvdgxdvwxmhzo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Server
PORT=3000
NODE_ENV=production
```

### Admin Panel Config (w bazie)
- `openai_api_key` - klucz OpenAI
- `groq_api_key` - klucz Groq
- `assistant_id` - ID asystenta OpenAI
- `jwt_secret` - sekret dla JWT
- `active_model` - aktywny model (openai/groq)
- `temperature`, `max_tokens` - parametry AI

## 📝 CHANGELOG

### Sesja 10 - System Pamięci z LangChain (14.01.2025, 17:00-01:30)
**Developer**: Claude (AI Assistant)

#### ✅ Zrealizowane:
1. **Schemat bazy danych pgvector**
   - Utworzono `supabase-memory-schema.sql`
   - Tabela `memories` z 1536D embeddings
   - Funkcje SQL dla similarity search
   - RLS policies dla bezpieczeństwa

2. **MemoryManager z LangChain**
   - Klasa w `lib/memory-manager.js`
   - Integracja z OpenAI Embeddings
   - Ekstrakcja entities (imiona, daty, relacje)
   - Formatowanie kontekstu dla AI

3. **Function Calling w Chat API**
   - `chat-with-memory.js` z funkcją `remember_this()`
   - Automatyczne rozpoznawanie ważnych informacji
   - Zasady zarządzania pamięcią w system prompt
   - Streaming z obsługą function calls

4. **Debugging i Naprawy**
   - Rozbudowane logowanie dla troubleshootingu
   - Fix: zmiana z `tools` na `functions` (stary format OpenAI)
   - Fix: health check dla Railway
   - Fix: dependencies conflicts (usunięcie package-lock.json)

#### ⚠️ Problemy napotkane:
1. **Railway deployment failures**
   - Health check timeouts
   - npm ci conflicts z package-lock.json
   - LangChain dependencies issues

2. **Memory system nie zapisuje**
   - Auth działa poprawnie
   - MemoryManager się nie inicjalizuje
   - Function calling nie jest wywoływane przez AI

3. **Tymczasowe rozwiązania**
   - Usunięto SupabaseVectorStore (problemy z buildem)
   - package-lock.json dodany do .gitignore
   - Error handling żeby app działała bez pamięci

#### 🛠️ Użyte narzędzia:
- **LangChain** - orchestracja AI workflows
- **pgvector** - PostgreSQL extension dla wektorów
- **OpenAI Embeddings** - tworzenie embeddings
- **Railway logs** - debugging deployment
- **Git** - version control z branch `railway-migration`

#### 📊 Stan końcowy:
- System pamięci zaimplementowany ale nie działa w produkcji
- Kod gotowy, wymaga debugowania deployment
- Dokumentacja zaktualizowana
- Testy manualne pokazują że auth działa

### 🔮 TODO na następną sesję:
1. **Test function calling w prawdziwym czacie** 🎯 PRIORYTET
   - Zalogować się jako prawdziwy user
   - Napisać wiadomości z informacjami osobistymi
   - Sprawdzić czy AI wywołuje `remember_this()`
   - Zweryfikować w bazie czy pamięć się zapisuje

2. **UI konwersacji - sidebar**
   - Lista konwersacji po lewej stronie
   - Przełączanie między konwersacjami
   - Tworzenie nowej konwersacji
   - Zmiana nazwy konwersacji

3. **UI pamięci - "Co o mnie wiesz?"**
   - Nowa zakładka/modal w aplikacji
   - Wyświetlanie zapisanych wspomnień
   - Grupowanie po typach (personal, relationship, preference, event)
   - Możliwość usunięcia wspomnienia

4. **PWA - instalacja mobilna**
   - Service Worker dla offline
   - Manifest.json z ikonami
   - Install prompt na iOS/Android

## 🚨 WAŻNE DLA KOLEJNYCH DEVELOPERÓW

### Zasady pracy:
1. **ZAWSZE pracuj na branchu `railway-migration`** (nie main!)
2. **ZAWSZE aktualizuj CHANGELOG.md** po każdej sesji
3. **ZAWSZE testuj lokalnie** przed deployem
4. **ZAWSZE sprawdzaj logi Railway** po deploy

### Jak debugować memory system:
1. Sprawdź logi w Railway Dashboard
2. Szukaj: `🧠 MemoryManager initialized`
3. Sprawdź Admin Panel czy jest OpenAI key
4. Test z prostą wiadomością: "Mój mąż Maciej jest programistą"

### Struktura commitów:
```
🔧 Fix: [opis]
✨ Feature: [opis]  
📝 Docs: [opis]
🐛 Bug: [opis]
♻️ Refactor: [opis]
```

### Kontakt:
- **Owner**: Natalia Rybarczyk
- **GitHub**: https://github.com/Nat-thelifecreator/TALK2Me
- **Production**: https://talk2me.up.railway.app

---
### Sesja 11 - Railway deployment & Memory System FIX (16.01.2025, 05:00-08:00)
**Developer**: Claude (AI Assistant)

#### ✅ Zrealizowane:
1. **Naprawiono Railway deployment**
   - Dodano brakującą zależność `@langchain/core`
   - Zmniejszono healthcheck timeout z 120s na 30s
   - Usunięto `npm ci` z build command
   - Dodano `nixpacks.toml` dla kontroli build process

2. **Naprawiono Memory System**
   - MemoryManager zmieniony z singleton na per-user cache
   - Test endpoint `/api/test-memory` działa poprawnie
   - Tworzy test usera z UUID: `11111111-1111-1111-1111-111111111111`
   - Zapisuje i odczytuje wspomnienia z similarity search

3. **Dodano nowe endpointy**
   - `/api/test-memory` - pełny test systemu pamięci
   - `/api/memory-status` - sprawdzanie statusu handlerów
   - `/api/routes` - lista wszystkich zarejestrowanych route'ów

4. **Dokumentacja i testy**
   - Utworzono `SQL/create-test-user.sql` dla ręcznego tworzenia test usera
   - Rozbudowane logowanie w każdym kroku
   - Zaktualizowano CHANGELOG.md

#### 🔧 Użyte technologie i narzędzia:
- **LangChain 0.3.6** - orchestracja AI workflows
- **@langchain/core 0.3.58** - core functionality
- **@langchain/openai 0.3.14** - integracja z OpenAI
- **pgvector** - PostgreSQL extension dla wektorów
- **OpenAI Embeddings** - model text-embedding-ada-002
- **Railway** - hosting z auto-deploy
- **Git** - version control na branch `railway-migration`

#### 📦 Stan końcowy:
- System pamięci DZIAŁA w produkcji
- Test endpoint pokazuje: `"status": "ok"`
- Railway deployment stabilny
- Dokumentacja zaktualizowana

---
**Ostatnia aktualizacja**: 16 stycznia 2025, 08:00
**Sesja**: #11
**Status**: 🟢 System pamięci działa, deployment stabilny