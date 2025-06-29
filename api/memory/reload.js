/**
 * Memory Router Reload API - Hot reload systemu pamięci
 * 
 * Endpointy:
 * - POST /api/memory/reload - przeładowanie systemu pamięci
 * 
 * @author Claude (AI Assistant) - Memory Providers System
 * @date 29.06.2025
 * @status ✅ RELOAD ENDPOINT
 */

import memoryRouter from './router.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    console.log('🔄 Memory Reload: Starting hot reload...');

    // Perform hot reload
    const status = await memoryRouter.reload();
    
    console.log('✅ Memory Reload: Completed successfully', {
      initialized: status.initialized,
      activeProvider: status.activeProvider?.name,
      enabled: status.activeProvider?.enabled
    });

    return res.status(200).json({
      success: true,
      message: 'Memory system reloaded successfully',
      status: status
    });

  } catch (error) {
    console.error('❌ Memory Reload error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: `Reload failed: ${error.message}`
    });
  }
}