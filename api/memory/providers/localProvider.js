/**
 * LocalProvider - Supabase + pgvector implementation
 * 
 * Reimplementacja obecnego MemoryManager jako provider
 * Zachowuje 100% funkcjonalności z manager.js
 * 
 * @author Claude (AI Assistant) - Memory Providers System  
 * @date 29.06.2025
 * @status ✅ LOCAL PROVIDER IMPLEMENTATION
 */

import { OpenAIEmbeddings } from '@langchain/openai';
import { createClient } from '@supabase/supabase-js';
import MemoryProvider from '../interfaces/memoryProvider.js';

export default class LocalProvider extends MemoryProvider {
  constructor(config = {}) {
    super(config);
    
    this.providerName = 'LocalProvider';
    this.supabase = null;
    this.embeddings = null;
    this.openaiApiKey = config.openaiApiKey;
    
    console.log('🏗️ LocalProvider constructor:', {
      supabaseUrl: config.supabaseUrl ? 'provided' : 'missing',
      supabaseKey: config.supabaseKey ? 'provided' : 'missing', 
      openaiApiKey: config.openaiApiKey ? 'provided' : 'missing'
    });

    if (config.supabaseUrl && config.supabaseKey) {
      this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    }

    this.enabled = !!(config.supabaseUrl && config.supabaseKey && config.openaiApiKey);
  }

  async initialize() {
    if (this.initialized) return true;

    console.log('🚀 LocalProvider: Starting initialization...');
    console.log('🔧 LocalProvider: Config check:', {
      hasSupabaseUrl: !!this.supabase,
      hasOpenaiApiKey: !!this.openaiApiKey,
      openaiKeyLength: this.openaiApiKey?.length || 0,
      enabled: this.enabled
    });

    if (!this.enabled) {
      console.warn('⚠️ LocalProvider: Missing required config - disabled');
      this.initialized = true;
      return false;
    }

    try {
      // Initialize OpenAI embeddings
      console.log('🔧 LocalProvider: Initializing OpenAI embeddings...');
      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: this.openaiApiKey,
        modelName: 'text-embedding-ada-002'
      });
      console.log('✅ LocalProvider: OpenAI embeddings initialized');

      // Test database connection and table access
      console.log('🔧 LocalProvider: Testing database access...');
      const { data, error } = await this.supabase
        .from('memories_v2')
        .select('count')
        .limit(1);

      if (error) {
        console.error('❌ LocalProvider: memories_v2 table access error:', error);
        if (error.code === '42P01') {
          console.error('Table does not exist. Please run the migration.');
        }
        this.enabled = false;
        return false;
      }

      console.log('✅ LocalProvider: Database access confirmed');
      this.initialized = true;
      console.log('✅ LocalProvider: Initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ LocalProvider: Initialization failed:', error);
      console.error('❌ LocalProvider: Error details:', error.message);
      console.error('❌ LocalProvider: Error stack:', error.stack);
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

      // Test database connection
      const { data, error } = await this.supabase
        .from('memories_v2')
        .select('count')
        .limit(1);

      if (error) {
        return { success: false, message: `Database error: ${error.message}` };
      }

      // Test OpenAI embeddings
      const testEmbedding = await this.embeddings.embedQuery('test connection');
      
      if (!testEmbedding || testEmbedding.length === 0) {
        return { success: false, message: 'OpenAI embeddings test failed' };
      }

      const latency = Date.now() - startTime;
      
