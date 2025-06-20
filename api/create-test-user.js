// Create test user for memory system
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const TEST_USER_ID = '11111111-1111-1111-1111-111111111111'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log('👤 Creating test user for memory system...')
    
    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', TEST_USER_ID)
      .single()
    
    if (existingUser) {
      console.log('✅ Test user already exists')
      return res.json({
        success: true,
        message: 'Test user already exists',
        user: existingUser,
        created: false
      })
    }
    
    // Create test user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        id: TEST_USER_ID,
        email: 'test@talk2me.app',
        password: '$2a$10$PJcPrkUeFBGXHvjrfRFQa.vFMOVxdcH8K1CS2lZFlGqmoH3Sq0wl.', // password: test123
        name: 'Test User',
        full_name: 'Test User for Memory System',
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (createError) {
      console.error('❌ Failed to create test user:', createError)
      return res.status(500).json({
        success: false,
        error: 'Failed to create test user',
        details: createError.message
      })
    }
    
    console.log('✅ Test user created successfully:', newUser)
    
    res.json({
      success: true,
      message: 'Test user created successfully',
      user: newUser,
      created: true
    })
  } catch (error) {
    console.error('❌ Create test user error:', error)
    res.status(500).json({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}