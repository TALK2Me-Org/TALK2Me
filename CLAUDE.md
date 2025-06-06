# TALK2Me - Stan Projektu & Historia

## 📋 O Projekcie
**TALK2Me** - Aplikacja mobilna AI do pomocy w komunikacji w związkach
- **Właściciel**: Natalia Rybarczyk (Nat-thelifecreator)
- **Współpracownik**: Maciej (narzeczony Natalii)
- **Repo GitHub**: https://github.com/Nat-thelifecreator/TALK2Me
- **Live URL**: https://talk2me2.vercel.app

## 🎯 Aktualny Stan (Grudzień 2024)
Projekt jest **~90% gotowy** i przeszedł pełną migrację z localhost na cloud:

### ✅ Ukończone Zadania
1. **Migracja bazy danych**: SQLite → Supabase (PostgreSQL)
2. **Migracja backendu**: Express.js localhost:3001 → Vercel Serverless Functions
3. **Zmiana API**: OpenAI Assistant API → OpenAI Chat Completions (szybsze odpowiedzi)
4. **Stworzenie admin panelu**: /admin z hasłem "qwe123"
5. **Konfiguracja deploymentu**: Vercel + GitHub auto-deploy
6. **Naprawienie błędów**: JavaScript syntax errors, ES6 modules, CORS

### 🔧 Architektura Techniczna
- **Frontend**: HTML/CSS/JavaScript (mobile-first)
- **Backend**: Vercel Serverless Functions (/api/)
- **Baza danych**: Supabase (PostgreSQL)
- **AI Models**: OpenAI GPT-3.5-turbo, Groq Llama (Claude wyłączony)
- **Deploy**: Vercel z GitHub webhook

## 📁 Struktura Projektu
```
/Users/nataliarybarczyk/TALK2Me/
├── public/
│   ├── index.html          # Główna aplikacja 
│   └── admin.html          # Panel administratora
├── api/
│   ├── chat.js            # Główny endpoint AI chat
│   ├── history.js         # Historia rozmów
│   ├── favorites.js       # Ulubione wiadomości
│   └── admin/config.js    # Zarządzanie konfiguracją
├── supabase-schema.sql    # Schema bazy danych
├── package.json           # Dependencies + "type": "module"
├── vercel.json           # Konfiguracja Vercel
└── CLAUDE.md             # Ten plik
```

## 🗃️ Supabase Database Schema
```sql
-- Tabele:
users (id, email, password, name, subscription_type, is_verified)
chat_history (id, user_id, message, response, ai_model, created_at)
app_config (id, config_key, config_value, updated_at)
```

## 🔑 Zmienne Środowiskowe (Vercel)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://cfnrhwgaevbltaflrvpz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ADMIN_PASSWORD=qwe123
```

## 🚀 Endpointy API
- `GET /api/setup` - Inicjalizacja bazy danych (✅ działa)
- `POST /api/chat` - Chat z AI (OpenAI + Groq fallback) - **⚠️ NIEPRZETESTOWANE**
- `GET/POST /api/history` - Historia rozmów użytkownika
- `GET/POST /api/favorites` - Zarządzanie ulubionymi
- `GET/PUT /api/admin/config` - Panel admin (hasło: qwe123)

### 🤖 Chat API Szczegóły (/api/chat)
**Format zapytania**:
```json
POST /api/chat
{
  "message": "Partner powiedział: nie mam czasu na rozmowy",
  "userContext": "opcjonalny kontekst sytuacji"
}
```

**AI Logic Flow**:
1. **Primary**: OpenAI Chat Completions API (gpt-3.5-turbo)
2. **Fallback**: Groq API (llama3-8b-8192) 
3. **Emergency**: Mock response (zawsze działa)

**System Prompt**: Jamie - empatyczny asystent do relacji
- 4-częściowa struktura odpowiedzi
- Styl: ciepły, zabawny, wspierający
- Format: ❤️ Przede wszystkim, 🤔 Co się wydarzyło, 🌿 Komunikacja, 💬 Spróbuj powiedzieć

**Response Speed**: 
- OpenAI: ~1-2s (szybkie!)
- Groq: ~2-3s (darmowy fallback)
- Mock: instant

## 🛠️ Ostatnie Zmiany & Fixes
1. **JavaScript Error Fix**: Naprawiony błąd w index.html:1891 (duplicate method)
2. **ES6 Modules**: Dodano "type": "module" do package.json
3. **Auto-deploy**: Skonfigurowany webhook GitHub → Vercel
4. **Testing**: Testy auto-deploy z version bump v1.1 → v1.3

## 📋 Co Zostało Do Zrobienia (Jutro)
1. **🔑 PRIORYTET: Skonfigurować API Keys** w admin panelu:
   - OpenAI API key do /admin 
   - Groq API key do /admin
   - Test czy API keys się zapisują w Supabase app_config
2. **🤖 KLUCZOWE: Test Chat Completions API**:
   - Sprawdzić czy POST /api/chat działa z prawdziwymi API keys
   - Test OpenAI gpt-3.5-turbo response
   - Test Groq fallback
   - Sprawdzić szybkość odpowiedzi (powinno być ~1-2s vs 15-30s Assistant API)
3. **Test pełnej funkcjonalności**: Historia, favorites
4. **Weryfikacja haseł**: Admin login i user auth

## 📞 Kontakt & Komendy
- **Admin Panel**: https://talk2me2.vercel.app/admin (hasło: qwe123)
- **Testowe komendy**:
  ```bash
  npm run dev          # Vercel dev mode
  git push            # Auto-deploy via webhook
  ```

## 🐛 Known Issues
- ~~Auto-deploy nie działał~~ ✅ FIXED
- ~~JavaScript syntax errors~~ ✅ FIXED  
- ~~API endpoints 500 errors~~ ✅ FIXED
- **⚠️ CRITICAL**: Chat Completions API nieprzetestowane - brak API keys w production
- **Pending**: Konfiguracja OpenAI/Groq keys w admin panelu
- **Unknown**: Czy szybkość odpowiedzi rzeczywiście ~1-2s (vs poprzednie 15-30s Assistant API)

## 💡 Uwagi Techniczne
- Projekt używa ES6 modules (import/export)
- Wszystkie endpointy używają Supabase RLS (Row Level Security)
- Admin panel wymaga Bearer token authorization
- Chat używa OpenAI jako primary, Groq jako fallback
- Mobile-first responsive design

## 🎨 Design & UX
- Kolor główny: #FF69B4 (różowy)
- Mobile-optimized (iOS/Android)
- PWA ready (Apple Web App capable)
- Smooth animations i transitions

---
**Ostatnia aktualizacja**: 6 grudnia 2024
**Status**: Gotowe do finalnych testów i konfiguracji API keys