      return { 
        success: true, 
        message: `LocalProvider connected (${latency}ms)`,
        latency,
        details: {
          database: 'Connected',
          embeddings: `OpenAI ada-002 (${testEmbedding.length}D)`,
          table: 'memories_v2 accessible'
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
      return { success: false, error: 'LocalProvider not enabled' };
    }

    try {
      const {
        summary = content.substring(0, 500),
        importance = 5,
        memory_type = 'personal',
        conversation_id = null
      } = metadata;

      // Extract entities
      const entities = this.extractEntities(content);
      
      // Create embedding
      console.log('🔍 LocalProvider: Creating embedding for:', summary);
      const embedding = await this.embeddings.embedQuery(summary);
      
      // Save to database
      const { data, error } = await this.supabase
        .from('memories_v2')
        .insert({
          user_id: userId,
          content: content,
          summary: summary,
          embedding: JSON.stringify(embedding),
          importance: importance,
          memory_type: memory_type,
          entities: entities,
          conversation_id: conversation_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ LocalProvider: Save error:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ LocalProvider: Memory saved successfully');
      return { success: true, memoryId: data.id, memory: data };
    } catch (error) {
      console.error('❌ LocalProvider: saveMemory error:', error);
      return { success: false, error: error.message };
    }
  }

  async getRelevantMemories(userId, query, limit = 10) {
    if (!this.initialized) await this.initialize();
    
    if (!this.isEnabled()) {
      console.log('⚠️ LocalProvider: Not enabled, returning empty memories');
      return { success: true, memories: [] };
    }

    try {
      console.log('🔍 LOCAL DEBUG: Getting relevant memories...');
      console.log('🔍 LOCAL DEBUG: User ID:', userId);
      console.log('🔍 LOCAL DEBUG: Query:', query.substring(0, 100) + '...');
      console.log('🔍 LOCAL DEBUG: Limit:', limit);
      
      // Create embedding for query
      console.log('🔍 LOCAL DEBUG: Creating embedding for query...');
      const queryEmbedding = await this.embeddings.embedQuery(query);
      console.log('🔍 LOCAL DEBUG: Query embedding created, dimension:', queryEmbedding.length);
      
      // Search with similarity
      console.log('🔍 LOCAL DEBUG: Calling match_memories RPC...');
      const { data, error } = await this.supabase.rpc('match_memories', {
        user_id_param: userId,
        query_embedding: JSON.stringify(queryEmbedding),
        match_threshold: 0.4,
        match_count: limit
      });

      if (error) {
        console.error('❌ LOCAL DEBUG: Similarity search error:', error);
        console.error('❌ LOCAL DEBUG: Error code:', error.code);
        console.error('❌ LOCAL DEBUG: Error details:', error.details);
        return { success: false, error: error.message };
      }

      console.log(`✅ LOCAL DEBUG: RPC returned ${data?.length || 0} memories`);
      
      if (data && data.length > 0) {
        console.log('🔍 LOCAL DEBUG: Memory details:', data.map(m => ({
          id: m.id?.substring(0, 8) + '...',
          summary: m.summary?.substring(0, 30) + '...',
          similarity: m.similarity_score,
          type: m.memory_type,
          user_id: m.user_id
        })));
      }
      
      return { 
        success: true, 
        memories: data || [],
        count: data?.length || 0
      };
    } catch (error) {
      console.error('❌ LOCAL DEBUG: getRelevantMemories exception:', error);
      console.error('❌ LOCAL DEBUG: Exception stack:', error.stack);
      return { success: false, error: error.message };
    }
  }

  async getAllMemories(userId, filters = {}) {
    if (!this.initialized) await this.initialize();
    
    if (!this.isEnabled()) {
      return { success: true, memories: [], count: 0 };
    }

    try {
      let query = this.supabase
        .from('memories_v2')
        .select('*')
        .eq('user_id', userId);

      // Apply filters
      if (filters.memory_type) {
        query = query.eq('memory_type', filters.memory_type);
      }
      
      if (filters.importance_min) {
        query = query.gte('importance', filters.importance_min);
      }

      // Order by creation date
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      return { 
        success: true, 
        memories: data || [],
        count: data?.length || 0
      };
    } catch (error) {
      console.error('❌ LocalProvider: getAllMemories error:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteMemory(memoryId) {
    if (!this.isEnabled()) {
      return { success: false, error: 'LocalProvider not enabled' };
    }

    try {
      const { error } = await this.supabase
        .from('memories_v2')
        .delete()
        .eq('id', memoryId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('❌ LocalProvider: deleteMemory error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateMemory(memoryId, updates) {
    if (!this.isEnabled()) {
      return { success: false, error: 'LocalProvider not enabled' };
    }

    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('memories_v2')
        .update(updateData)
        .eq('id', memoryId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, memory: data };
    } catch (error) {
      console.error('❌ LocalProvider: updateMemory error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Entity extraction from memory content
   * Copied from original MemoryManager
   */
  extractEntities(content) {
    const entities = {
      people: [],
      dates: [],
      emotions: [],
      relationships: []
    };

    // Extract people (names)
    const namePattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
    const potentialNames = content.match(namePattern) || [];
    
    // Filter out common words that might be capitalized
    const commonWords = ['I', 'Me', 'You', 'He', 'She', 'They', 'We', 'My', 'Your', 'His', 'Her', 'Their', 'Our'];
    entities.people = potentialNames.filter(name => 
      !commonWords.includes(name) && name.length > 1
    );

    // Extract emotions
    const emotionWords = ['happy', 'sad', 'angry', 'excited', 'nervous', 'anxious', 'love', 'hate', 'frustrated', 'calm', 'stressed'];
    entities.emotions = emotionWords.filter(emotion => 
      content.toLowerCase().includes(emotion)
    );

    // Extract relationship terms
    const relationshipWords = ['partner', 'boyfriend', 'girlfriend', 'husband', 'wife', 'friend', 'family', 'colleague', 'boss'];
    entities.relationships = relationshipWords.filter(rel => 
      content.toLowerCase().includes(rel)
    );

    return entities;
  }

  /**
   * Format memories for AI context
   * Copied from original MemoryManager  
   */
  formatMemoriesForContext(memories) {
    if (!memories || memories.length === 0) {
      return "No previous memories found.";
    }

    return memories.map((memory, index) => {
      const date = new Date(memory.created_at).toLocaleDateString();
      const importance = '★'.repeat(memory.importance || 1);
      
      return `[Memory ${index + 1}] (${date}, ${importance})\nType: ${memory.memory_type || 'personal'}\nSummary: ${memory.summary}\nContent: ${memory.content}\n`;
    }).join('\n---\n');
  }
}