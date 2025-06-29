// Admin API - zarządzanie konfiguracją
import { createClient } from '@supabase/supabase-js'
import { promptCache } from '../user/chat-with-memory.js'
import OpenAI from 'openai'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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
      // Sprawdź czy to zapytanie o prompt
      const { action } = req.query
      
      if (action === 'get-prompt') {
        // Zwróć informacje o cache promptu
        return res.json({
          success: true,
          prompt: promptCache.prompt ? promptCache.prompt.substring(0, 10000) + '...' : null,
          timestamp: promptCache.timestamp,
          source: promptCache.source,
          length: promptCache.prompt ? promptCache.prompt.length : 0
        })
      }
      
      // Normalne pobieranie konfiguracji
      const { data: config, error } = await supabase
        .from('app_config')
        .select('*')
        .order('config_key')

      if (error) {
        return res.status(500).json({ error: 'Database error', details: error })
      }

      res.json({ success: true, config })

    } else if (req.method === 'POST') {
      // Obsługa akcji POST
      const { action } = req.body
      console.log('🔧 Admin API POST received:', { action, body: req.body })
      
      if (action === 'refresh-prompt') {
        // Wymuś odświeżenie promptu
        const { data: config } = await supabase
          .from('app_config')
          .select('config_key, config_value')
          .in('config_key', ['openai_api_key', 'assistant_id'])
        
        const configMap = {}
        config?.forEach(item => {
          configMap[item.config_key] = item.config_value
        })
        
        if (!configMap.openai_api_key || !configMap.assistant_id) {
          return res.json({ 
            success: false, 
            error: 'Missing OpenAI API key or Assistant ID' 
          })
        }
        
        try {
          const openai = new OpenAI({ apiKey: configMap.openai_api_key })
          const assistant = await openai.beta.assistants.retrieve(configMap.assistant_id)
          
          // Zaktualizuj cache
          promptCache.prompt = assistant.instructions || 'You are a helpful AI assistant.'
          promptCache.timestamp = Date.now()
          promptCache.source = 'Manual refresh'
          
          return res.json({
            success: true,
            message: 'Prompt refreshed successfully',
            length: promptCache.prompt.length
          })
        } catch (error) {
          return res.json({
            success: false,
            error: 'Failed to fetch assistant: ' + error.message
          })
        }
      }
      
      else if (action === 'list-assistants') {
        // Lista dostępnych asystentów
        const { data: config } = await supabase
          .from('app_config')
          .select('config_key, config_value')
          .eq('config_key', 'openai_api_key')
          .single()
        
        if (!config?.config_value) {
          return res.json({ 
            success: false, 
            error: 'OpenAI API key not configured' 
          })
        }
        
        try {
          const openai = new OpenAI({ apiKey: config.config_value })
          const assistantsList = await openai.beta.assistants.list({
            order: 'desc',
            limit: 20
          })
          
          return res.json({
            success: true,
            assistants: assistantsList.data.map(assistant => ({
              id: assistant.id,
              name: assistant.name,
              description: assistant.description,
              model: assistant.model,
              created_at: assistant.created_at
            }))
          })
        } catch (error) {
          return res.json({
            success: false,
            error: 'Failed to fetch assistants: ' + error.message
          })
        }
      }
      
      // Domyślne zachowanie - błąd
      return res.status(400).json({ error: 'Invalid action' })
      
    } else if (req.method === 'PUT') {
      // Aktualizuj konfigurację
      const { config_key, config_value } = req.body

      if (!config_key) {
        return res.status(400).json({ error: 'config_key is required' })
      }

      // Używamy upsert zamiast update, aby działało nawet jeśli rekord nie istnieje
      const { error } = await supabase
        .from('app_config')
        .upsert({ 
          config_key: config_key,
          config_value: config_value,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'config_key'
        })

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