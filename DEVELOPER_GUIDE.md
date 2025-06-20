# 👨‍💻 PRZEWODNIK DEVELOPERA - TALK2Me

## 🚨 OBOWIĄZKOWE ZASADY DLA KAŻDEGO DEVELOPERA

### 1. Dokumentuj KAŻDĄ sesję pracy

Po zakończeniu pracy **ZAWSZE**:
1. Zaktualizuj `CHANGELOG.md` z opisem zmian
2. Dodaj podsumowanie do `CLAUDE.md` (jeśli duże zmiany)
3. Użyj formatu: `[SESJA X] - YYYY-MM-DD HH:MM`

### 2. Format wpisu do CHANGELOG

```markdown
## [SESJA 9] - 2025-01-10 10:00
### 🎯 Główne osiągnięcia
- Co udało się zrobić (lista)
- Jakie funkcje dodano
- Co naprawiono

### 🔧 Techniczne szczegóły
- Użyte technologie
- Zmiany w architekturze
- Nowe dependencies

### ⚠️ Problemy napotkane
- Co nie działało
- Jak rozwiązano
- Workarounds

### 📝 Do zrobienia
- Co zostało na później
- Known issues
```

### 3. Przed rozpoczęciem pracy

**ZAWSZE**:
1. Przeczytaj `CLAUDE.md` - aktualny stan projektu
2. Sprawdź ostatnie wpisy w `CHANGELOG.md`
3. Zobacz TODO w ostatniej sesji
4. Pull najnowsze zmiany z GitHub

### 4. Commituj z sensem

```bash
# Dobry commit message:
git commit -m "feat: Add conversation system with message grouping"
git commit -m "fix: Resolve JWT token expiration issue"
git commit -m "docs: Update Railway migration plan"

# Zły commit message:
git commit -m "updates"
git commit -m "fix bug"
git commit -m "changes"
```

## 🏗️ Struktura projektu - co gdzie jest

### Główne miejsca pracy:
- **Frontend**: `/public/index.html` (główna apka)
- **Backend API**: `/api/*.js` (Vercel functions)
- **Dokumentacja**: `CLAUDE.md`, `CHANGELOG.md`
- **Konfiguracja**: `package.json`, `vercel.json`

### Gdzie dodawać nowe funkcje:
- **Nowy endpoint**: `/api/nazwa.js`
- **Nowa strona**: `/public/nazwa.html`
- **Komponenty UI**: Inline w HTML (na razie)
- **Style**: Inline w `<style>` w HTML

## 🔧 Setup lokalnego środowiska

### 1. Klonowanie i instalacja
```bash
git clone https://github.com/Nat-thelifecreator/TALK2Me.git
cd TALK2Me
npm install
```

### 2. Zmienne środowiskowe
Utwórz `.env` (nie commituj!):
```env
NEXT_PUBLIC_SUPABASE_URL=https://hpxzhbubvdgxdvwxmhzo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

### 3. Uruchomienie lokalnie
```bash
# Vercel dev server (zalecane)
npm run dev

# Otwórz http://localhost:3000
```

## 📝 Workflow rozwoju

### 1. Nowa funkcjonalność
1. **Planowanie**: Opisz w TODO co chcesz zrobić
2. **Branch**: `git checkout -b feature/nazwa-funkcji`
3. **Rozwój**: Koduj z częstymi commitami
4. **Test**: Lokalnie + sprawdź wszystkie endpointy
5. **Dokumentacja**: Update odpowiednich plików
6. **PR**: Push i pull request do main

### 2. Bugfix
1. **Reproduce**: Znajdź jak odtworzyć błąd
2. **Branch**: `git checkout -b fix/nazwa-problemu`
3. **Fix**: Napraw + dodaj komentarz dlaczego
4. **Test**: Sprawdź czy nie psuje innych rzeczy
5. **Commit**: Z dokładnym opisem

### 3. Hotfix produkcyjny
1. **Branch z main**: `git checkout -b hotfix/critical-issue`
2. **Minimal fix**: Tylko niezbędne zmiany
3. **Test locally**: Dokładnie!
4. **Deploy**: Push do main (auto-deploy)
5. **Monitor**: Sprawdź logi na Vercel

## 🏛️ Architektura - jak to działa

### Request flow:
```
User (Browser)
    ↓
