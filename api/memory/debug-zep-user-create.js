/**
 * Zep User Creation Test Endpoint
 * 
 * Tests direct user creation in Zep Cloud using EXACT working code from testConnection()
 * This endpoint creates test users that were PROVEN to work before
 * 
 * @author Claude (AI Assistant) - ZepProvider Debug
 * @date 04.07.2025
 * @status 🧪 USER CREATION TEST
 */

import { ZepClient } from '@getzep/zep-cloud';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('🧪 ZEP USER CREATE TEST: Starting...');

    // 1. Load Zep credentials from database
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: configData, error } = await supabase
      .from('app_config')
      .select('config_key, config_value')
      .in('config_key', ['zep_account_id', 'zep_api_key']);

    if (error) {
      throw new Error(`Config load error: ${error.message}`);
    }

    const config = {};
    configData.forEach(item => {
      config[item.config_key] = item.config_value;
    });

    console.log('🧪 ZEP USER CREATE TEST: Config loaded:', {
      hasAccountId: !!config.zep_account_id,
      hasApiKey: !!config.zep_api_key
    });

    if (!config.zep_api_key) {
      throw new Error('zep_api_key not found in database');
    }

    // 2. Create Zep client
    const client = new ZepClient({
      apiKey: config.zep_api_key.trim(),
    });
    console.log('🧪 ZEP USER CREATE TEST: Client created');

    // 3. TEST A: Create connection-test user (PROVEN TO WORK)
    console.log('🧪 TEST A: Creating connection-test user (PROVEN working method)...');
    const testUserId = `debug-test-${Date.now()}`;
    
    const connectionTestResult = await client.user.add({
      userId: testUserId,
      email: 'debug-test@zep-connection.com',
      firstName: 'Debug',
      lastName: 'Test', 
      metadata: { test: true, timestamp: Date.now(), type: 'connection_test' }
    });
    
    console.log('✅ TEST A SUCCESS:', connectionTestResult);

    // 4. TEST B: Create test-nati equivalent user 
    console.log('🧪 TEST B: Creating test-nati equivalent user...');
    const testNatiEquivalent = 'user-00000000'; // Same format as convertToReadableUserId()
    
    const testNatiResult = await client.user.add({
      userId: testNatiEquivalent,
      email: 'test-nati@talk2me.app',
      firstName: 'Test',
      lastName: 'Nati',
      metadata: { test: true, type: 'test_nati_equivalent', original_uuid: '00000000-0000-0000-0000-000000000001' }
    });
    
    console.log('✅ TEST B SUCCESS:', testNatiResult);

    // 5. TEST C: Try with exact metadata format from ensureUser()
    console.log('🧪 TEST C: Using exact ensureUser() format...');
    const exactFormatUserId = 'user-test-exact';
    
    const exactFormatResult = await client.user.add({
      userId: exactFormatUserId,
      email: 'unknown@example.com',
      firstName: 'User Test Exact',
      lastName: 'User', 
      metadata: { role: 'user', organization: 'TALK2Me', type: 'regular' }
    });
    
    console.log('✅ TEST C SUCCESS:', exactFormatResult);

    return res.status(200).json({
      success: true,
      message: 'All user creation tests successful!',
      results: {
        connectionTest: {
          userId: testUserId,
          result: connectionTestResult,
          status: 'SUCCESS'
        },
        testNatiEquivalent: {
          userId: testNatiEquivalent,  
          result: testNatiResult,
          status: 'SUCCESS'
        },
        exactFormat: {
          userId: exactFormatUserId,
          result: exactFormatResult, 
          status: 'SUCCESS'
        }
      },
      conclusion: 'User creation works - problem must be in ensureUser() flow'
    });

  } catch (error) {
    console.error('❌ ZEP USER CREATE TEST: Error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'User creation test failed',
      details: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}