import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default async (req, res) => {
  console.log('🔧 TASK 2: Creating user_profile table...');
  
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase credentials');
      return res.status(500).json({ error: 'Missing Supabase credentials' });
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Read SQL file
    const sqlPath = path.join(dirname(__dirname), 'create-user-profile.sql');
    const sql = await fs.readFile(sqlPath, 'utf8');
    
    console.log('📄 Read SQL file successfully');

    // Execute SQL
    const { data, error } = await supabase.rpc('execute_sql', { query: sql }).single();
    
    if (error) {
      // If execute_sql doesn't exist, try direct query
      console.log('⚠️ execute_sql RPC not found, trying direct query...');
      
      // Split SQL into individual statements and execute them
      const statements = sql
        .split(';')
        .filter(stmt => stmt.trim())
        .map(stmt => stmt.trim() + ';');
      
      for (const statement of statements) {
        if (statement.includes('CREATE TABLE') || 
            statement.includes('CREATE INDEX') || 
            statement.includes('CREATE TRIGGER') ||
            statement.includes('CREATE FUNCTION') ||
            statement.includes('COMMENT ON') ||
            statement.includes('GRANT')) {
          
          console.log(`📝 Executing: ${statement.substring(0, 50)}...`);
          
          // For DDL statements, we need to use the Supabase management API
          // Since we can't execute raw SQL directly, we'll return instructions
          console.log('⚠️ Cannot execute DDL directly via API');
        }
      }
      
      // Return SQL for manual execution
      return res.status(200).json({
        success: false,
        message: 'Please execute the following SQL manually in Supabase SQL Editor',
        sql: sql,
        instructions: [
          '1. Go to Supabase Dashboard',
          '2. Navigate to SQL Editor',
          '3. Copy and paste the SQL code',
          '4. Click "Run" to execute',
          '5. Verify table creation in Table Editor'
        ]
      });
    }

    console.log('✅ Table created successfully!');
    
    // Try to verify table exists
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'user_profile')
      .single();
    
    if (tables) {
      console.log('✅ Verified: user_profile table exists');
    }

    return res.status(200).json({
      success: true,
      message: 'user_profile table created successfully',
      table: 'user_profile',
      columns: [
        'user_id (UUID, PRIMARY KEY)',
        'attachment_style (TEXT)',
        'dominujące_schematy (TEXT[])',
        'język_miłości (TEXT[])',
        'styl_komunikacji (TEXT)',
        'rola (TEXT)',
        'dzieciństwo (TEXT)',
        'aktualne_wyzywania (TEXT)',
        'cykliczne_wzorce (TEXT[])',
        'last_updated (TIMESTAMP)'
      ]
    });

  } catch (error) {
    console.error('❌ Error creating table:', error);
    return res.status(500).json({
      error: 'Failed to create user_profile table',
      details: error.message
    });
  }
};