// Test script for POST /api/summarize-memories endpoint

// Test data
const testData = {
  "user_id": "11111111-1111-1111-1111-111111111111"
};

async function testSummarizeMemories() {
  console.log('🧪 Testing POST /api/summarize-memories endpoint...\n');
  
  try {
    // Test locally
    const url = 'http://localhost:3000/api/summarize-memories';
    
    console.log('📮 Request data:', JSON.stringify(testData, null, 2));
    console.log('\n📍 URL:', url);
    
    // First, we need to ensure there are some memories for this user
    console.log('\n📝 NOTE: This test assumes you have already saved some memories for user_id: ' + testData.user_id);
    console.log('If not, please run test-save-memory.js first to create some test memories.\n');
    
    // Test the summarize endpoint
    console.log('1️⃣ Testing memory summarization...');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('\n✅ Success! Profile generated');
      console.log('📄 Response:', JSON.stringify(result, null, 2));
      
      // Display the generated profile
      if (result.summary) {
        console.log('\n🧠 Generated Psychological Profile:');
        console.log('================================');
        console.log(`👤 User ID: ${result.summary.user_id}`);
        console.log(`💭 Attachment Style: ${result.summary.attachment_style}`);
        console.log(`🧩 Dominant Schemas: ${result.summary.dominujące_schematy?.join(', ') || 'None'}`);
        console.log(`❤️  Love Languages: ${result.summary.język_miłości?.join(', ') || 'None'}`);
        console.log(`💬 Communication Style: ${result.summary.styl_komunikacji}`);
        console.log(`🎭 Life Role: ${result.summary.rola}`);
        console.log(`📊 Memories Analyzed: ${result.summary.memories_analyzed}`);
        console.log(`⏱️  Last Updated: ${result.summary.last_updated}`);
        console.log('================================');
      }
    } else {
      console.log('\n❌ Error:', response.status, response.statusText);
      console.log('📄 Response:', JSON.stringify(result, null, 2));
    }

    // Test validation errors
    console.log('\n\n🧪 Testing validation errors...\n');
    
    // Test missing user_id
    console.log('2️⃣ Testing missing user_id...');
    const response2 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    const result2 = await response2.json();
    console.log('Response:', result2.error);
    
    // Test invalid UUID
    console.log('\n3️⃣ Testing invalid UUID format...');
    const response3 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'invalid-uuid' })
    });
    
    const result3 = await response3.json();
    console.log('Response:', result3.error);
    
    // Test non-existent user
    console.log('\n4️⃣ Testing non-existent user...');
    const response4 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: '99999999-9999-9999-9999-999999999999' })
    });
    
    const result4 = await response4.json();
    console.log('Response:', result4.error || result4.message);
    
    console.log('\n✅ All tests completed!');
    
    // Instructions for next steps
    console.log('\n📋 Next Steps:');
    console.log('1. Check Supabase user_profile table to verify the profile was saved');
    console.log('2. Run test-update-profile.js to see the generated profile');
    console.log('3. Add more memories and run this again to see how the profile evolves');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Helper function to create test memories first
async function createTestMemories() {
  console.log('📝 Creating test memories first...\n');
  
  const testMemories = [
    {
      user_id: testData.user_id,
      actor: "user",
      memory_type: "personal",
      importance: 8,
      summary: "Czuję się odpowiedzialna za emocjonalny spokój w relacji z Maciejem",
      memory_layer: "long_term",
      visible_to_user: true
    },
    {
      user_id: testData.user_id,
      actor: "user",
      memory_type: "relationship",
      importance: 7,
      summary: "Maciej jest moim partnerem, programistą, cenimy wspólny czas",
      memory_layer: "long_term",
      visible_to_user: true
    },
    {
      user_id: testData.user_id,
      actor: "user",
      memory_type: "preference",
      importance: 6,
      summary: "Lubię gdy Maciej poświęca mi czas i uwagę, dotyk jest ważny",
      memory_layer: "long_term",
      visible_to_user: true
    }
  ];
  
  for (const memory of testMemories) {
    try {
      const response = await fetch('http://localhost:3000/api/save-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memory)
      });
      
      if (response.ok) {
        console.log(`✅ Created memory: ${memory.summary.substring(0, 50)}...`);
      } else {
        const error = await response.json();
        console.log(`❌ Failed to create memory: ${error.error}`);
      }
    } catch (error) {
      console.error('❌ Error creating memory:', error.message);
    }
  }
  
  console.log('\n✅ Test memories created!\n');
}

// Main test flow
async function runFullTest() {
  console.log('🚀 Starting full test of memory summarization...\n');
  
  // Ask if we should create test memories
  console.log('Do you want to create test memories first? (Recommended if this is your first run)');
  console.log('Comment/uncomment the line below:\n');
  
  // Uncomment this line to create test memories first:
  // await createTestMemories();
  
  // Run the summarization test
  await testSummarizeMemories();
}

// Run the test
runFullTest();