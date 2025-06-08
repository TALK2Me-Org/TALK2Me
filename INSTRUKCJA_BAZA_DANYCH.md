# 🚀 INSTRUKCJA KONFIGURACJI BAZY DANYCH

## Szybki Start - 3 kroki

### KROK 1: Zaloguj się do Supabase
1. Wejdź na https://app.supabase.com
2. Zaloguj się na swoje konto
3. Wybierz projekt `TALK2Me` (lub jak go nazwałaś)

### KROK 2: Otwórz SQL Editor
1. W menu po lewej stronie znajdź ikonę "SQL Editor" (wygląda jak terminal)
2. Kliknij "New query" (jeśli potrzeba)

### KROK 3: Wklej i uruchom SQL
1. Otwórz plik `supabase-schema.sql` w tym folderze
2. Skopiuj CAŁĄ jego zawartość (Ctrl+A, Ctrl+C)
3. Wklej do SQL Editor w Supabase
4. Kliknij przycisk "RUN" (zielony przycisk)

## ✅ Co się stanie?
- Utworzą się wszystkie tabele (users, chat_history, sessions, app_config)
- Wstawią się wszystkie klucze konfiguracyjne
- API key OpenAI będzie już skonfigurowany
- Assistant ID będzie ustawiony
- Panel admina będzie działał od razu

## 🎯 Po wykonaniu:
1. Wejdź na https://tk2me.vercel.app/admin
2. Wszystkie klucze powinny być już widoczne
3. Chat powinien działać od razu!

## ⚠️ Ważne:
- SQL najpierw USUWA stare tabele (jeśli istnieją)
- Potem tworzy nowe z pełną konfiguracją
- Nie stracisz danych bo prawdopodobnie tabele i tak nie istnieją

## 🆘 Problemy?
Jeśli coś nie działa:
1. Sprawdź czy jesteś w odpowiednim projekcie Supabase
2. Upewnij się że skopiowałaś CAŁY plik SQL
3. Zobacz czy nie ma błędów po kliknięciu RUN

---
Powodzenia! 🎉