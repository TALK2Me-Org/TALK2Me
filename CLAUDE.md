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
- **Status**: ✅ Działa, ale wymaga optymalizacji

### 🟡 BACKUP (Vercel) - STARE
- **URL**: https://tk2me.vercel.app
- **Branch**: `main`
- **Platforma**: Vercel (Serverless Functions)
- **Deploy**: Auto-deploy z main (obecnie nieużywane)
- **Status**: ✅ Działa jako backup

## 🎯 Aktualny Stan (Styczeń 2025)
Projekt jest **~70% gotowy** - podstawowe funkcje działają, ale brakuje kluczowych elementów:

### ✅ Co Działa
1. **Chat z AI** - streaming odpowiedzi w czasie rzeczywistym
2. **Autoryzacja** - logowanie/rejestracja użytkowników
3. **Admin Panel** - zarządzanie konfiguracją (/admin, hasło: qwe123)
4. **Historia rozmów** - zapisywanie czatów w bazie
5. **Ulubione** - oznaczanie ważnych wiadomości
6. **Dwa środowiska** - Railway (prod) + Vercel (backup)

### ❌ Czego Brakuje (30% projektu)
1. **System pamięci AI** - personalizacja na podstawie historii użytkownika
2. **System konwersacji** - grupowanie czatów w wątki (jak ChatGPT)
3. **Optymalizacja wydajności** - serwer "muli", brak cache'owania
4. **OAuth** - logowanie przez Google/Apple
5. **PWA** - instalacja jako aplikacja mobilna
6. **Testy jednostkowe** - zero coverage

### 🔧 Architektura Techniczna

#### RAILWAY (Produkcja):
- **Frontend**: Static files served by Express
- **Backend**: Express.js server (server.js)
- **Branch**: `railway-migration`
- **RAM**: 8GB (vs 1GB na Vercel)
- **Deploy**: Git push → auto-deploy

#### VERCEL (Backup):
- **Frontend**: Static hosting
- **Backend**: Serverless Functions (/api/)
- **Branch**: `main`
- **RAM**: 1GB limit
- **Deploy**: Git push → auto-deploy

#### WSPÓLNE:
- **Baza danych**: Supabase (PostgreSQL)
- **AI Models**: OpenAI GPT-3.5-turbo, Groq Llama
- **Auth**: Custom JWT (nie Supabase Auth)

