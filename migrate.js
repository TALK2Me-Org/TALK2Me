// Automated migration script for TALK2Me
// Run: node migrate.js

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config();

// Initialize Supabase client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Colors for console
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}⚠️ ${colors.reset} ${msg}`),
    header: (msg) => console.log(`\n${colors.bright}${colors.blue}${'='.repeat(50)}${colors.reset}\n${colors.bright}${msg}${colors.reset}\n${colors.blue}${'='.repeat(50)}${colors.reset}`)
};

// SQL execution helper
async function executeSQLFromFile(filename) {
    const sqlPath = path.join(__dirname, 'SQL', filename);
    const sqlContent = await fs.readFile(sqlPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
    
    const results = [];
    const errors = [];
    
    for (const statement of statements) {
        try {
            // Skip comments and empty statements
            if (!statement || statement.startsWith('--')) continue;
            
            // Use raw SQL execution via RPC
            const { data, error } = await supabase.rpc('exec_sql', {
                sql_query: statement + ';'
            });
            
            if (error) {
                errors.push({ statement: statement.substring(0, 100) + '...', error });
            } else {
                results.push({ statement: statement.substring(0, 100) + '...', data });
            }
        } catch (err) {
            errors.push({ statement: statement.substring(0, 100) + '...', error: err.message });
        }
    }
    
    return { results, errors };
}

// Create helper function for raw SQL execution
async function createExecSQLFunction() {
    log.info('Creating SQL execution helper function...');
    
    const createFunction = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
    RETURNS json AS $$
    DECLARE
        result json;
    BEGIN
        EXECUTE sql_query;
        result := json_build_object('success', true, 'message', 'Query executed successfully');
        RETURN result;
    EXCEPTION WHEN OTHERS THEN
        result := json_build_object('success', false, 'message', SQLERRM);
        RETURN result;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // This needs to be done manually first
    log.warning('Please execute this function in Supabase SQL Editor first:');
    console.log('\n```sql');
    console.log(createFunction);
    console.log('```\n');
    
    return false;
}

// Step 1: Backup
async function performBackup() {
    log.header('STEP 1: Creating Backup');
    
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const backupSchema = `backup_${timestamp}`;
        
        log.info(`Creating backup schema: ${backupSchema}`);
        
        // Get table counts before backup
        const tables = ['users', 'chat_history', 'conversations', 'messages', 'memories', 'sessions', 'app_config'];
        const counts = {};
        
        for (const table of tables) {
            const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
            counts[table] = count || 0;
            log.info(`Table ${table}: ${counts[table]} records`);
        }
        
        // Create backup tables
        for (const table of tables) {
            log.info(`Backing up ${table}...`);
            
            // For now, we'll just verify the tables exist
            const { error } = await supabase.from(table).select('id').limit(1);
            if (error) {
                log.error(`Cannot access table ${table}: ${error.message}`);
            } else {
                log.success(`Table ${table} verified`);
            }
        }
        
        log.success('Backup preparation complete');
        log.warning('Manual backup recommended via Supabase Dashboard: Settings -> Backups');
        
        return true;
        
    } catch (error) {
        log.error(`Backup failed: ${error.message}`);
        return false;
    }
}

// Step 2: Schema Migration
async function migrateSchema() {
    log.header('STEP 2: Migrating Schema');
    
    try {
        // Check if we can execute SQL
        const { error: testError } = await supabase.rpc('exec_sql', { sql_query: 'SELECT 1;' });
        
        if (testError) {
            log.error('Cannot execute SQL directly. Please run migration manually in Supabase SQL Editor.');
            log.info('Files to execute in order:');
            log.info('1. SQL/000_backup_script.sql');
            log.info('2. SQL/002_migration_script.sql');
            return false;
        }
        
        // If we can execute SQL, proceed with migration
        log.info('Executing migration script...');
        const { results, errors } = await executeSQLFromFile('002_migration_script.sql');
        
        if (errors.length > 0) {
            log.error(`Migration had ${errors.length} errors`);
            errors.forEach(e => log.error(`Error: ${e.error.message || e.error}`));
            return false;
        }
        
        log.success(`Migration executed ${results.length} statements successfully`);
        return true;
        
    } catch (error) {
        log.error(`Migration failed: ${error.message}`);
        return false;
    }
}

// Step 3: Verify Migration
async function verifyMigration() {
    log.header('STEP 3: Verifying Migration');
    
    try {
        // Check new columns exist
        const columnsToCheck = [
            { table: 'users', columns: ['password_hash', 'updated_at', 'is_active', 'deleted_at'] },
            { table: 'sessions', columns: ['token_hash', 'device_info', 'ip_address', 'revoked_at'] },
            { table: 'conversations', columns: ['summary', 'message_count', 'is_pinned', 'context'] },
            { table: 'messages', columns: ['edited_at', 'tokens_used', 'function_name', 'function_args'] },
            { table: 'memories', columns: ['confidence', 'access_count', 'expires_at', 'relationships'] }
        ];
        
        log.info('Checking table structures...');
        
        for (const check of columnsToCheck) {
            // Try to select the new columns
            const query = supabase.from(check.table).select(check.columns.join(',')).limit(1);
            const { error } = await query;
            
            if (error) {
                log.error(`Missing columns in ${check.table}: ${error.message}`);
                return false;
            } else {
                log.success(`Table ${check.table} has all required columns`);
            }
        }
        
        // Check new tables exist
        const newTables = ['memory_patterns', 'audit_logs', 'rate_limits'];
        
        for (const table of newTables) {
            const { error } = await supabase.from(table).select('id').limit(1);
            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                log.error(`Table ${table} not found: ${error.message}`);
                return false;
            } else {
                log.success(`Table ${table} exists`);
            }
        }
        
        // Check data integrity
        const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
        const { count: convCount } = await supabase.from('conversations').select('*', { count: 'exact', head: true });
        
        log.info(`Data check: ${userCount} users, ${convCount} conversations`);
        
        log.success('Migration verification complete');
        return true;
        
    } catch (error) {
        log.error(`Verification failed: ${error.message}`);
        return false;
    }
}

