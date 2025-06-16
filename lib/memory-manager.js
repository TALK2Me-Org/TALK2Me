/**
 * MemoryManager - System zarządzania pamięcią długoterminową AI
 * 
 * Wykorzystuje:
 * - OpenAI Embeddings do tworzenia wektorów semantycznych
 * - Supabase + pgvector do przechowywania i wyszukiwania
 * - Ekstrakcję entities (imiona, daty, relacje)
 * 
 * @author Claude (AI Assistant) - Sesja 10
 * @date 14.01.2025
 */
import { OpenAIEmbeddings } from '@langchain/openai';
import { createClient } from '@supabase/supabase-js';

class MemoryManager {
  constructor(supabaseUrl, supabaseKey, openaiApiKey) {
    console.log('🏗️ MemoryManager constructor called with:', {
      supabaseUrl: supabaseUrl ? 'provided' : 'missing',
      supabaseKey: supabaseKey ? `${supabaseKey.substring(0, 10)}...` : 'missing',
      openaiApiKey: openaiApiKey ? `${openaiApiKey.substring(0, 10)}...` : 'missing'
    });
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.openaiApiKey = openaiApiKey;
    this.embeddings = null;
    this.vectorStore = null;
    this.initialized = false;
    this.enabled = !!openaiApiKey;
    
    if (!this.enabled) {
      console.warn('⚠️ MemoryManager: No OpenAI API key provided - memory features disabled');
    } else {
      console.log('✅ MemoryManager: OpenAI API key present - memory features enabled');
    }
  }

  async initialize() {
    if (this.initialized) return;
    
    if (!this.enabled) {
      this.initialized = true;
      return;
    }
    
    try {
      // Initialize OpenAI embeddings only if we have API key
      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: this.openaiApiKey,
        modelName: 'text-embedding-ada-002'
      });
      
      // Sprawdź czy tabela memories istnieje
      const { data, error } = await this.supabase
        .from('memories')
        .select('id')
        .limit(1);
      
      if (error && error.code === '42P01') {
        console.error('Memories table does not exist. Please run the migration.');
        this.enabled = false;
      }
      
