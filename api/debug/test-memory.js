/**
 * Test endpoint for memory system
 */
import { createClient } from '@supabase/supabase-js'
import MemoryManager from '../memory/manager.js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Test user UUID - standard format for testing
const TEST_USER_ID = '11111111-1111-1111-1111-111111111111'

export default async function handler(req, res) {
  console.log('🧪 Test memory endpoint called:', req.method, req.url);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const testResults = {
    timestamp: new Date().toISOString(),
    steps: [],
    finalStatus: 'pending'
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Step 1: Check/Create test user
    testResults.steps.push({ step: 'Check test user', status: 'running' })
    console.log('👤 Checking test user:', TEST_USER_ID)
    
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', TEST_USER_ID)
      .single()
    
    if (userCheckError && userCheckError.code === 'PGRST116') {
      // User doesn't exist, create it
      console.log('🆕 Creating test user...')
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: TEST_USER_ID,
          email: 'test@talk2me.app',
          password: '$2a$10$PJcPrkUeFBGXHvjrfRFQa.vFMOVxdcH8K1CS2lZFlGqmoH3Sq0wl.', // password: test123
          name: 'Test User',
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (createError) {
        testResults.steps[testResults.steps.length - 1].status = 'failed'
        testResults.steps[testResults.steps.length - 1].error = createError.message
        testResults.steps[testResults.steps.length - 1].note = 'Run SQL/create-test-user.sql in Supabase to create test user manually'
        console.error('❌ Failed to create test user:', createError)
        console.log('💡 You can create the test user manually using SQL/create-test-user.sql')
      } else {
        testResults.steps[testResults.steps.length - 1].status = 'success'
        testResults.steps[testResults.steps.length - 1].result = 'Test user created'
        console.log('✅ Test user created successfully')
      }
    } else if (existingUser) {
      testResults.steps[testResults.steps.length - 1].status = 'success'
      testResults.steps[testResults.steps.length - 1].result = 'Test user exists'
      console.log('✅ Test user already exists')
    } else if (userCheckError) {
      testResults.steps[testResults.steps.length - 1].status = 'failed'
      testResults.steps[testResults.steps.length - 1].error = userCheckError.message
      console.error('❌ Failed to check test user:', userCheckError)
    }
    
    // Check if we should continue despite user creation failure
    const userStepFailed = testResults.steps.find(s => s.step === 'Check test user')?.status === 'failed'
    
    // Step 2: Get OpenAI key from config
    testResults.steps.push({ step: 'Get OpenAI API key', status: 'running' })
    console.log('🔑 Getting OpenAI API key from config...')
    
    const { data: config, error: configError } = await supabase
      .from('app_config')
      .select('config_value')
      .eq('config_key', 'openai_api_key')
      .single()
    
    if (configError) {
      testResults.steps[testResults.steps.length - 1].status = 'failed'
      testResults.steps[testResults.steps.length - 1].error = configError.message
      console.error('❌ Failed to get OpenAI key:', configError)
    } else {
      testResults.steps[testResults.steps.length - 1].status = 'success'
      testResults.steps[testResults.steps.length - 1].result = config?.config_value ? 'API key found' : 'No API key'
    }
    
    // Use key from config or fallback to environment variable
    const openaiKey = config?.config_value || process.env.OPENAI_API_KEY
    
    console.log('🔑 OpenAI key source:', {
      fromConfig: !!config?.config_value,
      fromEnv: !!process.env.OPENAI_API_KEY,
      finalKey: openaiKey ? `${openaiKey.substring(0, 10)}...` : 'missing'
    })
    
    // Step 3: Initialize MemoryManager
    testResults.steps.push({ step: 'Initialize MemoryManager', status: 'running' })
    console.log('🧠 Initializing MemoryManager...')
    
    const memoryManager = new MemoryManager(supabaseUrl, supabaseServiceKey, openaiKey)
    await memoryManager.initialize()
    
    testResults.steps[testResults.steps.length - 1].status = 'success'
    testResults.steps[testResults.steps.length - 1].result = {
      enabled: memoryManager.enabled,
      initialized: memoryManager.initialized,
      hasOpenAIKey: !!openaiKey
    }
    console.log('✅ MemoryManager initialized:', {
      enabled: memoryManager.enabled,
      hasEmbeddings: !!memoryManager.embeddings
    })
    
    // Step 4: Test saving a memory
    let saveResult = null
    if (memoryManager.enabled && !userStepFailed) {
      testResults.steps.push({ step: 'Save test memory', status: 'running' })
      console.log('💾 Testing memory save...')
      
      try {
        saveResult = await memoryManager.saveMemory(
          TEST_USER_ID,
          'This is a test memory from API endpoint. User mentioned their partner Maciej is a programmer.',
          'Partner Maciej is a programmer',
          5,
          'relationship',
          null
        )
        
        testResults.steps[testResults.steps.length - 1].status = 'success'
        testResults.steps[testResults.steps.length - 1].result = {
          memoryId: saveResult.id,
          summary: saveResult.summary,
          importance: saveResult.importance,
          type: saveResult.memory_type
        }
        console.log('✅ Memory saved successfully:', saveResult)
      } catch (saveError) {
        testResults.steps[testResults.steps.length - 1].status = 'failed'
        testResults.steps[testResults.steps.length - 1].error = saveError.message
        console.error('❌ Failed to save memory:', saveError)
      }
    } else {
      testResults.steps.push({ 
        step: 'Save test memory', 
        status: 'skipped',
        reason: userStepFailed ? 'Test user not available' : 'Memory system disabled (no OpenAI key)'
      })
    }
    
    // Step 5: Test retrieving memories
    let memories = []
    if (memoryManager.enabled && !userStepFailed) {
      testResults.steps.push({ step: 'Retrieve memories', status: 'running' })
      console.log('🔍 Testing memory retrieval...')
      
      try {
        memories = await memoryManager.getRelevantMemories(
          TEST_USER_ID,
          'Maciej programmer partner',
          10,
          0.5
        )
        
        testResults.steps[testResults.steps.length - 1].status = 'success'
        testResults.steps[testResults.steps.length - 1].result = {
          count: memories.length,
          foundTestMemory: memories.some(m => m.summary === 'Partner Maciej is a programmer')
        }
        console.log(`✅ Retrieved ${memories.length} memories`)
      } catch (retrieveError) {
        testResults.steps[testResults.steps.length - 1].status = 'failed'
        testResults.steps[testResults.steps.length - 1].error = retrieveError.message
        console.error('❌ Failed to retrieve memories:', retrieveError)
      }
    } else {
      testResults.steps.push({ 
        step: 'Retrieve memories', 
        status: 'skipped',
        reason: userStepFailed ? 'Test user not available' : 'Memory system disabled (no OpenAI key)'
      })
    }
    
    // Determine final status
    const failedSteps = testResults.steps.filter(s => s.status === 'failed')
    const skippedSteps = testResults.steps.filter(s => s.status === 'skipped')
    
    if (failedSteps.length > 0) {
      testResults.finalStatus = 'failed'
    } else if (skippedSteps.length > 0) {
      testResults.finalStatus = 'partial'
    } else {
      testResults.finalStatus = 'success'
    }
    
    // Send detailed response
    res.json({
      status: testResults.finalStatus === 'success' ? 'ok' : testResults.finalStatus,
      testUserId: TEST_USER_ID,
      memorySystemEnabled: memoryManager.enabled,
      openaiKeyPresent: !!openaiKey,
      openaiKeyPreview: openaiKey ? `${openaiKey.substring(0, 7)}...` : null,
      testResults: testResults,
      savedMemory: saveResult ? {
        id: saveResult.id,
        summary: saveResult.summary,
        importance: saveResult.importance,
        type: saveResult.memory_type
      } : null,
      retrievedMemories: {
        count: memories.length,
        memories: memories.map(m => ({
          id: m.id,
          summary: m.summary,
          importance: m.importance,
          type: m.memory_type,
          similarity: m.similarity,
          createdAt: m.created_at
        }))
      },
      message: testResults.finalStatus === 'success' 
        ? '✅ All tests passed! Memory system is working correctly.'
        : testResults.finalStatus === 'partial'
        ? '⚠️ Some tests were skipped. Check if OpenAI API key is configured.'
        : '❌ Some tests failed. Check the testResults for details.'
    })
  } catch (error) {
    console.error('❌ Test endpoint failed:', error)
    console.error('Stack trace:', error.stack)
    
    res.status(500).json({ 
      status: 'error',
      error: error.message,
      errorType: error.constructor.name,
      testUserId: TEST_USER_ID,
      testResults: testResults,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      message: '❌ Test endpoint encountered an error. Check logs for details.'
    })
  }
}