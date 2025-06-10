# TALK2Me 💕 - Bo miłość potrzebuje zrozumienia

Inteligentny mediator emocjonalny w Twojej kieszeni. Aplikacja wykorzystująca AI (Jamie) do pomocy parom w lepszej komunikacji.

## 🎯 Co robimy

Tłumaczymy emocjonalne komunikaty i intencje w relacjach na język zrozumiały dla partnera. Jamie analizuje to co powiedział Twój partner/partnerka i pomaga Ci zrozumieć co naprawdę miał/miała na myśli.

## ✨ Funkcje

- 🤖 **AI Mediator "Jamie"** - Emocjonalnie inteligentny asystent
- 💬 **4-sekcyjne odpowiedzi** - Empatia + Interpretacja + Edukacja + Propozycja
- 📚 **Historia rozmów** - Zapisywanie i przeglądanie wcześniejszych czatów
- ❤️ **Ulubione odpowiedzi** - Oznaczanie najważniejszych porad
- 🌍 **Dwujęzyczność** - Polski i Angielski
- 🌙 **Tryb ciemny** - Dostosowanie do preferencji
- 👤 **Personalizacja** - Avatar, kolory akcent, wielkość czcionki
- 🔐 **Bezpieczeństwo** - Szyfrowanie, JWT, lokalna baza danych

## 🏗️ Architektura

- **Frontend**: HTML/CSS/JS (przygotowywane do React Native)
- **Backend**: Node.js + Express + SQLite
- **AI**: OpenAI Assistant API + Groq (Llama 3) + Anthropic Claude
- **Deployment**: Vercel + localhost development

## 📱 Struktura projektu

```
/TALK2Me
├── mobile/
│   ├── prototype-final.html    # 🎯 Główna aplikacja
│   └── login.html             # 🔐 Autoryzacja
├── backend/
│   ├── server.js              # 🖥️ API Server
│   ├── database.js            # 🗄️ SQLite Model
│   └── auth.js                # 🔑 JWT Middleware
├── PROJECT_DOCUMENTATION.md   # 📋 Pełna dokumentacja
└── README.md                  # 👋 Ten plik
```

## 🚀 Uruchomienie lokalnie

### 1. Backend
```bash
cd backend
npm install
node server.js
# Serwer na http://localhost:3001
```

### 2. Frontend
```bash
# W głównym folderze
python3 -m http.server 9999 --directory mobile
# Aplikacja na http://localhost:9999/prototype-final.html
```

### 3. Konfiguracja API
Stwórz plik `backend/.env`:
```env
OPENAI_API_KEY=sk-proj-...
GROQ_API_KEY=gsk_...
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=talk2me-secret-key-2024
PORT=3001
CLIENT_URL=http://localhost:9999
```

## 🌐 Demo na żywo

- **Aplikacja**: [https://talk2me-natalia.vercel.app](https://talk2me-natalia.vercel.app)
- **Login**: [https://talk2me-natalia.vercel.app/login.html](https://talk2me-natalia.vercel.app/login.html)

## 📊 Status rozwoju

- ✅ **MVP Complete** - Podstawowa funkcjonalność działa
- ✅ **Authentication** - Logowanie/rejestracja z JWT
- ✅ **AI Integration** - 3 AI providers z fallback
- ✅ **Translations** - Pełne wsparcie PL/EN
- ✅ **Personalization** - Awatar, kolory, tryb ciemny
- 🚧 **React Native** - W planach migracja
- 🚧 **App Store** - Przygotowanie do publikacji

## 🛠️ Technologie

- **AI**: OpenAI GPT-4, Groq Llama 3, Anthropic Claude
- **Backend**: Node.js, Express.js, SQLite, JWT
- **Frontend**: Vanilla JS, CSS Grid/Flexbox, LocalStorage
- **Deploy**: Vercel (Frontend), localhost (Backend)
- **Tools**: Git, npm, Python (dev server)

## 🔑 Kluczowe decyzje

1. **SQLite zamiast PostgreSQL** - Prostsze w development
2. **3 AI providers** - Redundancja i niezawodność
3. **Vanilla JS** - Szybsze prototypowanie przed React Native
4. **JWT w localStorage** - Proste i skuteczne
5. **Vercel deployment** - Łatwe CI/CD i testowanie

## 👥 Team

- **Natalia Rybarczyk** - Product Owner, Design
- **Claude AI Assistant** - Development, Architecture

## 📄 Licencja

© 2024 TALK2Me. Wszelkie prawa zastrzeżone.

---

**Tagline**: *Bo miłość potrzebuje zrozumienia* / *Because love needs understanding*