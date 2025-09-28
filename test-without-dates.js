// Test member edit WITHOUT date fields to isolate the issue
const API_URL = 'https://proshael.onrender.com';

async function testWithoutDates() {
  console.log('🔍 Testing Member Edit WITHOUT Date Fields\n');
  console.log('=' .repeat(50) + '\n');

  try {
    // Login
    console.log('📌 Logging in...');
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
    const token = loginData.token;
    console.log('✅ Login successful\n');

    // Get a test member
    console.log('📌 Fetching test member...');
    const membersResponse = await fetch(`${API_URL}/api/members?limit=1`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const membersData = await membersResponse.json();
    const testMember = membersData.data[0];
    console.log(`✅ Test member: ${testMember.full_name}`);
    console.log(`   Current gender: ${testMember.gender}`);
    console.log(`   Current tribal_section: ${testMember.tribal_section}\n`);

    // Test update WITHOUT date fields
    console.log('📌 Testing update WITHOUT date fields...');

    const newGender = testMember.gender === 'male' ? 'female' : 'male';
    const newTribal = testMember.tribal_section === 'الدغيش' ? 'الرشيد' : 'الدغيش';

    const updateData = {
      gender: newGender,
      tribal_section: newTribal,
      notes: `Test without dates - ${new Date().toLocaleTimeString()}`
    };

    console.log('   Sending update:', JSON.stringify(updateData, null, 2));

    const updateResponse = await fetch(`${API_URL}/api/members/${testMember.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });

    const responseText = await updateResponse.text();
    let updateResult;
    try {
      updateResult = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Failed to parse response:', responseText);
      return;
    }

    if (!updateResponse.ok) {
      console.error('❌ Update failed!');
      console.error(`   Status: ${updateResponse.status}`);
      console.error(`   Error: ${updateResult.error || responseText}`);
      return;
    }

    console.log('✅ Update successful!');
    console.log(`   New gender: ${updateResult.data.gender}`);
    console.log(`   New tribal_section: ${updateResult.data.tribal_section}\n`);

    // Revert changes
    console.log('📌 Reverting changes...');
    const revertData = {
      gender: testMember.gender,
      tribal_section: testMember.tribal_section
    };

    const revertResponse = await fetch(`${API_URL}/api/members/${testMember.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(revertData)
    });

    if (revertResponse.ok) {
      console.log('✅ Successfully reverted\n');
    }

    console.log('=' .repeat(50));
    console.log('🎉 TEST PASSED - Updates work without date fields!');
    console.log('=' .repeat(50));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWithoutDates();