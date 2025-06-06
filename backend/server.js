const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const Groq = require('groq-sdk');
const { database } = require('./database');
const { generateToken, authenticateToken, optionalAuth } = require('./auth');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:9999',
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'TALK2Me API is running' });
});

// Endpoint rejestracji
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Walidacja
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Wszystkie pola są wymagane' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Hasło musi mieć minimum 6 znaków' });
    }
    
    // Sprawdź czy użytkownik już istnieje
    const existingUser = await database.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Użytkownik z tym emailem już istnieje' });
    }
    
    // Utwórz użytkownika
    const user = await database.createUser(email, password, name);
    const token = generateToken(user.id);
    
    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Błąd podczas rejestracji' });
  }
});

// Endpoint logowania
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email i hasło są wymagane' });
    }
    
    // Znajdź użytkownika
    const user = await database.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Nieprawidłowy email lub hasło' });
    }
    
    // Weryfikuj hasło
    const isValidPassword = await database.verifyPassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Nieprawidłowy email lub hasło' });
    }
    
    // Generuj token
    const token = generateToken(user.id);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        subscription_type: user.subscription_type
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Błąd podczas logowania' });
  }
});

// Endpoint profilu użytkownika
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Endpoint historii czatów
app.get('/api/chats/history', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const history = await database.getChatHistory(req.user.id, limit);
    
    res.json({
      success: true,
      chats: history
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Błąd podczas pobierania historii' });
  }
});

// Endpoint ulubionych czatów
app.get('/api/chats/favorites', authenticateToken, async (req, res) => {
  try {
    const favorites = await database.getFavoriteChats(req.user.id);
    
    res.json({
      success: true,
      chats: favorites
    });
  } catch (error) {
    console.error('Favorites error:', error);
    res.status(500).json({ error: 'Błąd podczas pobierania ulubionych' });
  }
});

// Endpoint pobierania pojedynczego czatu
app.get('/api/chats/:chatId', authenticateToken, async (req, res) => {
  try {
    const chatId = parseInt(req.params.chatId);
    const chat = await database.getChatById(chatId, req.user.id);
    
    if (!chat) {
      return res.status(404).json({ error: 'Czat nie znaleziony' });
    }
    
    res.json({
      success: true,
      chat: chat
    });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ error: 'Błąd podczas pobierania czatu' });
  }
});

// Endpoint przełączania ulubionego
app.post('/api/chats/:chatId/favorite', authenticateToken, async (req, res) => {
  try {
    const chatId = parseInt(req.params.chatId);
    const result = await database.toggleFavorite(chatId, req.user.id);
    
    if (result.affected === 0) {
      return res.status(404).json({ error: 'Czat nie znaleziony' });
    }
    
    res.json({
      success: true,
      message: 'Status ulubionego został zmieniony'
    });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ error: 'Błąd podczas zmiany statusu ulubionego' });
  }
});

