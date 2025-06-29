/**
 * MemoryProvider Interface - Abstract base class dla memory providers
 * 
 * Definiuje standardowe API dla różnych providerów pamięci:
 * - LocalProvider (Supabase + pgvector)
 * - Mem0Provider (Mem0 API)
 * - Możliwość dodania kolejnych w przyszłości
 * 
 * @author Claude (AI Assistant) - Memory Providers System
 * @date 29.06.2025
 * @status ✅ INTERFACE DEFINITION
 */

export default class MemoryProvider {
  constructor(config = {}) {
    this.config = config;
    this.initialized = false;
    this.enabled = false;
    this.providerName = 'BaseProvider';
  }

  /**
   * Inicjalizuje providera z wymaganymi credentials/connections
   * @returns {Promise<boolean>} success status
   */
  async initialize() {
    throw new Error('initialize() must be implemented by provider');
  }

  /**
   * Sprawdza czy provider jest gotowy do użycia
   * @returns {boolean} czy provider jest aktywny
   */
  isEnabled() {
    return this.enabled && this.initialized;
  }

  /**
   * Testuje połączenie z providerem
   * @returns {Promise<Object>} {success: boolean, message: string, latency?: number}
   */
  async testConnection() {
    throw new Error('testConnection() must be implemented by provider');
  }

  /**
   * Zapisuje nowe wspomnienie
   * @param {string} userId - ID użytkownika
   * @param {string} content - treść wspomnienia
   * @param {Object} metadata - dodatkowe metadane (summary, importance, type, etc.)
   * @returns {Promise<Object>} {success: boolean, memoryId?: string, error?: string}
   */
  async saveMemory(userId, content, metadata = {}) {
    throw new Error('saveMemory() must be implemented by provider');
  }

  /**
   * Pobiera relevantne wspomnienia na podstawie zapytania
   * @param {string} userId - ID użytkownika  
   * @param {string} query - zapytanie/kontekst do wyszukania
   * @param {number} limit - maksymalna liczba wspomnień (default: 10)
   * @returns {Promise<Object>} {success: boolean, memories: Array, error?: string}
   */
  async getRelevantMemories(userId, query, limit = 10) {
    throw new Error('getRelevantMemories() must be implemented by provider');
  }

  /**
   * Pobiera wszystkie wspomnienia użytkownika (dla admin panelu)
   * @param {string} userId - ID użytkownika
   * @param {Object} filters - filtry (type, importance, date_range)
   * @returns {Promise<Object>} {success: boolean, memories: Array, count: number}
   */
  async getAllMemories(userId, filters = {}) {
    throw new Error('getAllMemories() must be implemented by provider');
  }

  /**
   * Usuwa wspomnienie
   * @param {string} memoryId - ID wspomnienia
   * @returns {Promise<Object>} {success: boolean, error?: string}
   */
  async deleteMemory(memoryId) {
    throw new Error('deleteMemory() must be implemented by provider');
  }

  /**
   * Aktualizuje wspomnienie (dla admin panelu)
   * @param {string} memoryId - ID wspomnienia
   * @param {Object} updates - pola do aktualizacji
   * @returns {Promise<Object>} {success: boolean, error?: string}
   */
  async updateMemory(memoryId, updates) {
    throw new Error('updateMemory() must be implemented by provider');
  }

  /**
   * Zwraca informacje o providerze
   * @returns {Object} provider metadata
   */
  getProviderInfo() {
    return {
      name: this.providerName,
      enabled: this.enabled,
      initialized: this.initialized,
      config: this.config ? Object.keys(this.config) : []
    };
  }

  /**
   * Czyści cache/connection przy zmianie providera
   */
  async cleanup() {
    console.log(`🧹 ${this.providerName}: Cleanup completed`);
  }
}