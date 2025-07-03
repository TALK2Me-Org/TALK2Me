/**
 * ZepProvider - Zep Cloud Integration
 * 
 * Memory provider using Zep Cloud platform for cost-optimized memory management
 * Uses sessions and pre-computed context for reduced token costs
 */

import { ZepClient } from '@getzep/zep-cloud';
import MemoryProvider from '../interfaces/memoryProvider.js';

export default class ZepProvider extends MemoryProvider {
  constructor(config = {}) {
    super(config);
    
    this.providerName = 'ZepProvider';
    this.accountId = config.accountId ? config.accountId.trim() : null;
    this.apiKey = config.apiKey ? config.apiKey.trim() : null;
    this.client = null;
    
    console.log('ZepProvider constructor:', {
      accountId: this.accountId ? `${this.accountId.substring(0, 8)}...` : 'missing',
      apiKey: this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'missing'
    });

    this.enabled = !!(this.accountId && this.apiKey);
  }

  /**
   * Convert UUID or email to readable user_id for Zep
   */
  convertToReadableUserId(userId) {
    if (userId.includes('@')) {
      return userId.split('@')[0].replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    }
    
    if (userId.match(/^[0-9a-f-]{36}$/i)) {
      return `user-${userId.slice(0, 8)}`;
    }
    
    return userId.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
  }

  /**
   * Create user metadata for Zep user management
   */
  createUserMetadata(originalUserId, readableUserId) {
    return {
      email: originalUserId.includes('@') ? originalUserId : 'unknown@example.com',
      firstName: readableUserId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      lastName: 'User',
      metadata: { role: 'user', organization: 'TALK2Me', type: 'regular' }
    };
  }

  /**
   * Generate session ID for conversation
   */
  generateSessionId(userId) {
    const timestamp = Date.now();
    const readableUserId = this.convertToReadableUserId(userId);
    return `${readableUserId}-session-${timestamp}`;
  }

  /**
   * Inicjalizacja Zep Client
   */
  async initialize() {
    if (this.initialized) {
      console.log('ZepProvider: Already initialized');
      return true;
    }

    if (!this.accountId || !this.apiKey) {
      console.error('ZepProvider: Missing credentials');
      this.enabled = false;
      return false;
    }

    try {
      console.log('ZepProvider: Initializing client...');
      
      this.client = new ZepClient({
        apiKey: this.apiKey,
      });

      console.log('ZepProvider: Testing connection...');
      
      const connectionTest = await this.testConnection();
      if (!connectionTest.success) {
        console.error('ZepProvider: Connection test failed:', connectionTest.error);
        this.enabled = false;
        return false;
      }

      this.initialized = true;
      this.enabled = true;
      
      console.log('ZepProvider: Initialized successfully');
      return true;
    } catch (error) {
      console.error('ZepProvider: Initialization error:', error);
      this.enabled = false;
      return false;
    }
  }

  /**
   * Test połączenia z Zep Cloud
   */
  async testConnection() {
    if (!this.client) {
      return { success: false, error: 'Client not initialized' };
    }

    try {
      const startTime = Date.now();
      
      // Prosty test - spróbuj utworzyć test user
      const testUserId = `connection-test-${Date.now()}`;
      const testUser = await this.client.user.add({
        userId: testUserId,
        email: 'test@zep-connection.com',
        firstName: 'Connection',
        lastName: 'Test',
        metadata: { test: true, timestamp: Date.now() }
      });

      const latency = Date.now() - startTime;

      console.log(`ZepProvider: Connection test successful (${latency}ms)`);

      return { 
        success: true, 
        message: `Zep Cloud connection successful`,
        latency: latency,
        testUserId: testUser.userId
      };
    } catch (error) {
      console.error('ZepProvider: Connection test failed:', error.message);
      return { 
        success: false, 
        error: `Connection failed: ${error.message}` 
      };
    }
  }

