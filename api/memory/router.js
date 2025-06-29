/**
 * Memory Router - Centralny system zarządzania providerami pamięci
 * 
 * Funkcje:
 * - Wybór aktywnego providera na podstawie konfiguracji
 * - Fallback system (Local jako backup dla Mem0)
 * - Hot reload providerów bez restartu aplikacji
 * - Error handling i graceful degradation
 * 
 * @author Claude (AI Assistant) - Memory Providers System
 * @date 29.06.2025
 * @status ✅ ROUTER IMPLEMENTATION
 */

import { createClient } from '@supabase/supabase-js';
import LocalProvider from './providers/localProvider.js';
import Mem0Provider from './providers/mem0Provider.js';

class MemoryRouter {
  constructor() {
    this.providers = new Map();
    this.activeProvider = null;
    this.fallbackProvider = null;
    this.config = {};
    this.initialized = false;
    
    console.log('🚦 MemoryRouter: Initialized');
  }

  /**
   * Rejestruje nowego providera
   * @param {string} name - nazwa providera (np. 'local', 'mem0')
   * @param {MemoryProvider} providerClass - klasa providera
   */
  registerProvider(name, providerClass) {
    this.providers.set(name, providerClass);
    console.log(`📝 MemoryRouter: Registered provider '${name}'`);
  }

  /**
   * Ładuje konfigurację z Supabase app_config
   */
  async loadConfig() {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase configuration');
      }

      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { data: configData, error } = await supabase
        .from('app_config')
        .select('config_key, config_value')
        .in('config_key', [
          'default_memory_provider',
          'mem0_api_key',
          'mem0_user_id',
          'openai_api_key'
        ]);

      if (error) {
        console.error('❌ MemoryRouter: Failed to load config:', error);
        return false;
      }

      // Convert array to object
      this.config = {};
      configData.forEach(item => {
        this.config[item.config_key] = item.config_value;
      });

      console.log('✅ MemoryRouter: Config loaded:', {
        provider: this.config.default_memory_provider || 'local',
        hasOpenAI: !!this.config.openai_api_key,
        hasMem0: !!this.config.mem0_api_key
      });

