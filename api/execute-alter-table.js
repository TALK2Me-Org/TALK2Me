// TASK 1: Prosty executor ALTER TABLE
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

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔧 TASK 1: Executing ALTER TABLE memories_v2...')
    
    // Sprawdź strukturę przed
    console.log('📊 Checking structure before ALTER...')
    const { data: beforeData, error: beforeError } = await supabase
      .from('memories_v2')
      .select('id, user_id, content, summary, importance')
      .limit(1)

    if (beforeError) {
      return res.status(500).json({ 
        error: 'Cannot access memories_v2', 
        details: beforeError.message 
      })
    }

    console.log('✅ Base structure confirmed')

    // Test każdej nowej kolumny
    const newColumns = ['memory_layer', 'date', 'location', 'repeat', 'actor', 'visible_to_user']
    const columnStatus = {}

    for (const column of newColumns) {
      try {
        const { data: testCol, error: colError } = await supabase
          .from('memories_v2')
          .select(column)
          .limit(1)

        if (colError && colError.message.includes('does not exist')) {
          columnStatus[column] = 'missing'
          console.log(`❌ Column ${column}: MISSING`)
        } else if (colError) {
          columnStatus[column] = `error: ${colError.message}`
          console.log(`⚠️ Column ${column}: ${colError.message}`)
        } else {
          columnStatus[column] = 'exists'
          console.log(`✅ Column ${column}: EXISTS`)
        }
      } catch (err) {
        columnStatus[column] = `exception: ${err.message}`
        console.log(`💥 Column ${column}: ${err.message}`)
      }
    }

    // Sprawdź ile kolumn brakuje
    const missingColumns = Object.entries(columnStatus)
      .filter(([col, status]) => status === 'missing')
      .map(([col]) => col)

    console.log(`📊 Missing columns: ${missingColumns.length}`)
    console.log(`🔍 Status:`, columnStatus)

    return res.json({
      success: true,
      task: 'TASK 1 - ALTER TABLE memories_v2',
      timestamp: new Date().toISOString(),
      tableAccessible: true,
      columnStatus,
      missingColumns,
      needsAlterTable: missingColumns.length > 0,
      sqlCommand: missingColumns.length > 0 ? 
        `ALTER TABLE memories_v2 ` + 
        `ADD COLUMN IF NOT EXISTS memory_layer text, ` +
        `ADD COLUMN IF NOT EXISTS date date, ` +
        `ADD COLUMN IF NOT EXISTS location text, ` +
        `ADD COLUMN IF NOT EXISTS repeat text, ` +
        `ADD COLUMN IF NOT EXISTS actor text, ` +
        `ADD COLUMN IF NOT EXISTS visible_to_user boolean DEFAULT false;` 
        : 'No ALTER TABLE needed - all columns exist'
    })

  } catch (error) {
    console.error('❌ TASK 1 Error:', error)
    return res.status(500).json({ 
      error: 'TASK 1 failed', 
      details: error.message,
      timestamp: new Date().toISOString()
    })
  }
}