  /**
   * Ensure user exists in Zep Cloud
   */
  async ensureUser(userId) {
    const readableUserId = this.convertToReadableUserId(userId);
    const userMetadata = this.createUserMetadata(userId, readableUserId);

    try {
      await this.client.user.add({
        userId: readableUserId,
        email: userMetadata.email,
        firstName: userMetadata.firstName,
        lastName: userMetadata.lastName,
        metadata: userMetadata.metadata
      });

      console.log(`ZepProvider: User ensured: ${readableUserId}`);
      return { success: true, userId: readableUserId };
    } catch (error) {
      // Jeśli user już istnieje, to jest OK
      if (error.message.includes('already exists') || error.status === 409) {
        console.log(`ZepProvider: User already exists: ${readableUserId}`);
        return { success: true, userId: readableUserId };
      }
      
      console.error('ZepProvider: Error ensuring user:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Ensure session exists
   */
  async ensureSession(sessionId, userId) {
    const readableUserId = this.convertToReadableUserId(userId);

    try {
      await this.client.memory.addSession({
        sessionId: sessionId,
        userId: readableUserId,
        metadata: { 
          created_at: new Date().toISOString(),
          talk2me_user_id: userId,
          provider: 'ZepProvider'
        }
      });

      console.log(`ZepProvider: Session ensured: ${sessionId}`);
      return { success: true, sessionId: sessionId };
    } catch (error) {
      // Session may already exist
      if (error.message.includes('already exists') || error.status === 409) {
        console.log(`ZepProvider: Session already exists: ${sessionId}`);
        return { success: true, sessionId: sessionId };
      }
      
      console.error('ZepProvider: Error ensuring session:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Zapisuje wspomnienie w Zep Cloud
   */
  async saveMemory(userId, content, metadata = {}) {
    if (!this.isEnabled()) {
      return { success: false, error: 'ZepProvider not enabled' };
    }

    try {
      console.log('ZepProvider: Saving memory:', {
        userId: userId,
        contentLength: content.length
      });

      const userResult = await this.ensureUser(userId);
      if (!userResult.success) {
        return { success: false, error: `User creation failed: ${userResult.error}` };
      }
      const readableUserId = userResult.userId;

      const sessionId = metadata.sessionId || this.generateSessionId(userId);
      
      const sessionResult = await this.ensureSession(sessionId, userId);
      if (!sessionResult.success) {
        return { success: false, error: `Session creation failed: ${sessionResult.error}` };
      }

      const messageRole = metadata.role || 'user';
      
      await this.client.memory.add(sessionId, {
        messages: [{
          role: messageRole,
          content: content
        }]
      });

      console.log('ZepProvider: Memory saved successfully');
      return { 
        success: true, 
        memoryId: sessionId, // Zep uses session-based memory
        sessionId: sessionId,
        userId: readableUserId
      };
    } catch (error) {
      console.error('ZepProvider: Save memory error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Pobiera relevantne wspomnienia z Zep Cloud
   * KLUCZOWA FUNKCJA dla cost optimization - używa return_context: true
   */
  async getRelevantMemories(userId, query, limit = 10) {
    if (!this.isEnabled()) {
      return { success: false, error: 'ZepProvider not enabled' };
    }

    try {
      console.log('ZepProvider: Getting relevant memories:', {
        userId: userId,
        limit: limit
      });

      const readableUserId = this.convertToReadableUserId(userId);

      const sessions = await this.client.memory.listSessions({
        userId: readableUserId,
        limit: 5
      });

      if (!sessions.sessions || sessions.sessions.length === 0) {
        console.log('ZepProvider: No sessions found for user');
        return { success: true, memories: [], context: '' };
      }

      const searchResults = await this.client.memory.searchSessions({
        sessionIds: sessions.sessions.map(s => s.sessionId),
        text: query,
        searchScope: 'messages',
        searchType: 'mmr',
        mmrLambda: 0.6,
        limit: limit
      });
      const memories = [];
      let contextParts = [];

      if (searchResults.results) {
        searchResults.results.forEach(result => {
          if (result.message) {
            memories.push({
              id: result.message.uuid,
              content: result.message.content,
              summary: result.message.content.substring(0, 200) + '...',
              relevance_score: result.score,
              created_at: result.message.createdAt,
              memory_type: 'conversation',
              metadata: {
                sessionId: result.sessionId,
                role: result.message.role,
                zep_score: result.score
              }
            });

            contextParts.push(`[${result.score.toFixed(2)}] ${result.message.content}`);
          }
        });
      }

      const context = contextParts.join('\n\n');

      console.log(`ZepProvider: Retrieved ${memories.length} memories`);

      return { 
        success: true, 
        memories: memories,
        context: context, // Pre-computed context for cost optimization
        total: memories.length
      };
    } catch (error) {
      console.error('ZepProvider: Get relevant memories error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Pobiera wszystkie wspomnienia użytkownika (dla admin panelu)
   */
  async getAllMemories(userId, filters = {}) {
    if (!this.isEnabled()) {
      return { success: false, error: 'ZepProvider not enabled' };
    }

    try {
      const readableUserId = this.convertToReadableUserId(userId);

      const sessions = await this.client.memory.listSessions({
        userId: readableUserId,
        limit: 50
      });

      if (!sessions.sessions || sessions.sessions.length === 0) {
        return { success: true, memories: [], count: 0 };
      }

      const allMemories = [];

      for (const session of sessions.sessions) {
        try {
          const sessionMessages = await this.client.memory.getSessionMessages(session.sessionId, {
            limit: 100
          });

          if (sessionMessages.messages) {
            sessionMessages.messages.forEach(message => {
              allMemories.push({
                id: message.uuid,
                content: message.content,
                summary: message.content.substring(0, 200) + '...',
                importance: 3, // Default importance
                memory_type: 'conversation',
                created_at: message.createdAt,
                metadata: {
                  sessionId: session.sessionId,
                  role: message.role,
                  session_created: session.createdAt
                }
              });
            });
          }
        } catch (sessionError) {
          console.warn('ZepProvider: Error getting session messages:', sessionError.message);
        }
      }

      let filteredMemories = allMemories;
      if (filters.memory_type) {
        filteredMemories = filteredMemories.filter(m => m.memory_type === filters.memory_type);
      }

      console.log(`ZepProvider: Retrieved ${filteredMemories.length} memories`);

      return { 
        success: true, 
        memories: filteredMemories,
        count: filteredMemories.length
      };
    } catch (error) {
      console.error('ZepProvider: Get all memories error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Usuwa wspomnienie (session or message)
   */
  async deleteMemory(memoryId) {
    if (!this.isEnabled()) {
      return { success: false, error: 'ZepProvider not enabled' };
    }

    try {
      await this.client.memory.deleteSession(memoryId);
      
      console.log('ZepProvider: Memory deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('ZepProvider: Delete memory error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update memory (admin panel)
   */
  async updateMemory(memoryId, updates) {
    if (!this.isEnabled()) {
      return { success: false, error: 'ZepProvider not enabled' };
    }

    try {
      console.log('ZepProvider: Memory content updates not supported, metadata only');
      
      return { 
        success: true, 
        message: 'Zep memories are immutable, only metadata can be updated'
      };
    } catch (error) {
      console.error('ZepProvider: Update memory error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cleanup przy zmianie providera
   */
  async cleanup() {
    console.log('ZepProvider: Cleanup completed');
    this.client = null;
    this.initialized = false;
  }
}