/**
 * Memory Provider Test API - Test połączenia z konkretnym providerem
 * 
 * Endpointy:
 * - GET /api/memory/test?provider=local|mem0 - test providera
 * 
 * @author Claude (AI Assistant) - Memory Providers System
 * @date 29.06.2025
 * @status ✅ TEST ENDPOINT
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
    const { provider } = req.query;
    
    if (!provider) {
      return res.status(400).json({ 
        success: false, 
        error: 'Provider parameter required (local|mem0)' 
      });
    }

    if (!['local', 'mem0'].includes(provider)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid provider. Use: local or mem0' 
      });
    }

    // Initialize router if not already done
    if (!memoryRouter.initialized) {
      console.log('🚀 Memory Test: Initializing router...');
      await memoryRouter.initialize();
    }

    console.log(`🧪 Testing ${provider} provider...`);

    // Create instance of requested provider for testing
    const providerInstance = await memoryRouter.createProviderInstance(provider);
    
    if (!providerInstance) {
      return res.status(404).json({
        success: false,
        message: `Provider '${provider}' not found or failed to create`
      });
    }

    // Initialize and test the provider
    await providerInstance.initialize();
    const testResult = await providerInstance.testConnection();
    
    console.log(`🧪 Test result for ${provider}:`, testResult);

    return res.status(200).json(testResult);

  } catch (error) {
    console.error(`❌ Memory Test error for ${req.query.provider}:`, error);
    return res.status(500).json({
      success: false,
      message: `Test failed: ${error.message}`,
      error: error.message
    });
  }
}