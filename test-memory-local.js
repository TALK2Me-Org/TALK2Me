// DEPRECATED: Local test suite for memory system - replaced by memories_v2
// This file uses legacy memories table, kept for archival purposes
// Run with: node test-memory-local.js

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { MemoryManager } from './lib/memory-manager.js';

config();

// Test configuration
const TEST_USER_ID = 'test-user-' + Date.now();
const TEST_CONVERSATION_ID = 'test-conv-' + Date.now();

// Initialize clients
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'test-key'
});

// Test utilities
const log = (message, data = null) => {
    console.log(`[${new Date().toISOString()}] ${message}`);
    if (data) console.log(JSON.stringify(data, null, 2));
};

const assert = (condition, message) => {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
    log(`✅ ${message}`);
};

// Test cases
async function testDatabaseConnection() {
    log('Testing database connection...');
    
    const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);
    
    assert(!error, 'Database connection successful');
    return true;
}

async function testMemoryExtraction() {
    log('Testing memory extraction...');
    
    const testCases = [
        {
            input: "Mój mąż Maciej jest programistą i uwielbia kawę",
            expectedType: 'identity',
            expectedEntities: ['Maciej'],
            minImportance: 8
        },
        {
            input: "Nie lubię gdy ktoś się spóźnia",
            expectedType: 'preference',
            minImportance: 6
        },
        {
            input: "Wczoraj pokłóciłam się z mamą o pieniądze",
            expectedType: 'experience',
            minImportance: 7
        }
    ];
    
    const memoryManager = new MemoryManager(supabase, openai);
    
    for (const testCase of testCases) {
        log(`Testing: "${testCase.input}"`);
        
        // Simulate extraction
        const extraction = memoryManager.extractMemoryInfo(testCase.input);
        
        if (extraction) {
            assert(
                extraction.type === testCase.expectedType || !testCase.expectedType,
                `Correct type extracted: ${extraction.type}`
            );
            
            if (testCase.expectedEntities) {
                const hasEntities = testCase.expectedEntities.some(entity => 
                    extraction.content.includes(entity)
                );
                assert(hasEntities, 'Expected entities found');
            }
            
            assert(
                extraction.importance >= (testCase.minImportance || 1),
                `Importance score appropriate: ${extraction.importance}`
            );
        }
    }
    
    return true;
}

async function testEmbeddingGeneration() {
    log('Testing embedding generation...');
    
    // Skip if no API key
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'test-key') {
        log('⚠️  Skipping embedding test - no OpenAI API key');
        return true;
    }
    
    const testText = "Test memory content for embedding";
    
    try {
        const response = await openai.embeddings.create({
            model: "text-embedding-ada-002",
            input: testText
        });
        
        const embedding = response.data[0].embedding;
        
        assert(Array.isArray(embedding), 'Embedding is an array');
        assert(embedding.length === 1536, 'Embedding has correct dimensions');
        assert(embedding.every(val => typeof val === 'number'), 'All values are numbers');
        
        log(`Embedding generated: [${embedding.slice(0, 5).join(', ')}...]`);
        
    } catch (error) {
        log('❌ Embedding generation failed:', error.message);
        return false;
    }
    
    return true;
}

async function testMemorySaveAndRetrieve() {
    log('Testing memory save and retrieve...');
    
    // Create test user
    const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
            id: TEST_USER_ID,
            email: `test-${Date.now()}@example.com`,
            password_hash: 'test',
            name: 'Test User'
        })
        .select()
        .single();
    
    assert(!userError, 'Test user created');
    
    // Create test conversation
    const { data: convData, error: convError } = await supabase
        .from('conversations')
        .insert({
            id: TEST_CONVERSATION_ID,
            user_id: TEST_USER_ID,
            title: 'Test Conversation'
        })
        .select()
        .single();
    
    assert(!convError, 'Test conversation created');
    
    // Initialize memory manager
    const memoryManager = new MemoryManager(supabase, openai);
    
    // Test memory
    const testMemory = {
        content: "My partner Alex loves hiking in the mountains",
        type: 'identity',
        importance: 9,
        entities: { people: ['Alex'], activities: ['hiking'] }
    };
    
    // Save memory
    const saved = await memoryManager.saveMemory(
        TEST_USER_ID,
        testMemory.content,
        testMemory.type,
        testMemory.importance,
        TEST_CONVERSATION_ID,
        testMemory.entities
    );
    
    assert(saved, 'Memory saved successfully');
    
    // Retrieve memories
    const memories = await memoryManager.getRelevantMemories(
        TEST_USER_ID,
        "Tell me about Alex",
        5
    );
    
    assert(memories.length > 0, 'Memories retrieved');
    assert(
        memories.some(m => m.content.includes('Alex')),
        'Relevant memory found'
    );
    
    log('Retrieved memories:', memories);
    
    return true;
}

