# 🔒 Security Documentation - TALK2Me

> **Dokumentacja bezpieczeństwa i best practices**

## 🚨 KRYTYCZNE UWAGI BEZPIECZEŃSTWA

### ⚠️ ADMIN ENDPOINTS - NIEAUTORYZOWANE (29.06.2025)
**STATUS**: 🔴 KRYTYCZNE ZAGROŻENIE

Następujące endpointy admin **NIE MAJĄ AUTORYZACJI**:
- `/api/admin/config.js` - zarządzanie konfiguracją AI
- `/api/admin/debug.js` - informacje o bazie danych  
- `/api/admin/memory.js` - zarządzanie wspomnieniami użytkowników

**RYZYKO**: Pełny dostęp do danych bez hasła
**PRIORYTET**: NATYCHMIASTOWA NAPRAWA

### 🛡️ ZALECANE DZIAŁANIA:

1. **Dodać middleware autoryzacji**:
```javascript
// Admin authorization middleware
const adminPassword = 'qwe123' // Pobierać z env lub bazy
const adminAuth = req.headers['x-admin-password']
if (adminAuth !== adminPassword) {
  return res.status(401).json({ error: 'Unauthorized' })
}
```

2. **Implementować hasło admin z environment**:
```bash
ADMIN_PASSWORD=strong_password_here
```

3. **Rate limiting dla admin endpoints**

## 🔐 OBECNE ZABEZPIECZENIA

### ✅ Co Jest Zabezpieczone:
- **JWT Authentication** - endpointy user mają proper auth
- **Environment Variables** - secrets tylko w Railway/Supabase config
- **Supabase RLS** - Row Level Security na tabelach
- **CORS Headers** - proper cross-origin handling
- **Input Validation** - w memory management API

### 🔑 Zmienne Środowiskowe (Railway):
```bash
# Publiczne (frontend)
NEXT_PUBLIC_SUPABASE_URL=https://hpxzhbubvdgxdvwxmhzo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (read-only)

# Poufne (backend only)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (admin access)
OPENAI_API_KEY=sk-... (z Supabase config)
GROQ_API_KEY=gsk_... (z Supabase config)
JWT_SECRET=xxx (z Supabase config)

# Server
PORT=3000
NODE_ENV=production
```

## 🛡️ BEZPIECZEŃSTWO API

### User Endpoints (🟢 ZABEZPIECZONE):
- `/api/auth/*` - JWT validation
- `/api/user/*` - require Bearer token
- `/api/memory/*` - user-level authorization

### Admin Endpoints (🔴 NIEZABEZPIECZONE):
- `/api/admin/*` - **BRAK AUTORYZACJI**

## 📋 SECURITY CHECKLIST

### ✅ Gotowe:
- [x] JWT Authentication system
- [x] Environment variables separation
- [x] Database RLS policies
- [x] Input validation (partial)
- [x] Secrets w Supabase config
- [x] CORS configuration

### ❌ Do Naprawy:
- [ ] **Admin panel authorization** - KRYTYCZNE
- [ ] Rate limiting
- [ ] API input sanitization
- [ ] Error message sanitization
- [ ] Security headers (HSTS, CSP)
- [ ] Logging security events

## 🚨 INCIDENT RESPONSE

### W przypadku naruszenia:
1. **Natychmiast zmień wszystkie secrets**:
   - OpenAI API key
   - Supabase service role key  
   - JWT secret
   - Hasło admin

2. **Sprawdź logi Railway** pod kątem podejrzanych wywołań
3. **Zresetuj sesje użytkowników** (invalidate JWT tokens)
4. **Audyt bazy danych** pod kątem unauthorized changes

## 📞 Kontakt Security

**Security Owner**: Natalia Rybarczyk  
**Technical Mentor**: Maciej  
**Last Security Review**: 29.06.2025 (Sesja #22)

---

⚠️ **UWAGA**: Dokumentacja wymaga regularnej aktualizacji po każdej zmianie w systemie autoryzacji.

**Priorytet #1**: Naprawa admin endpoints przed kolejnym deploymentem!