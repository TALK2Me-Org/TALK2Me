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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import handlers with error handling
let chatHandler, historyHandler, favoritesHandler, conversationsHandler;
let loginHandler, registerHandler, meHandler, verifyHandler;
let configHandler, debugHandler;

try {
  console.log('📦 Loading API handlers...');
  
  // Try to load memory-enabled chat, fallback to basic if fails
  try {
    chatHandler = (await import('./api/chat-with-memory.js')).default;
    console.log('✅ Loaded: chat-with-memory handler');
  } catch (memoryError) {
    console.warn('⚠️  Failed to load memory chat:', memoryError.message);
    console.log('📌 Falling back to basic chat handler');
    chatHandler = (await import('./api/chat.js')).default;
    console.log('✅ Loaded: basic chat handler');
  }
  
  // Load other handlers
  historyHandler = (await import('./api/history.js')).default;
  console.log('✅ Loaded: history handler');
  
  favoritesHandler = (await import('./api/favorites.js')).default;
  console.log('✅ Loaded: favorites handler');
  
  conversationsHandler = (await import('./api/conversations.js')).default;
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
      auth: !!loginHandler
    }
  });
});

// Alternative health check endpoints
app.get('/healthz', (req, res) => res.status(200).send('OK'));
app.get('/api/health', (req, res) => res.status(200).json({ status: 'healthy' }));
app.get('/api/healthz', (req, res) => res.status(200).send('OK'));
app.get('/_health', (req, res) => res.status(200).send('OK'));

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'TALK2Me API is running',
    timestamp: new Date().toISOString()
  });
});

// Serve static files from public directory
app.use(express.static(join(__dirname, 'public')));

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
  app.put('/api/conversations/:id/title', conversationsHandler);
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
}
if (debugHandler) app.get('/api/admin/debug', debugHandler);

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