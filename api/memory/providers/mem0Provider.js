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
      // Initialize Mem0 client
      console.log('🔧 Mem0Provider: Creating MemoryClient...');
      this.client = new MemoryClient({ apiKey: this.apiKey });
      
      // Test connection by attempting to get memories (should work even if empty)
      console.log(`🔧 Mem0Provider: Testing API connection with user_id: ${this.userId}`);
      const testResult = await this.client.getAll({ 
        user_id: this.userId  // ✅ FIXED: Use actual userId for proper user separation
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
        enable_graph: true     // 🔗 NEW: Enable graph memory for relationship mapping
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
    if (!this.initialized) await this.initialize();
    
    if (!this.isEnabled()) {
      return { success: false, error: 'Mem0Provider not enabled' };
    }

    try {
      // 🎯 NEW: Convert to readable user_id for Mem0 dashboard
      const readableUserId = this.convertToReadableUserId(userId);
      
      console.log('💾 Mem0Provider: Saving memory to real API:', {
        originalUserId: userId,
        readableUserId: readableUserId,
        contentLength: content.length,
        metadata
      });

      // 👥 NEW: Enhanced user metadata for dashboard display
      const userMetadata = this.createUserMetadata(userId, readableUserId);

      // Prepare memory data for Mem0 API
      const memoryData = {
        userId: readableUserId,  // 🎯 Use readable user_id
        messages: [{ role: 'user', content: content }],
        metadata: {
          summary: metadata.summary || content.substring(0, 100),
          importance: metadata.importance || 5,
          memory_type: metadata.memory_type || 'personal',
          conversation_id: metadata.conversation_id,
          original_user_id: userId,  // Store original UUID for reference
          ...userMetadata  // 👥 Include user metadata for dashboard
        }
      };

      // Call real Mem0 API with readable user_id + graph memory
      const result = await this.client.add(memoryData.messages, {
        user_id: readableUserId,  // 🎯 Use readable user_id for dashboard
        enable_graph: true,  // 🔗 Enable graph memory for relationship mapping
        metadata: memoryData.metadata
      });

      console.log('✅ Mem0Provider: Memory saved successfully to real API');
      
      // Format response to match our provider interface
      return { 
        success: true, 
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
      console.error('❌ Mem0Provider: saveMemory error:', error);
      return { success: false, error: error.message };
    }
  }

  async getRelevantMemories(userId, query, limit = 10) {
    if (!this.initialized) await this.initialize();
    
    if (!this.isEnabled()) {
      return { success: true, memories: [] };
    }

    try {
      // 🎯 NEW: Convert to readable user_id for Mem0 queries
      const readableUserId = this.convertToReadableUserId(userId);
      
      console.log('🔍 Mem0Provider: Getting relevant memories from real API:', {
        originalUserId: userId,
        readableUserId: readableUserId,
        query: query.substring(0, 50) + '...',
        limit
      });
      
      // Call real Mem0 search API with readable user_id + graph memory
      const searchResults = await this.client.search(query, { 
        user_id: readableUserId,  // 🎯 Use readable user_id for queries
        enable_graph: true,  // 🔗 Enable graph memory for relationship-aware search
        limit: limit 
      });

      console.log(`🔍 Mem0Provider: Graph search completed for user ${userId}`);
      
      // Handle graph response format: searchResults now has {results, relations} when enable_graph=true
      const memories = searchResults.results || searchResults; // Fallback for backward compatibility
      const relations = searchResults.relations || [];
      
      console.log(`🔍 Mem0Provider: Found ${memories.length} memories, ${relations.length} relations`);

      // Format results to match our provider interface
      const formattedMemories = memories.map(memory => ({
        id: memory.id,
        user_id: userId,
        content: memory.memory || memory.content || '',
        summary: memory.memory || memory.content || '',
        importance: memory.score ? Math.round(memory.score * 5) : 3, // Convert score to 1-5
        memory_type: memory.metadata?.memory_type || 'personal',
        created_at: memory.created_at || new Date().toISOString(),
        similarity_score: memory.score || 0.5,
        provider: 'mem0'
      }));

      console.log(`✅ Mem0Provider: Found ${formattedMemories.length} relevant memories from real API`);
      
      return { 
        success: true, 
        memories: formattedMemories,
        count: formattedMemories.length,
        relations: relations,  // 🔗 NEW: Include graph relations in response
        graphEnabled: true     // 🔗 NEW: Indicate graph memory is active
      };
    } catch (error) {
      console.error('❌ Mem0Provider: getRelevantMemories error:', error);
      return { success: false, error: error.message };
    }
  }

  async getAllMemories(userId, filters = {}) {
    if (!this.initialized) await this.initialize();
    
    if (!this.isEnabled()) {
      return { success: true, memories: [], count: 0 };
    }

    try {
      // 🎯 NEW: Convert to readable user_id for Mem0 queries
      const readableUserId = this.convertToReadableUserId(userId);
      
      console.log('📋 Mem0Provider: Getting all memories from real API:', { 
        originalUserId: userId, 
        readableUserId: readableUserId, 
        filters 
      });

      // Call real Mem0 getAll API with readable user_id + graph memory
      const allMemoriesResponse = await this.client.getAll({ 
        user_id: readableUserId,  // 🎯 Use readable user_id for queries
        enable_graph: true  // 🔗 Enable graph memory for relationship mapping
      });

      console.log(`📋 Mem0Provider: Graph getAll completed for user ${userId}`);
      
      // Handle graph response format: allMemoriesResponse may have {results, relations} when enable_graph=true
      const allMemories = allMemoriesResponse.results || allMemoriesResponse; // Fallback for backward compatibility
      const allRelations = allMemoriesResponse.relations || [];
      
      console.log(`📋 Mem0Provider: Found ${allMemories.length} total memories, ${allRelations.length} relations`);

      // Format results to match our provider interface
      let formattedMemories = allMemories.map(memory => ({
        id: memory.id,
        user_id: userId,
        content: memory.memory || memory.content || '',
        summary: memory.memory || memory.content || '',
        importance: 3, // Default importance for Mem0 memories
        memory_type: memory.metadata?.memory_type || 'personal',
        created_at: memory.created_at || new Date().toISOString(),
        updated_at: memory.updated_at || memory.created_at || new Date().toISOString(),
        provider: 'mem0'
      }));

      // Apply filters (client-side filtering for Mem0)
      if (filters.memory_type) {
        formattedMemories = formattedMemories.filter(m => m.memory_type === filters.memory_type);
      }
      
      if (filters.importance_min) {
        formattedMemories = formattedMemories.filter(m => m.importance >= filters.importance_min);
      }

      console.log(`✅ Mem0Provider: Returning ${formattedMemories.length} filtered memories from real API`);

      return { 
        success: true, 
        memories: formattedMemories,
        count: formattedMemories.length,
        relations: allRelations,  // 🔗 NEW: Include graph relations in response
        graphEnabled: true        // 🔗 NEW: Indicate graph memory is active
      };
    } catch (error) {
      console.error('❌ Mem0Provider: getAllMemories error:', error);
      return { success: false, error: error.message };
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