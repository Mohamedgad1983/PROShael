// Debug script to check what's happening with member data
const API_URL = 'https://proshael.onrender.com';

async function debugMemberEdit() {
  console.log('🔍 Debugging Member Edit Issue\n');

  // Step 1: Login
  console.log('1️⃣ Logging in...');
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

  // Step 2: Get members and check their data
  console.log('2️⃣ Fetching members to check data format...');
  const membersResponse = await fetch(`${API_URL}/api/members?limit=5`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const membersData = await membersResponse.json();

  console.log('\n📊 Raw API Response:');
  console.log('=====================================');

  if (membersData.success && membersData.data) {
    membersData.data.forEach((member, index) => {
      console.log(`\nMember ${index + 1}:`);
      console.log('  ID:', member.id);
      console.log('  Name:', member.full_name);
      console.log('  Gender (type):', typeof member.gender);
      console.log('  Gender (value):', JSON.stringify(member.gender));
      console.log('  Gender (raw):', member.gender);
      console.log('  Tribal Section (type):', typeof member.tribal_section);
      console.log('  Tribal Section (value):', JSON.stringify(member.tribal_section));
      console.log('  Tribal Section (raw):', member.tribal_section);
      console.log('-------------------------------------');
    });
  }

  // Step 3: Check specific member
  if (membersData.data && membersData.data[0]) {
    const testMemberId = membersData.data[0].id;

    console.log('\n3️⃣ Getting specific member details...');
    const singleMemberResponse = await fetch(`${API_URL}/api/members/${testMemberId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (singleMemberResponse.ok) {
      const singleMember = await singleMemberResponse.json();
      console.log('\n📋 Single Member Data:');
      console.log('Gender:', singleMember.data?.gender);
      console.log('Tribal Section:', singleMember.data?.tribal_section);
      console.log('\nFull member object keys:', Object.keys(singleMember.data || {}));
    }
  }

  // Step 4: Check what values the database accepts
  console.log('\n4️⃣ Testing exact values match...');
  console.log('\nExpected dropdown values:');
  console.log('Gender: "male", "female"');
  console.log('Tribal: "الدغيش", "الرشيد", "الشبيعان", "العيد", "المسعود", "رشود", "رشيد", "عقاب"');

  // Check if any values have extra spaces or hidden characters
  if (membersData.data && membersData.data[0]) {
    const member = membersData.data[0];

    console.log('\n🔍 Checking for hidden characters:');
    console.log('Gender length:', member.gender?.length);
    console.log('Gender char codes:', member.gender?.split('').map(c => c.charCodeAt(0)));
    console.log('Tribal length:', member.tribal_section?.length);

    // Check for leading/trailing spaces
    if (member.gender !== member.gender?.trim()) {
      console.log('⚠️  Gender has extra spaces!');
    }
    if (member.tribal_section !== member.tribal_section?.trim()) {
      console.log('⚠️  Tribal section has extra spaces!');
    }
  }
}

debugMemberEdit().catch(console.error);