// Test endpoint for debugging memory system
import { createClient } from '@supabase/supabase-js'
import MemoryManager from '../lib/memory-manager.js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get OpenAI key from config
    const { data: config } = await supabase
      .from('app_config')
      .select('config_value')
      .eq('config_key', 'openai_api_key')
      .single()
    
    if (!config?.config_value) {
      return res.status(500).json({ error: 'OpenAI API key not configured' })
    }

    // Initialize MemoryManager
    const memoryManager = new MemoryManager(supabaseUrl, supabaseServiceKey, config.config_value)
    await memoryManager.initialize()
    
    console.log('✅ MemoryManager initialized for test')

    // Test saving a memory
    const testUserId = '3cb12341-c45f-494d-a64d-d65c00bb599a' // Your test user ID
    const testMemory = {
      content: 'Test message: Mój mąż Maciej często pracuje do późna',
      summary: 'Mąż Maciej często pracuje do późna',
      importance: 8,
      type: 'relationship'
    }

    console.log('💾 Attempting to save test memory:', testMemory)

    const result = await memoryManager.saveMemory(
      testUserId,
      testMemory.content,
      testMemory.summary,
      testMemory.importance,
      testMemory.type,
      null // no conversation ID for test
    )

    console.log('✅ Test memory saved successfully:', result)

    // Test retrieving memories
    const memories = await memoryManager.getRelevantMemories(
      testUserId,
      'Maciej',
      5,
      0.5
    )

    console.log(`📚 Found ${memories.length} memories for test query`)

    return res.status(200).json({
      success: true,
      savedMemory: result,
      retrievedMemories: memories,
      memoryManagerStatus: {
        initialized: memoryManager.initialized,
        hasVectorStore: !!memoryManager.vectorStore
      }
    })

  } catch (error) {
    console.error('❌ Test memory error:', error)
    return res.status(500).json({ 
      error: 'Test failed', 
      details: error.message,
      stack: error.stack
    })
  }
}