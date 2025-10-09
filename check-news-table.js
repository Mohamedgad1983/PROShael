// Script to check if news_announcements table exists in Supabase
require('dotenv').config({ path: './alshuail-backend/.env' });
const { createClient } = require('@supabase/supabase-js');

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

            // Try to list all available tables
            console.log('🔍 Attempting to list all available tables...\n');
            const { data: tables, error: tablesError } = await supabase
                .from('information_schema.tables')
                .select('table_name')
                .eq('table_schema', 'public');

            if (!tablesError && tables) {
                console.log('Available tables:');
                tables.forEach(t => console.log('  -', t.table_name));
            }
        } else {
            console.log('✅ news_announcements table EXISTS!\n');
            console.log(`📊 Total records: ${count || 0}\n`);

            if (data && data.length > 0) {
                console.log('📝 Sample record structure:');
                console.log(JSON.stringify(data[0], null, 2));
            } else {
                console.log('📝 Table is empty (no records yet)\n');

                // Try to get table structure by inserting and rolling back
                console.log('🔍 Fetching table columns...\n');
                const { error: structError } = await supabase
                    .from('news_announcements')
                    .select('*')
                    .limit(0);

                if (!structError) {
                    console.log('Table appears to be accessible but empty.');
                }
            }
        }
    } catch (err) {
        console.log('❌ Unexpected error:', err.message);
    }
}

checkNewsTable();
