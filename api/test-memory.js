/**
 * Test endpoint for memory system
 */
import { createClient } from '@supabase/supabase-js'
import MemoryManager from '../lib/memory-manager.js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
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

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get OpenAI key from config
    const { data: config } = await supabase
      .from('app_config')
      .select('config_value')
      .eq('config_key', 'openai_api_key')
      .single()
    
    const openaiKey = config?.config_value
    
    // Test MemoryManager initialization
    console.log('🧪 Testing MemoryManager initialization...')
    const memoryManager = new MemoryManager(supabaseUrl, supabaseServiceKey, openaiKey)
    await memoryManager.initialize()
    
    // Test saving a memory
    let saveResult = null
    if (memoryManager.enabled) {
      console.log('🧪 Testing memory save...')
      saveResult = await memoryManager.saveMemory(
        'test-user-123',
        'This is a test memory content',
        'Test memory for debugging',
        7,
        'personal',
        null
      )
    }
    
    // Test retrieving memories
    let memories = []
    if (memoryManager.enabled) {
      console.log('🧪 Testing memory retrieval...')
      memories = await memoryManager.getRelevantMemories(
        'test-user-123',
        'test',
        10,
        0.5
      )
    }
    
    res.json({
      status: 'ok',
      memorySystemEnabled: memoryManager.enabled,
      openaiKeyPresent: !!openaiKey,
      openaiKeyPreview: openaiKey ? `${openaiKey.substring(0, 7)}...` : null,
      saveResult: saveResult ? 'success' : 'failed',
      memoriesFound: memories.length,
      memories: memories.map(m => ({
        id: m.id,
        summary: m.summary,
        importance: m.importance,
        type: m.memory_type,
        createdAt: m.created_at
      }))
    })
  } catch (error) {
    console.error('Test failed:', error)
    res.status(500).json({ 
      error: error.message,
      stack: error.stack
    })
  }
}