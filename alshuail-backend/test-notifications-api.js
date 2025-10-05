// Test Notification API Endpoints
import fetch from 'node-fetch';
import { supabase } from './src/config/database.js';

const API_URL = 'http://localhost:3001';

// Test member credentials
const TEST_MEMBER = {
  phone: '+96550010001',
  password: '123456'
};

async function getAuthToken() {
  console.log('\n🔑 Getting auth token...');

  try {
    const response = await fetch(`${API_URL}/api/auth/member-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(TEST_MEMBER)
    });

    const data = await response.json();

    if (data.success && data.token) {
      console.log('✅ Auth successful');
      console.log('Member:', data.member?.full_name || 'Unknown');
      return data.token;
    } else {
      console.log('❌ Auth failed:', data.message || data.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Auth error:', error.message);
    return null;
  }
}

async function testNotificationEndpoints(token) {
  console.log('\n' + '='.repeat(50));
  console.log('🧪 TESTING NOTIFICATION ENDPOINTS');
  console.log('='.repeat(50));

  // Test 1: Get all notifications
  console.log('\n📋 TEST 1: Get All Notifications');
  console.log('GET /api/member/notifications');

  try {
    const response = await fetch(`${API_URL}/api/member/notifications`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Status:', response.status);
      console.log('📊 Summary:');
      console.log('  - Total notifications:', data.data?.total || 0);
      console.log('  - Unread count:', data.data?.unreadCount || 0);

      const categories = data.data?.notifications || {};
      console.log('📂 Categories:');
      Object.keys(categories).forEach(cat => {
        if (categories[cat]?.length > 0) {
          console.log(`  - ${cat}: ${categories[cat].length} notifications`);
        }
      });
    } else {
      console.log('❌ Failed:', response.status, data.error || data.message);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 2: Get notification summary
  console.log('\n📊 TEST 2: Get Notification Summary');
  console.log('GET /api/member/notifications/summary');

  try {
    const response = await fetch(`${API_URL}/api/member/notifications/summary`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Status:', response.status);
      console.log('📈 Category counts:');

      const summary = data.data || {};
      Object.keys(summary).forEach(cat => {
        const info = summary[cat];
        console.log(`  - ${cat}: Total: ${info.total}, Unread: ${info.unread}`);
      });
    } else {
      console.log('❌ Failed:', response.status, data.error || data.message);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 3: Mark a notification as read (if any exist)
  console.log('\n✓ TEST 3: Mark Notification as Read');
  console.log('PUT /api/member/notifications/:id/read');

  try {
    // First get notifications to find an ID
    const getResponse = await fetch(`${API_URL}/api/member/notifications`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const notifications = await getResponse.json();
    const categories = notifications.data?.notifications || {};

    // Find first unread notification
    let notifId = null;
    for (const cat of Object.keys(categories)) {
      const unreadNotif = categories[cat]?.find(n => !n.isRead);
      if (unreadNotif) {
        notifId = unreadNotif.id;
        break;
      }
    }

    if (notifId) {
      console.log('  Found unread notification:', notifId);

      const response = await fetch(`${API_URL}/api/member/notifications/${notifId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Status:', response.status);
        console.log('  Message:', data.message || data.messageAr);
      } else {
        console.log('❌ Failed:', response.status, data.error || data.message);
      }
    } else {
      console.log('⚠️  No unread notifications found to test');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 4: Delete a notification
  console.log('\n🗑️ TEST 4: Delete Notification');
  console.log('DELETE /api/member/notifications/:id');

  try {
    // First get notifications to find an ID
    const getResponse = await fetch(`${API_URL}/api/member/notifications`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const notifications = await getResponse.json();
    const categories = notifications.data?.notifications || {};

    // Find any notification to delete
    let notifId = null;
    for (const cat of Object.keys(categories)) {
      if (categories[cat]?.length > 0) {
        notifId = categories[cat][0].id;
        break;
      }
    }

    if (notifId) {
      console.log('  Deleting notification:', notifId);

      const response = await fetch(`${API_URL}/api/member/notifications/${notifId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Status:', response.status);
        console.log('  Message:', data.message || data.messageAr);
      } else {
        console.log('❌ Failed:', response.status, data.error || data.message);
      }
    } else {
      console.log('⚠️  No notifications found to delete');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 5: Mark all as read
  console.log('\n✓✓ TEST 5: Mark All Notifications as Read');
  console.log('PUT /api/member/notifications/read-all');

  try {
    const response = await fetch(`${API_URL}/api/member/notifications/read-all`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Status:', response.status);
      console.log('  Message:', data.message || data.messageAr);
      console.log('  Count updated:', data.count || 0);
    } else {
      console.log('❌ Failed:', response.status, data.error || data.message);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

// Check if notifications table exists
async function checkNotificationsTable() {
  console.log('\n🔍 Checking notifications table...');

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.log('❌ Notifications table error:', error.message);
      return false;
    }

    console.log('✅ Notifications table exists');
    console.log('  Total records:', data);
    return true;
  } catch (error) {
    console.log('❌ Error checking table:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Notification API Tests');
  console.log('Server:', API_URL);
  console.log('Time:', new Date().toISOString());

  // Check table
  const tableExists = await checkNotificationsTable();
  if (!tableExists) {
    console.log('\n⚠️  Notifications table not found. Please run migration first.');
    return;
  }

  // Get auth token
  const token = await getAuthToken();
  if (!token) {
    console.log('\n❌ Cannot proceed without auth token');
    return;
  }

  // Run tests
  await testNotificationEndpoints(token);

  console.log('\n' + '='.repeat(50));
  console.log('✅ ALL TESTS COMPLETED');
  console.log('='.repeat(50));

  process.exit(0);
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});