      return true;
    } catch (error) {
      console.error('❌ MemoryRouter: Config load error:', error);
      return false;
    }
  }

  /**
   * Inicjalizuje router i wybiera aktywnego providera
   */
  async initialize() {
    if (this.initialized) {
      console.log('⚠️ MemoryRouter: Already initialized');
      return true;
    }

    console.log('🚀 MemoryRouter: Starting initialization...');

    // Load config from database
    const configLoaded = await this.loadConfig();
    if (!configLoaded) {
      console.error('❌ MemoryRouter: Failed to load config, using defaults');
      this.config = { default_memory_provider: 'local' };
    }

    // Determine active and fallback providers
    const requestedProvider = this.config.default_memory_provider || 'local';
    
    try {
      await this.setActiveProvider(requestedProvider);
      this.initialized = true;
      
      console.log(`✅ MemoryRouter: Initialized with provider '${this.activeProvider?.providerName}'`);
      return true;
    } catch (error) {
      console.error('❌ MemoryRouter: Initialization failed:', error);
      return false;
    }
  }

  /**
   * Ustawia aktywnego providera z fallback logic
   */
  async setActiveProvider(providerName) {
    console.log(`🔄 MemoryRouter: Setting active provider to '${providerName}'`);

    // Clean up current provider
    if (this.activeProvider) {
      await this.activeProvider.cleanup();
    }

    try {
      // Try to initialize requested provider
      const provider = await this.createProviderInstance(providerName);
      
      if (provider && await provider.initialize()) {
        this.activeProvider = provider;
        
        // Set fallback provider (always local if not already local)
        if (providerName !== 'local') {
          this.fallbackProvider = await this.createProviderInstance('local');
          await this.fallbackProvider.initialize();
        }
        
        console.log(`✅ MemoryRouter: Active provider set to '${providerName}'`);
        return true;
      } else {
        throw new Error(`Failed to initialize ${providerName} provider`);
      }
    } catch (error) {
      console.error(`❌ MemoryRouter: Failed to set ${providerName} provider:`, error);
      
      // Fallback to local if not already trying local
      if (providerName !== 'local') {
        console.log('🔄 MemoryRouter: Falling back to local provider...');
        return await this.setActiveProvider('local');
      }
      
      throw error;
    }
  }

  /**
   * Tworzy instancję providera na podstawie nazwy
   */
  async createProviderInstance(providerName) {
    const ProviderClass = this.providers.get(providerName);
    
    if (!ProviderClass) {
      throw new Error(`Provider '${providerName}' not registered`);
    }

    // Prepare provider-specific config
    let providerConfig = {};
    
    switch (providerName) {
      case 'local':
        providerConfig = {
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          openaiApiKey: this.config.openai_api_key
        };
        break;
      case 'mem0':
        providerConfig = {
          apiKey: this.config.mem0_api_key,
          userId: this.config.mem0_user_id || 'default-user',
          openaiApiKey: this.config.openai_api_key
        };
        break;
    }

    return new ProviderClass(providerConfig);
  }

  /**
   * Wykonuje operację z automatycznym fallback
   */
  async executeWithFallback(operation, ...args) {
    if (!this.activeProvider) {
      throw new Error('No active memory provider');
    }

    try {
      // Try with active provider
      const result = await this.activeProvider[operation](...args);
      
      if (result.success) {
        return result;
      } else if (this.fallbackProvider && result.error) {
        console.warn(`⚠️ MemoryRouter: ${operation} failed on ${this.activeProvider.providerName}, trying fallback...`);
        return await this.fallbackProvider[operation](...args);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ MemoryRouter: ${operation} error on ${this.activeProvider.providerName}:`, error);
      
      // Try fallback provider
      if (this.fallbackProvider) {
        console.log(`🔄 MemoryRouter: Using fallback provider for ${operation}...`);
        try {
          return await this.fallbackProvider[operation](...args);
        } catch (fallbackError) {
          console.error(`❌ MemoryRouter: Fallback ${operation} also failed:`, fallbackError);
          return { success: false, error: `Both primary and fallback providers failed: ${error.message}` };
        }
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Public API methods - przekazują wywołania do aktywnego providera
   */
  
  async saveMemory(userId, content, metadata = {}) {
    return await this.executeWithFallback('saveMemory', userId, content, metadata);
  }

  async getRelevantMemories(userId, query, limit = 10) {
    return await this.executeWithFallback('getRelevantMemories', userId, query, limit);
  }

  async getAllMemories(userId, filters = {}) {
    return await this.executeWithFallback('getAllMemories', userId, filters);
  }

  async deleteMemory(memoryId) {
    return await this.executeWithFallback('deleteMemory', memoryId);
  }

  async updateMemory(memoryId, updates) {
    return await this.executeWithFallback('updateMemory', memoryId, updates);
  }

  async testConnection() {
    if (!this.activeProvider) {
      return { success: false, error: 'No active provider' };
    }
    return await this.activeProvider.testConnection();
  }

  /**
   * Informacje o stanie routera
   */
  getStatus() {
    return {
      initialized: this.initialized,
      activeProvider: this.activeProvider?.getProviderInfo() || null,
      fallbackProvider: this.fallbackProvider?.getProviderInfo() || null,
      registeredProviders: Array.from(this.providers.keys()),
      config: {
        defaultProvider: this.config.default_memory_provider || 'local'
      }
    };
  }

  /**
   * Hot reload - przeładowanie providera bez restartu
   */
  async reload() {
    console.log('🔄 MemoryRouter: Reloading...');
    
    this.initialized = false;
    await this.loadConfig();
    await this.initialize();
    
    console.log('✅ MemoryRouter: Reload completed');
    return this.getStatus();
  }
}

// Singleton instance
const memoryRouter = new MemoryRouter();

// Register providers immediately
memoryRouter.registerProvider('local', LocalProvider);
memoryRouter.registerProvider('mem0', Mem0Provider);

console.log('🚦 MemoryRouter: Providers registered:', Array.from(memoryRouter.providers.keys()));

export default memoryRouter;