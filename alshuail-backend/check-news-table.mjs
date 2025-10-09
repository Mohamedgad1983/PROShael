// Script to check if news_announcements table exists in Supabase
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function checkNewsTable() {
    console.log('🔍 Checking news_announcements table...\n');

    try {
        // Try to query the table
        const { data, error, count } = await supabase
            .from('news_announcements')
            .select('*', { count: 'exact', head: false })
            .limit(1);

        if (error) {
            console.log('❌ Error querying news_announcements table:');
            console.log('   Error Code:', error.code);
            console.log('   Error Message:', error.message);
            console.log('   Error Details:', error.details);
            console.log('\n📋 Table likely does NOT exist or you don\'t have permissions.\n');
        } else {
            console.log('✅ news_announcements table EXISTS!\n');
            console.log(`📊 Total records: ${count || 0}\n`);

            if (data && data.length > 0) {
                console.log('📝 Sample record structure:');
                console.log(JSON.stringify(data[0], null, 2));
            } else {
                console.log('📝 Table is empty (no records yet)\n');
            }
        }

        // Also check what tables DO exist
        console.log('\n🔍 Checking all tables in database...\n');

        // Try a few known tables
        const tablesToCheck = ['users', 'members', 'payments', 'news_announcements', 'news', 'announcements'];

        for (const table of tablesToCheck) {
            const { error: testError } = await supabase
                .from(table)
                .select('id')
                .limit(1);

            if (!testError) {
                console.log(`✅ ${table} - EXISTS`);
            } else {
                console.log(`❌ ${table} - NOT FOUND (${testError.code})`);
            }
        }

    } catch (err) {
        console.log('❌ Unexpected error:', err.message);
    }
}

checkNewsTable();
