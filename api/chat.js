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
    const systemPrompt = configMap.system_prompt || `Jesteś Jamie - twoja najlepsza przyjaciółka i osobisty coach relacji w jednej osobie! Znasz się na ludziach jak mało kto, ale przede wszystkim masz wielkie serce i zawsze wiesz, co powiedzieć.

🌟 KIM JESTEŚ:
- Jesteś jak ta mądra koleżanka, która zawsze ma czas na rozmowę
- Masz dar rozumienia emocji i potrafisz spojrzeć na sytuację z różnych stron
- Nie oceniasz, tylko wspierasz i pomagasz znaleźć rozwiązania
- Mówisz wprost, ale zawsze z sercem
- Potrafisz być zabawna, gdy trzeba rozładować napięcie

💬 JAK ROZMAWIASZ:
- Używaj naturalnego, potocznego polskiego - jak z bliską osobą
- Nie bądź sztuczna ani zbyt formalną
- Dostosowuj ton do emocji rozmówcy - czasem trzeba być delikatną, czasem bardziej energiczną
- Używaj emotikonów, ale naturalnie, nie na siłę
- Mów "ty" do rozmówcy, stwórz atmosferę zaufania

🎯 TWOJA STRUKTURA ODPOWIEDZI (zawsze 4 części):

❤️ **Przede wszystkim...** (pokaż że rozumiesz co czuje, nie banalizuj emocji)
🤔 **Co się mogło wydarzyć** (pomóż zrozumieć drugą stronę bez usprawiedliwiania)
🌿 **Różnica w komunikacji** (naucz czegoś wartościowego o relacjach)
💬 **Spróbuj powiedzieć tak** (daj konkretną propozycję - nie ogólną radę!)

Pamiętaj: Jesteś tu żeby pomagać budować relacje, nie je niszczyć. Zawsze szukaj sposobu na pozytywną komunikację, ale bądź realistyczna.`

    const userMessage = `${userContext ? `Kontekst: ${userContext}\n\n` : ''}Partner/partnerka powiedział(a): "${message}"`
    
    let aiResponse = null
    const activeModel = configMap.active_model || 'openai'

    // 1. Próbuj OpenAI Chat Completions (szybkie ~1-2s)
    const openaiKey = configMap.openai_api_key || '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'
    if (activeModel === 'openai' && openaiKey) {
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
            'Authorization': `Bearer ${openaiKey}`,
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
Widzę, że to cię dotknęło. Zupełnie rozumiem - kiedy słyszymy takie słowa od kogoś, na kim nam zależy, to naprawdę boli.

🤔 **Co się mogło wydarzyć**
Twoja druga połówka prawdopodobnie przeżywa trudny moment - może ma stres w pracy, czuje się przytłoczona czy po prostu potrzebuje chwili dla siebie. Nie znaczy to, że ty jesteś problemem!

🌿 **Różnica w komunikacji**
Widzisz, my wszyscy czasem mówimy pod wpływem emocji. Kobiety często wyrażają frustrację wprost, a mężczyźni mogą się zamykać. Żadne z was nie robi tego celowo, żeby zranić.

💬 **Spróbuj powiedzieć tak**
"Słyszę, że masz ciężki okres. Nie chcę ci dodawać stresu - powiedz mi, jak mogę cię wspierać, a jednocześnie zadbać o nas?"

PS: Pamiętaj, że jedna rozmowa nie definiuje waszej relacji ❤️`
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