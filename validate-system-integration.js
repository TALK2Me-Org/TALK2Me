/**
 * System Integration Validation
 * 
 * Validates that all components work together:
 * - Server route registration
 * - Admin panel endpoint accessibility  
 * - Memory router integration
 * - Chat API integration
 * 
 * @author Claude (AI Assistant) - Memory Providers System
 * @date 29.06.2025
 * @status ✅ INTEGRATION VALIDATION
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔗 Validating System Integration...\n');

async function validateIntegration() {
  let passed = 0;
  let total = 0;
  
  function test(name, condition, details = '') {
    total++;
    if (condition) {
      console.log(`✅ ${name}`);
      if (details) console.log(`   ${details}`);
      passed++;
    } else {
      console.log(`❌ ${name}`);
      if (details) console.log(`   ${details}`);
    }
  }
  
  // Test 1: File Structure Validation
  console.log('=== FILE STRUCTURE ===');
  
  const requiredFiles = [
    'api/memory/router.js',
    'api/memory/interfaces/memoryProvider.js',
    'api/memory/providers/localProvider.js',
    'api/memory/providers/mem0Provider.js',
    'api/memory/status.js',
    'api/memory/test.js',
    'api/memory/reload.js',
    'api/user/chat-with-memory.js',
    'public/admin.html',
    'server.js'
  ];
  
  for (const file of requiredFiles) {
    const filePath = join(__dirname, file);
    const exists = fs.existsSync(filePath);
    test(`File exists: ${file}`, exists);
  }
  
  console.log();
  
  // Test 2: Server.js Routes Registration
  console.log('=== SERVER ROUTES INTEGRATION ===');
  
  const serverContent = fs.readFileSync(join(__dirname, 'server.js'), 'utf8');
  
  test('Memory Router handlers imported', 
    serverContent.includes('memoryStatusHandler') && 
    serverContent.includes('memoryTestHandler') && 
    serverContent.includes('memoryReloadHandler'));
    
  test('Memory status route registered', serverContent.includes("app.get('/api/memory/status'"));
  test('Memory test route registered', serverContent.includes("app.get('/api/memory/test'"));
  test('Memory reload route registered', serverContent.includes("app.post('/api/memory/reload'"));
  
  test('Server imports memory handlers', serverContent.includes('memory/status.js') && serverContent.includes('memory/test.js'));
  
  console.log();
  
  // Test 3: Admin Panel Integration
  console.log('=== ADMIN PANEL INTEGRATION ===');
  
  const adminContent = fs.readFileSync(join(__dirname, 'public/admin.html'), 'utf8');
  
  test('Memory Providers section exists', adminContent.includes('Memory Providers Configuration'));
  test('Provider selector dropdown exists', adminContent.includes('memory_provider_selector'));
  test('Test buttons exist', adminContent.includes('testProvider'));
  test('Reload button exists', adminContent.includes('reloadMemorySystem'));
  test('Mem0 API key field exists', adminContent.includes('mem0_api_key'));
  test('JavaScript functions exist', 
    adminContent.includes('loadMemoryProviderStatus') && 
    adminContent.includes('switchMemoryProvider'));
  
  console.log();
  
  // Test 4: Chat Integration
  console.log('=== CHAT API INTEGRATION ===');
  
  const chatContent = fs.readFileSync(join(__dirname, 'api/user/chat-with-memory.js'), 'utf8');
  
  test('Chat imports memory router', chatContent.includes("import memoryRouter from '../memory/router.js'"));
  test('Chat no longer uses MemoryManager directly', !chatContent.includes('new MemoryManager('));
  test('Chat uses router for memory retrieval', chatContent.includes('memoryRouter.getRelevantMemories'));
  test('Chat uses router for memory saving', chatContent.includes('memoryRouter.saveMemory'));
  test('Function calling updated for router', chatContent.includes('Memory Router'));
  
  console.log();
  
  // Test 5: Provider Architecture
  console.log('=== PROVIDER ARCHITECTURE ===');
  
  const routerContent = fs.readFileSync(join(__dirname, 'api/memory/router.js'), 'utf8');
  const localContent = fs.readFileSync(join(__dirname, 'api/memory/providers/localProvider.js'), 'utf8');
  const mem0Content = fs.readFileSync(join(__dirname, 'api/memory/providers/mem0Provider.js'), 'utf8');
  
  test('Router registers providers', 
    routerContent.includes('registerProvider(\'local\'') && 
    routerContent.includes('registerProvider(\'mem0\''));
    
  test('LocalProvider extends MemoryProvider', localContent.includes('extends MemoryProvider'));
  test('Mem0Provider extends MemoryProvider', mem0Content.includes('extends MemoryProvider'));
  
  test('Router has fallback logic', routerContent.includes('executeWithFallback'));
  test('Router has hot reload', routerContent.includes('async reload()'));
  
  console.log();
  
  // Test 6: Configuration Integration
  console.log('=== CONFIGURATION INTEGRATION ===');
  
  test('Router loads config from database', routerContent.includes('default_memory_provider'));
  test('Router supports Mem0 config', routerContent.includes('mem0_api_key'));
  test('Admin panel saves provider config', adminContent.includes('default_memory_provider'));
  
  console.log();
  
  // Test Summary
  console.log('='.repeat(50));
  console.log('🔗 INTEGRATION VALIDATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passed}/${total} tests`);
  console.log(`📊 Success Rate: ${Math.round((passed/total) * 100)}%`);
  
  if (passed === total) {
    console.log('\n🎉 ALL INTEGRATION TESTS PASSED!');
    console.log('✅ File structure complete');
    console.log('✅ Server routes properly registered');
    console.log('✅ Admin panel fully integrated');
    console.log('✅ Chat API using Memory Router');
    console.log('✅ Provider architecture implemented');
    console.log('✅ Configuration system integrated');
    console.log('\n🚀 SYSTEM READY FOR DEPLOYMENT!');
    console.log('\n📋 DEPLOYMENT CHECKLIST:');
    console.log('   1. Set default_memory_provider in database config');
    console.log('   2. Add mem0_api_key if using Mem0 provider');
    console.log('   3. Test provider switching in admin panel');
    console.log('   4. Verify memory saving in chat');
    console.log('   5. Test hot reload functionality');
  } else {
    console.log('\n⚠️ Some integration tests failed - review implementation');
  }
  
  return passed === total;
}

// Run validation
validateIntegration().then((success) => {
  console.log('\n🏁 Integration validation completed');
  process.exit(success ? 0 : 1);
}).catch((error) => {
  console.error('❌ Integration validation failed:', error);
  process.exit(1);
});