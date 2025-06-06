const axios = require('axios');
require('dotenv').config();

async function testOpenAI() {
  try {
    console.log('Testing OpenAI API with key:', process.env.OPENAI_API_KEY.substring(0, 20) + '...');
    
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say hello in Polish' }
      ],
      temperature: 0.7,
      max_tokens: 50
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Success! Response:', response.data.choices[0].message.content);
  } catch (error) {
    console.error('Error:', error.response?.status, error.response?.data || error.message);
  }
}

testOpenAI();