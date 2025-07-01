/**
 * Mem0 Debug Endpoint - Direct API testing
 * 
 * Bypasses router to test Mem0 API directly
 * Provides detailed error logging and diagnostics
 * 
 * @author Claude (AI Assistant) - Mem0 Debug
 * @date 01.07.2025
 * @status 🔍 DEBUG ENDPOINT
 */

import { MemoryClient } from 'mem0ai';
import { createClient } from '@supabase/supabase-js';

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
    console.log('🔍 MEM0 DEBUG: Starting direct API test...');

    // Step 1: Load config from database
    console.log('🔍 MEM0 DEBUG: Loading config from database...');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: configData, error } = await supabase
      .from('app_config')
      .select('config_key, config_value')
      .in('config_key', ['mem0_api_key', 'mem0_user_id']);

    if (error) {
      throw new Error(`Config load error: ${error.message}`);
    }

    // Convert to object
    const config = {};
    configData.forEach(item => {
      config[item.config_key] = item.config_value;
    });

    console.log('🔍 MEM0 DEBUG: Config loaded:', {
      hasApiKey: !!config.mem0_api_key,
      apiKeyLength: config.mem0_api_key?.length || 0,
      apiKeyPrefix: config.mem0_api_key?.substring(0, 10) || 'none',
      userId: config.mem0_user_id,
      userIdLength: config.mem0_user_id?.length || 0,
      userIdHasSpaces: config.mem0_user_id ? config.mem0_user_id !== config.mem0_user_id.trim() : false
    });

    // Step 2: Test basic Mem0 client creation
    console.log('🔍 MEM0 DEBUG: Creating MemoryClient...');
    
    if (!config.mem0_api_key) {
      throw new Error('mem0_api_key not found in database');
    }

    const trimmedApiKey = config.mem0_api_key.trim();
    const trimmedUserId = (config.mem0_user_id || 'test-user').trim();

    console.log('🔍 MEM0 DEBUG: Using trimmed values:', {
      apiKeyLength: trimmedApiKey.length,
      userId: trimmedUserId,
      userIdLength: trimmedUserId.length
    });

    const client = new MemoryClient({ apiKey: trimmedApiKey });
    console.log('✅ MEM0 DEBUG: MemoryClient created successfully');

    // Step 3: Test simple API call
    console.log('🔍 MEM0 DEBUG: Testing getAll API call...');
    console.log('🔍 MEM0 DEBUG: Call parameters:', { userId: trimmedUserId });

    const startTime = Date.now();
    const memories = await client.getAll({ userId: trimmedUserId });
    const latency = Date.now() - startTime;

    console.log('✅ MEM0 DEBUG: API call successful!', {
      memoriesCount: memories.length,
      latency: `${latency}ms`,
      memories: memories.slice(0, 3) // First 3 for debugging
    });

    return res.status(200).json({
      success: true,
      message: 'Mem0 API working perfectly!',
      debug: {
        apiKey: `${trimmedApiKey.substring(0, 10)}...`,
        userId: trimmedUserId,
        latency: `${latency}ms`,
        memoriesFound: memories.length,
        sampleMemories: memories.slice(0, 2)
      }
    });

  } catch (error) {
    console.error('❌ MEM0 DEBUG: Error occurred:', error);
    console.error('❌ MEM0 DEBUG: Error message:', error.message);
    console.error('❌ MEM0 DEBUG: Error stack:', error.stack);

    return res.status(500).json({
      success: false,
      error: error.message,
      debug: {
        errorType: error.constructor.name,
        timestamp: new Date().toISOString(),
        stack: error.stack
      }
    });
  }
}