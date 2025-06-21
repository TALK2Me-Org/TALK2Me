# 🗂️ STRUKTURA PROJEKTU TALK2Me

## 📁 Pełne drzewo katalogów z opisami (Stan na 19.06.2025)

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
│   ├── 📄 manifest.json                # 🆕 PWA manifest - kompletna konfiguracja
│   ├── 📄 sw.js                        # 🆕 Service Worker - offline cache & sync
│   ├── 📄 generate-icons.html          # 🆕 Generator ikon PWA (HTML + Canvas)
│   ├── 📁 icons/                       # 🆕 Ikony aplikacji PWA (8 rozmiarów)
│   │   ├── 📄 icon-72x72.png           # Ikona 72x72px (Android)
│   │   ├── 📄 icon-96x96.png           # Ikona 96x96px (Android)
│   │   ├── 📄 icon-128x128.png         # Ikona 128x128px (Desktop)
│   │   ├── 📄 icon-144x144.png         # Ikona 144x144px (Windows)
│   │   ├── 📄 icon-152x152.png         # Ikona 152x152px (iOS)
│   │   ├── 📄 icon-192x192.png         # Ikona 192x192px (Android Maskable)
│   │   ├── 📄 icon-384x384.png         # Ikona 384x384px (Splash Screen)
│   │   ├── 📄 icon-512x512.png         # Ikona 512x512px (High-res)
│   │   ├── 📄 icon.svg                 # Źródłowa ikona SVG
│   │   └── 📄 create-icons.js          # Node.js generator ikon (niewykorzystany)
│   └── 📄 index-*.html                 # Backup/wersje developerskie
│
├── 📁 api/                             # BACKEND HANDLERS (Express.js)
│   ├── 📄 README.md                    # 📋 API organization documentation
│   │
│   ├── 📁 user/                        # 👤 USER-FACING FEATURES
│   │   ├── 📄 chat-with-memory.js      # 🔥 Main chat with AI memory (LangChain)
│   │   ├── 📄 conversations.js         # Conversation management (CRUD)
│   │   ├── 📄 favorites.js             # User favorites for important messages
│   │   └── 📄 history.js               # Chat history (legacy support)
│   │
│   ├── 📁 auth/                        # 🔐 AUTHENTICATION & AUTHORIZATION
│   │   ├── 📄 login.js                 # User login with JWT tokens
│   │   ├── 📄 register.js              # User registration
│   │   ├── 📄 me.js                    # Current user data
│   │   └── 📄 verify.js                # Email verification (future)
│   │
│   ├── 📁 memory/                      # 🧠 AI MEMORY MANAGEMENT
│   │   ├── 📄 manager.js               # 🔥 MemoryManager class (LangChain + pgvector)
│   │   ├── 📄 save-memory.js           # Save memories with embeddings
│   │   ├── 📄 update-profile.js        # Update psychological profiles
│   │   └── 📄 summarize-memories.js    # AI-powered profile generation
│   │
│   ├── 📁 admin/                       # 🛡️ ADMIN PANEL FEATURES
│   │   ├── 📄 config.js                # AI configuration (keys, models)
│   │   ├── 📄 debug.js                 # System debugging information
│   │   └── 📄 memory.js                # Memory Viewer CRUD operations
│   │
│   └── 📁 debug/                       # 🔍 DEVELOPMENT & MONITORING
│       ├── 📄 test-memory.js           # Memory system health check
│       └── 📄 debug-tables.js          # Database table inspection
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
│   ├── 📄 supabase-memory-schema.sql   # System pamięci (legacy memories)
│   ├── 📄 create-memories-v2.sql       # 🔥 PRODUKCYJNY schema memories_v2
│   ├── 📄 cleanup-and-test-user.sql    # Czyszczenie + test data
│   ├── 📄 alter-memories-v2.sql        # TASK 1 - ALTER TABLE dla nowych kolumn
│   ├── 📄 TASK_1_EXECUTE.sql           # TASK 1 - Skrypt wykonawczy ALTER
│   ├── 📄 create-user-profile.sql      # TASK 2 - Schema tabeli user_profile
│   ├── 📄 create-test-user-nati.sql    # 🆕 Sesja 16 - Tworzenie test usera Nati
│   ├── 📄 update-importance-constraint.sql # 🆕 Sesja 16 - Update constraint 1-5
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
    ├── 📄 verify-migration.js          # Weryfikacja migracji
    ├── 📄 test-save-memory.js          # 🆕 TASK 3 - Test script dla save-memory
    ├── 📄 test-update-profile.js       # 🆕 TASK 4 - Test script dla update-profile
    └── 📄 test-summarize-memories.js   # 🆕 TASK 5 - Test script dla AI summarization
