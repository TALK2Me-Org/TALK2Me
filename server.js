/**
 * TALK2Me Server - Express.js server dla Railway deployment
 * 
 * Główne funkcjonalności:
 * - Serwowanie static files (SPA)
 * - API endpoints dla czatu, auth, admin
 * - Health checks dla Railway
 * - Dynamiczne ładowanie handlerów z fallback
 * 
 * @author Claude (AI Assistant) - Sesja 9-11
 * @date 12-16.01.2025
 * @deployment Railway (https://talk2me.up.railway.app)
 */
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Startup diagnostics
console.log('🚀 Starting TALK2Me server...');
console.log('📊 Environment:', process.env.NODE_ENV || 'development');
console.log('🔧 Node version:', process.version);
console.log('📁 Working directory:', process.cwd());

// Check critical environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.warn('⚠️  Missing environment variables:', missingEnvVars);
} else {
  console.log('✅ All required environment variables present');
}

// Check OpenAI API key
console.log('🔑 OpenAI API Key check:');
if (process.env.OPENAI_API_KEY) {
  console.log(`✅ OPENAI_API_KEY present, length: ${process.env.OPENAI_API_KEY.length}`);
  console.log(`🔍 Key preview: ${process.env.OPENAI_API_KEY.substring(0, 10)}...`);
} else {
  console.warn('❌ OPENAI_API_KEY not found in environment variables');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import handlers with error handling
let chatHandler, historyHandler, favoritesHandler, conversationsHandler;
let loginHandler, registerHandler, meHandler, verifyHandler;
let configHandler, debugHandler, testMemoryHandler, memoryHandler, debugTablesHandler;
let saveMemoryHandler, updateProfileHandler, summarizeMemoriesHandler;
let memoryStatusHandler, memoryTestHandler, memoryReloadHandler, debugMem0Handler, debugZepHandler;
let telemetryHandler, performanceLogsHandler;

try {
  console.log('📦 Loading API handlers...');
  
  // Load memory-enabled chat handler
  chatHandler = (await import('./api/user/chat-with-memory.js')).default;
  console.log('✅ Loaded: chat-with-memory handler');
  
  // Load other handlers
  historyHandler = (await import('./api/user/history.js')).default;
  console.log('✅ Loaded: history handler');
  
  favoritesHandler = (await import('./api/user/favorites.js')).default;
  console.log('✅ Loaded: favorites handler');
  
  conversationsHandler = (await import('./api/user/conversations.js')).default;
  console.log('✅ Loaded: conversations handler');
  
  // Auth handlers
  loginHandler = (await import('./api/auth/login.js')).default;
  console.log('✅ Loaded: login handler');
  
  registerHandler = (await import('./api/auth/register.js')).default;
  console.log('✅ Loaded: register handler');
  
  meHandler = (await import('./api/auth/me.js')).default;
  console.log('✅ Loaded: me handler');
  
  verifyHandler = (await import('./api/auth/verify.js')).default;
  console.log('✅ Loaded: verify handler');
  
  // Admin handlers
  configHandler = (await import('./api/admin/config.js')).default;
  console.log('✅ Loaded: config handler');
  
  debugHandler = (await import('./api/admin/debug.js')).default;
  console.log('✅ Loaded: debug handler');
  
  memoryHandler = (await import('./api/admin/memory.js')).default;
  console.log('✅ Loaded: memory handler');
  
  // Test handlers
  try {
    testMemoryHandler = (await import('./api/debug/test-memory.js')).default;
    console.log('✅ Loaded: test-memory handler');
  } catch (e) {
    console.log('⚠️ Could not load test-memory handler:', e.message);
  }
  
  // Debug handlers
  try {
    debugTablesHandler = (await import('./api/debug/debug-tables.js')).default;
    console.log('✅ Loaded: debug-tables handler');
  } catch (e) {
    console.log('⚠️ Could not load debug-tables handler:', e.message);
  }
  
  // Memory Management API handlers
  try {
    saveMemoryHandler = (await import('./api/memory/save-memory.js')).default;
    console.log('✅ Loaded: save-memory handler');
  } catch (e) {
    console.log('⚠️ Could not load save-memory handler:', e.message);
  }
  
  // Profile update handler
  try {
    updateProfileHandler = (await import('./api/memory/update-profile.js')).default;
    console.log('✅ Loaded: update-profile handler');
  } catch (e) {
    console.log('⚠️ Could not load update-profile handler:', e.message);
  }
  
  // Summarize memories handler
  try {
    summarizeMemoriesHandler = (await import('./api/memory/summarize-memories.js')).default;
    console.log('✅ Loaded: summarize-memories handler');
  } catch (e) {
    console.log('⚠️ Could not load summarize-memories handler:', e.message);
  }
  
  // Memory Provider System handlers
  try {
    memoryStatusHandler = (await import('./api/memory/status.js')).default;
    console.log('✅ Loaded: memory-status handler');
  } catch (e) {
    console.log('⚠️ Could not load memory-status handler:', e.message);
  }
  
  try {
    memoryTestHandler = (await import('./api/memory/test.js')).default;
    console.log('✅ Loaded: memory-test handler');
  } catch (e) {
    console.log('⚠️ Could not load memory-test handler:', e.message);
  }
  
  try {
    memoryReloadHandler = (await import('./api/memory/reload.js')).default;
    console.log('✅ Loaded: memory-reload handler');
  } catch (e) {
    console.log('⚠️ Could not load memory-reload handler:', e.message);
  }
  
  try {
    debugMem0Handler = (await import('./api/memory/debug-mem0.js')).default;
    console.log('✅ Loaded: debug-mem0 handler');
  } catch (e) {
    console.log('⚠️ Could not load debug-mem0 handler:', e.message);
  }
  
  try {
    debugZepHandler = (await import('./api/memory/debug-zep.js')).default;
    console.log('✅ Loaded: debug-zep handler');
  } catch (e) {
    console.log('⚠️ Could not load debug-zep handler:', e.message);
  }
  
  // Telemetry handler
  try {
    telemetryHandler = (await import('./api/admin/telemetry.js')).default;
    console.log('✅ Loaded: telemetry handler');
  } catch (e) {
    console.log('⚠️ Could not load telemetry handler:', e.message);
  }
  
  // Performance logs handler
  try {
    performanceLogsHandler = (await import('./api/debug/performance-logs.js')).default;
    console.log('✅ Loaded: performance-logs handler');
  } catch (e) {
    console.log('⚠️ Could not load performance-logs handler:', e.message);
  }
  
  console.log('✅ All handlers loaded successfully');
} catch (error) {
  console.error('❌ Critical error loading handlers:', error);
  console.error('Stack trace:', error.stack);
  // Don't exit - try to run with whatever loaded
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.path}`);
    next();
  });
}

// Health check endpoints - Railway compatibility
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.5.1',
    service: 'talk2me',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    handlers: {
      chat: !!chatHandler,
      history: !!historyHandler,
      favorites: !!favoritesHandler,
      conversations: !!conversationsHandler,
      auth: !!loginHandler,
      memory: !!memoryHandler
    }
  });
});

// Alternative health check endpoints
app.get('/healthz', (req, res) => res.status(200).send('OK'));
app.get('/api/health', (req, res) => res.status(200).json({ status: 'healthy' }));
app.get('/api/healthz', (req, res) => res.status(200).send('OK'));
app.get('/_health', (req, res) => res.status(200).send('OK'));

// Test endpoints
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'TALK2Me API is running',
    timestamp: new Date().toISOString()
  });
});

// Simple memory test endpoint
app.get('/api/memory-status', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Memory endpoint reachable',
    timestamp: new Date().toISOString(),
    handlers: {
      testMemory: !!testMemoryHandler,
      chat: !!chatHandler
    }
  });
});

// Serve static files from public directory
app.use(express.static(join(__dirname, 'public')));

// Debug route to see all registered routes
app.get('/api/routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    }
  });
  res.json({ routes });
});

// API Routes - only add if handler loaded successfully
if (chatHandler) {
  app.post('/api/chat', chatHandler);
} else {
  app.post('/api/chat', (req, res) => {
    res.status(503).json({ error: 'Chat service temporarily unavailable' });
  });
}

if (historyHandler) {
  app.get('/api/history', historyHandler);
  app.post('/api/history', historyHandler);
}

if (favoritesHandler) {
  app.get('/api/favorites', favoritesHandler);
  app.post('/api/favorites', favoritesHandler);
  app.delete('/api/favorites/:id', favoritesHandler);
}

// Conversations
if (conversationsHandler) {
  app.get('/api/conversations', conversationsHandler);
  app.post('/api/conversations', conversationsHandler);
  app.get('/api/conversations/:id/messages', conversationsHandler);
  app.put('/api/conversations/:id', conversationsHandler); // PUT for updating conversation (title, archived status)
  app.put('/api/conversations/:id/title', conversationsHandler); // Legacy PUT for title only
  app.delete('/api/conversations/:id', conversationsHandler);
}

// Auth routes
if (loginHandler) app.post('/api/auth/login', loginHandler);
if (registerHandler) app.post('/api/auth/register', registerHandler);
if (meHandler) app.get('/api/auth/me', meHandler);
if (verifyHandler) app.post('/api/auth/verify', verifyHandler);

// Admin routes
if (configHandler) {
  app.get('/api/admin/config', configHandler);
  app.put('/api/admin/config', configHandler);
  app.post('/api/admin/config', configHandler);
}
if (debugHandler) app.get('/api/admin/debug', debugHandler);

// Memory management routes
if (memoryHandler) {
  app.get('/api/admin/memory', memoryHandler);
  app.put('/api/admin/memory', memoryHandler);
  app.delete('/api/admin/memory', memoryHandler);
  console.log('✅ Registered memory admin routes');
}

// Test endpoints
if (testMemoryHandler) {
  app.get('/api/test-memory', testMemoryHandler);
  console.log('✅ Registered route: GET /api/test-memory');
} else {
  // Fallback if handler didn't load
  app.get('/api/test-memory', (req, res) => {
    res.json({ 
      status: 'error', 
      message: 'Test memory handler not loaded',
      timestamp: new Date().toISOString()
    });
  });
  console.log('⚠️ Registered fallback route: GET /api/test-memory');
}

// Debug endpoints
if (debugTablesHandler) {
  app.get('/api/debug-tables', debugTablesHandler);
  console.log('✅ Registered route: GET /api/debug-tables');
}

// Memory Management API endpoints
if (saveMemoryHandler) {
  app.post('/api/save-memory', saveMemoryHandler);
  console.log('✅ Registered route: POST /api/save-memory');
}

// Profile update endpoint
if (updateProfileHandler) {
  app.post('/api/update-profile', updateProfileHandler);
  console.log('✅ Registered route: POST /api/update-profile');
}

// Summarize memories endpoint
if (summarizeMemoriesHandler) {
  app.post('/api/summarize-memories', summarizeMemoriesHandler);
  console.log('✅ Registered route: POST /api/summarize-memories');
}

// Memory Provider System endpoints
if (memoryStatusHandler) {
  app.get('/api/memory/status', memoryStatusHandler);
  console.log('✅ Registered route: GET /api/memory/status');
}

if (memoryTestHandler) {
  app.get('/api/memory/test', memoryTestHandler);
  console.log('✅ Registered route: GET /api/memory/test');
}

if (memoryReloadHandler) {
  app.post('/api/memory/reload', memoryReloadHandler);
  console.log('✅ Registered route: POST /api/memory/reload');
}

if (debugMem0Handler) {
  app.get('/api/memory/debug-mem0', debugMem0Handler);
  console.log('✅ Registered route: GET /api/memory/debug-mem0');
}

if (debugZepHandler) {
  app.get('/api/memory/debug-zep', debugZepHandler);
  console.log('✅ Registered route: GET /api/memory/debug-zep');
}

// Telemetry endpoints
if (telemetryHandler) {
  app.get('/api/admin/telemetry', telemetryHandler);
  console.log('✅ Registered route: GET /api/admin/telemetry');
}

// Performance logs endpoint
if (performanceLogsHandler) {
  app.get('/api/debug/performance-logs', performanceLogsHandler);
  console.log('✅ Registered route: GET /api/debug/performance-logs');
}

// Root endpoint - handle both health checks and static files
app.get('/', (req, res, next) => {
  // Railway health check
  if (req.headers['user-agent'] && 
      (req.headers['user-agent'].includes('Railway') || 
       req.headers['user-agent'].includes('GoogleHC') ||
       req.headers['user-agent'].includes('kube-probe'))) {
    return res.status(200).send('OK');
  }
  
  // Health check query parameter
  if (req.query.health || req.query.healthcheck) {
    return res.status(200).json({ status: 'ok', service: 'talk2me' });
  }
  
  // Otherwise serve static files
  next();
});

// Catch all - serve index.html for client-side routing
app.get('*', (req, res) => {
  const indexPath = join(__dirname, 'public', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error serving index.html:', err);
      res.status(404).send('Page not found');
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server with better error handling
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log(`🚀 TALK2Me server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Server is ready to accept connections`);
  console.log(`🏥 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`🌐 Application: http://0.0.0.0:${PORT}`);
  console.log('='.repeat(50));
});

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
  process.exit(1);
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('📴 Received shutdown signal, closing server gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('❌ Force closing server');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in production, just log
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});