import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export default async (req, res) => {
  console.log('📝 POST /api/save-memory - Processing request...');
  
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed. Use POST.' });
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

    // Extract data from request body
    const {
      user_id,
      actor = 'user',
      memory_type,
      importance = 5,
      summary,
      memory_layer = 'long_term',
      date,
      location,
      repeat = 'none',
      tags = [],
      source_context,
      status = 'active',
      visible_to_user = true
    } = req.body;

    // Validate required fields
    const errors = [];
    
    if (!user_id) errors.push('Missing required field: user_id');
    if (!summary) errors.push('Missing required field: summary');
    if (!memory_type) errors.push('Missing required field: memory_type');
    
    // Validate user_id format (should be UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (user_id && !uuidRegex.test(user_id)) {
      errors.push('Invalid user_id format. Must be a valid UUID');
    }
    
    // Validate summary length
    if (summary && summary.length > 300) {
      errors.push('Summary exceeds maximum length of 300 characters');
    }
    
    // Validate memory_type
    const validMemoryTypes = ['personal', 'relationship', 'preference', 'event', 'schemat'];
    if (memory_type && !validMemoryTypes.includes(memory_type)) {
      errors.push(`Invalid memory_type. Must be one of: ${validMemoryTypes.join(', ')}`);
    }
    
    // Validate importance range
    if (importance < 1 || importance > 10) {
      errors.push('Importance must be between 1 and 10');
    }
    
    // Validate memory_layer
    const validLayers = ['short_term', 'long_term', 'core'];
    if (memory_layer && !validLayers.includes(memory_layer)) {
      errors.push(`Invalid memory_layer. Must be one of: ${validLayers.join(', ')}`);
    }
    
    // Return validation errors if any
    if (errors.length > 0) {
      console.error('❌ Validation errors:', errors);
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors
      });
    }

    // Convert 'schemat' to 'personal' for database compatibility
    const dbMemoryType = memory_type === 'schemat' ? 'personal' : memory_type;

    // Create OpenAI client for embeddings
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error('❌ Missing OpenAI API key');
      return res.status(500).json({ error: 'AI service configuration error' });
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });

    // Generate embedding for the summary
    console.log('🤖 Generating embedding for memory...');
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: summary
    });
    
    const embedding = embeddingResponse.data[0].embedding;
    console.log('✅ Embedding generated successfully');

    // Prepare metadata object
    const metadata = {
      actor,
      memory_layer,
      tags,
      source_context,
      status,
      original_memory_type: memory_type // Store original type in metadata
    };

    // Prepare entities object
    const entities = {};
    if (tags && tags.length > 0) {
      entities.tags = tags;
    }
    if (location) {
      entities.location = location;
    }

    // Prepare data for insertion
    const memoryData = {
      user_id,
      content: source_context || summary, // Use source_context as content if provided
      summary,
      embedding,
      importance,
      memory_type: dbMemoryType,
      entities,
      metadata,
      memory_layer,
      date: date || null,
      location: location || null,
      repeat: repeat || 'none',
      actor: actor || 'user',
      visible_to_user
    };

    console.log('💾 Saving memory to database...');
    
    // Insert memory into database
    const { data, error } = await supabase
      .from('memories_v2')
      .insert([memoryData])
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return res.status(500).json({ 
        error: 'Failed to save memory',
        details: error.message
      });
    }

    console.log('✅ Memory saved successfully:', data.id);

    // Return success response
    return res.status(200).json({
      success: true,
      memory_id: data.id,
      message: 'Memory saved successfully',
      data: {
        id: data.id,
        user_id: data.user_id,
        summary: data.summary,
        memory_type: memory_type, // Return original type
        importance: data.importance,
        created_at: data.created_at
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