async function testFunctionCalling() {
    log('Testing function calling integration...');
    
    const systemPrompt = `You are a helpful assistant with memory capabilities.
When users share important information about themselves or their relationships, use the remember_this function.`;
    
    const functions = [{
        name: "remember_this",
        description: "Save important information about the user or their relationships",
        parameters: {
            type: "object",
            properties: {
                content: { type: "string" },
                memory_type: { 
                    type: "string",
                    enum: ["identity", "preference", "experience", "emotion", "routine", "goal", "boundary"]
                },
                importance: { type: "integer", minimum: 1, maximum: 10 }
            },
            required: ["content", "memory_type", "importance"]
        }
    }];
    
    // Skip if no API key
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'test-key') {
        log('⚠️  Skipping function calling test - no OpenAI API key');
        return true;
    }
    
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: "My wife Sarah is a teacher and we've been married for 5 years" }
            ],
            functions: functions,
            function_call: "auto"
        });
        
        const message = response.choices[0].message;
        
        if (message.function_call) {
            const functionCall = JSON.parse(message.function_call.arguments);
            
            assert(functionCall.content, 'Function call has content');
            assert(functionCall.memory_type, 'Function call has type');
            assert(functionCall.importance >= 7, 'High importance for relationship info');
            
            log('Function called with:', functionCall);
        } else {
            log('⚠️  No function call made - AI might need adjustment');
        }
        
    } catch (error) {
        log('❌ Function calling test failed:', error.message);
        return false;
    }
    
    return true;
}

async function cleanup() {
    log('Cleaning up test data...');
    
    // Delete test memories
    await supabase
        .from('memories')
        .delete()
        .eq('user_id', TEST_USER_ID);
    
    // Delete test messages
    await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', TEST_CONVERSATION_ID);
    
    // Delete test conversation
    await supabase
        .from('conversations')
        .delete()
        .eq('id', TEST_CONVERSATION_ID);
    
    // Delete test user
    await supabase
        .from('users')
        .delete()
        .eq('id', TEST_USER_ID);
    
    log('✅ Cleanup completed');
}

// Run all tests
async function runTests() {
    log('🚀 Starting memory system tests...\n');
    
    const tests = [
        { name: 'Database Connection', fn: testDatabaseConnection },
        { name: 'Memory Extraction', fn: testMemoryExtraction },
        { name: 'Embedding Generation', fn: testEmbeddingGeneration },
        { name: 'Memory Save & Retrieve', fn: testMemorySaveAndRetrieve },
        { name: 'Function Calling', fn: testFunctionCalling }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        log(`\n📋 Running: ${test.name}`);
        log('='.repeat(50));
        
        try {
            const result = await test.fn();
            if (result) {
                passed++;
                log(`✅ ${test.name} PASSED\n`);
            } else {
                failed++;
                log(`❌ ${test.name} FAILED\n`);
            }
        } catch (error) {
            failed++;
            log(`❌ ${test.name} FAILED:`, error.message);
            console.error(error);
        }
    }
    
    // Always cleanup
    await cleanup();
    
    // Summary
    log('\n' + '='.repeat(50));
    log(`📊 Test Results: ${passed} passed, ${failed} failed`);
    log('='.repeat(50));
    
    if (failed === 0) {
        log('🎉 All tests passed! Memory system is ready.');
    } else {
        log('⚠️  Some tests failed. Please check the logs above.');
    }
    
    process.exit(failed > 0 ? 1 : 0);
}

// Check environment
function checkEnvironment() {
    log('Checking environment variables...');
    
    const required = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY'
    ];
    
    const optional = [
        'OPENAI_API_KEY'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        log('❌ Missing required environment variables:', missing);
        log('Please create a .env file with these variables');
        process.exit(1);
    }
    
    optional.forEach(key => {
        if (!process.env[key]) {
            log(`⚠️  Optional variable ${key} not set - some tests will be skipped`);
        }
    });
    
    log('✅ Environment check passed\n');
}

// Main
checkEnvironment();
runTests().catch(error => {
    log('💥 Unexpected error:', error);
    process.exit(1);
});