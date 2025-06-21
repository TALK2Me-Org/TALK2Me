# 🔌 API Structure

## 📁 Organization by Purpose

### 👤 **user/** - User-Facing Features
- **`chat-with-memory.js`** - 🔥 Main chat endpoint with AI memory system
- **`conversations.js`** - Conversation management (CRUD)
- **`favorites.js`** - User favorites for important messages
- **`history.js`** - Chat history (legacy support)

### 🔐 **auth/** - Authentication & Authorization  
- **`login.js`** - User login with JWT tokens
- **`register.js`** - User registration 
- **`me.js`** - Current user data
- **`verify.js`** - Email verification (future feature)

### 🧠 **memory/** - AI Memory Management
- **`manager.js`** - 🔥 MemoryManager class (LangChain + pgvector business logic)
- **`save-memory.js`** - Save memories with embeddings API endpoint
- **`update-profile.js`** - Update user psychological profiles API endpoint
- **`summarize-memories.js`** - AI-powered profile generation API endpoint

### 🛡️ **admin/** - Admin Panel Features
- **`config.js`** - AI configuration management (keys, models)
- **`debug.js`** - System debugging information
- **`memory.js`** - Memory Viewer CRUD operations

### 🔍 **debug/** - Development & Monitoring
- **`test-memory.js`** - Memory system health check
- **`debug-tables.js`** - Database table inspection

## 🚀 Usage

All endpoints are registered in `server.js` with their new paths:

```javascript
// User endpoints
app.post('/api/chat', chatHandler);               // user/chat-with-memory.js
app.get('/api/conversations', conversationsHandler); // user/conversations.js

// Memory endpoints  
app.post('/api/save-memory', saveMemoryHandler); // memory/save-memory.js

// Admin endpoints
app.get('/api/admin/config', configHandler);     // admin/config.js

// Debug endpoints
app.get('/api/test-memory', testMemoryHandler);  // debug/test-memory.js
```

## 📊 Files by Category
- **User**: 4 endpoints (core user features)
- **Auth**: 4 endpoints (authentication)
- **Memory**: 3 endpoints + 1 business logic class (AI memory management)
- **Admin**: 3 endpoints (admin panel)
- **Debug**: 2 endpoints (monitoring)

**Total**: 16 API endpoints + 1 shared business logic class