Frontend (HTML/JS)
    ↓ Fetch API
Vercel Functions (/api)
    ↓ 
Supabase (PostgreSQL)
    ↓
OpenAI API / Groq API
    ↓ Streaming
Response (SSE)
```

### Autoryzacja:
1. Login → JWT token
2. Token w localStorage
3. Każdy request: `Authorization: Bearer <token>`
4. Backend weryfikuje token
5. Tryb gościa: brak tokena = ograniczone funkcje

### AI Chat flow:
1. User pisze wiadomość
2. Frontend wysyła POST /api/chat
3. Backend:
   - Sprawdza auth
   - Pobiera prompt z cache/API
   - Wywołuje OpenAI streaming
   - Przekazuje chunks przez SSE
4. Frontend wyświetla w real-time
5. Zapis do historii

## 🐛 Debugging

### Częste problemy:

#### 1. "Invalid JWT token"
- Token wygasł (24h)
- Wyloguj i zaloguj ponownie
- Sprawdź localStorage

#### 2. "Supabase connection error"
- Sprawdź zmienne środowiskowe
- Verify Supabase URL
- Check service role key

#### 3. "OpenAI rate limit"
- Fallback na Groq powinien działać
- Sprawdź klucze API w admin panel

#### 4. "Vercel function timeout"
- Max 10s na Hobby plan
- Optymalizuj zapytania
- Rozważ upgrade/migrację

### Gdzie szukać logów:
- **Frontend**: Chrome DevTools Console
- **Backend**: Vercel Dashboard → Functions → Logs
- **Database**: Supabase Dashboard → Logs
- **Network**: Chrome DevTools → Network tab

## 🚀 Deployment

### Automatyczny (zalecany):
```bash
git push origin main
# Vercel auto-deploy przez webhook
```

### Manualny (jeśli trzeba):
```bash
vercel --prod
```

### Preview deployment:
```bash
git push origin feature/branch
# Vercel tworzy preview URL
```

## 📋 Checklist przed deploymentem

- [ ] Wszystkie testy lokalne przeszły
- [ ] Nie ma `console.log` w produkcyjnym kodzie
- [ ] Zmienne środowiskowe ustawione na Vercel
- [ ] Dokumentacja zaktualizowana
- [ ] CHANGELOG.md uzupełniony
- [ ] Backup ważnych danych (jeśli migracja DB)

## 🎯 Best Practices

### Code Style:
- ES6+ features (async/await, arrow functions)
- Meaningful variable names
- Komentarze dla skomplikowanej logiki
- Error handling everywhere

### Security:
- NIGDY nie commituj secrets
- Sanitize user inputs
- Use parameterized queries
- Validate on backend (nie ufaj frontend)

### Performance:
- Cache co się da (prompt!)
- Streaming dla długich odpowiedzi
- Lazy load gdy możliwe
- Monitor RAM usage

### UX:
- Mobile-first always
- Loading states dla async
- Error messages user-friendly
- Preserve user data (localStorage)

## 🆘 Kontakty & Pomoc

- **Właściciel**: Natalia Rybarczyk
- **Repo**: https://github.com/Nat-thelifecreator/TALK2Me
- **Live**: https://talk2me2.vercel.app
- **Admin**: /admin (hasło: qwe123)

## 📚 Ważne linki

- **Supabase**: https://app.supabase.com/project/hpxzhbubvdgxdvwxmhzo
- **Vercel**: https://vercel.com/natalias-projects-0df16838/talk2me
- **OpenAI**: https://platform.openai.com
- **Railway**: https://railway.app (planowana migracja)

---

## ⚡ Quick Start dla nowego developera

1. **Clone & Install**:
```bash
git clone [repo]
cd TALK2Me
npm install
```

2. **Get .env from Natalia**

3. **Run locally**:
```bash
npm run dev
```

4. **Make changes**

5. **Update docs**:
- CHANGELOG.md (OBOWIĄZKOWO!)
- CLAUDE.md (jeśli duże zmiany)

6. **Push to GitHub**

7. **Verify deployment**

---

**PAMIĘTAJ**: Dokumentacja to nie zło konieczne, to twój przyjaciel! 
Następny developer (może ty za miesiąc) będzie ci wdzięczny 🙏

**Ostatnia aktualizacja**: 2025-01-09 23:00