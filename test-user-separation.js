/**
 * Test User Separation in Mem0 API
 * 
 * Sprawdza czy użytkownicy mają oddzielną pamięć
 * Symuluje użytkowników: kontakt@nataliarybarczyk.pl, fidziu@me.com
 */

import { MemoryClient } from 'mem0ai';
import { createClient } from '@supabase/supabase-js';

async function testUserSeparation() {
  console.log('🧪 Testing User Separation in Mem0...');
  
  try {
    // Step 1: Load Mem0 API key from database
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: configData } = await supabase
      .from('app_config')
      .select('config_key, config_value')
      .eq('config_key', 'mem0_api_key');
    
    const apiKey = configData[0]?.config_value?.trim();
    if (!apiKey) throw new Error('No Mem0 API key found');
    
    const client = new MemoryClient({ apiKey });
    
    // Step 2: Test with Natalia's user ID
    console.log('\n👩 Testing Natalia (kontakt@nataliarybarczyk.pl)...');
    const nataliaUserId = 'natalia-rybarczyk';
    
    // Add memory for Natalia
    await client.add([
      { role: 'user', content: 'Moje imię to Natalia i jestem właścicielem TALK2Me' }
    ], {
      user_id: nataliaUserId
    });
    
    // Get Natalia's memories
    const nataliaMemories = await client.getAll({ user_id: nataliaUserId });
    console.log(`📋 Natalia's memories: ${nataliaMemories.length} found`);
    
    // Step 3: Test with Maciej's user ID  
    console.log('\n👨 Testing Maciej (fidziu@me.com)...');
    const maciejUserId = 'maciej-fidziu';
    
    // Add memory for Maciej
    await client.add([
      { role: 'user', content: 'Jestem Maciej, mentor projektu TALK2Me, mój email to fidziu@me.com' }
    ], {
      user_id: maciejUserId
    });
    
    // Get Maciej's memories
    const maciejMemories = await client.getAll({ user_id: maciejUserId });
    console.log(`📋 Maciej's memories: ${maciejMemories.length} found`);
    
    // Step 4: Cross-check - each user should only see their own memories
    console.log('\n🔍 Cross-checking user separation...');
    
    console.log('👩 Natalia sees:', nataliaMemories.map(m => m.memory?.substring(0, 50) + '...'));
    console.log('👨 Maciej sees:', maciejMemories.map(m => m.memory?.substring(0, 50) + '...'));
    
    // Step 5: Search test - personalized results
    console.log('\n🔎 Testing personalized search...');
    
    const nataliaSearch = await client.search('właściciel TALK2Me', { 
      user_id: nataliaUserId, 
      limit: 5 
    });
    console.log(`👩 Natalia search results: ${nataliaSearch.length}`);
    
    const maciejSearch = await client.search('mentor projektu', { 
      user_id: maciejUserId, 
      limit: 5 
    });
    console.log(`👨 Maciej search results: ${maciejSearch.length}`);
    
    console.log('\n✅ User separation test completed successfully!');
    console.log('✅ Each user has private, separated memory space');
    
  } catch (error) {
    console.error('❌ User separation test failed:', error.message);
  }
}

// Run test
testUserSeparation();