# TALK2Me - Decyzje Architektoniczne

## 📋 Decision Log
*Ostatnia aktualizacja: 2025-01-15*

## 1. Struktura Bazy Danych

### ✅ DECYZJA: Migracja z chat_history na conversations/messages
**Powód**: 
- `chat_history` to flat structure - nie wspiera konwersacji
- Nowy system pozwala na threading, kontekst, metadata
- Łatwiejsza integracja z memory system

**Plan migracji**:
1. Zachowujemy `chat_history` jako legacy (read-only)
2. Nowe rozmowy idą do `conversations`/`messages`
3. Po 30 dniach usuwamy `chat_history`

### ✅ DECYZJA: pgvector z OpenAI embeddings
**Powód**:
- Native PostgreSQL = mniej dependencies
- OpenAI text-embedding-ada-002 = najlepszy stosunek jakość/cena
- 1536 wymiarów = dobry balans między dokładnością a wydajnością

**Alternatywy odrzucone**:
- Pinecone/Weaviate - dodatkowy serwis do zarządzania
- Sentence transformers - gorsze wyniki dla polskiego

### ✅ DECYZJA: Custom JWT zamiast Supabase Auth
**Powód**:
- Pełna kontrola nad flow autoryzacji
- Łatwiejsza integracja z OAuth w przyszłości
- Brak vendor lock-in

**Implementacja**:
- JWT w localStorage (nie cookies - problemy z Safari)
- Refresh tokens w tabeli `sessions`
- 7 dni ważności, auto-refresh

## 2. System Pamięci

### ✅ DECYZJA: LangChain 0.3.6 + Function Calling
**Powód**:
- LangChain daje gotowe abstrakcje dla memory management
- Function calling = AI samo decyduje co zapamiętać
- Łatwa wymiana modeli (OpenAI → Anthropic)

**Flow pamięci**:
```
User Message → AI Analysis → remember_this() → Extract Entities → 
→ Generate Embedding → Store in DB → Update Context
```

### ✅ DECYZJA: Typy pamięci i importance scoring
**Typy**:
- `personal` - informacje o użytkowniku
- `relationship` - info o partnerze/rodzinie
- `preference` - co lubi/nie lubi
- `event` - ważne wydarzenia

**Importance** (1-10):
- 8-10: Krytyczne (imiona, rocznice, traumy)
- 5-7: Ważne (preferencje, zwyczaje)
- 1-4: Kontekstowe (jednorazowe wydarzenia)

### ✅ DECYZJA: Semantic search z cutoff
**Parametry**:
- Top 10 memories per query
- Similarity threshold: 0.7
- Recency boost: nowsze = ważniejsze
- Max 2000 tokens kontekstu

## 3. Infrastruktura

### ✅ DECYZJA: Railway.app jako primary hosting
**Powód**:
- Wspiera długie połączenia (SSE streaming)
- Persistent storage dla Node.js
- Auto-scaling
- Łatwy deploy z GitHub

**Backup**: Vercel (serverless) - tylko dla stateless API

### ✅ DECYZJA: Express.js zamiast Next.js
**Powód**:
- Pełna kontrola nad server lifecycle
- Łatwiejsze SSE streaming
- Mniej abstrakcji = mniej problemów
- Railway preferuje Express

### ❌ DECYZJA: Brak Docker (na razie)
**Powód**:
- Railway ma własny build system (Nixpacks)
- Docker = dodatkowa złożoność
- Można dodać później jeśli potrzeba

## 4. Frontend i Mobile

### ✅ DECYZJA: PWA first, React Native later
**Powód**:
- Szybszy time to market
- Jedna codebase na start
- PWA działa na iOS/Android
- React Native gdy będzie 10k+ users

**PWA Features**:
- Service Worker z offline queue
- Web Push Notifications
- Install prompts
- Biometric auth (WebAuthn)

### ✅ DECYZJA: Vanilla JS zamiast React
**Powód**:
- Zero build step
- Mniejszy bundle (ważne dla mobile)
- Prostsze debugowanie
- Łatwiejsze SSR w przyszłości

## 5. Security i Privacy

### ✅ DECYZJA: E2E encryption dla memories (TODO)
**Plan**:
- User-side encryption key z hasła
- Szyfrowane `content` i `summary`
- Tylko embeddings w plaintext (dla search)

### ✅ DECYZJA: Soft deletes everywhere
**Implementacja**:
- `deleted_at` timestamp
- 30 dni grace period
- Hard delete po 30 dniach

### ✅ DECYZJA: Rate limiting per endpoint
**Limity**:
- Chat: 100 req/hour
- Memory save: 50/hour  
- Auth: 10/hour
- Redis dla tracking (później)

## 6. Skalowanie

### ✅ DECYZJA: Prepared statements + connection pooling
**Parametry**:
- Pool size: 20 connections
- Statement cache: 100
- Idle timeout: 30s

### ✅ DECYZJA: Sharding by user_id (przyszłość)
**Gdy przekroczymy**:
- 100k users
- 10M messages
- 1M memories

**Plan**:
- Shard key: first 2 chars of user_id
- 256 shards max
- Vitess lub Citus

## 7. Kluczowe Trade-offs

### 🤝 Prostota vs Skalowalność
**Wybór**: Prostota teraz, skalowanie później
- Monolith zamiast microservices
- PostgreSQL zamiast distributed DB
- Vanilla JS zamiast heavy framework

### 🤝 Privacy vs Features
**Wybór**: Privacy first
- Memories można usunąć
- Brak telemetrii bez zgody
- Local-first gdzie możliwe

### 🤝 Cost vs Performance  
**Wybór**: Zbalansowane
- OpenAI GPT-3.5 default, GPT-4 na żądanie
- Embeddings cache na 7 dni
- Lazy loading historii

## 📝 Następne Decyzje do Podjęcia

1. **Monitoring**: Sentry vs LogRocket vs Custom
2. **Analytics**: Mixpanel vs Amplitude vs None
3. **CDN**: Cloudflare vs Fastly vs Railway CDN
4. **Backup**: Automated backup strategy
5. **Testing**: Jest vs Vitest, Playwright vs Cypress

---

*Ten dokument jest living document - aktualizuj przy każdej ważnej decyzji!*