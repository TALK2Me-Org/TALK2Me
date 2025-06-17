// Test direct access to memories_v2 table
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log('🧪 Testing direct memories_v2 table access...')
    
    // Test 1: Simple select to check table access
    console.log('📝 Test 1: Simple select from memories_v2')
    const { data: selectData, error: selectError } = await supabase
      .from('memories_v2')
      .select('*')
      .limit(5)
    
    console.log('Select result:', { data: selectData, error: selectError })
    
    // Test 2: Try to insert test record
    console.log('📝 Test 2: Insert test memory to memories_v2')
    const testMemory = {
      user_id: '11111111-1111-1111-1111-111111111111',
      conversation_id: null,
      content: 'Test content for memories_v2 table access',
      summary: 'Test memory from direct API',
      embedding: Array(1536).fill(0.1), // Dummy embedding
      importance: 5,
      memory_type: 'personal',
      entities: { test: true }
    }
    
    const { data: insertData, error: insertError } = await supabase
      .from('memories_v2')
      .insert(testMemory)
      .select()
    
    console.log('Insert result:', { data: insertData, error: insertError })
    
    // Test 3: Check if test user exists
    console.log('📝 Test 3: Check test user in users table')
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', '11111111-1111-1111-1111-111111111111')
    
    console.log('User check result:', { data: userData, error: userError })
    
    // Test 4: Count memories for test user
    console.log('📝 Test 4: Count memories for test user')
    const { count, error: countError } = await supabase
      .from('memories_v2')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', '11111111-1111-1111-1111-111111111111')
    
    console.log('Count result:', { count, error: countError })
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      tests: {
        select: {
          success: !selectError,
          error: selectError?.message || null,
          recordCount: selectData?.length || 0
        },
        insert: {
          success: !insertError,
          error: insertError?.message || null,
          insertedId: insertData?.[0]?.id || null
        },
        userExists: {
          success: !userError,
          error: userError?.message || null,
          userFound: userData?.length > 0
        },
        memoryCount: {
          success: !countError,
          error: countError?.message || null,
          count: count || 0
        }
      },
      testUserId: '11111111-1111-1111-1111-111111111111'
    })
  } catch (error) {
    console.error('❌ Test memories_v2 error:', error)
    res.status(500).json({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}