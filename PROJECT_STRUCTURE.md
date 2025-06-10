# 🗂️ STRUKTURA PROJEKTU TALK2Me

## 📁 Pełne drzewo katalogów z opisami

```
/Users/nataliarybarczyk/TALK2Me/
│
├── 📁 api/                           # Vercel Serverless Functions (backend)
│   ├── 📁 admin/                     # Endpointy panelu administratora
│   │   ├── config.js                 # GET/PUT - zarządzanie konfiguracją AI (klucze API, modele)
│   │   └── debug.js                  # GET - endpoint debugowania, info o cache promptu
│   │
│   ├── 📁 auth/                      # System autoryzacji
│   │   ├── login.js                  # POST - logowanie użytkownika (JWT token)
│   │   ├── register.js               # POST - rejestracja nowego użytkownika
│   │   ├── verify.js                 # POST - weryfikacja adresu email
│   │   └── me.js                     # GET - dane zalogowanego użytkownika
│   │
│   ├── chat.js                       # POST - GŁÓWNY endpoint czatu z AI
│   │                                 # - Streaming SSE responses
│   │                                 # - OpenAI Chat Completions + Groq fallback
│   │                                 # - Cache promptu z Assistant API
│   │
│   ├── conversations.js              # GET/POST/PUT/DELETE - system konwersacji
│   │                                 # - Lista konwersacji użytkownika
│   │                                 # - CRUD operations
│   │                                 # - Integracja z messages table
│   │
│   ├── favorites.js                  # GET/POST/DELETE - ulubione wiadomości
│   │                                 # - Zapisywanie ważnych odpowiedzi
│   │
│   └── history.js                    # GET/POST - historia czatów
│                                     # - Pobieranie poprzednich rozmów
│                                     # - Zapisywanie nowych wpisów
│
├── 📁 backend/                       # STARY backend (nieużywany)
│   ├── auth.js                       # Stara autoryzacja Express
│   ├── database.js                   # SQLite connection (zastąpione Supabase)
│   ├── server.js                     # Express server localhost:3001
│   ├── test-api.js                   # Testy API
│   ├── test-claude.js                # Test integracji Claude
│   ├── package.json                  # Dependencies starego backendu
│   └── node_modules/                 # Moduły Node.js
│
├── 📁 public/                        # Frontend - pliki statyczne
│   ├── index.html                    # ⭐ GŁÓWNA APLIKACJA
│   │                                 # - Mobile-first UI
│   │                                 # - Chat interface
│   │                                 # - Menu boczne
│   │                                 # - Tryb gościa/zalogowany
│   │
│   ├── admin.html                    # Panel administratora
│   │                                 # - Konfiguracja AI
│   │                                 # - Zarządzanie kluczami API
│   │                                 # - Podgląd promptu
│   │                                 # - Hasło: qwe123
│   │
│   ├── login.html                    # Strona logowania/rejestracji
│   │                                 # - Formularz logowania
│   │                                 # - Link do rejestracji
│   │
│   ├── clear-storage.html            # Narzędzie czyszczenia localStorage
│   │
│   ├── index-backup-before-v2.html   # Backup przed zmianami v2
│   └── index-v2-conversations.html   # Prototyp UI z konwersacjami (wycofany)
│
├── 📁 mobile/                        # Prototypy mobilne (archiwum)
│   ├── prototype.html                # Pierwszy prototyp
│   ├── prototype-v2.html             # Iteracja 2
│   ├── prototype-v3.html             # Iteracja 3
│   ├── prototype-v4.html             # Iteracja 4
│   ├── prototype-working.html        # Działający prototyp
│   ├── prototype-final.html          # Finalny prototyp
│   ├── prototype-mobile.html         # Mobile-specific
│   ├── prototype-chatgpt-style.html  # Styl podobny do ChatGPT
│   └── login.html                    # Prototyp logowania
│
├── 📁 design/                        # Dokumentacja projektowa
│   └── ui-concept.md                 # Koncepcja UI/UX
│
├── 📄 Pliki konfiguracyjne
│   ├── package.json                  # ⚙️ Dependencies + ES6 modules
│   │                                 # - "type": "module"
│   │                                 # - Vercel dev dependencies
│   │
│   ├── vercel.json                   # ⚙️ Konfiguracja Vercel
│   │                                 # - Routing rules
│   │                                 # - Function settings
│   │
│   ├── .gitignore                    # Ignorowane pliki Git
│   └── .env                          # Zmienne środowiskowe (nie w repo!)
│
├── 📄 Skrypty SQL
│   ├── supabase-schema.sql           # 🗃️ Główny schemat bazy danych
│   │                                 # - users, chat_history, app_config
│   │
│   ├── supabase-conversations-schema.sql # 🗃️ Schemat dla konwersacji
│   │                                     # - conversations, messages tables
│   │
│   └── cleanup-and-test-user.sql     # Skrypt czyszczenia + test user
│
├── 📄 Dokumentacja
│   ├── CLAUDE.md                     # 📋 GŁÓWNA DOKUMENTACJA
│   │                                 # - Stan projektu
│   │                                 # - Historia sesji
│   │                                 # - Plany rozwoju
│   │
│   ├── CHANGELOG.md                  # 📝 Historia wszystkich zmian
│   │                                 # - Chronologiczny log sesji
│   │
│   ├── PROJECT_STRUCTURE.md          # 🗂️ Ten plik
│   │
│   ├── README.md                     # 📖 Publiczny opis projektu
│   │                                 # - Dla GitHub
│   │
│   ├── PROJECT_DOCUMENTATION.md      # 📚 Dokumentacja sesji 1-3
│   │                                 # - Szczegółowy opis początków
│   │
│   ├── PROJECT_DOCUMENTATION_V4.md   # 📚 Dokumentacja sesji 4
│   │                                 # - Migracja na cloud
│   │
│   ├── INSTRUKCJA_BAZA_DANYCH.md     # 💾 Instrukcja setup Supabase
│   │
│   ├── FAZA2_INSTRUKCJA_WDROZENIA.md # 🚀 Instrukcja systemu konwersacji
│   │
│   ├── VERCEL_DEPLOY_HOOK_INSTRUKCJA.md # 🔗 Auto-deploy setup (PL)
│   └── VERCEL_DEPLOY_HOOK_SETUP.md   # 🔗 Auto-deploy setup (EN)
│
└── 📄 Pliki głównego katalogu
    └── migration-to-conversations.sql # 🔄 Skrypt migracji (planowany)
```

