// Debug endpoint to check what tables exist in Supabase
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
    
    console.log('🔍 Checking what tables exist in Supabase...')
    
    // Check memories table
    const { data: memoriesData, error: memoriesError } = await supabase
      .from('memories')
      .select('id', { count: 'exact', head: true })
    
    // Check memories_v2 table  
    const { data: memoriesV2Data, error: memoriesV2Error } = await supabase
      .from('memories_v2')
      .select('id', { count: 'exact', head: true })
    
    // Check users table
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
    
    const result = {
      timestamp: new Date().toISOString(),
      tables: {
        memories: {
          exists: !memoriesError,
          count: memoriesData?.length || 0,
          error: memoriesError?.message || null,
          errorCode: memoriesError?.code || null
        },
        memories_v2: {
          exists: !memoriesV2Error,
          count: memoriesV2Data?.length || 0,
          error: memoriesV2Error?.message || null,
          errorCode: memoriesV2Error?.code || null
        },
        users: {
          exists: !usersError,
          count: usersData?.length || 0,
          error: usersError?.message || null,
          errorCode: usersError?.code || null
        }
      },
      supabaseConfig: {
        url: supabaseUrl ? 'configured' : 'missing',
        serviceKey: supabaseServiceKey ? 'configured' : 'missing'
      }
    }
    
    console.log('📊 Table check results:', result)
    
    res.json({
      success: true,
      ...result
    })
  } catch (error) {
    console.error('❌ Debug tables error:', error)
    res.status(500).json({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}