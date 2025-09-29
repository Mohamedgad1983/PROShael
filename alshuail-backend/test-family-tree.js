import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// Generate a valid test token
const JWT_SECRET = process.env.JWT_SECRET || 'alshuail-super-secure-jwt-secret-key-2024-production-ready-32chars';
const testToken = jwt.sign(
  {
    userId: 'test-admin',
    role: 'admin',
    email: 'admin@alshuail.com'
  },
  JWT_SECRET,
  { expiresIn: '24h' }
);

console.log('Generated Test Token:', testToken);
console.log('\n');

const API_BASE = 'http://localhost:3001/api';

async function testFamilyTreeAPI() {
  console.log('🧪 Testing Family Tree API Endpoints...\n');

  try {
    // 1. First get members to test with
    console.log('1️⃣ Fetching members...');
    const membersResponse = await fetch(`${API_BASE}/members?limit=5`, {
      headers: {
        'Authorization': `Bearer ${testToken}`
      }
    });

    if (!membersResponse.ok) {
      const error = await membersResponse.text();
      console.error('❌ Failed to fetch members:', error);
      return;
    }

    const membersData = await membersResponse.json();
    const members = membersData.members || membersData.data || [];
    console.log(`✅ Found ${members.length} members`);

    if (members.length === 0) {
      console.log('⚠️ No members found in database');
      return;
    }

    const testMemberId = members[0].id;
    console.log(`📍 Testing with member: ${members[0].name} (ID: ${testMemberId})\n`);

    // 2. Test Get Family Tree
    console.log('2️⃣ Testing GET /api/family-tree/tree/:memberId');
    const startTime1 = Date.now();
    const treeResponse = await fetch(`${API_BASE}/family-tree/tree/${testMemberId}`, {
      headers: {
        'Authorization': `Bearer ${testToken}`
      }
    });

    const treeData = await treeResponse.json();
    const responseTime1 = Date.now() - startTime1;

    if (treeResponse.ok) {
      console.log(`✅ Family tree fetched in ${responseTime1}ms`);
      console.log(`   - Relationships found: ${treeData.relationshipCount || 0}`);
      if (treeData.data) {
        console.log(`   - Member: ${treeData.data.name}`);
        console.log(`   - Children: ${treeData.data.children?.length || 0}`);
        console.log(`   - Parents: ${treeData.data.parents?.length || 0}`);
        console.log(`   - Siblings: ${treeData.data.siblings?.length || 0}`);
      }
    } else {
      console.log(`❌ Error: ${treeData.error}`);
    }

    // 3. Test Get Relationships
    console.log('\n3️⃣ Testing GET /api/family-tree/relationships/:memberId');
    const startTime2 = Date.now();
    const relResponse = await fetch(`${API_BASE}/family-tree/relationships/${testMemberId}`, {
      headers: {
        'Authorization': `Bearer ${testToken}`
      }
    });

    const relData = await relResponse.json();
    const responseTime2 = Date.now() - startTime2;

    if (relResponse.ok) {
      console.log(`✅ Relationships fetched in ${responseTime2}ms`);
      console.log(`   - Total relationships: ${relData.count}`);
    } else {
      console.log(`❌ Error: ${relData.error}`);
    }

    // 4. Test Statistics
    console.log('\n4️⃣ Testing GET /api/family-tree/statistics');
    const startTime3 = Date.now();
    const statsResponse = await fetch(`${API_BASE}/family-tree/statistics`, {
      headers: {
        'Authorization': `Bearer ${testToken}`
      }
    });

    const statsData = await statsResponse.json();
    const responseTime3 = Date.now() - startTime3;

    if (statsResponse.ok) {
      console.log(`✅ Statistics fetched in ${responseTime3}ms`);
      console.log(`   - Total relationships: ${statsData.data?.totalRelationships || 0}`);
      console.log(`   - Relationship types:`, statsData.data?.relationshipTypes || {});
    } else {
      console.log(`❌ Error: ${statsData.error}`);
    }

    // 5. Test Creating a Relationship (if we have at least 2 members)
    if (members.length >= 2) {
      console.log('\n5️⃣ Testing POST /api/family-tree/relationships');
      const relationshipData = {
        memberFrom: members[0].id,
        memberTo: members[1].id,
        relationshipType: 'sibling'
      };

      const createResponse = await fetch(`${API_BASE}/family-tree/relationships`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(relationshipData)
      });

      const createData = await createResponse.json();

      if (createResponse.ok) {
        console.log(`✅ Relationship created successfully`);
        console.log(`   - ID: ${createData.data?.id}`);
        console.log(`   - Type: ${createData.data?.relationship_type}`);
      } else if (createResponse.status === 409) {
        console.log(`ℹ️ Relationship already exists`);
      } else {
        console.log(`❌ Error: ${createData.error}`);
      }
    }

    // Performance Summary
    console.log('\n📊 Performance Summary:');
    console.log(`   - Average response time: ${Math.round((responseTime1 + responseTime2 + responseTime3) / 3)}ms`);
    console.log(`   - All endpoints < 100ms: ${responseTime1 < 100 && responseTime2 < 100 && responseTime3 < 100 ? '✅ Yes' : '❌ No'}`);

    console.log('\n✨ Family Tree API testing complete!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testFamilyTreeAPI();