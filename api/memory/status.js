/**
 * Memory Router Status API - Informacje o stanie systemu pamięci
 * 
 * Endpointy:
 * - GET /api/memory/status - status aktywnych providerów
 * 
 * @author Claude (AI Assistant) - Memory Providers System
 * @date 29.06.2025
 * @status ✅ STATUS ENDPOINT
 */

import memoryRouter from './router.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Initialize router if not already done
    if (!memoryRouter.initialized) {
      console.log('🚀 Memory Status: Initializing router...');
      await memoryRouter.initialize();
    }

    // Get current status
    const status = memoryRouter.getStatus();
    
    console.log('📊 Memory Status requested:', {
      initialized: status.initialized,
      activeProvider: status.activeProvider?.name,
      enabled: status.activeProvider?.enabled,
      registeredProviders: status.registeredProviders
    });

    return res.status(200).json({
      success: true,
      ...status
    });

  } catch (error) {
    console.error('❌ Memory Status error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}