// Szybki setup OpenAI API key
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cfnrhwgaevbltaflrvpz.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmbnJod2dhZXZibHRhZmxydnB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzUxMDU3MywiZXhwIjoyMDQ5MDg2NTczfQ.8kVy0rMCkw_3_F-xPV-P3VcCvqYqZ3Zw6w0w0w0w0w'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method === 'POST') {
    try {
      const { openai_key } = req.body
      
      if (!openai_key) {
        return res.status(400).json({ error: 'OpenAI key required' })
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      // Wstaw/aktualizuj OpenAI key
      const { error } = await supabase
        .from('app_config')
        .upsert({ 
          config_key: 'openai_api_key',
          config_value: openai_key,
          updated_at: new Date().toISOString()
        })

      if (error) {
        return res.status(500).json({ error: 'Database error', details: error })
      }

      res.json({ success: true, message: 'OpenAI key saved!' })

    } catch (error) {
      res.status(500).json({ error: 'Server error', details: error.message })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}