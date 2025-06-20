// Test script for POST /api/update-profile endpoint

// Test data from TASK 4
const testProfile = {
  "user_id": "11111111-1111-1111-1111-111111111111",
  "attachment_style": "lękowy",
  "dominujące_schematy": ["porzucenie", "niewystarczalność"],
  "język_miłości": ["dotyk", "czas"],
  "styl_komunikacji": "emocjonalny",
  "rola": "matka dwójki dzieci, partnerka Macieja",
  "dzieciństwo": "Była emocjonalnym opiekunem matki",
  "aktualne_wyzywania": "Godzenie pracy i relacji",
  "cykliczne_wzorce": ["reakcja lękowa po konflikcie"]
};

async function testUpdateProfile() {
  console.log('🧪 Testing POST /api/update-profile endpoint...\n');
  
  try {
    // Test locally
    const url = 'http://localhost:3000/api/update-profile';
    
    console.log('📮 Sending test profile:', JSON.stringify(testProfile, null, 2));
    console.log('\n📍 URL:', url);
    
    // First update - should create new profile
    console.log('\n1️⃣ First request (should create new profile)...');
    const response1 = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testProfile)
    });

    const result1 = await response1.json();
    
    if (response1.ok) {
      console.log('✅ Success!');
      console.log('📄 Response:', JSON.stringify(result1, null, 2));
    } else {
      console.log('❌ Error:', response1.status, response1.statusText);
      console.log('📄 Response:', JSON.stringify(result1, null, 2));
    }

    // Second update - should update existing profile
    console.log('\n2️⃣ Second request (should update existing profile)...');
    const updatedProfile = {
      ...testProfile,
      attachment_style: "bezpieczny",
      aktualne_wyzywania: "Balans między pracą a rodziną - postępy!"
    };
    
    const response2 = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedProfile)
    });

    const result2 = await response2.json();
    
    if (response2.ok) {
      console.log('✅ Success!');
      console.log('📄 Response:', JSON.stringify(result2, null, 2));
    } else {
      console.log('❌ Error:', response2.status, response2.statusText);
      console.log('📄 Response:', JSON.stringify(result2, null, 2));
    }

    // Test validation errors
    console.log('\n\n🧪 Testing validation errors...\n');
    
    // Test missing user_id
    console.log('3️⃣ Testing missing user_id...');
    const missingUserId = { ...testProfile };
    delete missingUserId.user_id;
    
    const response3 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(missingUserId)
    });
    
    const result3 = await response3.json();
    console.log('Response:', result3.error);
    
    // Test invalid UUID
    console.log('\n4️⃣ Testing invalid UUID format...');
    const invalidUuid = { ...testProfile, user_id: 'abc123' };
    
    const response4 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidUuid)
    });
    
    const result4 = await response4.json();
    console.log('Response:', result4.error);
    
    // Test invalid array field
    console.log('\n5️⃣ Testing invalid array field...');
    const invalidArray = { 
      ...testProfile, 
      dominujące_schematy: "should be array not string" 
    };
    
    const response5 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidArray)
    });
    
    const result5 = await response5.json();
    console.log('Response:', result5.error);
    
    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testUpdateProfile();