/**
 * Mem0Provider - Real Mem0 API integration
 * 
 * Integrates with Mem0 cloud platform for memory management
 * Uses mem0ai npm package for structured API calls
 * 
 * @author Claude (AI Assistant) - Memory Providers System
 * @date 01.07.2025
 * @status ✅ REAL API IMPLEMENTATION
 */

import { MemoryClient } from 'mem0ai';
import MemoryProvider from '../interfaces/memoryProvider.js';

export default class Mem0Provider extends MemoryProvider {
  constructor(config = {}) {
    super(config);
    
    this.providerName = 'Mem0Provider';
    this.apiKey = config.apiKey ? config.apiKey.trim() : null;
    
    // Stateless provider - userId passed dynamically to each method
    this.testUserId = (config.userId || 'test-user').trim();
    this.client = null;
    
    console.log('Mem0Provider constructor:', {
      apiKey: this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'missing',
      testUserId: this.testUserId
    });

    this.enabled = !!this.apiKey;
  }

  /**
   * Convert UUID or email to readable user_id for Mem0 dashboard
   * @param {string} userId - UUID from Supabase or email
   * @returns {string} - Readable user_id for Mem0
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
   * Create user metadata for Mem0 dashboard display
   * @param {string} originalUserId - Original UUID/email
   * @param {string} readableUserId - Readable user_id
   * @returns {object} - User metadata object
   */
  createUserMetadata(originalUserId, readableUserId) {
    return {
      user_name: readableUserId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      user_email: originalUserId.includes('@') ? originalUserId : 'unknown@example.com',
      user_role: 'User',
      user_organization: 'TALK2Me',
      user_type: 'user'
    };
  }

  /**
   * Helper function for error handling and logging
   * @param {string} operation - Operation name
   * @param {Error} error - Error object
   * @param {number} startTime - Start time for latency calculation
   * @returns {object} - Formatted error response
   */
  handleError(operation, error, startTime) {
    const latency = Date.now() - startTime;
    console.error(`❌ Mem0Provider: ${operation} error (${latency}ms):`, error.message);
    return { success: false, error: error.message, latency };
  }

  /**
   * Defensive validation for memory input - prevents context dumps
   * @param {string} content - Memory content to validate
   * @param {object} metadata - Metadata object to validate
   * @returns {object} - {valid: boolean, sanitized: string, warning?: string}
   */
  validateMemoryInput(content, metadata = {}) {
    // Check for conversation_messages - BLOCKED!
    if (metadata.conversation_messages && Array.isArray(metadata.conversation_messages)) {
      return {
        valid: false,
        sanitized: '',
        warning: 'conversation_messages detected - context dumps blocked'
      };
    }

    // Check content type and length
    if (typeof content !== 'string') {
      return {
        valid: false,
        sanitized: '',
        warning: 'content must be string type'
      };
    }

    // Max 512 characters for single memory
    const MAX_MEMORY_LENGTH = 512;
    if (content.length > MAX_MEMORY_LENGTH) {
      const truncated = content.substring(0, MAX_MEMORY_LENGTH);
      return {
        valid: true,
        sanitized: truncated,
        warning: `content truncated from ${content.length} to ${MAX_MEMORY_LENGTH} chars`
      };
    }

    // Empty content check
    if (!content.trim()) {
      return {
        valid: false,
        sanitized: '',
        warning: 'empty content not allowed'
      };
    }

    return {
      valid: true,
      sanitized: content.trim(),
      warning: null
    };
  }

  /**
   * Defensive validation for query input
   * @param {string} query - Query string to validate
   * @returns {object} - {valid: boolean, sanitized: string, warning?: string}
   */
  validateQueryInput(query) {
    if (typeof query !== 'string') {
      return {
        valid: false,
        sanitized: '',
        warning: 'query must be string type'
      };
    }

    // Max 256 characters for query
    const MAX_QUERY_LENGTH = 256;
    if (query.length > MAX_QUERY_LENGTH) {
      const truncated = query.substring(0, MAX_QUERY_LENGTH);
      return {
        valid: true,
        sanitized: truncated,
        warning: `query truncated from ${query.length} to ${MAX_QUERY_LENGTH} chars`
      };
    }

    if (!query.trim()) {
      return {
        valid: false,
        sanitized: '',
        warning: 'empty query not allowed'
      };
    }

    return {
      valid: true,
      sanitized: query.trim(),
      warning: null
    };
  }

  async initialize() {
    if (this.initialized) return true;

    console.log('Mem0Provider: Starting initialization...');

    if (!this.enabled) {
      console.warn('Mem0Provider: Missing API key - disabled');
      this.initialized = true;
      return false;
    }

    try {
      console.log('Mem0Provider: Creating MemoryClient...');
      this.client = new MemoryClient({ 
        apiKey: this.apiKey,
        timeout: 5000,
        retries: 2
      });
      
      console.log(`Mem0Provider: Testing API connection with test user_id: ${this.testUserId}`);
      const testResult = await this.client.getAll({ 
        user_id: this.testUserId,
        version: 'v2',
        async_mode: true
      });
      console.log(`Mem0Provider: API test successful, found ${testResult.length || 0} memories`);
      
      this.initialized = true;
      console.log('Mem0Provider: Initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Mem0Provider: Initialization failed:', error);
      console.error('❌ Mem0Provider: Error details:', error.message);
      
      // Check for specific user_id related errors
      if (error.message && error.message.includes('user_id')) {
        console.error('Mem0Provider: user_id format issue');
        console.error(`Mem0Provider: Current testUserId: "${this.testUserId}"`);
        console.error('Mem0Provider: API requires valid UUID format for user_id');
      }
      
      this.enabled = false;
      this.initialized = true;
      return false;
    }
  }

