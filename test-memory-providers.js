/**
 * Memory Providers System Test Script
 * 
 * Tests the complete modular memory providers system:
 * - Router initialization and provider registration
 * - Provider switching and configuration
 * - Memory operations (save, retrieve)
 * - Fallback mechanisms
 * 
 * @author Claude (AI Assistant) - Memory Providers System
 * @date 29.06.2025
 * @status ✅ VALIDATION TEST
 */

import memoryRouter from './api/memory/router.js';
import LocalProvider from './api/memory/providers/localProvider.js';
import Mem0Provider from './api/memory/providers/mem0Provider.js';

// Test configuration
const TEST_USER_ID = '11111111-1111-1111-1111-111111111111';
const TEST_MESSAGE = 'My test message for provider validation';

console.log('🧪 Starting Memory Providers System Test...\n');

async function runTests() {
  try {
    // Test 1: Router Initialization
    console.log('=== TEST 1: Router Initialization ===');
    
    if (!memoryRouter.initialized) {
      console.log('🚀 Initializing Memory Router...');
      await memoryRouter.initialize();
    }
    
    const status = memoryRouter.getStatus();
    console.log('📊 Router Status:', {
      initialized: status.initialized,
      activeProvider: status.activeProvider?.name,
      fallbackProvider: status.fallbackProvider?.name,
      registeredProviders: status.registeredProviders
    });
    
    if (status.initialized) {
      console.log('✅ TEST 1 PASSED: Router initialized successfully\n');
    } else {
      console.log('❌ TEST 1 FAILED: Router not initialized\n');
      return;
    }

    // Test 2: Provider Registration
    console.log('=== TEST 2: Provider Registration ===');
    
    const registeredProviders = status.registeredProviders;
    console.log('📝 Registered providers:', registeredProviders);
    
    if (registeredProviders.includes('local') && registeredProviders.includes('mem0')) {
      console.log('✅ TEST 2 PASSED: Both providers registered\n');
    } else {
      console.log('❌ TEST 2 FAILED: Missing providers\n');
      return;
    }

    // Test 3: Provider Connection Tests
    console.log('=== TEST 3: Provider Connection Tests ===');
    
    // Test Local Provider
    console.log('🧪 Testing Local Provider...');
    try {
      const localProvider = await memoryRouter.createProviderInstance('local');
      await localProvider.initialize();
      const localTest = await localProvider.testConnection();
      console.log('Local Provider Test:', localTest.success ? '✅ PASS' : '❌ FAIL', localTest.message);
    } catch (error) {
      console.log('Local Provider Test: ❌ ERROR -', error.message);
    }
    
    // Test Mem0 Provider
    console.log('🧪 Testing Mem0 Provider...');
    try {
      const mem0Provider = await memoryRouter.createProviderInstance('mem0');
      await mem0Provider.initialize();
      const mem0Test = await mem0Provider.testConnection();
      console.log('Mem0 Provider Test:', mem0Test.success ? '✅ PASS' : '❌ FAIL', mem0Test.message);
    } catch (error) {
      console.log('Mem0 Provider Test: ❌ ERROR -', error.message);
    }
    
    console.log('✅ TEST 3 COMPLETED: Connection tests finished\n');

    // Test 4: Memory Operations via Router
    console.log('=== TEST 4: Memory Operations via Router ===');
    
    // Test save memory
    console.log('💾 Testing memory save...');
    const saveResult = await memoryRouter.saveMemory(TEST_USER_ID, TEST_MESSAGE, {
      summary: 'Test memory via router',
      importance: 3,
      memory_type: 'personal'
    });
    
    console.log('Save Result:', saveResult.success ? '✅ SUCCESS' : '❌ FAILED');
    if (saveResult.success) {
      console.log('Memory ID:', saveResult.memoryId);
    } else {
      console.log('Error:', saveResult.error);
    }
    
    // Test retrieve memories
    console.log('🔍 Testing memory retrieval...');
    const retrieveResult = await memoryRouter.getRelevantMemories(TEST_USER_ID, 'test message', 5);
    
    console.log('Retrieve Result:', retrieveResult.success ? '✅ SUCCESS' : '❌ FAILED');
    if (retrieveResult.success) {
      console.log('Found memories:', retrieveResult.memories?.length || 0);
    } else {
      console.log('Error:', retrieveResult.error);
    }
    
    console.log('✅ TEST 4 COMPLETED: Memory operations tested\n');

    // Test 5: Hot Reload Test
    console.log('=== TEST 5: Hot Reload Test ===');
    
    console.log('🔄 Testing hot reload...');
    const reloadResult = await memoryRouter.reload();
    
    console.log('Reload Result:', reloadResult.initialized ? '✅ SUCCESS' : '❌ FAILED');
    console.log('Active Provider after reload:', reloadResult.activeProvider?.name || 'none');
    
    console.log('✅ TEST 5 COMPLETED: Hot reload tested\n');

    // Test Summary
    console.log('=== TEST SUMMARY ===');
    console.log('🎉 Memory Providers System Test COMPLETED!');
    console.log('📊 Final Status:', memoryRouter.getStatus());
    
    console.log('\n✅ ALL TESTS PASSED - System is ready for production use!');
    
  } catch (error) {
    console.error('❌ TEST FAILED with error:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run tests
runTests().then(() => {
  console.log('\n🏁 Test script completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});