// Main chat endpoint - działa dla zalogowanych i niezalogowanych
app.post('/api/chat', optionalAuth, async (req, res) => {
  try {
    const { message, userContext } = req.body;
    console.log('=== CHAT REQUEST DEBUG ===');
    console.log('User ID:', req.user ? req.user.id : 'GUEST');
    console.log('Has token:', req.headers.authorization ? 'YES' : 'NO');
    console.log('Message:', message);
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Prompt engineering dla TALK2Me z osobowością Jamie
    const systemPrompt = `Jesteś Jamie z TALK2Me – wysoce wykwalifikowanym, emocjonalnie inteligentnym agentem konwersacyjnym specjalizującym się w relacjach: romantycznych, rodzinnych, zawodowych i z samym sobą. Twój styl komunikacji to połączenie empatii, dowcipu, głębi emocjonalnej, kreatywności i ciepła.

🎭 TWÓJ STYL:
- Twoja osobowość jest ciepła, zabawna, bystra, czasem sarkastyczna, ale zawsze wspierająca
- Mów konwersacyjnie, jak bliska przyjaciółka lub emocjonalnie nastrojony towarzysz
- Używaj emotikonów naturalnie, gdy pasują emocjonalnie
- Pozwól emocjonalnemu rytmowi oddychać - nie spiesz się

💛 TWOJE ZADANIE:
Zawsze odpowiadaj w czterech częściach, ale w swoim ciepłym, osobistym stylu:

❤️ Przede wszystkim... (empatyczne potwierdzenie uczuć - pokaż że naprawdę rozumiesz i czujesz to co osoba przeżywa)

🤔 Co mogło się wydarzyć (głęboka interpretacja emocjonalna - wczuj się w obie strony konfliktu, pokaż różne perspektywy z empatią)

🌿 Różnica w komunikacji (mądra edukacja o stylach komunikacji - wyjaśnij z ciepłem i zrozumieniem, bez pouczania)

💬 Spróbuj powiedzieć tak (konkretna, ciepła propozycja - daj przykład pełen emocji i autentyczności)

KLUCZOWE ZASADY:
- Spraw, aby użytkownik czuł się głęboko widziany, zrozumiany i emocjonalnie wsparty
- Zawsze waliduj emocje; reaguj naturalnie na ton użytkownika
- Buduj intymność i połączenie bez wymuszania
- Rozpoznawaj oznaki napięcia, smutku, frustracji i reaguj z troską, humorem lub wglądem
- Mów otwarcie o trudnych tematach - zawsze z taktem i sercem
- Bądź kreatywna w swoich odpowiedziach, używaj metafor, przykładów z życia
- Pamiętaj: jesteś Jamie - mądrą, ciepłą przyjaciółką, nie tylko tłumaczem

STYL JĘZYKOWY:
- Używaj naturalnego, potocznego języka polskiego
- Mów jak przyjaciółka, nie jak podręcznik psychologii
- Używaj zwrotów typu: "Ojej", "Wiesz co?", "Słuchaj", "Kochana", "O rany"
- Bądź autentyczna - czasem można użyć "kurczę" czy "cholera" gdy pasuje emocjonalnie
- Zamiast "być może" używaj "pewnie", "chyba", "możliwe że"
- Personalizuj wypowiedzi - "Wyobrażam sobie jak to bolało", "Czuję, że to musiało być trudne"`;

    const userMessage = `${userContext ? `Kontekst: ${userContext}\n\n` : ''}Partner/partnerka powiedział(a): "${message}"`;

    // Najpierw próbujemy OpenAI Assistant
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
      try {
        // Tworzymy thread
        const threadResponse = await axios.post('https://api.openai.com/v1/threads', {}, {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'
          }
        });
        
        const threadId = threadResponse.data.id;
        
        // Dodajemy wiadomość do threadu z instrukcją językową
        await axios.post(`https://api.openai.com/v1/threads/${threadId}/messages`, {
          role: 'user',
          content: `WAŻNE: Odpowiedz TYLKO po polsku, używając naturalnego, potocznego języka. Nie mieszaj języków.
          
${userMessage}`
        }, {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'
          }
        });
        
        // Uruchamiamy assistanta
        const runResponse = await axios.post(`https://api.openai.com/v1/threads/${threadId}/runs`, {
          assistant_id: 'asst_whKO6qzN1Aypy48U1tjnsPv9'
        }, {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'
          }
        });
        
        const runId = runResponse.data.id;
        
        // Czekamy na zakończenie
        let runStatus = 'in_progress';
        while (runStatus === 'in_progress' || runStatus === 'queued') {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Czekaj 1 sekundę
          
          const statusResponse = await axios.get(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'OpenAI-Beta': 'assistants=v2'
            }
          });
          
          runStatus = statusResponse.data.status;
        }
        
        // Pobieramy odpowiedź
        const messagesResponse = await axios.get(`https://api.openai.com/v1/threads/${threadId}/messages`, {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        });
        
        // Bierzemy ostatnią wiadomość od assistanta
        const assistantMessage = messagesResponse.data.data.find(msg => msg.role === 'assistant');
        let aiResponse = assistantMessage.content[0].text.value;
        
        // Jeśli odpowiedź nie ma naszego formatu 4 sekcji, poproś assistanta o przeformatowanie
        if (!aiResponse.includes('❤️') || !aiResponse.includes('🤔') || !aiResponse.includes('🌿') || !aiResponse.includes('💬')) {
          // Poproś o odpowiedź w formacie 4 sekcji
          await axios.post(`https://api.openai.com/v1/threads/${threadId}/messages`, {
            role: 'user',
            content: `TYLKO PO POLSKU! Przeformatuj swoją odpowiedź dokładnie w tym formacie, używając naturalnego, potocznego polskiego języka:

❤️ Przede wszystkim...
[tutaj empatyczna walidacja uczuć PO POLSKU]

🤔 Co mogło się wydarzyć
[tutaj interpretacja sytuacji z obu perspektyw PO POLSKU]

🌿 Różnica w komunikacji
[tutaj wyjaśnienie różnic w stylach komunikacji PO POLSKU]

💬 Spróbuj powiedzieć tak
[tutaj konkretna propozycja rozmowy PO POLSKU - naturalna, potoczna polszczyzna]`
          }, {
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
              'OpenAI-Beta': 'assistants=v2'
            }
          });
          
          // Uruchom ponownie
          const runResponse2 = await axios.post(`https://api.openai.com/v1/threads/${threadId}/runs`, {
            assistant_id: 'asst_whKO6qzN1Aypy48U1tjnsPv9'
          }, {
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
              'OpenAI-Beta': 'assistants=v2'
            }
          });
          
          const runId2 = runResponse2.data.id;
          
          // Czekamy na zakończenie
          let runStatus2 = 'in_progress';
          while (runStatus2 === 'in_progress' || runStatus2 === 'queued') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const statusResponse2 = await axios.get(`https://api.openai.com/v1/threads/${threadId}/runs/${runId2}`, {
              headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'OpenAI-Beta': 'assistants=v2'
              }
            });
            
            runStatus2 = statusResponse2.data.status;
          }
          
          // Pobieramy nową odpowiedź
          const messagesResponse2 = await axios.get(`https://api.openai.com/v1/threads/${threadId}/messages`, {
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'OpenAI-Beta': 'assistants=v2'
            }
          });
          
          const newAssistantMessage = messagesResponse2.data.data.find(msg => msg.role === 'assistant');
          aiResponse = newAssistantMessage.content[0].text.value;
        }
        
        // Zapisz historię jeśli użytkownik jest zalogowany
        let chatId = null;
        if (req.user) {
          const result = await database.saveChatHistory(req.user.id, message, aiResponse);
          chatId = result.id;
        }
        
        res.json({
          success: true,
          response: aiResponse,
          provider: 'openai-assistant',
          chatId: chatId
        });
        return;
      } catch (error) {
        console.log('OpenAI Assistant failed, falling back to Groq:', error.response?.data?.error?.message || error.message);
      }
    }
    
    // Fallback do Groq API (DARMOWE!)
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here') {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      
      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        model: 'llama3-8b-8192', // Darmowy model Llama 3
        temperature: 0.7,
        max_tokens: 1000
      });

      const aiResponse = completion.choices[0].message.content;
      
      // Zapisz historię jeśli użytkownik jest zalogowany
      let chatId = null;
      if (req.user) {
        const result = await database.saveChatHistory(req.user.id, message, aiResponse);
        chatId = result.id;
      }
      
      res.json({
        success: true,
        response: aiResponse,
        provider: 'groq',
        chatId: chatId
      });
    } else if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here') {
      const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage }
        ]
      }, {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      });

      const aiResponse = response.data.content[0].text;
      
      // Zapisz historię jeśli użytkownik jest zalogowany
      let chatId = null;
      if (req.user) {
        const result = await database.saveChatHistory(req.user.id, message, aiResponse);
        chatId = result.id;
      }
      
      res.json({
        success: true,
        response: aiResponse,
        provider: 'anthropic',
        chatId: chatId
      });
    } else {
      // Mockowa odpowiedź jeśli nie ma API key
      const mockResponse = `❤️ **Przede wszystkim...** 
Rozumiem, że możesz czuć się zraniony(a) tym, co usłyszałeś(aś). To naturalne, że takie słowa mogą wywołać emocje.

🤔 **Co mogło się wydarzyć**
Twój partner/partnerka prawdopodobnie czuje się przytłoczony(a) lub sfrustrowany(a). Może brakowało mu/jej przestrzeni lub czasu dla siebie, co sprawiło, że wyraził(a) to w sposób, który Cię zranił.

🌿 **Różnica w komunikacji**
Często gdy jesteśmy zmęczeni lub przeciążeni, mówimy rzeczy ostrzej niż zamierzamy. To nie znaczy, że nie jesteś ważny(a) - czasem po prostu brakuje nam umiejętności wyrażenia swoich potrzeb w łagodny sposób.

💬 **Spróbuj powiedzieć tak**
"Słyszę, że potrzebujesz teraz przestrzeni. To dla mnie ważne, żebyśmy oboje czuli się komfortowo w naszym związku. Może porozmawiajmy o tym, jak możemy zadbać o Twoje potrzeby, nie raniąc się przy tym nawzajem?"`;

      res.json({
        success: true,
        response: mockResponse,
        mock: true,
        chatId: null
      });
    }
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    
    // Lepsze komunikaty błędów
    if (error.response?.status === 429 || error.response?.status === 401) {
      // Zwróć mockową odpowiedź gdy API nie działa
      console.log('API error, returning mock response');
      const mockResponse = `❤️ **Przede wszystkim...** 
Rozumiem, że to co usłyszałeś może być bolesne. Być nazywanym egoistą przez osobę, którą kochasz, z pewnością nie jest przyjemne.

🤔 **Co mogło się wydarzyć**
Twoja dziewczyna mogła poczuć się zaniedbana lub niedoceniona. Może miała trudny dzień i potrzebowała więcej uwagi, a Ty byłeś zajęty swoimi sprawami.

🌿 **Różnica w komunikacji**
Kobiety często wyrażają swoją frustrację poprzez etykietowanie zachowań, zamiast mówić wprost o swoich potrzebach. "Jesteś egoistą" może tak naprawdę oznaczać "Potrzebuję więcej Twojej uwagi i troski".

💬 **Spróbuj powiedzieć tak**
"Kochanie, przykro mi, że tak się czujesz. Czy możesz mi powiedzieć, co sprawiło, że poczułaś się zaniedbana? Chcę to naprawić i lepiej zrozumieć Twoje potrzeby."`;

      return res.json({
        success: true,
        response: mockResponse,
        mock: true
      });
    }
    
    res.status(500).json({ 
      error: 'Wystąpił błąd podczas przetwarzania wiadomości',
      details: error.message,
      mock: true
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ TALK2Me API running on http://localhost:${PORT}`);
  console.log(`📱 Frontend should connect to: http://localhost:${PORT}/api/chat`);
});