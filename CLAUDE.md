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
- **Admin Panel**: https://talk2me2.vercel.app/admin (hasło: qwe123)
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
**Ostatnia aktualizacja**: 7 stycznia 2025 20:30  
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