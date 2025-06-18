// Using built-in fetch (Node.js 18+)

// Test data from TASK 3
const testMemory = {
  "user_id": "11111111-1111-1111-1111-111111111111", // Test user UUID
  "actor": "user",
  "memory_type": "schemat",
  "importance": 5,
  "summary": "Zawsze czuje się odpowiedzialna za spokój w relacji",
  "memory_layer": "long_term",
  "date": "2025-06-18",
  "location": "dom rodzinny",
  "repeat": "none",
  "tags": ["Maciej", "relacja"],
  "source_context": "Rozmowa wieczorna",
  "status": "active",
  "visible_to_user": true
};

async function testSaveMemory() {
  console.log('🧪 Testing POST /api/save-memory endpoint...\n');
  
  try {
    // Test locally first
    const url = 'http://localhost:3000/api/save-memory';
    
    console.log('📮 Sending test memory:', JSON.stringify(testMemory, null, 2));
    console.log('\n📍 URL:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testMemory)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('\n✅ Success! Memory saved');
      console.log('📄 Response:', JSON.stringify(result, null, 2));
    } else {
      console.log('\n❌ Error:', response.status, response.statusText);
      console.log('📄 Response:', JSON.stringify(result, null, 2));
    }

    // Test validation errors
    console.log('\n\n🧪 Testing validation errors...\n');
    
    // Test missing user_id
    console.log('1️⃣ Testing missing user_id...');
    const missingUserId = { ...testMemory };
    delete missingUserId.user_id;
    
    const response1 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(missingUserId)
    });
    
    const result1 = await response1.json();
    console.log('Response:', result1.error, '-', result1.details);
    
    // Test invalid UUID
    console.log('\n2️⃣ Testing invalid UUID format...');
    const invalidUuid = { ...testMemory, user_id: 'abc123' };
    
    const response2 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidUuid)
    });
    
    const result2 = await response2.json();
    console.log('Response:', result2.error, '-', result2.details);
    
    // Test summary too long
    console.log('\n3️⃣ Testing summary too long...');
    const longSummary = { ...testMemory, summary: 'A'.repeat(301) };
    
    const response3 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(longSummary)
    });
    
    const result3 = await response3.json();
    console.log('Response:', result3.error, '-', result3.details);
    
    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSaveMemory();