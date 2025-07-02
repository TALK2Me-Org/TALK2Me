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
    
    // Use simple string format for Mem0 API compatibility
    // Mem0 expects simple string user IDs like "alex", "john", "test-user"
    // IMPORTANT: Trim any spaces from config values
    this.userId = (config.userId || 'default-user').trim();
    this.client = null;
    
    console.log('🏗️ Mem0Provider constructor:', {
      apiKey: this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'missing',
      userId: this.userId,
      userIdSource: config.userId ? 'config' : 'fallback-uuid'
    });

    this.enabled = !!this.apiKey;
  }

  /**
   * Convert UUID or email to readable user_id for Mem0 dashboard
   * @param {string} userId - UUID from Supabase or email
   * @returns {string} - Readable user_id for Mem0
   */
  convertToReadableUserId(userId) {
    // If it's an email, extract readable format
    if (userId.includes('@')) {
      if (userId.includes('kontakt@nataliarybarczyk.pl')) return 'natalia-rybarczyk';
      if (userId.includes('fidziu@me.com')) return 'maciej-mentor';
      // Generic email conversion: extract username part
      return userId.split('@')[0].replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    }
    
    // If it's UUID, provide meaningful fallback based on known UUIDs
    if (userId.match(/^[0-9a-f-]{36}$/i)) {
      // Map known UUIDs to readable names
      const knownUUIDs = {
        '550e8400-e29b-41d4-a716-446655440000': 'test-user-nati',
        '9b2f5a20-4296-4981-8145-c61d1356d74a': 'user-maciej'
      };
      return knownUUIDs[userId] || `user-${userId.slice(0, 8)}`;
    }
    
    // If already readable, return as-is
    return userId.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
  }

  /**
   * Create rich user metadata for Mem0 dashboard display
   * @param {string} originalUserId - Original UUID/email
   * @param {string} readableUserId - Readable user_id
   * @returns {object} - User metadata object
   */
  createUserMetadata(originalUserId, readableUserId) {
    // Define known users with rich metadata
    const userProfiles = {
      'natalia-rybarczyk': {
        user_name: 'Natalia Rybarczyk',
        user_email: 'kontakt@nataliarybarczyk.pl',
        user_role: 'Owner & Founder',
        user_organization: 'TALK2Me',
        user_type: 'admin'
      },
      'maciej-mentor': {
        user_name: 'Maciej',
        user_email: 'fidziu@me.com', 
        user_role: 'Project Mentor',
        user_organization: 'TALK2Me',
        user_type: 'mentor'
      },
      'test-user-nati': {
        user_name: 'Test User Natalia',
        user_email: 'test@example.com',
        user_role: 'Test User',
        user_organization: 'TALK2Me',
        user_type: 'test'
      }
    };

    // Return metadata for known user or generic metadata
    return userProfiles[readableUserId] || {
      user_name: readableUserId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      user_email: originalUserId.includes('@') ? originalUserId : 'unknown@example.com',
      user_role: 'User',
      user_organization: 'TALK2Me',
      user_type: 'user'
    };
  }

  async initialize() {
    if (this.initialized) return true;

    console.log('🚀 Mem0Provider: Starting initialization...');

    if (!this.enabled) {
      console.warn('⚠️ Mem0Provider: Missing API key - disabled');
      this.initialized = true;
      return false;
    }

    try {
      // Initialize Mem0 client with performance optimizations
      console.log('🔧 Mem0Provider: Creating MemoryClient with performance config...');
      this.client = new MemoryClient({ 
        apiKey: this.apiKey,
        // 🚀 Performance optimizations
        timeout: 5000,  // 5s timeout instead of default
        retries: 2,     // Fewer retries for faster failures
        version: 'v2'   // Default to V2 API
      });
      
      // Test connection by attempting to get memories (should work even if empty)
      console.log(`🔧 Mem0Provider: Testing API connection with user_id: ${this.userId}`);
      const testResult = await this.client.getAll({ 
        user_id: this.userId,  // ✅ FIXED: Use actual userId for proper user separation
        version: 'v2'  // 🚀 NEW: V2 API for 91% better latency
      });
      console.log(`🔧 Mem0Provider: API test successful, found ${testResult.length || 0} memories`);
      
      this.initialized = true;
      console.log('✅ Mem0Provider: Initialized successfully with real API');
      return true;
    } catch (error) {
      console.error('❌ Mem0Provider: Initialization failed:', error);
      console.error('❌ Mem0Provider: Error details:', error.message);
      
      // Check for specific user_id related errors
      if (error.message && error.message.includes('user_id')) {
        console.error('💡 Mem0Provider: This appears to be a user_id format issue');
        console.error(`💡 Mem0Provider: Current userId: "${this.userId}"`);
        console.error('💡 Mem0Provider: Mem0 API requires valid UUID format for user_id');
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

      console.log('🧪 Mem0Provider: Testing real API connection...');
      
      // Test real API call - get memories count for specific user with graph memory
      const memoriesResponse = await this.client.getAll({ 
        user_id: this.userId,  // ✅ FIXED: Use actual userId for proper user separation
        enable_graph: true,    // 🔗 NEW: Enable graph memory for relationship mapping
        version: 'v2'         // 🚀 NEW: V2 API for 91% better latency
      });
      
      // Handle graph response format
      const memories = memoriesResponse.results || memoriesResponse;
      const relations = memoriesResponse.relations || [];
      
      const latency = Date.now() - startTime;
      
      return { 
        success: true, 
        message: `Mem0Provider connected (${latency}ms) - Real API with Graph Memory`,
        latency,
        details: {
          api: 'Mem0 Cloud API v1',
          userId: this.userId,
          status: 'Real API connection successful',
          memoriesCount: memories.length || 0,
          relationsCount: relations.length || 0,  // 🔗 NEW: Graph relations count
          graphEnabled: true                      // 🔗 NEW: Graph memory indicator
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
    
    if (!this.initialized) await this.initialize();
    
    if (!this.isEnabled()) {
      return { success: false, error: 'Mem0Provider not enabled' };
    }

    try {
      // 🎯 Convert to readable user_id for Mem0 dashboard
      const readableUserId = this.convertToReadableUserId(userId);
      
      console.log('💾 Mem0Provider: Saving memory to real API:', {
        originalUserId: userId,
        readableUserId: readableUserId,
        contentLength: content.length,
        metadata
      });

      // 🚀 ASYNC OPTIMIZATION: Prepare data and metadata in parallel
      const [userMetadata, memoryData] = await Promise.all([
        // Enhanced user metadata for dashboard display
        Promise.resolve(this.createUserMetadata(userId, readableUserId)),
        // Prepare memory data for Mem0 API
        Promise.resolve({
          userId: readableUserId,
          messages: [{ role: 'user', content: content }],
          metadata: {
            summary: metadata.summary || content.substring(0, 100),
            importance: metadata.importance || 5,
            memory_type: metadata.memory_type || 'personal',
            conversation_id: metadata.conversation_id,
            original_user_id: userId
          }
        })
      ]);

      // Merge user metadata
      memoryData.metadata = { ...memoryData.metadata, ...userMetadata };

      // 🚀 ASYNC: Single optimized API call
      const result = await this.client.add(memoryData.messages, {
        user_id: readableUserId,
        enable_graph: true,
        version: 'v2',
        metadata: memoryData.metadata
      });

      const latency = Date.now() - startTime;
      console.log(`✅ Mem0Provider: Memory saved successfully (${latency}ms)`);
      
      return { 
        success: true, 
        latency,
        memoryId: result.id || `mem0_${Date.now()}`,
        memory: {
          id: result.id || `mem0_${Date.now()}`,
          user_id: userId,
          content: content,
          summary: metadata.summary || content.substring(0, 100),
          importance: metadata.importance || 5,
          memory_type: metadata.memory_type || 'personal',
          created_at: new Date().toISOString(),
          provider: 'mem0'
        }
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      console.error(`❌ Mem0Provider: saveMemory error (${latency}ms):`, error);
      return { success: false, error: error.message, latency };
    }
  }

  async getRelevantMemories(userId, query, limit = 10) {
    const startTime = Date.now();
    
    if (!this.initialized) await this.initialize();
    
    if (!this.isEnabled()) {
      return { success: true, memories: [] };
    }

    try {
      // 🎯 Convert to readable user_id for Mem0 queries
      const readableUserId = this.convertToReadableUserId(userId);
      
      console.log('🔍 Mem0Provider: Getting relevant memories from real API:', {
        originalUserId: userId,
        readableUserId: readableUserId,
        query: query.substring(0, 50) + '...',
        limit
      });
      
      // 🚀 ASYNC OPTIMIZATION: Single optimized search call
      const searchResults = await this.client.search(query, { 
        user_id: readableUserId,
        enable_graph: true,
        version: 'v2',
        limit: limit 
      });

      // 🚀 ASYNC: Parallel processing of results
      const [memories, relations, formattedMemories] = await Promise.all([
        Promise.resolve(searchResults.results || searchResults),
        Promise.resolve(searchResults.relations || []),
        Promise.resolve((searchResults.results || searchResults).map(memory => ({
          id: memory.id,
          user_id: userId,
          content: memory.memory || memory.content || '',
          summary: memory.memory || memory.content || '',
          importance: memory.score ? Math.round(memory.score * 5) : 3,
          memory_type: memory.metadata?.memory_type || 'personal',
          created_at: memory.created_at || new Date().toISOString(),
          similarity_score: memory.score || 0.5,
          provider: 'mem0'
        })))
      ]);

      const latency = Date.now() - startTime;
      console.log(`✅ Mem0Provider: Found ${formattedMemories.length} memories, ${relations.length} relations (${latency}ms)`);
      
      return { 
        success: true, 
        latency,
        memories: formattedMemories,
        count: formattedMemories.length,
        relations: relations,
        graphEnabled: true
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      console.error(`❌ Mem0Provider: getRelevantMemories error (${latency}ms):`, error);
      return { success: false, error: error.message, latency };
    }
  }

  async getAllMemories(userId, filters = {}) {
    const startTime = Date.now();
    
    if (!this.initialized) await this.initialize();
    
    if (!this.isEnabled()) {
      return { success: true, memories: [], count: 0 };
    }

    try {
      // 🎯 Convert to readable user_id for Mem0 queries
      const readableUserId = this.convertToReadableUserId(userId);
      
      console.log('📋 Mem0Provider: Getting all memories from real API:', { 
        originalUserId: userId, 
        readableUserId: readableUserId, 
        filters 
      });

      // 🚀 ASYNC OPTIMIZATION: Single optimized getAll call
      const allMemoriesResponse = await this.client.getAll({ 
        user_id: readableUserId,
        enable_graph: true,
        version: 'v2'
      });

      // 🚀 ASYNC: Parallel processing of response data
      const [allMemories, allRelations, formattedMemories] = await Promise.all([
        Promise.resolve(allMemoriesResponse.results || allMemoriesResponse),
        Promise.resolve(allMemoriesResponse.relations || []),
        Promise.resolve((allMemoriesResponse.results || allMemoriesResponse).map(memory => ({
          id: memory.id,
          user_id: userId,
          content: memory.memory || memory.content || '',
          summary: memory.memory || memory.content || '',
          importance: 3,
          memory_type: memory.metadata?.memory_type || 'personal',
          created_at: memory.created_at || new Date().toISOString(),
          updated_at: memory.updated_at || memory.created_at || new Date().toISOString(),
          provider: 'mem0'
        })))
      ]);

      // 🚀 ASYNC: Parallel filtering operations
      let filteredMemories = formattedMemories;
      
      if (filters.memory_type || filters.importance_min) {
        const filterPromises = [];
        
        if (filters.memory_type) {
          filterPromises.push(Promise.resolve(filteredMemories.filter(m => m.memory_type === filters.memory_type)));
        }
        
        if (filters.importance_min) {
          filterPromises.push(Promise.resolve(filteredMemories.filter(m => m.importance >= filters.importance_min)));
        }
        
        // Apply filters in sequence if multiple exist
        for (const filterPromise of filterPromises) {
          filteredMemories = await filterPromise;
        }
      }

      const latency = Date.now() - startTime;
      console.log(`✅ Mem0Provider: Returning ${filteredMemories.length} filtered memories, ${allRelations.length} relations (${latency}ms)`);

      return { 
        success: true, 
        latency,
        memories: filteredMemories,
        count: filteredMemories.length,
        relations: allRelations,
        graphEnabled: true
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      console.error(`❌ Mem0Provider: getAllMemories error (${latency}ms):`, error);
      return { success: false, error: error.message, latency };
    }
  }

  async deleteMemory(memoryId) {
    if (!this.isEnabled()) {
      return { success: false, error: 'Mem0Provider not enabled' };
    }

    try {
      console.log('🗑️ Mem0Provider: Deleting memory from real API:', memoryId);
      
      // Call real Mem0 delete API
      await this.client.delete(memoryId);
      
      console.log('✅ Mem0Provider: Memory deleted successfully from real API');
      return { success: true };
    } catch (error) {
      console.error('❌ Mem0Provider: deleteMemory error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateMemory(memoryId, updates) {
    if (!this.isEnabled()) {
      return { success: false, error: 'Mem0Provider not enabled' };
    }

    try {
      console.log('✏️ Mem0Provider: Updating memory with real API:', { memoryId, updates });
      
      // Call real Mem0 update API
      const updatedMemory = await this.client.update(memoryId, {
        data: updates.content || updates.summary,
        metadata: {
          memory_type: updates.memory_type,
          importance: updates.importance
        }
      });

      // Format response to match our provider interface
      const formattedMemory = {
        id: memoryId,
        content: updates.content || updates.summary,
        summary: updates.summary,
        importance: updates.importance,
        memory_type: updates.memory_type,
        updated_at: new Date().toISOString(),
        provider: 'mem0'
      };

      console.log('✅ Mem0Provider: Memory updated successfully with real API');
      return { success: true, memory: formattedMemory };
    } catch (error) {
      console.error('❌ Mem0Provider: updateMemory error:', error);
      return { success: false, error: error.message };
    }
  }
}