```

## 🔑 Kluczowe pliki według funkcji

### 🎯 Frontend (User Interface)
- **Główna aplikacja**: `/public/index.html` - SPA z chat interface
- **Panel admina**: `/public/admin.html` - zarządzanie konfiguracją i wspomnieniami
- **Logowanie**: `/public/login.html` - autoryzacja użytkowników
- **PWA**: `/public/manifest.json` + `/public/sw.js` - instalacja mobilna
- **Test pamięci**: `/public/test-memory.html` - debug systemu pamięci

### 🔌 Backend (API)
- **Chat z pamięcią**: `/api/chat-with-memory.js` - główny endpoint z LangChain
- **Autoryzacja**: `/api/auth/*.js` - login, register, JWT
- **Konwersacje**: `/api/conversations.js` - system rozmów
- **Memory Management**: `/api/save-memory.js`, `/api/update-profile.js`, `/api/summarize-memories.js`
- **Admin**: `/api/admin/*.js` - panel administracyjny
- **Test endpoints**: `/api/test-*.js` - debugowanie

### 🧠 System Pamięci AI
- **Memory Manager**: `/lib/memory-manager.js` - LangChain orchestration
- **Database Schema**: `/create-memories-v2.sql` - pgvector + embeddings
- **User Profiles**: `/create-user-profile.sql` - profile psychologiczne

### 🗃️ Baza danych
- **Główny schema**: `/supabase-schema.sql` - users, config, sessions
- **System pamięci**: `/create-memories-v2.sql` - memories_v2 z pgvector
- **Profile użytkowników**: `/create-user-profile.sql` - psychologiczne profile
- **Konwersacje**: `/supabase-conversations.sql` - system rozmów

### 📋 Dokumentacja
- **Główna**: `/CLAUDE.md` - kompleksowy opis projektu
- **Zmiany**: `/CHANGELOG.md` - historia sesji roboczych
- **Struktura**: `/PROJECT_STRUCTURE.md` - ten plik
- **Publiczna**: `/README.md` - opis dla GitHub

### 🔧 Konfiguracja
- **Server**: `/server.js` - Express.js dla Railway
- **Railway**: `/railway.json` + `/nixpacks.toml` - deployment config
- **Dependencies**: `/package.json` - LangChain, OpenAI, Supabase

## 📊 Statystyki projektu (Stan na 19.06.2025)

### Liczba plików według typu:
- **JavaScript (API + Lib)**: 25+ plików
- **HTML (Frontend + PWA)**: 15+ plików  
- **SQL (Schemas + Scripts)**: 15+ plików
- **Markdown (Docs)**: 10+ plików
- **JSON/Config**: 5+ plików
- **PWA Assets**: 10+ plików (ikony + manifest)
- **Razem**: ~80+ plików aktywnych

### Rozmiar i złożoność:
- **Backend JS**: ~8000+ linii (Express + LangChain)
- **Frontend HTML/CSS/JS**: ~6000+ linii (SPA + PWA)
- **SQL Schemas**: ~2000+ linii (PostgreSQL + pgvector)
- **Dokumentacja**: ~5000+ linii (CLAUDE.md + guides)
- **Całkowity rozmiar**: ~5MB (bez node_modules)

### Funkcjonalność:
- **Chat z AI**: ✅ Streaming SSE + Function Calling
- **System Pamięci**: ✅ LangChain + pgvector + embeddings
- **Memory Management**: ✅ CRUD API + Admin Panel
- **User Profiles**: ✅ AI-generated psychological profiles
- **PWA**: ✅ Installable mobile app + offline cache
- **Auth System**: ✅ JWT + user management
- **Admin Panel**: ✅ Configuration + Memory Viewer
- **Railway Deploy**: ✅ Auto-deploy + health checks
- **Test Coverage**: ✅ Production endpoints tested

## 🚀 Ścieżki deploymentu

### 🟢 Aktualnie (Railway - PRODUKCJA):
```
GitHub Push (main) → Railway Build → Deploy
         ↓               ↓           ↓
    Auto-webhook    Express.js    Europe-West4
                    Container     Single Server
```
**URL**: https://talk2me.up.railway.app  
**Branch**: `main` (aktywny)  
**Health checks**: ✅ Co 10s  
**Status**: 🟢 Stabilny  

### 🟡 Backup (Vercel - NIEAKTYWNY):
```
GitHub Push → Vercel Build → Deploy
    ↓             ↓            ↓
  Webhook    Serverless    CDN Edge
```
**URL**: https://tk2me.vercel.app  
**Status**: ⚠️ Może konflikować z Railway  

## 🏗️ Architektura techniczna

### Backend Stack:
- **Server**: Express.js na Railway (Node.js 18)
- **Database**: Supabase PostgreSQL + pgvector extension
- **AI**: OpenAI GPT-3.5/4 + text-embedding-ada-002
- **Memory**: LangChain 0.3.6 + function calling
- **Auth**: Custom JWT implementation
- **Streaming**: Server-Sent Events (SSE)

### Frontend Stack:
- **Framework**: Vanilla JavaScript SPA
- **PWA**: Service Worker + Manifest + Install Prompts
- **Styling**: Custom CSS z CSS Variables
- **State**: LocalStorage + in-memory cache
- **Icons**: 8 rozmiarów PNG (72px-512px)

### Database Schema:
- **users** - dane użytkowników + JWT sessions
- **memories_v2** - wspomnienia AI z embeddings (1536D vectors)
- **user_profile** - profile psychologiczne generowane przez AI  
- **conversations** + **messages** - system rozmów
- **app_config** - konfiguracja AI (klucze, modele)
- **chat_history** - legacy historia (backup)

---
**Ostatnia aktualizacja struktury**: 19 czerwca 2025, 00:00  
**Stan projektu**: 96% gotowy - backend kompletny + testy produkcyjne ✅