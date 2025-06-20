# 🛠️ Stack Technologiczny TALK2Me

## 📱 Frontend

### Framework & Języki
- **Framework**: Vanilla JavaScript (ES6+)
  - Świadomy wybór - prostota i wydajność
  - Planowana migracja na React Native dla aplikacji mobilnej
- **Markup**: HTML5 z semantic elements
- **Styling**: CSS3 z nowoczesnymi funkcjami
  - CSS Variables dla personalizacji
  - Flexbox & Grid Layout
  - Mobile-first responsive design
- **JavaScript**: ES6 modules
  - Async/await dla API calls
  - Fetch API z streaming support
  - Event-driven architecture

### UI/UX Features
- **PWA Ready**: 
  - Apple Web App capable
  - Viewport meta tags
  - Touch-optimized interface
- **Dark Mode**: Toggle z localStorage
- **Animacje**: CSS transitions & animations
- **Ikony**: Unicode emoji (planowane: custom SVG)

### Komunikacja z Backend
- **REST API**: JSON over HTTPS
- **Streaming**: Server-Sent Events (SSE)
- **Auth**: JWT w localStorage
- **State**: localStorage dla ustawień

## 🔧 Backend

### Obecna Architektura (Vercel)
- **Platform**: Vercel Serverless Functions
- **Runtime**: Node.js 18.x
- **Framework**: Serverless functions (no framework)
- **Routing**: Vercel file-based routing
- **Limity**: 
  - 12 funkcji (Hobby plan)
  - 50MB na funkcję
  - 10s timeout

### Planowana Architektura (Railway)
- **Platform**: Railway.app
- **Runtime**: Node.js 20.x
- **Framework**: Express.js 4.x
- **Features**:
  - Persistent container
  - 8GB RAM
  - WebSocket support
  - No cold starts

### Wspólne elementy
- **Language**: JavaScript ES6+
- **Package Manager**: npm
- **Module System**: ES modules ("type": "module")
- **Middleware**:
  - CORS
  - Body parsing (JSON)
  - Error handling
  - Request logging

## 🗃️ Baza Danych

### Provider: Supabase
- **Database**: PostgreSQL 15
- **Features**:
  - Row Level Security (RLS)
  - Real-time subscriptions (niewykorzystane)
  - Built-in Auth (niewykorzystane - custom JWT)
  - pgvector extension (planowane)

### Schema
```sql
-- Główne tabele
users                 -- Użytkownicy aplikacji
chat_history         -- Historia czatów (legacy)
app_config           -- Konfiguracja aplikacji
conversations        -- Konwersacje (nowe)
messages             -- Wiadomości w konwersacjach
memories             -- Pamięć AI (planowane)

-- Indeksy
idx_messages_conversation
idx_conversations_user
memories_embedding_idx (planowane)
```

### Połączenie
- **Client**: Supabase JavaScript Client
- **Auth**: Service Role Key (backend)
- **Security**: RLS policies per table

## 🤖 AI/ML

### Modele AI
1. **OpenAI** (Primary)
   - Models: GPT-3.5-turbo, GPT-4, GPT-4.1
   - Chat Completions API
   - Streaming responses
   - Function calling (planowane)
   - Embeddings: text-embedding-ada-002

2. **Groq** (Fallback)
   - Model: llama3-8b-8192
   - Fast inference
   - No streaming support

3. **Claude** (Wyłączone)
   - Anthropic API
   - Zbyt drogi dla MVP

### Zarządzanie AI
- **Prompt Management**: 
  - OpenAI Assistant API dla promptu
  - Cache w pamięci RAM
  - Auto-refresh co 1h
- **Model Selection**: Dynamiczny wybór w admin panel
- **Error Handling**: Automatic fallback Groq

### Planowane: LangChain
- **Memory Management**: Conversation memory
- **Vector Store**: Semantic search
- **Embeddings**: Document processing
- **Agents**: Tool calling

## 🌐 Infrastruktura

### Hosting & Deployment
- **Current**: Vercel
  - Auto-deploy z GitHub
  - Preview deployments
  - Edge Network CDN
  - Serverless Functions

- **Planned**: Railway
  - Container-based
  - Persistent storage
  - More resources
  - Single region (US-West)

