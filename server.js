import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import all API handlers
import chatHandler from './api/chat-with-memory.js'; // Using memory-enabled version
import historyHandler from './api/history.js';
import favoritesHandler from './api/favorites.js';
import conversationsHandler from './api/conversations.js';

// Auth handlers
import loginHandler from './api/auth/login.js';
import registerHandler from './api/auth/register.js';
import meHandler from './api/auth/me.js';
import verifyHandler from './api/auth/verify.js';

// Admin handlers
import configHandler from './api/admin/config.js';
import debugHandler from './api/admin/debug.js';

// Test handler
// import testMemoryHandler from './api/test-memory.js'; // Commented out for now

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

// Serve static files from public directory
app.use(express.static(join(__dirname, 'public')));

// API Routes
app.post('/api/chat', chatHandler);
app.get('/api/history', historyHandler);
app.post('/api/history', historyHandler);
app.get('/api/favorites', favoritesHandler);
app.post('/api/favorites', favoritesHandler);
app.delete('/api/favorites/:id', favoritesHandler);

// Conversations
app.get('/api/conversations', conversationsHandler);
app.post('/api/conversations', conversationsHandler);
app.get('/api/conversations/:id/messages', conversationsHandler);
app.put('/api/conversations/:id/title', conversationsHandler);
app.delete('/api/conversations/:id', conversationsHandler);

// Auth routes
app.post('/api/auth/login', loginHandler);
app.post('/api/auth/register', registerHandler);
app.get('/api/auth/me', meHandler);
app.post('/api/auth/verify', verifyHandler);

// Admin routes
app.get('/api/admin/config', configHandler);
app.put('/api/admin/config', configHandler);
app.get('/api/admin/debug', debugHandler);

// Test route for debugging
// app.post('/api/test-memory', testMemoryHandler); // Commented out for now

// Health check endpoints - Railway compatibility
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.5.0',
    service: 'talk2me',
    uptime: process.uptime()
  });
});

// Alternative health check endpoints
app.get('/healthz', (req, res) => res.status(200).send('OK'));
app.get('/api/health', (req, res) => res.status(200).json({ status: 'healthy' }));
app.get('/api/healthz', (req, res) => res.status(200).send('OK'));
app.get('/_health', (req, res) => res.status(200).send('OK'));

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
  res.sendFile(join(__dirname, 'public', 'index.html'));
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
  console.log(`🚀 TALK2Me server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Server is ready to accept connections`);
  console.log(`🏥 Health check available at: http://0.0.0.0:${PORT}/health`);
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