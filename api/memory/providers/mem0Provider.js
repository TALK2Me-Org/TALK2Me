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
    this.apiKey = config.apiKey;
    
    // Use UUID format for Mem0 API compatibility
    // Mem0 requires proper user_id format, not just "default-user"
    this.userId = config.userId || '550e8400-e29b-41d4-a716-446655440000';
    this.client = null;
    
    console.log('🏗️ Mem0Provider constructor:', {
      apiKey: this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'missing',
      userId: this.userId,
      userIdSource: config.userId ? 'config' : 'fallback-uuid'
    });

    this.enabled = !!this.apiKey;
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
      console.log(`🔧 Mem0Provider: Testing API connection with userId: ${this.userId}`);
      const testResult = await this.client.getAll({ userId: this.userId });
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
      
      // Test real API call - get memories count
      const memories = await this.client.getAll({ userId: this.userId });
      
      const latency = Date.now() - startTime;
      
      return { 
        success: true, 
        message: `Mem0Provider connected (${latency}ms) - Real API`,
        latency,
        details: {
          api: 'Mem0 Cloud API v1',
          userId: this.userId,
          status: 'Real API connection successful',
          memoriesCount: memories.length || 0
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
      console.log('💾 Mem0Provider: Saving memory to real API:', {
        userId,
        contentLength: content.length,
        metadata
      });

      // Prepare memory data for Mem0 API
      const memoryData = {
        userId: userId,
        messages: [{ role: 'user', content: content }],
        metadata: {
          summary: metadata.summary || content.substring(0, 100),
          importance: metadata.importance || 5,
          memory_type: metadata.memory_type || 'personal',
          conversation_id: metadata.conversation_id
        }
      };

      // Call real Mem0 API
      const result = await this.client.add(memoryData.messages, {
        userId: memoryData.userId,
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
      console.log('🔍 Mem0Provider: Getting relevant memories from real API:', {
        userId,
        query: query.substring(0, 50) + '...',
        limit
      });
      
      // Call real Mem0 search API
      const searchResults = await this.client.search(query, { 
        userId: userId,
        limit: limit 
      });

      console.log(`🔍 Mem0Provider: API returned ${searchResults.length} memories`);

      // Format results to match our provider interface
      const formattedMemories = searchResults.map(memory => ({
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
        count: formattedMemories.length
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
      console.log('📋 Mem0Provider: Getting all memories from real API:', { userId, filters });

      // Call real Mem0 getAll API
      const allMemories = await this.client.getAll({ userId: userId });

      console.log(`📋 Mem0Provider: API returned ${allMemories.length} total memories`);

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
        count: formattedMemories.length
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