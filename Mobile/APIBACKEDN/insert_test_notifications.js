#!/usr/bin/env node

/**
 * Insert Test Notifications
 * Creates sample notifications for testing the notification API
 */

const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../alshuail-backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test user ID (سارة الشعيل)
const TEST_USER_ID = '147b3021-a6a3-4cd7-af2c-67ad11734aa0';

async function insertTestNotifications() {
  console.log('\n🔧 Inserting Test Notifications...\n');

  try {
    // 1. Delete existing notifications for test user
    console.log('1️⃣ Cleaning up existing test notifications...');
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', TEST_USER_ID);

    if (deleteError) {
      console.error('Error deleting:', deleteError);
    } else {
      console.log('✅ Cleaned up old notifications\n');
    }

    // 2. Insert new test notifications
    console.log('2️⃣ Inserting new test notifications...');

    const testNotifications = [
      // News Notifications (3 total, 2 unread)
      {
        user_id: TEST_USER_ID,
        type: 'news_urgent',
        title: 'إعلان هام',
        message: 'إجتماع عائلي عاجل يوم الجمعة القادمة',
        is_read: false,
        created_at: new Date().toISOString()
      },
      {
        user_id: TEST_USER_ID,
        type: 'news_general',
        title: 'أخبار العائلة',
        message: 'تهنئة بمناسبة نجاح الطلاب',
        is_read: false,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
      },
      {
        user_id: TEST_USER_ID,
        type: 'news_announcement',
        title: 'تحديث النظام',
        message: 'تم تحديث نظام إدارة العائلة',
        is_read: true,
        read_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() // 2 days ago
      },

      // Initiative Notifications (3 total, 2 unread)
      {
        user_id: TEST_USER_ID,
        type: 'initiative_new',
        title: 'مبادرة جديدة',
        message: 'مبادرة دعم الطلاب المتفوقين 2025',
        is_read: false,
        created_at: new Date().toISOString()
      },
      {
        user_id: TEST_USER_ID,
        type: 'initiative_update',
        title: 'تحديث المبادرة',
        message: 'تم تحديث مبادرة بناء المسجد',
        is_read: false,
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() // 6 hours ago
      },
      {
        user_id: TEST_USER_ID,
        type: 'initiative_completed',
        title: 'إكتمال مبادرة',
        message: 'تم إكتمال مبادرة الإفطار الجماعي',
        is_read: true,
        read_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
      },

      // Diya Notifications (2 total, 1 unread)
      {
        user_id: TEST_USER_ID,
        type: 'diya_pending',
        title: 'دية معلقة',
        message: 'دية جديدة تحتاج للدفع: 50,000 ريال',
        is_read: false,
        created_at: new Date().toISOString()
      },
      {
        user_id: TEST_USER_ID,
        type: 'diya_completed',
        title: 'إكتمال دية',
        message: 'تم إكمال دفع الدية - شكراً لمساهمتك',
        is_read: true,
        read_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
      }
    ];

    const { data, error } = await supabase
      .from('notifications')
      .insert(testNotifications)
      .select();

    if (error) {
      console.error('❌ Error inserting notifications:', error);
      process.exit(1);
    }

    console.log(`✅ Inserted ${data.length} test notifications\n`);

    // 3. Verify insertion
    console.log('3️⃣ Verifying notifications...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('notifications')
      .select('type, is_read')
      .eq('user_id', TEST_USER_ID);

    if (verifyError) {
      console.error('Error verifying:', verifyError);
    } else {
      const summary = verifyData.reduce((acc, n) => {
        const category = n.type.split('_')[0]; // Extract category (news, initiative, diya)
        if (!acc[category]) acc[category] = { total: 0, unread: 0 };
        acc[category].total++;
        if (!n.is_read) acc[category].unread++;
        return acc;
      }, {});

      console.log('\n📊 Summary:');
      Object.entries(summary).forEach(([category, counts]) => {
        console.log(`   ${category}: ${counts.total} total (${counts.unread} unread)`);
      });

      const totalUnread = Object.values(summary).reduce((sum, c) => sum + c.unread, 0);
      console.log(`   Total Unread: ${totalUnread}\n`);
    }

    console.log('✅ Test notifications ready!\n');
    console.log('You can now run: node test_notifications.js\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

insertTestNotifications();
