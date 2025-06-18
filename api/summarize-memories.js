import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export default async (req, res) => {
  console.log('🧠 POST /api/summarize-memories - Processing request...');
  
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    // Get user_id from request body
    const { user_id } = req.body;

    // Validate user_id
    if (!user_id) {
      console.error('❌ Missing required field: user_id');
      return res.status(400).json({ 
        error: 'Missing required field: user_id' 
      });
    }

    // Validate user_id format (should be UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(user_id)) {
      console.error('❌ Invalid user_id format');
      return res.status(400).json({ 
        error: 'Invalid user_id format. Must be a valid UUID' 
      });
    }

    // Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase credentials');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error('❌ Missing OpenAI API key');
      return res.status(500).json({ error: 'AI service configuration error' });
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });

    console.log('📚 Fetching memories for user:', user_id);

    // Fetch all memories for the user
    const { data: memories, error: fetchError } = await supabase
      .from('memories_v2')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Error fetching memories:', fetchError);
      return res.status(500).json({ 
        error: 'Failed to fetch memories',
        details: fetchError.message
      });
    }

    if (!memories || memories.length === 0) {
      console.log('⚠️ No memories found for user');
      return res.status(404).json({ 
        error: 'No memories found for this user' 
      });
    }

    console.log(`✅ Found ${memories.length} memories`);

    // Group memories by type for better analysis
    const groupedMemories = {
      personal: [],
      relationship: [],
      preference: [],
      event: [],
      other: []
    };

    memories.forEach(memory => {
      const type = memory.memory_type || 'other';
      const memoryInfo = {
        summary: memory.summary,
        importance: memory.importance,
        date: memory.date,
        location: memory.location,
        actor: memory.actor,
        memory_layer: memory.memory_layer,
        tags: memory.metadata?.tags || [],
        original_type: memory.metadata?.original_memory_type
      };

      if (groupedMemories[type]) {
        groupedMemories[type].push(memoryInfo);
      } else {
        groupedMemories.other.push(memoryInfo);
      }
    });

    // Prepare context for AI
    const memoriesContext = Object.entries(groupedMemories)
      .filter(([_, memories]) => memories.length > 0)
      .map(([type, memories]) => {
        return `\n${type.toUpperCase()} memories (${memories.length}):\n${memories.map(m => `- ${m.summary} (importance: ${m.importance})`).join('\n')}`;
      })
      .join('\n');

    // Create prompt for AI
    const systemPrompt = `You are a psychological profiler analyzing user memories to create a comprehensive psychological profile. Based on the memories provided, identify patterns and generate a profile.

IMPORTANT: Your response must be ONLY a valid JSON object with these exact fields:
{
  "attachment_style": "one of: bezpieczny, lękowy, unikający, zdezorganizowany",
  "dominujące_schematy": ["array of psychological schemas in Polish"],
  "język_miłości": ["array of love languages in Polish: słowa uznania, czas, prezenty, przysługi, dotyk"],
  "styl_komunikacji": "one of: asertywny, pasywny, agresywny, pasywno-agresywny, emocjonalny, logiczny",
  "rola": "user's life role description in Polish"
}`;

    const userPrompt = `Based on these memories from the user, create their psychological profile:

${memoriesContext}

Remember to respond ONLY with a JSON object, no additional text.`;

    console.log('🤖 Generating AI psychological profile...');

    // Call OpenAI to analyze memories
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const aiResponse = completion.choices[0].message.content;
    console.log('✅ AI response received');

    // Parse AI response
    let profileData;
    try {
      profileData = JSON.parse(aiResponse);
      console.log('✅ Successfully parsed AI response');
    } catch (parseError) {
      console.error('❌ Failed to parse AI response:', aiResponse);
      return res.status(500).json({ 
        error: 'Failed to parse AI response',
        details: 'AI did not return valid JSON'
      });
    }

    // Validate required fields
    const requiredFields = ['attachment_style', 'dominujące_schematy', 'język_miłości', 'styl_komunikacji', 'rola'];
    const missingFields = requiredFields.filter(field => !profileData[field]);
    
    if (missingFields.length > 0) {
      console.error('❌ Missing required fields in AI response:', missingFields);
      return res.status(500).json({ 
        error: 'Incomplete AI response',
        details: `Missing fields: ${missingFields.join(', ')}`
      });
    }

    // Add additional fields based on memory analysis
    const additionalData = {
      dzieciństwo: memories.find(m => m.summary.toLowerCase().includes('dzieciństwo') || m.summary.toLowerCase().includes('matka') || m.summary.toLowerCase().includes('ojciec'))?.summary || null,
      aktualne_wyzywania: memories.filter(m => m.importance >= 7).slice(0, 3).map(m => m.summary).join('; ') || null,
      cykliczne_wzorce: memories.filter(m => m.repeat && m.repeat !== 'none').map(m => m.summary) || []
    };

    // Prepare complete profile data
    const completeProfile = {
      user_id,
      ...profileData,
      ...additionalData,
      last_updated: new Date().toISOString()
    };

    console.log('💾 Updating user profile...');

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('user_profile')
      .select('user_id')
      .eq('user_id', user_id)
      .single();

    let result;
    if (existingProfile) {
      // Update existing profile
      const { data, error } = await supabase
        .from('user_profile')
        .update(completeProfile)
        .eq('user_id', user_id)
        .select()
        .single();

      if (error) {
        console.error('❌ Update error:', error);
        return res.status(500).json({ 
          error: 'Failed to update profile',
          details: error.message
        });
      }
      result = data;
      console.log('✅ Profile updated successfully');
    } else {
      // Insert new profile
      const { data, error } = await supabase
        .from('user_profile')
        .insert([completeProfile])
        .select()
        .single();

      if (error) {
        console.error('❌ Insert error:', error);
        return res.status(500).json({ 
          error: 'Failed to create profile',
          details: error.message
        });
      }
      result = data;
      console.log('✅ Profile created successfully');
    }

    // Return success response
    return res.status(200).json({
      status: 'success',
      message: 'User profile generated and saved successfully',
      summary: {
        user_id: result.user_id,
        attachment_style: result.attachment_style,
        dominujące_schematy: result.dominujące_schematy,
        język_miłości: result.język_miłości,
        styl_komunikacji: result.styl_komunikacji,
        rola: result.rola,
        memories_analyzed: memories.length,
        last_updated: result.last_updated
      }
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};