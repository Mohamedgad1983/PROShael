// Test member update API directly
const API_URL = 'https://proshael.onrender.com';

async function testMemberUpdate() {
  console.log('🧪 Testing Member Update API\n');

  // Step 1: Login as admin
  console.log('1️⃣ Logging in as admin...');
  const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'admin@alshuail.com',
      password: 'Admin@123456'
    })
  });

  const loginData = await loginResponse.json();
  if (!loginData.success) {
    console.error('❌ Login failed:', loginData.error);
    return;
  }

  const token = loginData.token;
  console.log('✅ Logged in successfully\n');

  // Step 2: Get a member to test with
  console.log('2️⃣ Fetching members...');
  const membersResponse = await fetch(`${API_URL}/api/members?limit=1`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const membersData = await membersResponse.json();
  if (!membersData.success || !membersData.data.length) {
    console.error('❌ No members found');
    return;
  }

  const testMember = membersData.data[0];
  console.log('✅ Found member:', testMember.full_name);
  console.log('   Current gender:', testMember.gender);
  console.log('   Current tribal_section:', testMember.tribal_section, '\n');

  // Step 3: Try to update the member
  console.log('3️⃣ Testing member update...');

  const updateData = {
    full_name: testMember.full_name,
    phone: testMember.phone,
    email: testMember.email || 'test@example.com',
    gender: 'female',  // Change to female to test
    tribal_section: 'الرشيد',  // Change to different section
    nationality: 'سعودي'
  };

  console.log('📤 Sending update:', JSON.stringify(updateData, null, 2));

  const updateResponse = await fetch(`${API_URL}/api/members/${testMember.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(updateData)
  });

  console.log('Response status:', updateResponse.status);

  const updateResult = await updateResponse.json();

  if (updateResponse.ok && updateResult.success) {
    console.log('✅ Update successful!');
    console.log('Updated member data:');
    console.log('   Gender:', updateResult.data.gender);
    console.log('   Tribal Section:', updateResult.data.tribal_section);

    // Step 4: Change it back
    console.log('\n4️⃣ Reverting changes...');
    const revertResponse = await fetch(`${API_URL}/api/members/${testMember.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        gender: testMember.gender || 'male',
        tribal_section: testMember.tribal_section || 'الدغيش'
      })
    });

    if (revertResponse.ok) {
      console.log('✅ Reverted successfully');
    }
  } else {
    console.error('❌ Update failed:', updateResult.error || 'Unknown error');
    console.error('Full response:', updateResult);
  }
}

// Run the test
testMemberUpdate().catch(console.error);