  async testConnection() {
    const startTime = Date.now();
    
    try {
      if (!this.isEnabled()) {
        return { success: false, message: 'Provider not enabled or initialized' };
      }

      console.log('Mem0Provider: Testing API connection...');
      
      const memoriesResponse = await this.client.getAll({ 
        user_id: this.testUserId,
        version: 'v2',
        async_mode: true
      });
      const memories = memoriesResponse.results || memoriesResponse;
      const relations = memoriesResponse.relations || [];
      
      const latency = Date.now() - startTime;
      
      return { 
        success: true, 
        message: `Mem0Provider connected (${latency}ms) - Real API with Graph Memory`,
        latency,
        details: {
          api: 'Mem0 Cloud API v1',
          testUserId: this.testUserId,
          status: 'Real API connection successful',
          memoriesCount: memories.length || 0,
          relationsCount: relations.length || 0,
          graphEnabled: true
        }
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Connection test failed: ${error.message}`,
        latency: Date.now() - startTime
      };
    }
  }

  async saveMemory(userId, content, metadata = {}) {
    const startTime = Date.now();
    
    // DEFENSIVE PROGRAMMING: Validate input first
    const validation = this.validateMemoryInput(content, metadata);
    if (!validation.valid) {
      console.warn(`Mem0Provider: saveMemory blocked - ${validation.warning}`);
      return { success: false, error: validation.warning };
    }
    
    // Log warning if content was truncated
    if (validation.warning) {
      console.warn(`Mem0Provider: saveMemory warning - ${validation.warning}`);
    }
    
    if (!this.initialized) await this.initialize();
    
    if (!this.isEnabled()) {
      return { success: false, error: 'Mem0Provider not enabled' };
    }

    try {
      const readableUserId = this.convertToReadableUserId(userId);
      
      console.log('Mem0Provider: Saving single memory:', {
        userId: readableUserId,
        contentLength: validation.sanitized.length,
        originalLength: content.length
      });

      // FIXED: Only single memory, NO conversation_messages!
      const singleMessage = [{ role: 'user', content: validation.sanitized }];
      
      const result = await this.client.add(singleMessage, {
        user_id: readableUserId,
        version: 'v2',
        async_mode: true
      });

      const latency = Date.now() - startTime;
      console.log(`Mem0Provider: Memory saved successfully (${latency}ms)`);
      
      return { 
        success: true, 
        latency,
        memoryId: result.id || `mem0_${Date.now()}`,
        memory: {
          id: result.id || `mem0_${Date.now()}`,
          user_id: userId,
          content: validation.sanitized,
          summary: metadata.summary || validation.sanitized.substring(0, 100),
          importance: metadata.importance || 5,
          memory_type: metadata.memory_type || 'personal',
          created_at: new Date().toISOString(),
          provider: 'mem0'
        }
      };
    } catch (error) {
      return this.handleError('saveMemory', error, startTime);
    }
  }

  async getRelevantMemories(userId, query, limit = 10) {
    const startTime = Date.now();
    
    // DEFENSIVE PROGRAMMING: Validate query input
    const queryValidation = this.validateQueryInput(query);
    if (!queryValidation.valid) {
      console.warn(`Mem0Provider: getRelevantMemories blocked - ${queryValidation.warning}`);
      return { success: false, error: queryValidation.warning };
    }
    
    // Log warning if query was truncated
    if (queryValidation.warning) {
      console.warn(`Mem0Provider: getRelevantMemories warning - ${queryValidation.warning}`);
    }
    
    // DEFENSIVE: Limit max results to 10
    const safeLimit = Math.min(limit || 10, 10);
    
    if (!this.initialized) await this.initialize();
    
    if (!this.isEnabled()) {
      return { success: true, memories: [] };
    }

    try {
      const readableUserId = this.convertToReadableUserId(userId);
      
      console.log('Mem0Provider: Getting relevant memories:', {
        userId: readableUserId,
        queryLength: queryValidation.sanitized.length,
        originalQueryLength: query.length,
        limitRequested: limit,
        limitApplied: safeLimit
      });
      
      const searchResults = await this.client.search(queryValidation.sanitized, { 
        user_id: readableUserId,
        version: 'v2',
        top_k: safeLimit,
        async_mode: true
      });

      const memories = searchResults.results || searchResults;
      const relations = searchResults.relations || [];
      const formattedMemories = memories.map(memory => ({
        id: memory.id,
        user_id: userId,
        content: memory.memory || memory.content || '',
        summary: memory.memory || memory.content || '',
        importance: memory.score ? Math.round(memory.score * 5) : 3,
        memory_type: memory.metadata?.memory_type || 'personal',
        created_at: memory.created_at || new Date().toISOString(),
        similarity_score: memory.score || 0.5,
        provider: 'mem0'
      }));

      const latency = Date.now() - startTime;
      console.log(`Mem0Provider: Found ${formattedMemories.length} memories (${latency}ms)`);
      
      return { 
        success: true, 
        latency,
        memories: formattedMemories,
        count: formattedMemories.length,
        relations: relations,
        graphEnabled: true
      };
    } catch (error) {
      return this.handleError('getRelevantMemories', error, startTime);
    }
  }

  async getAllMemories(userId, filters = {}) {
    const startTime = Date.now();
    
    // DEFENSIVE: No need for query validation here, but limit results
    const MAX_ALL_MEMORIES = 100; // Safety limit for getAllMemories
    
    if (!this.initialized) await this.initialize();
    
    if (!this.isEnabled()) {
      return { success: true, memories: [], count: 0 };
    }

    try {
      const readableUserId = this.convertToReadableUserId(userId);
      
      console.log('Mem0Provider: Getting all memories (max 100):', { 
        userId: readableUserId,
        filters,
        maxResults: MAX_ALL_MEMORIES
      });

      const allMemoriesResponse = await this.client.getAll({ 
        user_id: readableUserId,
        version: 'v2',
        async_mode: true
      });

      const allMemories = allMemoriesResponse.results || allMemoriesResponse;
      const allRelations = allMemoriesResponse.relations || [];
      
      // DEFENSIVE: Limit number of memories to prevent memory overload
      const limitedMemories = allMemories.slice(0, MAX_ALL_MEMORIES);
      if (allMemories.length > MAX_ALL_MEMORIES) {
        console.warn(`Mem0Provider: Truncated ${allMemories.length} memories to ${MAX_ALL_MEMORIES}`);
      }
      
      const formattedMemories = limitedMemories.map(memory => ({
        id: memory.id,
        user_id: userId,
        content: memory.memory || memory.content || '',
        summary: memory.memory || memory.content || '',
        importance: 3,
        memory_type: memory.metadata?.memory_type || 'personal',
        created_at: memory.created_at || new Date().toISOString(),
        updated_at: memory.updated_at || memory.created_at || new Date().toISOString(),
        provider: 'mem0'
      }));

      let filteredMemories = formattedMemories;
      
      if (filters.memory_type) {
        filteredMemories = filteredMemories.filter(m => m.memory_type === filters.memory_type);
      }
      
      if (filters.importance_min) {
        filteredMemories = filteredMemories.filter(m => m.importance >= filters.importance_min);
      }

      const latency = Date.now() - startTime;
      console.log(`Mem0Provider: Returning ${filteredMemories.length} memories (${latency}ms)`);

      return { 
        success: true, 
        latency,
        memories: filteredMemories,
        count: filteredMemories.length,
        relations: allRelations,
        graphEnabled: true
      };
    } catch (error) {
      return this.handleError('getAllMemories', error, startTime);
    }
  }

  async deleteMemory(memoryId) {
    if (!this.isEnabled()) {
      return { success: false, error: 'Mem0Provider not enabled' };
    }

    try {
      console.log('Mem0Provider: Deleting memory:', memoryId);
      
      await this.client.delete(memoryId);
      
      console.log('Mem0Provider: Memory deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Mem0Provider: deleteMemory error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async updateMemory(memoryId, updates) {
    if (!this.isEnabled()) {
      return { success: false, error: 'Mem0Provider not enabled' };
    }

    try {
      console.log('Mem0Provider: Updating memory:', { memoryId, updates });
      
      const updatedMemory = await this.client.update(memoryId, {
        data: updates.content || updates.summary,
        metadata: {
          memory_type: updates.memory_type,
          importance: updates.importance
        }
      });
      const formattedMemory = {
        id: memoryId,
        content: updates.content || updates.summary,
        summary: updates.summary,
        importance: updates.importance,
        memory_type: updates.memory_type,
        updated_at: new Date().toISOString(),
        provider: 'mem0'
      };

      console.log('Mem0Provider: Memory updated successfully');
      return { success: true, memory: formattedMemory };
    } catch (error) {
      console.error('❌ Mem0Provider: updateMemory error:', error.message);
      return { success: false, error: error.message };
    }
  }
}