### Domain & SSL
- **Domain**: talk2me2.vercel.app
- **SSL**: Automatic (Let's Encrypt)
- **DNS**: Vercel managed

### CI/CD
- **Version Control**: Git + GitHub
- **Branching**: main + feature branches
- **Deploy**: 
  - Push to main → Auto deploy
  - GitHub Webhooks
  - Zero-downtime deployments

### Monitoring & Logs
- **Logs**: Vercel Functions logs
- **Errors**: Console + Vercel dashboard
- **Analytics**: Planowane (Vercel Analytics)

## 📦 Zewnętrzne Usługi

### 1. **OpenAI API**
- **Użycie**: Główny model czatu
- **Endpoints**: 
  - /v1/chat/completions
  - /v1/assistants
  - /v1/embeddings
- **Klucz**: Przechowywany w Supabase

### 2. **Groq API**
- **Użycie**: Fallback gdy OpenAI fail
- **Model**: Open source Llama
- **Zalety**: Szybkie, tańsze

### 3. **Supabase**
- **Użycie**: Baza danych + storage
- **Plan**: Free tier
- **Limity**: 500MB database, 1GB bandwidth

### 4. **Vercel**
- **Użycie**: Hosting + Functions
- **Plan**: Hobby (darmowy)
- **Limity**: 12 functions, 100GB bandwidth

### 5. **GitHub**
- **Użycie**: Version control
- **Integracje**: 
  - Vercel auto-deploy
  - Issue tracking
  - Współpraca

### 6. **Railway** (planowane)
- **Użycie**: Nowy hosting
- **Plan**: Hobby ($5/mies)
- **Zalety**: Więcej RAM, persistent

## 📊 Narzędzia Developerskie

### Development
- **Editor**: VS Code (zakładane)
- **Terminal**: Native macOS
- **API Testing**: Postman/curl
- **Browser**: Chrome DevTools

### Debugging
- **Backend**: console.log + Vercel logs
- **Frontend**: Chrome DevTools
- **Network**: Browser Network tab
- **Database**: Supabase dashboard

### Planowane ulepszenia
- **Testing**: Jest + Playwright
- **Linting**: ESLint
- **Formatting**: Prettier
- **Type Safety**: TypeScript (może)

## 🔐 Bezpieczeństwo

### Authentication
- **Method**: Custom JWT
- **Storage**: localStorage (token)
- **Expiry**: 24h tokens
- **Refresh**: Manual re-login

### Authorization
- **Admin**: Hardcoded password "qwe123"
- **Users**: JWT verification
- **Guest**: Limited access

### Data Protection
- **HTTPS**: Everywhere
- **CORS**: Configured origins
- **SQL Injection**: Parameterized queries
- **XSS**: Input sanitization
- **Secrets**: Environment variables

### Planowane
- **OAuth**: Google/Apple Sign-In
- **2FA**: Time-based OTP
- **Encryption**: At-rest data
- **Audit**: Activity logs

## 📈 Wydajność

### Obecna
- **Chat Response**: 1-2s (streaming)
- **Page Load**: <2s
- **API Calls**: <500ms
- **Database**: <100ms queries

### Optymalizacje
- **Caching**: Prompt w RAM
- **Streaming**: SSE dla czatu
- **Lazy Loading**: Planowane
- **Compression**: Gzip enabled

### Bottlenecks
- **Cold Starts**: Vercel functions
- **Latency**: US servers (180ms z PL)
- **Memory**: 1GB limit Vercel

## 🚀 Roadmap Technologiczny

### Krótkoterminowe (1-2 miesiące)
1. **Migracja na Railway**
2. **LangChain integration**
3. **System konwersacji UI**
4. **pgvector dla pamięci**

### Średnioterminowe (3-6 miesięcy)
1. **React Native app**
2. **OAuth implementation**
3. **Premium features**
4. **Analytics dashboard**

### Długoterminowe (6-12 miesięcy)
1. **Multi-language support**
2. **Voice integration**
3. **Therapy mode**
4. **AI fine-tuning**

---
**Ostatnia aktualizacja**: 2025-01-09 23:00
**Wersja**: 1.0