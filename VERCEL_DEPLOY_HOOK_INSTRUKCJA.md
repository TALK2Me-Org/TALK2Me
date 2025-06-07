# 🚀 Instrukcja: Automatyczne Deploy na Vercel z GitHub

## Problem
Vercel nie automatycznie deployuje zmian z GitHub ("nie ciągnie vercel tego ręce opadają").

## Rozwiązanie: Deploy Hook

### Krok 1: Stwórz Deploy Hook w Vercel
1. Idź do **Vercel Dashboard** → Projekt **TALK2Me**
2. Kliknij **Settings** (ustawienia)
3. Z lewego menu wybierz **Deploy Hooks**
4. Kliknij **Create Hook**
5. Wypełnij:
   - **Hook Name**: `GitHub Auto Deploy`
   - **Git Branch**: `main` (lub `master`)
6. Kliknij **Create Hook**
7. **SKOPIUJ URL** który się pojawi (będzie wyglądał jak: `https://api.vercel.com/v1/integrations/deploy/...`)

### Krok 2: Dodaj Webhook w GitHub
1. Idź do **GitHub** → Twoje repo **TALK2Me**
2. Kliknij **Settings** (w repo, nie w profilu)
3. Z lewego menu wybierz **Webhooks**
4. Kliknij **Add webhook**
5. Wypełnij:
   - **Payload URL**: WKLEJ URL z Vercel
   - **Content type**: `application/json`
   - **Which events**: `Just the push event`
6. Kliknij **Add webhook**

### Krok 3: Test
1. Zrób jakąś małą zmianę w kodzie
2. Commituj i pushuj do GitHub:
   ```bash
   git add .
   git commit -m "test auto deploy"
   git push
   ```
3. Sprawdź w Vercel czy deploy się automatycznie rozpoczął

## ✅ Gotowe!
Teraz przy każdym push do GitHub, Vercel automatycznie zrobi deploy. Nie musisz już ręcznie redployować!

## 🔧 Jeśli nie działa
- Sprawdź czy webhook URL jest poprawny
- Sprawdź czy branch name się zgadza
- W GitHub Settings → Webhooks sprawdź czy są zielone checkmarki
- W Vercel sprawdź logi deploymentów

## 📋 Alternatywa: GitHub Integration
Jeśli Deploy Hook nie zadziała, możesz też spróbować:
1. Vercel → Settings → Git
2. Disconnect i ponownie Connect z GitHub
3. Upewnij się że ma access do repo TALK2Me