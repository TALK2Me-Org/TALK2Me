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

## 🎯 Aktualny Stan (14 Stycznia 2025, 01:30)
Projekt jest **~75% gotowy** - podstawowe funkcje działają + system pamięci AI zaimplementowany:

### ✅ Co Działa
1. **Chat z AI** - streaming odpowiedzi w czasie rzeczywistym
2. **Autoryzacja** - logowanie/rejestracja użytkowników (custom JWT)
3. **Admin Panel** - zarządzanie konfiguracją (/admin, hasło: qwe123)
4. **Historia rozmów** - zapisywanie czatów w bazie
5. **Ulubione** - oznaczanie ważnych wiadomości
6. **System konwersacji** - backend gotowy, frontend w trakcie
7. **System pamięci AI** - LangChain + pgvector (zaimplementowany, wymaga debugowania)

### ⚠️ W Trakcie Naprawy
1. **Railway deployment** - healthcheck failures
2. **Memory system** - nie zapisuje wspomnień (auth działa, ale function calling nie triggeruje)
3. **LangChain dependencies** - konflikty wersji

### ❌ Czego Brakuje (25% projektu)
1. **UI konwersacji** - frontend dla systemu konwersacji
2. **Optymalizacja wydajności** - cache'owanie, indeksy
3. **OAuth** - logowanie przez Google/Apple
4. **PWA** - instalacja jako aplikacja mobilna
5. **Testy jednostkowe** - zero coverage
6. **Semantic search** - pełna integracja pgvector

## 🏗️ ARCHITEKTURA PROJEKTU

### 📁 Struktura Katalogów
```
/Users/nataliarybarczyk/TALK2Me/
├── 📄 server.js                    # Express.js server dla Railway
├── 📄 railway.json                 # Konfiguracja Railway deployment
├── 📄 package.json                 # Dependencies + scripts
├── 📄 .gitignore                   # Ignorowane pliki (w tym package-lock.json)
├── 📄 CLAUDE.md                    # Główna dokumentacja projektu (TEN PLIK)
├── 📄 CHANGELOG.md                 # Historia zmian (NOWY)
│
├── 📁 public/                      # Frontend (static files)
│   ├── 📄 index.html               # Główna aplikacja SPA
│   ├── 📄 login.html               # Strona logowania/rejestracji
│   ├── 📄 admin.html               # Panel administratora
│   ├── 📄 test-memory.html         # Strona testowa dla systemu pamięci
│   ├── 📄 styles.css               # Główne style aplikacji
│   ├── 📄 manifest.json            # PWA manifest
│   └── 📁 icons/                   # Ikony aplikacji
│
├── 📁 api/                         # Backend handlers
│   ├── 📄 chat.js                  # Podstawowy chat endpoint
│   ├── 📄 chat-with-memory.js      # Chat z systemem pamięci LangChain
│   ├── 📄 history.js               # Historia rozmów
│   ├── 📄 favorites.js             # Ulubione wiadomości
│   ├── 📄 conversations.js         # System konwersacji
│   ├── 📁 auth/                    # Autoryzacja
│   │   ├── 📄 login.js             # Endpoint logowania
│   │   ├── 📄 register.js          # Endpoint rejestracji
│   │   ├── 📄 me.js                # Dane użytkownika
│   │   └── 📄 verify.js            # Weryfikacja email
│   └── 📁 admin/                   # Panel admina
│       ├── 📄 config.js            # Zarządzanie konfiguracją
│       └── 📄 debug.js             # Debug info
│
├── 📁 lib/                         # Biblioteki pomocnicze
│   └── 📄 memory-manager.js        # Manager pamięci AI (LangChain)
│
├── 📁 archive/                     # Stara dokumentacja
│   ├── 📄 README_legacy.md
│   └── 📄 PROJECT_DOCUMENTATION_*.md
│
└── 📁 SQL/                         # Schematy bazy danych
    ├── 📄 supabase-schema.sql      # Podstawowy schemat
    ├── 📄 supabase-conversations-schema.sql  # System konwersacji
    └── 📄 supabase-memory-schema.sql         # System pamięci z pgvector
```

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

### External Services
- **Supabase**: Database + Auth (tylko baza używana)
- **OpenAI API**: Chat completions + Embeddings + Assistant API
- **Groq API**: Fallback AI provider
- **Railway**: Hosting produkcyjny
- **Vercel**: Backup hosting
- **GitHub**: Version control + auto-deploy

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
1. **Naprawić Railway deployment**
   - Sprawdzić logi build process
   - Może zmienić na Docker zamiast Nixpacks
   - Alternatywa: wrócić do Vercel z memory API jako osobny serwis

2. **Debug memory system**
   - Dlaczego MemoryManager się nie inicjalizuje?
   - Czy OpenAI API key jest poprawnie przekazywany?
   - Test function calling w izolacji

3. **UI dla konwersacji**
   - Sidebar z listą konwersacji
   - Integracja z istniejącym UI

4. **Optymalizacja**
   - Cache embeddings
   - Batch operations dla memory save

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
**Ostatnia aktualizacja**: 14 stycznia 2025, 01:30
**Sesja**: #10
**Status**: 🔴 Deployment issues, memory system implemented but not working