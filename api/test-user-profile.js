import { createClient } from '@supabase/supabase-js';

export default async (req, res) => {
  console.log('🧪 Testing user_profile table...');
  
  try {
    // Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase credentials');
      return res.status(500).json({ error: 'Missing Supabase credentials' });
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'GET') {
      // Check if table exists by trying to query it
      const { data, error } = await supabase
        .from('user_profile')
        .select('*')
        .limit(1);
      
      if (error) {
        console.error('❌ Table query error:', error);
        return res.status(404).json({
          exists: false,
          error: error.message,
          hint: 'Table might not exist. Please create it first using the SQL provided.'
        });
      }

      console.log('✅ Table exists!');
      return res.status(200).json({
        exists: true,
        message: 'user_profile table exists',
        sampleData: data
      });
    }

    if (req.method === 'POST') {
      // Try to insert a test record
      const testUserId = '11111111-1111-1111-1111-111111111111'; // Test user UUID
      
      const testProfile = {
        user_id: testUserId,
        attachment_style: 'secure',
        dominujące_schematy: ['perfekcjonizm', 'potrzeba kontroli'],
        język_miłości: ['słowa uznania', 'czas'],
        styl_komunikacji: 'asertywny',
        rola: 'opiekun',
        dzieciństwo: 'stabilne środowisko rodzinne, wspierający rodzice',
        aktualne_wyzywania: 'równowaga między pracą a życiem osobistym',
        cykliczne_wzorce: ['przeciążenie → wycofanie → regeneracja']
      };

      // First check if profile already exists
      const { data: existing } = await supabase
        .from('user_profile')
        .select('user_id')
        .eq('user_id', testUserId)
        .single();

      let result;
      if (existing) {
        // Update existing profile
        const { data, error } = await supabase
          .from('user_profile')
          .update(testProfile)
          .eq('user_id', testUserId)
          .select();
        
        if (error) {
          console.error('❌ Update error:', error);
          return res.status(500).json({ error: error.message });
        }
        result = data;
        console.log('✅ Test profile updated');
      } else {
        // Insert new profile
        const { data, error } = await supabase
          .from('user_profile')
          .insert([testProfile])
          .select();
        
        if (error) {
          console.error('❌ Insert error:', error);
          return res.status(500).json({ error: error.message });
        }
        result = data;
        console.log('✅ Test profile inserted');
      }

      return res.status(200).json({
        success: true,
        message: 'Test profile created/updated successfully',
        profile: result[0]
      });
    }

    return res.status(405).json({ error: 'Method not allowed. Use GET or POST.' });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({
      error: 'Failed to test user_profile table',
      details: error.message
    });
  }
};