## 📁 Struktura Projektu
```
/Users/nataliarybarczyk/TALK2Me/
├── server.js              # 🆕 Express server dla Railway
├── railway.json           # 🆕 Konfiguracja Railway
├── public/
│   ├── index.html         # Główna aplikacja 
│   └── admin.html         # Panel administratora
├── api/                   # Handlery (używane przez oba środowiska)
│   ├── chat.js            # Główny endpoint AI chat
│   ├── history.js         # Historia rozmów
│   ├── favorites.js       # Ulubione wiadomości
│   ├── conversations.js   # 🆕 System konwersacji (w budowie)
│   └── admin/config.js    # Zarządzanie konfiguracją
├── lib/                   # 🔜 Przyszłe moduły
│   └── memory-manager.js  # (planowany) LangChain memory
├── archive/               # 🆕 Stara dokumentacja
│   ├── README_legacy.md
│   └── PROJECT_DOCUMENTATION_*.md
├── supabase-*.sql         # Schematy bazy danych
├── package.json           # Dependencies + scripts
├── vercel.json            # Konfiguracja Vercel (backup)
└── CLAUDE.md              # Ten plik (główna dokumentacja)
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
NEXT_PUBLIC_SUPABASE_URL=https://hpxzhbubvdgxdvwxmhzo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
**Uwaga**: Wszystkie inne konfiguracje (API keys, assistant ID, etc.) są teraz przechowywane w bazie danych i zarządzane przez panel admina.

## 🚀 Endpointy API
- `GET /api/setup` - Inicjalizacja bazy danych (✅ działa)
- `POST /api/chat` - Chat z AI (✅ Chat Completions + Streaming)
- `GET/POST /api/history` - Historia rozmów użytkownika
- `GET/POST /api/favorites` - Zarządzanie ulubionymi
- `GET/PUT /api/admin/config` - Panel admin (hasło: qwe123)
- `POST /api/auth/login` - Logowanie użytkownika
- `POST /api/auth/register` - Rejestracja nowego użytkownika
- `GET /api/auth/me` - Pobieranie danych zalogowanego użytkownika

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
3. **Streaming**: Server-Sent Events (SSE) dla płynnego wyświetlania

**Response Format**: 
- Streaming chunks przez SSE
- Format: `data: {"content": "tekst"}\n\n`
- Zakończenie: `data: [DONE]\n\n`
- Frontend wyświetla tekst w czasie rzeczywistym

**Response Speed**: 
- OpenAI Chat Completions: ~1-2s (z streamingiem)
- Groq: ~2-3s (bez streamingu, fallback)
- Poprzednio Assistant API: ~10-30s ❌

## ⚠️ KLUCZOWE INFORMACJE DLA DEVELOPERÓW

### 🔴 GDZIE PRACUJEMY:
- **Branch**: `railway-migration` (NIE main!)
- **Deploy**: Railway z brancha `railway-migration`
- **URL produkcji**: https://talk2me.up.railway.app
- **Każdy push** na `railway-migration` = auto-deploy

### 🟡 CO Z VERCEL:
- Branch `main` nadal działa na Vercel
- To tylko backup, NIE rozwijamy go
- URL: https://tk2me.vercel.app

### 🔧 JAK PRACOWAĆ:
```bash
# Zawsze sprawdź że jesteś na właściwym branchu!
git checkout railway-migration

# Twoje zmiany
git add .
git commit -m "opis"
git push origin railway-migration

# NIE pushuj do main!
```

## 🛠️ Ostatnie Zmiany & Fixes
1. **JavaScript Error Fix**: Naprawiony błąd w index.html:1891 (duplicate method)
2. **ES6 Modules**: Dodano "type": "module" do package.json
3. **Auto-deploy**: Skonfigurowany webhook GitHub → Vercel
4. **Testing**: Testy auto-deploy z version bump v1.1 → v1.3
5. **Assistant API Integration**: Usunięty hardkodowany prompt, zaimplementowana integracja z OpenAI Assistant API
6. **Auth System Restored**: Przywrócony system logowania/rejestracji z endpointami API
7. **Clean Assistant Messages**: Usunięte formatowanie wiadomości użytkownika - teraz przesyłana jest czysta wiadomość do Assistant API
8. **Removed 4-Section Format**: Usunięte formatowanie odpowiedzi na 4 sekcje - aplikacja wyświetla czystą odpowiedź z Assistant API
9. **🚀 CHAT COMPLETIONS + STREAMING**: Zamieniono wolne Assistant API na szybkie Chat Completions z SSE streamingiem (10x szybsze!)
10. **📝 Dokumentacja URL**: Zaktualizowano Supabase URL w dokumentacji na nowy projekt

## 📋 W Trakcie Realizacji
### ✅ FAZA 1 (UKOŃCZONA):
- Chat Completions z streamingiem
- 10x szybsze odpowiedzi (1-2s vs 10-30s)
- Płynne wyświetlanie tekstu

### 🚧 FAZA 2 - System Konwersacji (3h):
#### 2.1 Utworzenie nowych tabel (30min):
```sql
-- Tabela konwersacji
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  title TEXT,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela wiadomości
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  user_id UUID NOT NULL REFERENCES users(id),
  role TEXT CHECK (role IN ('user', 'assistant', 'function', 'system')) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indeksy
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_conversations_user ON conversations(user_id, last_message_at DESC);
```

#### 2.2 Migracja danych (1h):
- Backup tabeli chat_history
- Grupowanie wiadomości po datach
- Utworzenie konwersacji dla każdego dnia
- Przeniesienie par message/response do messages

#### 2.3 API Endpoints (1h):
- `GET /api/conversations` - lista konwersacji
- `POST /api/conversations` - nowa konwersacja
- `GET /api/conversations/:id/messages` - wiadomości
- `PUT /api/conversations/:id/title` - zmiana tytułu
- `DELETE /api/conversations/:id` - usuwanie

#### 2.4 Update chat.js (30min):
- Obsługa conversationId w request
- Auto-tworzenie konwersacji
- Update last_message_at

### 📅 FAZA 3 - System Pamięci z pgvector (4h):
#### 3.1 Setup pgvector (30min):
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

#### 3.2 Tabela memories (45min):
```sql
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  conversation_id UUID REFERENCES conversations(id),
  summary TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  importance INT DEFAULT 5,
  memory_type TEXT CHECK (memory_type IN ('personal', 'relationship', 'preference', 'event')),
  entities JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX memories_embedding_idx ON memories 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

#### 3.3 MemoryManager (1.5h):
```javascript
// api/lib/memory-manager.js
class MemoryManager {
  async createEmbedding(text)
  async saveMemory(userId, summary, importance)
  async getRelevantMemories(userId, query, limit)
  async extractEntities(text)
}
```

#### 3.4 Function Calling (1h):
```javascript
functions: [{
  name: "remember_this",
  description: "Zapisz ważne wspomnienie",
  parameters: {
    summary: { type: "string" },
    importance: { type: "number", min: 1, max: 10 }
  }
}]
```

### 📅 FAZA 4 - Nowy Chat API z Pamięcią (4h):
- Pełna reimplementacja /api/chat
- Integracja z conversations
- Pobieranie relevant memories
- Streaming + function calling
- System prompt z kontekstem

#### Memory Rules (do system prompt):
```
ZASADY ZARZĄDZANIA PAMIĘCIĄ:

1. ZAWSZE zapisuj gdy użytkownik wspomina:
   - Imiona bliskich (partner, dzieci, rodzice)
   - Ważne daty (rocznice, urodziny)
   - Traumatyczne wydarzenia
   - Preferencje komunikacyjne

2. Używaj funkcji remember_this() gdy dowiesz się czegoś ważnego
   Przykład: "Mój mąż Maciej..." → remember_this("Mąż ma na imię Maciej", 9)

3. Priorytetyzuj (importance 1-10):
   - 9-10: Kluczowe relacje, traumy
   - 7-8: Ważne preferencje, hobby
   - 5-6: Codzienne fakty
   - 1-4: Mniej istotne szczegóły

4. NIE zapisuj:
   - Poufnych danych (hasła, numery)
   - Tymczasowych stanów emocjonalnych
   - Informacji z pojedynczej kłótni
```

### 📅 FAZA 5 - UI Konwersacji (3h):
- Sidebar z listą konwersacji
- Ładowanie historii
- Zarządzanie konwersacjami
- Auto-generowanie tytułów
- Mobile responsive

### 📅 FAZA 6 - Panel Admina (2h):
- Memory Explorer
- User memories viewer
- Prompt management
- Analytics dashboard

### 📅 FAZA 7 - OAuth (3h):
- Google Sign-In setup
- Apple Sign-In setup
- Integracja z Supabase Auth
- UI dla social login

## 📞 Kontakt & Komendy
- **Admin Panel**: https://tk2me.vercel.app/admin (hasło: qwe123)
- **Testowe komendy**:
  ```bash
  npm run dev          # Vercel dev mode
  git push            # Auto-deploy via webhook
  ```

## 🐛 Known Issues & Status
- ~~Auto-deploy nie działał~~ ✅ FIXED
- ~~JavaScript syntax errors~~ ✅ FIXED  
- ~~API endpoints 500 errors~~ ✅ FIXED
- ~~Limit 12 funkcji Vercel~~ ✅ FIXED (usunięto pliki backup)
- ~~Chat Completions wolne~~ ✅ FIXED (streaming działa!)
- **TODO**: System konwersacji (FAZA 2)
- **TODO**: System pamięci AI (FAZA 3)

## 🔑 Kluczowe Pliki do Edycji:
### Backend:
- `/api/chat.js` - główny endpoint czatu (obecnie: streaming SSE)
- `/api/conversations.js` - TODO: zarządzanie konwersacjami
- `/api/lib/memory-manager.js` - TODO: system pamięci
- `/supabase-schema.sql` - schema bazy danych

### Frontend:
- `/public/index.html` - główna aplikacja (linie 1684-1850: sendMessage)
- `/public/admin-temp.html` - panel admina bez hasła

### Konfiguracja:
- Supabase: https://app.supabase.com/project/hpxzhbubvdgxdvwxmhzo
- Vercel: https://vercel.com/natalias-projects-0df16838/talk2me
- Live: https://tk2me.vercel.app

## 💡 Uwagi Techniczne
- Projekt używa ES6 modules (import/export)
- Wszystkie endpointy używają Supabase RLS (Row Level Security)
- Admin panel wymaga Bearer token authorization
- Chat używa OpenAI jako primary, Groq jako fallback
- Mobile-first responsive design
- Streaming przez Server-Sent Events (SSE)
- Limit Vercel: max 12 funkcji serverless

## 🎨 Design & UX
- Kolor główny: #FF69B4 (różowy)
- Mobile-optimized (iOS/Android)
- PWA ready (Apple Web App capable)
- Smooth animations i transitions

---
**Ostatnia aktualizacja**: 8 stycznia 2025 22:30  
**Status**: 🚀 LIVE PRODUCTION - Aplikacja działa w chmurze z SUPER SZYBKIM streamingiem!

## ✅ SESJA 6 - INTEGRACJA ASSISTANT API & CACHE (2025-01-07)

### 🚀 GŁÓWNE OSIĄGNIĘCIA:
1. **Dodanie modeli GPT-4.1** - najnowsze modele OpenAI z 1M tokenów kontekstu!
   - GPT-4.1, GPT-4.1 mini, GPT-4.1 nano
   - GPT-4.5 Research Preview
   
2. **Naprawienie zapisywania modelu** - zmiana UPDATE na UPSERT w admin/config.js
   - Teraz model się zapisuje poprawnie po odświeżeniu strony
   
3. **Integracja Chat Completions z Assistant API**:
   - Chat pobiera prompt z OpenAI Assistant API
   - Używa go w Chat Completions dla szybkich odpowiedzi
   
4. **Cache promptu w pamięci RAM**:
   - Błyskawiczne odpowiedzi (0ms dla cache)
   - Auto-refresh co 1 godzinę
   - Brak dodatkowych zapytań do bazy
   
5. **Panel admina z podglądem promptu**:
   - Wyświetla do 10k znaków promptu
   - Przycisk "Refresh Prompt from OpenAI"
   - Status cache z informacją o wieku

### 🔧 TECHNICZNE SZCZEGÓŁY:
- **promptCache** w chat.js - obiekt w pamięci serwera
- **Export/Import** - admin/config.js importuje cache z chat.js
- **Brak nowych endpointów** - wykorzystanie istniejących (limit 12)
- **Streaming nadal działa** - SSE bez zmian

### 📊 FLOW DZIAŁANIA:
1. **Pierwszy chat po deploy** → pobiera prompt z Assistant API (~1s)
2. **Kolejne chaty** → używają cache z RAM (0ms!)
3. **Po 1 godzinie** → automatyczne odświeżenie
4. **Manual refresh** → przycisk w panelu admina

### 🎯 AKTUALNY STATUS:
- ✅ **Chat używa prawdziwego promptu** z OpenAI Assistant
- ✅ **Wybór modeli działa** - wszystkie modele OpenAI dostępne
- ✅ **Panel admina ulepszony** - widać prompt i można go odświeżyć
- ✅ **Zero dodatkowego delay** - cache w pamięci RAM

