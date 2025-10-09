import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function checkNotificationsSchema() {
    console.log('🔍 Checking notifications table schema...\n');

    try {
        // Try to select from notifications table
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .limit(1);

        if (error) {
            console.log('❌ Error:', error.message);
            console.log('\n💡 Table might not exist or schema issue\n');
            return;
        }

        console.log('✅ Notifications table exists!');
        if (data && data.length > 0) {
            console.log('\n📋 Sample notification:');
            console.log(JSON.stringify(data[0], null, 2));
        } else {
            console.log('\n📋 Table is empty (no notifications yet)');
        }

        // Get all members count
        const { data: members, error: memberError } = await supabase
            .from('users')
            .select('id, email, phone', { count: 'exact' })
            .eq('role', 'member');

        if (!memberError && members) {
            console.log(`\n👥 Total members who will receive notifications: ${members.length}`);
        }

    } catch (err) {
        console.log('❌ Unexpected error:', err.message);
    }
}

checkNotificationsSchema();