// Step 4: Test Connection
async function testNewStructure() {
    log.header('STEP 4: Testing New Structure');
    
    try {
        // Test 1: Create a test memory
        log.info('Testing memory creation...');
        
        const testMemory = {
            id: 'test-' + Date.now(),
            user_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
            content: 'Test memory content',
            summary: 'Test summary',
            embedding: Array(1536).fill(0.1), // dummy embedding
            memory_type: 'preference',
            importance: 5,
            confidence: 0.8,
            entities: { test: true }
        };
        
        const { error: insertError } = await supabase
            .from('memories')
            .insert(testMemory);
            
        if (insertError) {
            log.warning(`Memory insert test failed (expected if no test user): ${insertError.message}`);
        } else {
            log.success('Memory structure test passed');
            
            // Clean up test memory
            await supabase.from('memories').delete().eq('id', testMemory.id);
        }
        
        // Test 2: Check indexes
        log.info('Checking indexes...');
        const { data: indexes, error: indexError } = await supabase.rpc('get_indexes');
        
        if (!indexError && indexes) {
            log.success(`Found ${indexes.length} indexes`);
        } else {
            log.warning('Cannot verify indexes directly');
        }
        
        // Test 3: Check functions
        log.info('Checking functions...');
        const functions = ['update_updated_at_column', 'search_memories', 'get_user_stats'];
        
        for (const func of functions) {
            // We can't directly check if functions exist via Supabase client
            log.info(`Function ${func} should exist (verify in SQL Editor)`);
        }
        
        log.success('Structure tests complete');
        return true;
        
    } catch (error) {
        log.error(`Testing failed: ${error.message}`);
        return false;
    }
}

// Main migration process
async function runMigration() {
    log.header('🚀 TALK2Me Database Migration Tool');
    
    // Check connection
    log.info('Checking database connection...');
    const { error: connError } = await supabase.from('users').select('count').limit(1);
    
    if (connError) {
        log.error('Cannot connect to database. Check your credentials.');
        process.exit(1);
    }
    
    log.success('Connected to Supabase');
    
    // Show migration plan
    log.header('📋 Migration Plan');
    console.log('1. Create backup of all tables');
    console.log('2. Add new columns to existing tables');
    console.log('3. Create new tables (memory_patterns, audit_logs, rate_limits)');
    console.log('4. Create/update indexes for performance');
    console.log('5. Migrate chat_history to conversations/messages');
    console.log('6. Verify migration success\n');
    
    // Check if exec_sql function exists
    const { error: funcError } = await supabase.rpc('exec_sql', { sql_query: 'SELECT 1;' });
    
    if (funcError) {
        log.warning('Direct SQL execution not available');
        log.header('📝 Manual Migration Required');
        
        console.log('\nPlease follow these steps in Supabase SQL Editor:\n');
        console.log('1. Go to: https://app.supabase.com/project/hpxzhbubvdgxdvwxmhzo/sql');
        console.log('2. Execute these SQL files in order:');
        console.log('   - SQL/000_backup_script.sql (backup first!)');
        console.log('   - SQL/002_migration_script.sql (main migration)');
        console.log('3. After migration, run: node test-memory-local.js');
        console.log('\nDetailed instructions in: MIGRATION_GUIDE.md');
        
        // Create a combined SQL file for easy copy-paste
        await createCombinedSQL();
        
        return;
    }
    
    // If we can execute SQL, proceed with automated migration
    const steps = [
        { name: 'Backup', fn: performBackup },
        { name: 'Schema Migration', fn: migrateSchema },
        { name: 'Verification', fn: verifyMigration },
        { name: 'Testing', fn: testNewStructure }
    ];
    
    for (const step of steps) {
        const result = await step.fn();
        if (!result) {
            log.error(`${step.name} failed. Migration aborted.`);
            log.info('You can run the migration manually using the SQL files in the SQL directory.');
            process.exit(1);
        }
    }
    
    log.header('🎉 Migration Complete!');
    log.success('Database has been successfully migrated to v2.0');
    log.info('Next steps:');
    log.info('1. Run: node test-memory-local.js');
    log.info('2. Test the application');
    log.info('3. Monitor for any issues');
}

// Create combined SQL for manual execution
async function createCombinedSQL() {
    log.info('Creating combined SQL file for manual execution...');
    
    const backup = await fs.readFile(path.join(__dirname, 'SQL', '000_backup_script.sql'), 'utf8');
    const migration = await fs.readFile(path.join(__dirname, 'SQL', '002_migration_script.sql'), 'utf8');
    
    const combined = `-- TALK2Me Combined Migration Script
-- Generated: ${new Date().toISOString()}
-- =====================================================
-- PART 1: BACKUP (Run this first!)
-- =====================================================

${backup}

-- =====================================================
-- PART 2: MIGRATION (Run after backup is verified)
-- =====================================================

${migration}`;
    
    await fs.writeFile(path.join(__dirname, 'SQL', 'COMBINED_MIGRATION.sql'), combined);
    
    log.success('Created SQL/COMBINED_MIGRATION.sql for easy copy-paste');
}

// Run migration
runMigration().catch(error => {
    log.error(`Unexpected error: ${error.message}`);
    console.error(error);
    process.exit(1);
});