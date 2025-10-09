import axios from 'axios';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const API_URL = 'http://localhost:3001/api';
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function testPushNotification() {
    console.log('🧪 Testing Push Notification Feature\n');
    console.log('═══════════════════════════════════════\n');

    try {
        // Step 1: Login as admin
        console.log('📝 Step 1: Login as admin...');
        const loginResponse = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@alshuail.com',
            password: 'admin123'
        });

        const token = loginResponse.data.token;
        console.log('✅ Login successful\n');

        // Step 2: Create a test news article
        console.log('📝 Step 2: Creating test news article...');
        const createResponse = await axios.post(
            `${API_URL}/news`,
            {
                title_ar: 'إشعار اختبار - اجتماع عائلي مهم',
                content_ar: 'يسر عائلة الشعيل دعوتكم لحضور الاجتماع العائلي السنوي يوم الجمعة القادم الساعة 7 مساءً في المقر الرئيسي.',
                category: 'announcement',
                priority: 'high',
                is_published: true
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const newsId = createResponse.data.news.id;
        console.log(`✅ News created with ID: ${newsId}\n`);

        // Step 3: Get member count
        console.log('📝 Step 3: Checking member count...');
        const { data: members } = await supabase
            .from('users')
            .select('id, email', { count: 'exact' })
            .eq('role', 'member');

        console.log(`✅ Found ${members?.length || 0} members in database\n`);

        // Step 4: Send push notification
        console.log('📝 Step 4: Sending push notification to all members...');
        const pushResponse = await axios.post(
            `${API_URL}/news/${newsId}/push-notification`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log('✅ Push notification sent successfully!');
        console.log(`\n📊 Results:`);
        console.log(`   Message: ${pushResponse.data.message}`);
        console.log(`   Recipients: ${pushResponse.data.recipient_count}`);
        console.log(`   Devices: ${pushResponse.data.devices_sent || 0}\n`);

        // Step 5: Verify notifications were created
        console.log('📝 Step 5: Verifying notifications in database...');
        const { data: notifications, count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact' })
            .eq('related_id', newsId)
            .eq('type', 'news');

        console.log(`✅ Found ${count} notifications in database`);
        if (notifications && notifications.length > 0) {
            console.log(`\n📋 Sample notification:`);
            console.log(`   Title: ${notifications[0].title_ar}`);
            console.log(`   Message: ${notifications[0].message_ar}`);
            console.log(`   Icon: ${notifications[0].icon}`);
            console.log(`   Action URL: ${notifications[0].action_url}`);
        }

        // Step 6: Clean up - delete the test news
        console.log(`\n📝 Step 6: Cleaning up test data...`);
        await axios.delete(`${API_URL}/news/${newsId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Test news deleted\n');

        console.log('═══════════════════════════════════════');
        console.log('✅ All tests passed successfully!');
        console.log('═══════════════════════════════════════\n');

    } catch (error) {
        console.error('\n❌ Test failed:', error.response?.data || error.message);
        console.error('\nFull error:', error);
    }
}

testPushNotification();
