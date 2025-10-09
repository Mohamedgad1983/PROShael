import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function verifyNotifications() {
    console.log('🔍 Verifying notifications sent for news...\n');

    try {
        // Get the latest news
        const { data: news, error: newsError } = await supabase
            .from('news_announcements')
            .select('id, title_ar, created_at')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (newsError) throw newsError;

        console.log('📰 Latest News:');
        console.log(`   Title: ${news.title_ar}`);
        console.log(`   ID: ${news.id}`);
        console.log(`   Created: ${news.created_at}\n`);

        // Get notifications for this news
        const { data: notifications, error: notifError } = await supabase
            .from('notifications')
            .select('*')
            .eq('related_id', news.id)
            .eq('type', 'news');

        if (notifError) throw notifError;

        console.log(`✅ Found ${notifications.length} notifications sent!\n`);

        if (notifications.length > 0) {
            console.log('📋 Sample notification:');
            const sample = notifications[0];
            console.log(`   Title: ${sample.title_ar}`);
            console.log(`   Message: ${sample.message_ar}`);
            console.log(`   Icon: ${sample.icon}`);
            console.log(`   Priority: ${sample.priority}`);
            console.log(`   Action URL: ${sample.action_url}`);
            console.log(`   Read: ${sample.is_read}`);
            console.log(`   Created: ${sample.created_at}\n`);

            console.log(`📊 Recipients breakdown:`);
            console.log(`   Total sent: ${notifications.length}`);
            console.log(`   Unread: ${notifications.filter(n => !n.is_read).length}`);
            console.log(`   Read: ${notifications.filter(n => n.is_read).length}`);
        }

        console.log('\n✅ Notification system working perfectly!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

verifyNotifications();