## 🔑 Kluczowe pliki według funkcji

### 🎯 Frontend (User Interface)
- **Główna aplikacja**: `/public/index.html`
- **Panel admina**: `/public/admin.html`
- **Logowanie**: `/public/login.html`

### 🔌 Backend (API)
- **Chat z AI**: `/api/chat.js`
- **Autoryzacja**: `/api/auth/*.js`
- **Konwersacje**: `/api/conversations.js`
- **Admin**: `/api/admin/*.js`

### 🗃️ Baza danych
- **Schema**: `/supabase-schema.sql`
- **Konwersacje**: `/supabase-conversations-schema.sql`

### 📋 Dokumentacja
- **Główna**: `/CLAUDE.md`
- **Zmiany**: `/CHANGELOG.md`
- **Publiczna**: `/README.md`

## 📊 Statystyki projektu

### Liczba plików według typu:
- **JavaScript (API)**: 12 plików
- **HTML (Frontend)**: 14 plików
- **SQL**: 3 pliki
- **Markdown (Docs)**: 9 plików
- **JSON (Config)**: 2 pliki
- **Razem**: ~40 plików aktywnych

### Rozmiar i złożoność:
- **Linie kodu JS**: ~3000
- **Linie HTML/CSS**: ~5000
- **Dokumentacja**: ~3000 linii
- **Całkowity rozmiar**: ~2MB (bez node_modules)

## 🚀 Ścieżki deploymentu

### Obecnie (Vercel):
```
GitHub Push → Vercel Build → Deploy
    ↓             ↓            ↓
  Webhook    Serverless    CDN Edge
```

### Planowane (Railway):
```
GitHub Push → Railway Build → Deploy
    ↓             ↓            ↓
  Auto-deploy  Container    Single Server
```

---
**Ostatnia aktualizacja struktury**: 2025-01-09 23:00