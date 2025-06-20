// Setup OpenAI key in Supabase config from environment variable
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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
    
    console.log('🔑 Setting up OpenAI key in Supabase config...')
    
    if (!process.env.OPENAI_API_KEY) {
      return res.status(400).json({
        success: false,
        error: 'OPENAI_API_KEY not found in environment variables'
      })
    }
    
    // Save OpenAI key to app_config table
    const { error: upsertError } = await supabase
      .from('app_config')
      .upsert({
        config_key: 'openai_api_key',
        config_value: process.env.OPENAI_API_KEY,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'config_key'
      })
    
    if (upsertError) {
      console.error('❌ Failed to save OpenAI key:', upsertError)
      return res.status(500).json({
        success: false,
        error: 'Failed to save OpenAI key to database',
        details: upsertError.message
      })
    }
    
    console.log('✅ OpenAI key saved to Supabase config')
    
    res.json({
      success: true,
      message: 'OpenAI key saved to config successfully',
      keyLength: process.env.OPENAI_API_KEY.length,
      keyPreview: `${process.env.OPENAI_API_KEY.substring(0, 10)}...`
    })
  } catch (error) {
    console.error('❌ Setup OpenAI key error:', error)
    res.status(500).json({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}