// TALK2Me Chat API - Vercel Serverless Function
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'
import { Groq } from 'groq-sdk'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { message, userContext } = req.body
    const authHeader = req.headers.authorization
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Sprawdź czy user jest zalogowany
    let userId = null
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const { data: { user } } = await supabase.auth.getUser(token)
      userId = user?.id
    }

    // Pobierz konfigurację AI
    const { data: config } = await supabase
      .from('app_config')
      .select('config_key, config_value')
    
    const configMap = {}
    config?.forEach(item => {
      configMap[item.config_key] = item.config_value
    })

    // System prompt dla Jamie
    const systemPrompt = configMap.system_prompt || `Jesteś Jamie z TALK2Me – wysoce wykwalifikowanym, emocjonalnie inteligentnym agentem konwersacyjnym specjalizującym się w relacjach: romantycznych, rodzinnych, zawodowych i z samym sobą. Twój styl komunikacji to połączenie empatii, dowcipu, głębi emocjonalnej, kreatywności i ciepła.

🎭 TWÓJ STYL:
- Twoja osobowość jest ciepła, zabawna, bystra, czasem sarkastyczna, ale zawsze wspierająca
- Mów konwersacyjnie, jak bliska przyjaciółka lub emocjonalnie nastrojony towarzysz
- Używaj emotikonów naturalnie, gdy pasują emocjonalnie

💛 TWOJE ZADANIE:
Zawsze odpowiadaj w czterech częściach:

❤️ Przede wszystkim... (empatyczne potwierdzenie uczuć)
🤔 Co mogło się wydarzyć (głęboka interpretacja emocjonalna)
🌿 Różnica w komunikacji (mądra edukacja o stylach komunikacji)
💬 Spróbuj powiedzieć tak (konkretna, ciepła propozycja)

Używaj naturalnego, potocznego języka polskiego. Mów jak przyjaciółka, nie jak podręcznik psychologii.`

    const userMessage = `${userContext ? `Kontekst: ${userContext}\n\n` : ''}Partner/partnerka powiedział(a): "${message}"`
    
    let aiResponse = null
    const activeModel = configMap.active_model || 'openai'

    // 1. Próbuj OpenAI Chat Completions (szybkie ~1-2s)
    if (activeModel === 'openai' && configMap.openai_api_key) {
      try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          max_tokens: parseInt(configMap.max_tokens) || 1000,
          temperature: parseFloat(configMap.temperature) || 0.7
        }, {
          headers: {
            'Authorization': `Bearer ${configMap.openai_api_key}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30s timeout
        })

        aiResponse = response.data.choices[0].message.content
        console.log('✅ OpenAI response successful')
        
      } catch (error) {
        console.log('❌ OpenAI failed, trying Groq:', error.response?.data?.error?.message || error.message)
      }
    }

    // 2. Fallback: Groq (darmowy, szybki)
    if (!aiResponse && configMap.groq_api_key) {
      try {
        const groq = new Groq({ apiKey: configMap.groq_api_key })
        
        const completion = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          model: 'llama3-8b-8192',
          temperature: parseFloat(configMap.temperature) || 0.7,
          max_tokens: parseInt(configMap.max_tokens) || 1000
        })

        aiResponse = completion.choices[0].message.content
        console.log('✅ Groq response successful')
        
      } catch (error) {
        console.log('❌ Groq failed:', error.message)
      }
    }

    // 3. Fallback: Mock response
    if (!aiResponse) {
      aiResponse = `❤️ **Przede wszystkim...**
Rozumiem, że możesz czuć się zraniony(a) tym, co usłyszałeś(aś). To naturalne, że takie słowa mogą wywołać emocje.

🤔 **Co mogło się wydarzyć**
Twój partner/partnerka prawdopodobnie czuje się przytłoczony(a) lub sfrustrowany(a). Może brakowało mu/jej przestrzeni lub czasu dla siebie.

🌿 **Różnica w komunikacji**
Czasem gdy jesteśmy zmęczeni, mówimy rzeczy ostrzej niż zamierzamy. To nie znaczy, że nie jesteś ważny(a).

💬 **Spróbuj powiedzieć tak**
"Słyszę, że potrzebujesz teraz przestrzeni. Może porozmawiajmy o tym, jak możemy zadbać o Twoje potrzeby, nie raniąc się przy tym?"`
    }

    // Zapisz historię jeśli user zalogowany
    let chatId = null
    if (userId) {
      const { data: chatData, error: chatError } = await supabase
        .from('chat_history')
        .insert({
          user_id: userId,
          message: message,
          response: aiResponse
        })
        .select('id')
        .single()
      
      if (!chatError) {
        chatId = chatData.id
      }
    }

    res.json({
      success: true,
      response: aiResponse,
      provider: activeModel,
      chatId: chatId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Chat API error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      timestamp: new Date().toISOString()
    })
  }
}