### 📝 NASTĘPNE KROKI (FAZA 2):
- [ ] System konwersacji (tabele conversations + messages)
- [ ] pgvector + semantic memory search
- [ ] UI dla historii rozmów (sidebar)
- [ ] Function calling dla zapisywania pamięci

## ✅ SESJA 5 - CHAT COMPLETIONS + STREAMING (2025-06-08)

### 🎯 GŁÓWNE OSIĄGNIĘCIA:
1. **10x SZYBSZE ODPOWIEDZI**:
   - Było: Assistant API ~10-30 sekund
   - Jest: Chat Completions ~1-2 sekundy!
   
2. **STREAMING TEKSTU**:
   - Implementacja Server-Sent Events (SSE)
   - Płynne wyświetlanie słowo po słowie
   - Animowany kursor podczas pisania
   
3. **ZACHOWANE FUNKCJE**:
   - Historia czatów dalej działa
   - Autoryzacja użytkowników OK
   - System promptów konfigurowalny

### 🔧 TECHNICZNE SZCZEGÓŁY:
- Zamiana `openai.beta.assistants` → `openai.chat.completions`
- Streaming przez `stream: true` + chunked responses
- Frontend: `fetch` → streaming reader z parsowaniem SSE
- Backup poprzedniej wersji w `chat-backup-assistant-api.js`

### 📊 PORÓWNANIE WYDAJNOŚCI:
| Metoda | Czas odpowiedzi | Streaming | UX |
|--------|----------------|-----------|-----|
| Assistant API | 10-30s | ❌ | 😴 |
| Chat Completions | 1-2s | ✅ | 🚀 |

### 🎬 NASTĘPNE KROKI:
- FAZA 2: System konwersacji (w toku)
- FAZA 3: pgvector + pamięć AI
- FAZA 4-7: Pełny system jak ChatGPT

## ✅ SESJA 4 - UKOŃCZONA MIGRACJA CLOUD (2025-06-07)

### 🎉 PRZEŁOMOWE OSIĄGNIĘCIE:
**Aplikacja jest teraz w pełni działająca w produkcji:**
- **Live URL:** https://tk2me.vercel.app  
- **Admin Panel:** https://tk2me.vercel.app/admin (qwe123)
- **Backend:** Vercel Serverless Functions
- **Database:** Supabase PostgreSQL  
- **AI:** OpenAI Chat Completions (1-2s response!)

### 🔧 GŁÓWNE TRANSFORMACJE:
1. **SQLite → Supabase PostgreSQL**
2. **Express.js localhost → Vercel Serverless**  
3. **Assistant API → Chat Completions (10x szybsze!)**
4. **Localhost → Cloud-native production**
5. **Hardcoded colors → CSS Variables system**
6. **Menu prawej strony → lewe menu (sliding)**
7. **Stary prompt → Nowy "Jamie" (jak przyjaciółka)**

### 🎯 CURRENT STATUS:
- ✅ **Aplikacja LIVE** - działa w internecie
- ✅ **AI Chat** - OpenAI + Groq fallback  
- ✅ **Admin Panel** - konfiguracja kluczy API
- ✅ **UI Naprawione** - personalizacja kolorów
- ✅ **Auto-deploy** - GitHub → Vercel pipeline

### ❓ TODO POZOSTAŁE:
- [ ] Zmienić emotki na symbole czarno-białe (niska priorytet)
- [ ] Zintegrować auth system z frontendem  
- [ ] Testy produkcyjne z prawdziwymi użytkownikami

## ✅ SESJA 7 - FAZA 2: SYSTEM KONWERSACJI (2025-01-08)

### 🎯 PRÓBA IMPLEMENTACJI:
1. **Utworzono schemat bazy danych**:
   - Tabele `conversations` i `messages`
   - Automatyczna migracja z `chat_history`
   - RLS policies i indeksy
   
