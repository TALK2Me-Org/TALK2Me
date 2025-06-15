// Quick test to verify migration success
import { createClient } from '@supabase/supabase-js';

// Use environment variables or Railway config
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hpxzhbubvdgxdvwxmhzo.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    console.log('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMigration() {
    console.log('🔍 Testing migration results...\n');
    
    try {
        // 1. Check schema version
        const { data: version, error: versionError } = await supabase
            .from('app_config')
            .select('config_value')
            .eq('config_key', 'schema_version')
            .single();
            
        if (version) {
            console.log(`✅ Schema version: ${version.config_value}`);
        }
        
        // 2. Check new tables
        console.log('\n📋 Checking new tables:');
        const newTables = ['memory_patterns', 'audit_logs', 'rate_limits'];
        
        for (const table of newTables) {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });
                
            if (!error) {
                console.log(`✅ ${table} exists (${count || 0} records)`);
            } else {
                console.log(`❌ ${table}: ${error.message}`);
            }
        }
        
        // 3. Check memories table structure
        console.log('\n🧠 Checking memories table:');
        const { data: memory, error: memError } = await supabase
            .from('memories')
            .select('id, confidence, access_count, deleted_at')
            .limit(1);
            
        if (!memError) {
            console.log('✅ Memories table has new columns');
        } else {
            console.log(`❌ Memories table check failed: ${memError.message}`);
        }
        
        // 4. Check data migration
        console.log('\n📊 Data migration status:');
        const { count: convCount } = await supabase
            .from('conversations')
            .select('*', { count: 'exact', head: true });
            
        const { count: msgCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true });
            
        const { count: chatHistoryCount } = await supabase
            .from('chat_history')
            .select('*', { count: 'exact', head: true });
            
        console.log(`- Conversations: ${convCount || 0}`);
        console.log(`- Messages: ${msgCount || 0}`);
        console.log(`- Chat History (legacy): ${chatHistoryCount || 0}`);
        
        if (chatHistoryCount > 0 && msgCount >= chatHistoryCount * 2) {
            console.log('✅ Chat history appears to be migrated');
        }
        
        // 5. Test a simple query
        console.log('\n🔍 Testing query performance:');
        const start = Date.now();
        
        const { data: testQuery, error: queryError } = await supabase
            .from('conversations')
            .select('*, messages(count)')
            .limit(5);
            
        const duration = Date.now() - start;
        
        if (!queryError) {
            console.log(`✅ Query executed in ${duration}ms`);
        } else {
            console.log(`❌ Query failed: ${queryError.message}`);
        }
        
        console.log('\n' + '='.repeat(50));
        console.log('🎉 Migration verification complete!');
        console.log('='.repeat(50));
        
        console.log('\n📝 Next steps:');
        console.log('1. Test the application at https://talk2me.up.railway.app');
        console.log('2. Run memory tests: npm run test:memory');
        console.log('3. Monitor logs for any errors');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testMigration();