      this.initialized = true;
      console.log('✅ MemoryManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MemoryManager:', error);
      this.enabled = false;
      this.initialized = true; // Mark as initialized even if failed
    }
  }

  async saveMemory(userId, content, summary, importance = 5, memoryType = 'personal', conversationId = null) {
    if (!this.initialized) await this.initialize();
    
    if (!this.enabled) {
      console.log('Memory system disabled - skipping save');
      return null;
    }
    
    try {
      // Extract entities from the content
      const entities = this.extractEntities(content);
      
      // Create embedding for the summary
      console.log('🔍 Creating embedding for:', summary);
      const embedding = await this.embeddings.embedQuery(summary);
      console.log('📊 Embedding created, length:', embedding.length);
      
      // Save to database
      const { data, error } = await this.supabase
        .from('memories')
        .insert({
          user_id: userId,
          conversation_id: conversationId,
          content,
          summary,
          embedding,
          importance,
          memory_type: memoryType,
          entities
        })
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error saving memory:', error);
        throw error;
      }
      
      console.log(`✅ Memory saved successfully: ${summary} (importance: ${importance})`);
      console.log('📦 Saved data:', data);
      return data;
    } catch (error) {
      console.error('❌ Failed to save memory:', {
        error: error.message,
        stack: error.stack,
        userId,
        summary,
        importance,
        memoryType
      });
      throw error;
    }
  }

  async getRelevantMemories(userId, query, limit = 5, threshold = 0.7) {
    if (!this.initialized) await this.initialize();
    
    if (!this.enabled) {
      return [];
    }
    
    try {
      // Create embedding for the query
      const queryEmbedding = await this.embeddings.embedQuery(query);
      
      // Search for similar memories
      const { data, error } = await this.supabase.rpc('match_memories', {
        query_embedding: queryEmbedding,
        match_user_id: userId,
        match_count: limit,
        match_threshold: threshold
      });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Failed to get relevant memories:', error);
      return [];
    }
  }

  async getMemoriesByType(userId, memoryType, limit = 10) {
    try {
      const { data, error } = await this.supabase.rpc('get_memories_by_type', {
        p_user_id: userId,
        p_memory_type: memoryType,
        p_limit: limit
      });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Failed to get memories by type:', error);
      return [];
    }
  }

  extractEntities(text) {
    const entities = {
      people: [],
      relationships: [],
      dates: [],
      locations: [],
      preferences: []
    };
    
    // Extract people names (simple pattern matching)
    const namePatterns = [
      /(?:mój|moja|moim|mojego|mojej)\s+(\w+)\s+([\wń]+)/gi,
      /(?:nazywa się|ma na imię)\s+([\wń]+)/gi,
      /(?:partner|partnera|partnerka|mąż|męża|żona|żony|chłopak|chłopaka|dziewczyna|dziewczyny)\s+([\wń]+)/gi
    ];
    
    for (const pattern of namePatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const name = match[1] || match[2];
        if (name && name.length > 2) {
          entities.people.push(name);
        }
      }
    }
    
    // Extract relationships
    const relationshipKeywords = ['mąż', 'żona', 'partner', 'partnerka', 'chłopak', 'dziewczyna', 'rodzice', 'mama', 'tata', 'ojciec', 'matka', 'dzieci', 'syn', 'córka'];
    for (const keyword of relationshipKeywords) {
      if (text.toLowerCase().includes(keyword)) {
        entities.relationships.push(keyword);
      }
    }
    
    // Extract dates (simple patterns)
    const datePatterns = [
      /(\d{1,2})\s+(stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|września|października|listopada|grudnia)/gi,
      /(\d{4})\s+rok/gi,
      /(\d{1,2})\s+lat\s+temu/gi
    ];
    
    for (const pattern of datePatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        entities.dates.push(match[0]);
      }
    }
    
    // Remove duplicates
    for (const key in entities) {
      entities[key] = [...new Set(entities[key])];
    }
    
    return entities;
  }

  formatMemoriesForContext(memories) {
    if (!memories || memories.length === 0) return '';
    
    const grouped = memories.reduce((acc, memory) => {
      if (!acc[memory.memory_type]) {
        acc[memory.memory_type] = [];
      }
      acc[memory.memory_type].push(memory);
      return acc;
    }, {});
    
    let context = '\n### Wspomnienia o użytkowniku:\n';
    
    const typeLabels = {
      personal: 'Informacje osobiste',
      relationship: 'Relacje',
      preference: 'Preferencje',
      event: 'Wydarzenia'
    };
    
    for (const [type, mems] of Object.entries(grouped)) {
      if (mems.length > 0) {
        context += `\n**${typeLabels[type] || type}:**\n`;
        for (const mem of mems) {
          context += `- ${mem.summary} (ważność: ${mem.importance}/10)\n`;
          if (mem.entities && Object.keys(mem.entities).length > 0) {
            const relevantEntities = [];
            if (mem.entities.people?.length > 0) {
              relevantEntities.push(`osoby: ${mem.entities.people.join(', ')}`);
            }
            if (mem.entities.relationships?.length > 0) {
              relevantEntities.push(`relacje: ${mem.entities.relationships.join(', ')}`);
            }
            if (relevantEntities.length > 0) {
              context += `  Kontekst: ${relevantEntities.join('; ')}\n`;
            }
          }
        }
      }
    }
    
    return context;
  }

  async analyzeConversationForMemories(userId, messages, conversationId = null) {
    const potentialMemories = [];
    
    for (const message of messages) {
      if (message.role === 'user') {
        // Check for important patterns
        const importanceScore = this.calculateImportance(message.content);
        
        if (importanceScore >= 5) {
          const memoryType = this.detectMemoryType(message.content);
          const summary = await this.generateSummary(message.content);
          
          potentialMemories.push({
            content: message.content,
            summary,
            importance: importanceScore,
            type: memoryType,
            conversationId
          });
        }
      }
    }
    
    return potentialMemories;
  }

  calculateImportance(text) {
    let score = 5; // Base score
    
    // High importance keywords
    const highImportancePatterns = [
      /nazywa się|ma na imię/i,
      /mój|moja|moim|mojego|mojej/i,
      /rocznica|urodziny|ślub/i,
      /trauma|trudne|ciężkie|bolesne/i,
      /zawsze|nigdy|bardzo ważne/i
    ];
    
    // Medium importance keywords
    const mediumImportancePatterns = [
      /lubię|preferuję|wolę/i,
      /często|zazwyczaj|czasami/i,
      /praca|pracuje|zawód/i
    ];
    
    for (const pattern of highImportancePatterns) {
      if (pattern.test(text)) {
        score = Math.min(score + 3, 10);
      }
    }
    
    for (const pattern of mediumImportancePatterns) {
      if (pattern.test(text)) {
        score = Math.min(score + 1, 10);
      }
    }
    
    return score;
  }

  detectMemoryType(text) {
    const lowerText = text.toLowerCase();
    
    if (/mój|moja|partner|mąż|żona|dzieci|rodzice|rodzina/i.test(lowerText)) {
      return 'relationship';
    }
    
    if (/nazywam się|mam \d+ lat|mieszkam|pracuję|jestem/i.test(lowerText)) {
      return 'personal';
    }
    
    if (/lubię|wolę|preferuję|nie lubię|denerwuje|irytuje/i.test(lowerText)) {
      return 'preference';
    }
    
    if (/wydarzyło|stało się|było|miałem|miałam|zdarzyło/i.test(lowerText)) {
      return 'event';
    }
    
    return 'personal';
  }

  async generateSummary(text) {
    // For now, simple extraction - in production, use GPT for better summaries
    const maxLength = 100;
    let summary = text.trim();
    
    // Remove common phrases
    summary = summary.replace(/^(więc|no|tak|ale|i)\s+/i, '');
    
    // Truncate if too long
    if (summary.length > maxLength) {
      summary = summary.substring(0, maxLength - 3) + '...';
    }
    
    return summary;
  }
}

export default MemoryManager;