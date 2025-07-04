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
    console.log('🐛 ZepProvider DEBUG: convertToReadableUserId INPUT:', userId);
    
    if (userId.includes('@')) {
      const result = userId.split('@')[0].replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      console.log('🐛 ZepProvider DEBUG: Email conversion path → result:', result);
      return result;
    }
    
    if (userId.match(/^[0-9a-f-]{36}$/i)) {
      const result = `user-${userId.slice(0, 8)}`;
      console.log('🐛 ZepProvider DEBUG: UUID conversion path → result:', result);
      return result;
    }
    
    const result = userId.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
    console.log('🐛 ZepProvider DEBUG: Fallback conversion path → result:', result);
    return result;
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
   * Test połączenia z Zep Cloud - PRODUCTION SAFE (no test users created)
   */
  async testConnection() {
    if (!this.client) {
      return { success: false, error: 'Client not initialized' };
    }

    // PRODUCTION SAFE: Skip connection test to avoid creating spam users
    if (process.env.NODE_ENV === 'production') {
      console.log('ZepProvider: Connection test skipped in production (no spam users created)');
      return { 
        success: true, 
        message: 'Zep Cloud connection test skipped in production',
        latency: 0,
        note: 'Production mode - API assumed working'
      };
    }

    try {
      const startTime = Date.now();
      
      // DEVELOPMENT ONLY: Simple API status check without creating users
      // Try to get memories (empty result is OK, just test API access)
      const testResult = await this.client.memory.getAll({
        userId: 'api-test-check',
        limit: 1
      });

      const latency = Date.now() - startTime;

      console.log(`ZepProvider: Connection test successful (${latency}ms) - API accessible`);

      return { 
        success: true, 
        message: `Zep Cloud API accessible`,
        latency: latency,
        note: 'Development mode - API check only'
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
    console.log('🐛 ZepProvider DEBUG: ensureUser() ENTRY');
    console.log('🐛 ZepProvider DEBUG: Original userId:', userId);
    
    const readableUserId = this.convertToReadableUserId(userId);
    console.log('🐛 ZepProvider DEBUG: Converted readableUserId:', readableUserId);
    
    const userMetadata = this.createUserMetadata(userId, readableUserId);
    console.log('🐛 ZepProvider DEBUG: User metadata:', userMetadata);

    const zapPayload = {
      userId: readableUserId,
      email: userMetadata.email,
      firstName: userMetadata.firstName,
      lastName: userMetadata.lastName,
      metadata: userMetadata.metadata
    };
    console.log('🐛 ZepProvider DEBUG: Zep API payload:', zapPayload);

    try {
      console.log('🐛 ZepProvider DEBUG: Calling Zep client.user.add()...');
      const zapResult = await this.client.user.add(zapPayload);
      console.log('🐛 ZepProvider DEBUG: Zep API SUCCESS result:', zapResult);

      console.log(`✅ ZepProvider: User ensured: ${readableUserId}`);
      return { success: true, userId: readableUserId };
    } catch (error) {
      console.log('🐛 ZepProvider DEBUG: Zep API ERROR caught:', {
        message: error.message,
        status: error.status,
        code: error.code,
        stack: error.stack
      });
      
      // Jeśli user już istnieje, to jest OK
      if (error.message.includes('already exists') || error.status === 409) {
        console.log(`✅ ZepProvider: User already exists: ${readableUserId}`);
        return { success: true, userId: readableUserId };
      }
      
      console.error('❌ ZepProvider: Error ensuring user:', error.message);
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
   * Zapisuje wspomnienie w Zep Cloud - ONLY REAL USERS
   */
  async saveMemory(userId, content, metadata = {}) {
    if (!this.isEnabled()) {
      return { success: false, error: 'ZepProvider not enabled' };
    }

    // CRITICAL: Validate userId format - reject invalid/spam users only
    if (!userId || typeof userId !== 'string' || userId.length < 10) {
      console.error('ZepProvider: REJECTED saveMemory - invalid userId:', userId);
      return { success: false, error: 'Invalid userId - valid user required' };
    }

    // ONLY reject spam connection-test users, allow real UUIDs (including test-nati)
    if (userId.startsWith('connection-test-') || userId.startsWith('demo-') || userId === 'undefined' || userId === 'null') {
      console.error('ZepProvider: REJECTED saveMemory - spam user detected:', userId);
      return { success: false, error: 'Spam users not allowed - valid user required' };
    }

    try {
      console.log('🐛 ZepProvider DEBUG: saveMemory ENTRY POINT');
      console.log('🐛 ZepProvider DEBUG: Raw userId:', userId);
      console.log('🐛 ZepProvider DEBUG: userId type:', typeof userId);
      console.log('🐛 ZepProvider DEBUG: userId length:', userId?.length);
      console.log('🐛 ZepProvider DEBUG: Content length:', content.length);
      console.log('🐛 ZepProvider DEBUG: Metadata:', metadata);
      
      console.log('🐛 ZepProvider DEBUG: BEFORE ensureUser() call...');
      const userResult = await this.ensureUser(userId);
      console.log('🐛 ZepProvider DEBUG: ensureUser() RESULT:', userResult);
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
   * Pobiera relevantne wspomnienia z Zep Cloud - ONLY REAL USERS
   * KLUCZOWA FUNKCJA dla cost optimization - używa return_context: true
   */
  async getRelevantMemories(userId, query, limit = 10) {
    if (!this.isEnabled()) {
      return { success: false, error: 'ZepProvider not enabled' };
    }

    // CRITICAL: Validate userId format - reject invalid/spam users only
    if (!userId || typeof userId !== 'string' || userId.length < 10) {
      console.error('ZepProvider: REJECTED getRelevantMemories - invalid userId:', userId);
      return { success: true, memories: [], context: '' }; // Empty result for invalid users
    }

    // ONLY reject spam connection-test users, allow real UUIDs (including test-nati)
    if (userId.startsWith('connection-test-') || userId.startsWith('demo-') || userId === 'undefined' || userId === 'null') {
      console.error('ZepProvider: REJECTED getRelevantMemories - spam user detected:', userId);
      return { success: true, memories: [], context: '' }; // Empty result for spam users
    }

    try {
      console.log('ZepProvider: getRelevantMemories for REAL userId:', userId, {
        limit: limit,
        userIdType: 'REAL_USER'
      });

      const readableUserId = this.convertToReadableUserId(userId);

      // FIXED: Use new Zep API - direct memory search instead of deprecated searchSessions
      console.log('ZepProvider: Using new memory search API...');
      const searchResults = await this.client.memory.search(query, {
        userId: readableUserId,
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
   * Pobiera wszystkie wspomnienia użytkownika (dla admin panelu) - ONLY REAL USERS
   */
  async getAllMemories(userId, filters = {}) {
    if (!this.isEnabled()) {
      return { success: false, error: 'ZepProvider not enabled' };
    }

    // CRITICAL: Validate userId format - reject invalid/spam users only
    if (!userId || typeof userId !== 'string' || userId.length < 10) {
      console.error('ZepProvider: REJECTED getAllMemories - invalid userId:', userId);
      return { success: true, memories: [], count: 0 }; // Empty result for invalid users
    }

    // ONLY reject spam connection-test users, allow real UUIDs (including test-nati)
    if (userId.startsWith('connection-test-') || userId.startsWith('demo-') || userId === 'undefined' || userId === 'null') {
      console.error('ZepProvider: REJECTED getAllMemories - spam user detected:', userId);
      return { success: true, memories: [], count: 0 }; // Empty result for spam users
    }

    try {
      console.log('ZepProvider: getAllMemories for REAL userId:', userId, {
        filters,
        userIdType: 'REAL_USER'
      });

      const readableUserId = this.convertToReadableUserId(userId);

      // FIXED: Use new Zep API - get all memories directly instead of sessions
      console.log('ZepProvider: Getting all memories with new API...');
      try {
        const allMemoriesResult = await this.client.memory.getAll({
          userId: readableUserId,
          limit: 100
        });

        const allMemories = [];
        if (allMemoriesResult.memories) {
          allMemoriesResult.memories.forEach(memory => {
            allMemories.push({
              id: memory.id || memory.uuid,
              content: memory.content || memory.memory,
              summary: (memory.content || memory.memory || '').substring(0, 200) + '...',
              importance: 3, // Default importance
              memory_type: 'conversation',
              created_at: memory.createdAt || memory.created_at,
              metadata: {
                memory_id: memory.id,
                zep_metadata: memory.metadata
              }
            });
          });
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
      } catch (apiError) {
        console.error('ZepProvider: Get all memories API error:', apiError.message);
        return { success: true, memories: [], count: 0 }; // Return empty on API error
      }
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