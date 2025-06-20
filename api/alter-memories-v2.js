// TASK 1: Endpoint do wykonania ALTER TABLE na memories_v2
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  // CORS headers
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

    console.log('🔧 Starting ALTER TABLE on memories_v2...')

    // Lista kolumn do dodania
    const columns = [
      { name: 'memory_layer', type: 'text' },
      { name: 'date', type: 'date' },
      { name: 'location', type: 'text' },
      { name: 'repeat', type: 'text' },
      { name: 'actor', type: 'text' },
      { name: 'visible_to_user', type: 'boolean', default: 'false' }
    ]

    const results = []
    
    // Sprawdź obecną strukturę przez próbę SELECT
    console.log('📊 Checking current structure...')
    const { data: structureTest, error: structureError } = await supabase
      .from('memories_v2')
      .select('id, user_id, content')
      .limit(1)

    if (structureError) {
      console.error('❌ Cannot access memories_v2:', structureError)
      return res.status(500).json({ 
        error: 'Cannot access memories_v2 table', 
        details: structureError.message 
      })
    }

    console.log('✅ memories_v2 table accessible')

    // Sprawdź które kolumny już istnieją przez próbę SELECT
    for (const column of columns) {
      try {
        console.log(`🔍 Checking column: ${column.name}`)
        
        const selectQuery = column.name === 'visible_to_user' ? 
          `${column.name}` : 
          `${column.name}`
        
        const { data: testData, error: testError } = await supabase
          .from('memories_v2')
          .select(selectQuery)
          .limit(1)

        if (testError && testError.message.includes('column') && testError.message.includes('does not exist')) {
          // Kolumna nie istnieje - trzeba ją dodać
          results.push({
            column: column.name,
            status: 'needs_creation',
            error: null,
            exists: false
          })
          console.log(`➕ Column ${column.name}: needs to be created`)
        } else if (testError) {
          // Inny błąd
          results.push({
            column: column.name,
            status: 'error',
            error: testError.message,
            exists: 'unknown'
          })
          console.log(`❌ Column ${column.name}: error - ${testError.message}`)
        } else {
          // Kolumna istnieje
          results.push({
            column: column.name,
            status: 'exists',
            error: null,
            exists: true
          })
          console.log(`✅ Column ${column.name}: already exists`)
        }
      } catch (err) {
        results.push({
          column: column.name,
          status: 'error',
          error: err.message,
          exists: 'unknown'
        })
        console.log(`❌ Column ${column.name}: exception - ${err.message}`)
      }
    }

    // Sprawdź strukturę po zmianach
    const { data: afterTest, error: afterError } = await supabase
      .from('memories_v2')
      .select('id, memory_layer, date, location, repeat, actor, visible_to_user')
      .limit(1)

    const structureVerified = !afterError

    console.log('🔍 Structure verification:', structureVerified ? 'SUCCESS' : 'FAILED')

    return res.json({
      success: true,
      message: 'ALTER TABLE completed',
      timestamp: new Date().toISOString(),
      results,
      structureVerified,
      afterError: afterError?.message || null
    })

  } catch (error) {
    console.error('❌ ALTER TABLE handler error:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      timestamp: new Date().toISOString()
    })
  }
}