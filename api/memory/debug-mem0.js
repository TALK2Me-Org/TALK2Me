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
    const originalUserId = (config.mem0_user_id || 'test-user').trim();
    
    // 🎯 NEW: Convert to readable user_id for better dashboard display
    const trimmedUserId = originalUserId.includes('550e8400') ? 'test-user-natalia' : originalUserId;

    console.log('🔍 MEM0 DEBUG: Using trimmed values:', {
      apiKeyLength: trimmedApiKey.length,
      userId: trimmedUserId,
      userIdLength: trimmedUserId.length
    });

    const client = new MemoryClient({ apiKey: trimmedApiKey });
    console.log('✅ MEM0 DEBUG: MemoryClient created successfully');

    // Step 3: Inspect the client object first
    console.log('🔍 MEM0 DEBUG: Inspecting MemoryClient methods...');
    console.log('🔍 MEM0 DEBUG: Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(client)));
    console.log('🔍 MEM0 DEBUG: Client object keys:', Object.keys(client));

    // Step 4: Try different API call approach
    console.log('🔍 MEM0 DEBUG: Testing add API call first (safer than getAll)...');
    
    const startTime = Date.now();
    
    // Try a simple add operation first with graph memory enabled
    // 🎯 NEW: Add test memory with readable user_id and rich metadata
    const testMemory = await client.add([
      { role: 'user', content: 'Test memory from TALK2Me debug endpoint - Natalia Rybarczyk jest właścicielem TALK2Me i pracuje z Maciejem jako mentor projektu' }
    ], {
      user_id: trimmedUserId,  // 🎯 NEW: Use readable user_id for dashboard
      enable_graph: true,      // 🔗 Enable graph memory for relationship mapping
      metadata: {
        user_name: 'Test User Natalia',
        user_email: 'test@nataliarybarczyk.pl',
        user_role: 'Test User',
        user_organization: 'TALK2Me',
        user_type: 'test',
        original_user_id: originalUserId
      }
    });
    
    console.log('✅ MEM0 DEBUG: Add operation successful!', testMemory);
    
    // Step 4: Test users() method to see available functionality
    console.log('🔍 MEM0 DEBUG: Testing users() method...');
    let usersResult = null;
    try {
      usersResult = await client.users();
      console.log('✅ MEM0 DEBUG: Users method successful!', usersResult);
    } catch (error) {
      console.log('⚠️ MEM0 DEBUG: Users method failed:', error.message);
      usersResult = { error: error.message };
    }
    
    // Now try to get all memories for this specific user with graph enabled
    const memoriesResponse = await client.getAll({ 
      user_id: trimmedUserId,  // ✅ FIXED: Use actual user_id for proper separation
      enable_graph: true       // 🔗 NEW: Enable graph memory to get relations
    });
    
    // Handle graph response format
    const memories = memoriesResponse.results || memoriesResponse;
    const relations = memoriesResponse.relations || [];
    
    const latency = Date.now() - startTime;

    console.log('✅ MEM0 DEBUG: API call successful!', {
      memoriesCount: memories.length,
      latency: `${latency}ms`,
      memories: memories.slice(0, 3) // First 3 for debugging
    });

    return res.status(200).json({
      success: true,
      message: 'Mem0 API with Graph Memory working perfectly!',
      debug: {
        apiKey: `${trimmedApiKey.substring(0, 10)}...`,
        originalUserId: originalUserId,  // 🎯 Show original UUID
        readableUserId: trimmedUserId,   // 🎯 Show readable user_id for dashboard
        latency: `${latency}ms`,
        testMemoryAdded: testMemory,
        memoriesFound: memories.length,
        relationsFound: relations.length,  // 🔗 Graph relations count
        sampleMemories: memories.slice(0, 2),
        sampleRelations: relations.slice(0, 3),  // 🔗 Sample relations
        graphEnabled: true,  // 🔗 Graph memory indicator
        readableUserIdStrategy: 'UUID → readable conversion for dashboard',  // 🎯 Strategy info
        usersMethodTest: usersResult || "not tested",  // 👥 Users method result
        clientMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(client))
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