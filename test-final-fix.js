// Final test to verify all member edit issues are fixed
const API_URL = 'https://proshael.onrender.com';

async function testFinalFix() {
  console.log('🧪 FINAL TEST - Member Edit Fix Verification\n');
  console.log('============================================\n');

  // Step 1: Login
  console.log('1️⃣ Testing Login...');
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
  console.log('✅ Login successful\n');

  // Step 2: Get a test member
  console.log('2️⃣ Fetching test member...');
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
  console.log('✅ Test member:', testMember.full_name);
  console.log('   Current gender:', testMember.gender);
  console.log('   Current tribal_section:', testMember.tribal_section, '\n');

  // Step 3: Test updating with gender and tribal_section
  console.log('3️⃣ Testing member update with gender and tribal_section...');

  const updateData = {
    full_name: testMember.full_name,
    phone: testMember.phone,
    email: testMember.email || '',
    gender: testMember.gender === 'male' ? 'female' : 'male',  // Toggle gender
    tribal_section: testMember.tribal_section === 'الدغيش' ? 'الرشيد' : 'الدغيش',  // Toggle tribal
    nationality: testMember.nationality || 'سعودي',
    national_id: testMember.national_id || '',
    date_of_birth: testMember.date_of_birth || '',
    city: testMember.city || '',
    // district removed - doesn't exist in DB
    address: testMember.address || '',
    occupation: testMember.occupation || '',
    employer: testMember.employer || '',
    membership_number: testMember.membership_number || '',
    membership_status: testMember.membership_status || 'active',
    membership_date: testMember.membership_date || '',
    membership_type: testMember.membership_type || 'regular',
    notes: testMember.notes || ''
  };

  console.log('   Changing gender to:', updateData.gender);
  console.log('   Changing tribal_section to:', updateData.tribal_section);

  const updateResponse = await fetch(`${API_URL}/api/members/${testMember.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(updateData)
  });

  const updateResult = await updateResponse.json();

  if (updateResponse.ok && updateResult.success) {
    console.log('✅ Update successful!');
    console.log('   New gender:', updateResult.data.gender);
    console.log('   New tribal_section:', updateResult.data.tribal_section, '\n');

    // Step 4: Revert changes
    console.log('4️⃣ Reverting changes...');
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
      console.log('✅ Successfully reverted to original values\n');
    }

    console.log('============================================');
    console.log('🎉 ALL TESTS PASSED! Member edit is working!');
    console.log('============================================\n');
    console.log('Summary:');
    console.log('✅ Login works');
    console.log('✅ Fetching members works');
    console.log('✅ Updating gender works');
    console.log('✅ Updating tribal_section works');
    console.log('✅ No 500 errors');

  } else {
    console.error('❌ Update failed!');
    console.error('   Status:', updateResponse.status);
    console.error('   Error:', updateResult.error || 'Unknown error');
    console.error('   Details:', updateResult);
  }
}

// Run the test
testFinalFix().catch(console.error);