2. **Backend API**:
   - `/api/conversations.js` - zarządzanie konwersacjami
   - Zaktualizowany `/api/chat.js` z obsługą conversationId
   - Streaming nadal działa

3. **Nowy UI (index-v2)**:
   - Sidebar z listą konwersacji (jak ChatGPT)
   - Responsywny design
   - Niestety brakuje wielu funkcji ze starego UI

### ⚠️ PROBLEMY NAPOTKANE:
1. **Limit funkcji Vercel** (12 na planie Hobby):
   - Musieliśmy usunąć niepotrzebne pliki
   - Rozwiązane przez cleanup

2. **System autoryzacji**:
   - Mieszanka Supabase Auth i custom JWT
   - Pętla logowania
   - Ostatecznie wróciliśmy do custom JWT

3. **UI/UX**:
   - Nowy interfejs stracił wiele funkcji (menu, dark mode, etc.)
   - Przywróciliśmy stary działający interfejs

### 📊 AKTUALNY STATUS:
- ✅ Backend dla konwersacji GOTOWY (tabele, API)
- ✅ System auth naprawiony (custom JWT)
- ✅ Tryb gościa działa
- ❌ Frontend konwersacji wycofany (zbyt dużo zmian naraz)

### 📝 WNIOSKI:
- System konwersacji wymaga stopniowej integracji
- Lepiej dodawać funkcje do istniejącego UI niż zastępować całkowicie
- Backend jest gotowy, frontend do zrobienia jutro

### 🎬 PLAN NA JUTRO (SESJA 8):
1. **Hybrydowy interfejs**:
   - Zachować stary działający UI
   - Dodać przycisk "Historia rozmów"
   - Opcjonalny sidebar z konwersacjami

2. **Stopniowa integracja**:
   - Konwersacje tylko dla zalogowanych
   - Goście używają zwykłego czatu
   - Bez psucia istniejących funkcji

3. **Poprawki UX**:
   - Jasne komunikaty o trybie gościa
   - Łatwiejsze logowanie/rejestracja

## ✅ SESJA 8 - PLANOWANIE MIGRACJI NA RAILWAY (2025-01-09 23:00)

### 🎯 GŁÓWNE OSIĄGNIĘCIA:
1. **Analiza ograniczeń Vercel dla LangChain**:
   - Limit 50MB na funkcję serverless
   - Max 1GB RAM (za mało dla LangChain)
   - Cold starts problematyczne dla AI

2. **Wybór Railway.app jako nowej platformy**:
   - 8GB RAM dostępne
   - Persistent containers (brak cold starts)
   - $5/mies start, prosty jak Vercel
   - Git push = deploy

3. **Decyzja o systemie pamięci z LangChain**:
   - Personalizacja AI to kluczowa funkcjonalność
   - LangChain ułatwi semantic search
   - Integracja z pgvector dla pamięci

4. **Szczegółowy plan migracji (5 etapów)**:
   - ETAP 1: Express.js server setup
   - ETAP 2: Railway deployment
   - ETAP 3: System konwersacji
   - ETAP 4: LangChain + Memory
   - ETAP 5: Testing & optymalizacja

### 🔧 TECHNICZNE SZCZEGÓŁY:
- **Architektura docelowa**: Express.js na Railway (jeden serwer)
- **Rezygnacja z**: Architektury rozproszonej, Cloudflare CDN
- **Akceptacja**: ~180ms latencji z US-West dla prostoty
- **LangChain modules**: Tylko memory, embeddings, vectorstores

### 📊 ANALIZA PLATFORM:
| Platform | Pros | Cons | Decyzja |
|----------|------|------|---------|
| Vercel Pro | Znane środowisko | Limit RAM | ❌ |
| Railway | 8GB RAM, prosty | Tylko US-West | ✅ |
| Fly.io | Serwery w PL | Bardziej skomplikowane | ❌ |
| Render | EU region | Mniej RAM | ❌ |

### 📋 ZADANIA NA JUTRO (SESJA 9):
1. **Utworzenie struktury Express.js** (45 min)
   - server.js z wszystkimi routes
   - Konwersja Vercel functions → Express endpoints
   - Zachowanie API compatibility

2. **Setup Railway** (30 min)
   - railway.json config
   - Environment variables
   - GitHub integration

3. **Deploy & Test** (30 min)
   - Podstawowa migracja bez LangChain
   - Weryfikacja wszystkich endpoints
   - Performance check

4. **System Konwersacji** (2h)
   - SQL migration script
   - API endpoints implementation
   - Basic UI integration

5. **LangChain Layer** (3h)
   - Memory Manager implementation
   - Semantic search setup
   - Integration z chat.js

### 🎬 PLAN WYKONANIA:
```
Dzień 1 (Jutro):
├── 09:00-10:00: Express setup
├── 10:00-10:30: Railway deploy
├── 10:30-12:30: Conversations system
└── 14:00-17:00: LangChain integration

Dzień 2:
├── Testing & optimization
├── Documentation update
└── Production switch
```

### 📝 NOTATKI Z DYSKUSJI:
- Natalia preferuje jeden serwer (prostota)
- LangChain kluczowy dla personalizacji
- Railway mimo US lokalizacji (DX > latencja)
- Migracja stopniowa, bez psucia produkcji

### ⚠️ DO ZAPAMIĘTANIA:
- **Backup Vercel** przed migracją
- **Test każdego etapu** osobno
- **Monitor RAM** z LangChain
- **Dokumentuj zmiany** w CHANGELOG

---
**Zakończenie sesji**: 9 stycznia 2025, 23:00
**Developer**: Claude (AI Assistant)
**Status**: Plan gotowy, implementacja jutro

## ✅ SESJA 9 - MIGRACJA NA RAILWAY + PLAN LANGCHAIN (2025-01-10)

### 🎯 GŁÓWNE OSIĄGNIĘCIA:
1. **Sukces migracji na Railway!** 🚀
   - Branch `railway-migration` utworzony i wdrożony
   - Express.js server działa na https://talk2me.up.railway.app
   - Wszystkie endpointy działają (chat, auth, admin)
   - SSE streaming działa poprawnie

**⚠️ WAŻNE: Pracujemy teraz na branchu `railway-migration`, NIE na main!**
- Railway deployuje z brancha `railway-migration`
- Vercel nadal używa brancha `main` jako backup
- Wszystkie zmiany robimy na `railway-migration`

2. **Minimalna refaktoryzacja**:
   - Jeden plik `server.js` importuje wszystkie handlery
   - Zero zmian w kodzie API handlers
   - Express rozumie format (req, res) z Vercel

3. **Railway config**:
   - 8GB RAM dostępne (vs 1GB na Vercel)
   - Persistent container (brak cold starts)
   - Health endpoint dla monitoringu
   - Auto-deploy z GitHub

### 🔧 TECHNICZNE SZCZEGÓŁY MIGRACJI:
```javascript
// server.js - klucz do prostej migracji
import express from 'express';
import chatHandler from './api/chat.js';
// ... import wszystkich handlerów

const app = express();
app.post('/api/chat', chatHandler);
// ... mapowanie routes
```

### 📊 STATUS PO MIGRACJI:
- ✅ Railway deployment live na https://talk2me.up.railway.app
- ✅ Chat z AI działa (ale "trochę muli") 
- ✅ Vercel nadal działa jako backup na https://tk2me.vercel.app
- ⏳ Optymalizacje wstrzymane do po LangChain
- 🔧 **Branch `railway-migration` jest teraz głównym branchem rozwojowym**
- 🔄 Auto-deploy z GitHub przy każdym push na `railway-migration`

### 🧠 PLAN IMPLEMENTACJI LANGCHAIN + MEMORY SYSTEM:

#### FAZA 1: SETUP PGVECTOR (30 min)
```sql
-- Enable pgvector w Supabase
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabela memories z embeddings
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  conversation_id UUID REFERENCES conversations(id),
  content TEXT NOT NULL,
  summary TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  importance INT DEFAULT 5,
  memory_type TEXT CHECK (memory_type IN ('personal', 'relationship', 'preference', 'event')),
  entities JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index dla similarity search
CREATE INDEX memories_embedding_idx ON memories 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

#### FAZA 2: LANGCHAIN SETUP (45 min)
```javascript
// lib/memory-manager.js
import { SupabaseVectorStore } from 'langchain/vectorstores/supabase';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';

class MemoryManager {
  async initialize() {
    this.embeddings = new OpenAIEmbeddings();
    this.vectorStore = new SupabaseVectorStore(this.embeddings, {
      client: supabase,
      tableName: 'memories',
      queryName: 'match_memories'
    });
  }

  async saveMemory(userId, content, importance = 5) {
    // Create embedding & save to vector store
  }

  async getRelevantMemories(userId, query, limit = 5) {
    // Similarity search in vector store
  }
}
```

#### FAZA 3: FUNCTION CALLING (30 min)
```javascript
// Funkcja do zapamiętywania ważnych informacji
const functions = [{
  name: "remember_this",
  description: "Zapisz ważne informacje o użytkowniku",
  parameters: {
    type: "object",
    properties: {
      summary: { 
        type: "string", 
        description: "Krótkie podsumowanie do zapamiętania" 
      },
      importance: { 
        type: "number", 
        minimum: 1, 
        maximum: 10 
      },
      type: { 
        type: "string", 
        enum: ["personal", "relationship", "preference", "event"] 
      }
    },
    required: ["summary", "importance"]
  }
}];
```

#### FAZA 4: INTEGRACJA Z CHATEM (1h)
- Pobieranie relevant memories przed odpowiedzią
- Dodawanie kontekstu do system prompt
- Obsługa function calls (remember_this)
- Streaming z function calling

#### FAZA 5: MEMORY RULES (30 min)
```
ZASADY ZAPAMIĘTYWANIA:

1. ZAWSZE zapisuj gdy dowiadujesz się:
   - Imion bliskich (partner, dzieci, rodzice)
   - Ważnych dat (rocznice, urodziny)
   - Traumatycznych wydarzeń
   - Preferencji komunikacyjnych

2. Priorytetyzacja (1-10):
   - 9-10: Kluczowe relacje, traumy
   - 7-8: Ważne preferencje
   - 5-6: Codzienne fakty
   
3. NIE zapisuj:
   - Danych poufnych (hasła, numery kart)
   - Chwilowych stanów emocjonalnych
```

#### FAZA 6: TESTING (30 min)
- Test zapisywania różnych typów pamięci
- Test similarity search
- Test personalizacji odpowiedzi
- Performance z LangChain

### 📦 NOWE DEPENDENCIES:
```json
{
  "langchain": "^0.1.0",
  "@langchain/openai": "^0.0.10",
  "@langchain/community": "^0.0.10",
  "pgvector": "^0.1.0"
}
```

### 🎯 EFEKT KOŃCOWY:
- **AI pamięta użytkownika** między sesjami
- **Personalizowane odpowiedzi** bazujące na historii
- **Automatyczne wyłapywanie** ważnych informacji
- **Kontekst relacji** w każdej rozmowie

### ⚠️ WAŻNE DECYZJE:
- **Optymalizacje później** - najpierw funkcjonalności
- **Nie używać PM2 cluster** - konflikt z LangChain memory
- **Railway ma dość RAM** - 8GB powinno wystarczyć

### 📝 NEXT STEPS:
1. Implementacja pgvector schema
2. MemoryManager class
3. Integracja z chat.js
4. Testy z prawdziwymi użytkownikami

---
**Status sesji**: Railway działa, plan LangChain gotowy
**Do zrobienia**: Implementacja memory system po powrocie ze spaceru
**Branch**: `railway-migration` (NIE main!)
**Deploy**: Railway auto-deploy z brancha `railway-migration`