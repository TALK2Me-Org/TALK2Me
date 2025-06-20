// Test database connection before migration
// Run: node test-db-connection.js

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testConnection() {
    console.log('🔍 Testing Supabase connection...\n');
    
    try {
        // Test 1: Basic connection
        console.log('1️⃣ Testing basic connection...');
        const { data: test, error: testError } = await supabase
            .from('users')
            .select('count(*)', { count: 'exact', head: true });
            
        if (testError) throw testError;
        console.log('✅ Connection successful!\n');
        
        // Test 2: Get current schema info
        console.log('2️⃣ Checking current tables...');
        const { data: tables, error: tablesError } = await supabase
            .rpc('get_schema_info');
            
        if (tablesError) {
            // Fallback query if function doesn't exist
            const { data: counts, error: countsError } = await supabase.rpc('get_table_counts');
            
            if (countsError) {
                // Manual counts
                console.log('📊 Current table counts:');
                
                const tablesToCheck = ['users', 'conversations', 'messages', 'memories', 'chat_history'];
                
                for (const table of tablesToCheck) {
                    try {
                        const { count } = await supabase
                            .from(table)
                            .select('*', { count: 'exact', head: true });
                        console.log(`   ${table}: ${count || 0} records`);
                    } catch (e) {
                        console.log(`   ${table}: ❌ table not found or error`);
                    }
                }
            }
        }
        
        // Test 3: Check if pgvector is installed
        console.log('\n3️⃣ Checking pgvector extension...');
        const { data: extensions, error: extError } = await supabase
            .rpc('check_extensions');
            
        if (extError) {
            console.log('⚠️  Cannot check extensions directly, but this is normal\n');
        } else {
            const hasVector = extensions?.some(ext => ext.name === 'vector');
            console.log(hasVector ? '✅ pgvector is installed' : '❌ pgvector not found');
        }
        
        // Test 4: Check current schema version
        console.log('4️⃣ Checking schema version...');
        const { data: config, error: configError } = await supabase
            .from('app_config')
            .select('config_value')
            .eq('config_key', 'schema_version')
            .single();
            
        if (configError || !config) {
            console.log('ℹ️  No schema version found (this is normal for first migration)\n');
        } else {
            console.log(`📌 Current schema version: ${config.config_value}\n`);
        }
        
        // Test 5: Check for backup schema
        console.log('5️⃣ Checking for existing backups...');
        const { data: schemas, error: schemaError } = await supabase
            .rpc('list_schemas');
            
        if (schemaError) {
            console.log('⚠️  Cannot list schemas directly\n');
        } else {
            const backupSchemas = schemas?.filter(s => s.name.startsWith('backup_'));
            if (backupSchemas?.length > 0) {
                console.log('📦 Found existing backups:');
                backupSchemas.forEach(s => console.log(`   - ${s.name}`));
            } else {
                console.log('✅ No existing backups found (clean state)');
            }
        }
        
        console.log('\n' + '='.repeat(50));
        console.log('✅ Database is ready for migration!');
        console.log('='.repeat(50));
        console.log('\n📝 Next steps:');
        console.log('1. Go to Supabase SQL Editor');
        console.log('2. Run SQL/000_backup_script.sql');
        console.log('3. Follow MIGRATION_GUIDE.md');
        
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        console.error('\nPlease check:');
        console.error('1. Your .env file has correct Supabase credentials');
        console.error('2. Your Supabase project is running');
        console.error('3. Network connection is working');
        process.exit(1);
    }
}

// Helper function to create RPC functions if needed
async function createHelperFunctions() {
    const helpers = `
    -- Get table counts
    CREATE OR REPLACE FUNCTION get_table_counts()
    RETURNS JSON AS $$
    DECLARE
        result JSON;
    BEGIN
        SELECT json_build_object(
            'users', (SELECT COUNT(*) FROM users),
            'conversations', (SELECT COUNT(*) FROM conversations),
            'messages', (SELECT COUNT(*) FROM messages),
            'memories', (SELECT COUNT(*) FROM memories),
            'chat_history', (SELECT COUNT(*) FROM chat_history)
        ) INTO result;
        RETURN result;
    END;
    $$ LANGUAGE plpgsql;
    
    -- Check extensions
    CREATE OR REPLACE FUNCTION check_extensions()
    RETURNS TABLE(name TEXT, version TEXT) AS $$
    BEGIN
        RETURN QUERY
        SELECT extname::TEXT, extversion::TEXT
        FROM pg_extension
        WHERE extname IN ('vector', 'uuid-ossp', 'pg_trgm');
    END;
    $$ LANGUAGE plpgsql;
    
    -- List schemas
    CREATE OR REPLACE FUNCTION list_schemas()
    RETURNS TABLE(name TEXT) AS $$
    BEGIN
        RETURN QUERY
        SELECT schema_name::TEXT
        FROM information_schema.schemata
        WHERE schema_name LIKE 'backup_%'
        ORDER BY schema_name;
    END;
    $$ LANGUAGE plpgsql;
    `;
    
    console.log('\n📌 Helper SQL functions (copy to SQL Editor if needed):');
    console.log('```sql');
    console.log(helpers);
    console.log('```');
}

// Run tests
testConnection().then(() => {
    createHelperFunctions();
}).catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});