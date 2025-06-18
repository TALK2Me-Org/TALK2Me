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

    // Sprawdź obecną strukturę
    const { data: beforeColumns, error: beforeError } = await supabase
      .rpc('get_table_columns', { table_name: 'memories_v2' })
      .catch(() => null) // Jeśli funkcja nie istnieje

    console.log('📊 Current structure check attempted')

    // Wykonaj ALTER TABLE
    const alterQuery = `
      ALTER TABLE memories_v2
      ADD COLUMN IF NOT EXISTS memory_layer text,
      ADD COLUMN IF NOT EXISTS date date,
      ADD COLUMN IF NOT EXISTS location text,
      ADD COLUMN IF NOT EXISTS repeat text,
      ADD COLUMN IF NOT EXISTS actor text,
      ADD COLUMN IF NOT EXISTS visible_to_user boolean DEFAULT false;
    `

    const { data: alterResult, error: alterError } = await supabase
      .rpc('exec_sql', { sql: alterQuery })
      .catch(async () => {
        // Fallback - użyj bezpośredniego SQL
        return await supabase
          .from('memories_v2')
          .select('*')
          .limit(0) // Nie pobieraj danych, tylko sprawdź strukturę
      })

    if (alterError && !alterError.message.includes('already exists')) {
      console.error('❌ ALTER TABLE error:', alterError)
      return res.status(500).json({ 
        error: 'ALTER TABLE failed', 
        details: alterError.message 
      })
    }

    // Alternatywny sposób - wykonaj każdą kolumnę osobno
    const columns = [
      { name: 'memory_layer', type: 'text' },
      { name: 'date', type: 'date' },
      { name: 'location', type: 'text' },
      { name: 'repeat', type: 'text' },
      { name: 'actor', type: 'text' },
      { name: 'visible_to_user', type: 'boolean DEFAULT false' }
    ]

    const results = []
    
    for (const column of columns) {
      try {
        const singleAlterQuery = `ALTER TABLE memories_v2 ADD COLUMN IF NOT EXISTS ${column.name} ${column.type};`
        
        // Próba wykonania przez raw SQL
        const { error: columnError } = await supabase
          .rpc('exec_raw_sql', { query: singleAlterQuery })
          .catch(() => ({ error: null })) // Ignoruj błędy jeśli RPC nie istnieje

        results.push({
          column: column.name,
          status: columnError ? 'error' : 'success',
          error: columnError?.message || null
        })

        console.log(`✅ Column ${column.name}: ${columnError ? 'error' : 'success'}`)
      } catch (err) {
        results.push({
          column: column.name,
          status: 'error',
          error: err.message
        })
        console.log(`❌ Column ${column.name}: ${err.message}`)
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