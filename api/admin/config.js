// Admin API - zarządzanie konfiguracją
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
// const adminPassword = process.env.ADMIN_PASSWORD || 'qwe123' // TODO: pobrać z bazy po włączeniu autoryzacji

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Password')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    // TYMCZASOWO - wyłączona autoryzacja
    console.log('⚠️ UWAGA: Panel admina działa bez hasła - tylko do testów!')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (req.method === 'GET') {
      // Pobierz konfigurację
      const { data: config, error } = await supabase
        .from('app_config')
        .select('*')
        .order('config_key')

      if (error) {
        return res.status(500).json({ error: 'Database error', details: error })
      }

      res.json({ success: true, config })

    } else if (req.method === 'PUT') {
      // Aktualizuj konfigurację
      const { config_key, config_value } = req.body

      if (!config_key) {
        return res.status(400).json({ error: 'config_key is required' })
      }

      const { error } = await supabase
        .from('app_config')
        .update({ 
          config_value: config_value,
          updated_at: new Date().toISOString()
        })
        .eq('config_key', config_key)

      if (error) {
        return res.status(500).json({ error: 'Update failed', details: error })
      }

      res.json({ success: true, message: `Updated ${config_key}` })

    } else {
      res.status(405).json({ error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('Admin API error:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}