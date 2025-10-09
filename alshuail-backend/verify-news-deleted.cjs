// Script to verify if news article was deleted
require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function verifyNewsDeleted() {
    const newsId = '85423278-9e3e-4752-a032-a0042e5e53fb';
    console.log(`🔍 Checking if news article ${newsId} still exists...\n`);

    try {
        // Check if the specific news article exists
        const { data, error } = await supabase
            .from('news_announcements')
            .select('*')
            .eq('id', newsId);

        if (error) {
            console.log('❌ Error querying news_announcements:', error.message);
            return;
        }

        if (data && data.length > 0) {
            console.log('❌ NEWS ARTICLE STILL EXISTS!');
            console.log('📝 Article details:');
            console.log(JSON.stringify(data[0], null, 2));
        } else {
            console.log('✅ NEWS ARTICLE WAS SUCCESSFULLY DELETED!');
            console.log('✅ No records found with ID:', newsId);
        }

        // Also check total count of all news
        const { data: allNews, error: countError, count } = await supabase
            .from('news_announcements')
            .select('*', { count: 'exact' });

        if (!countError) {
            console.log(`\n📊 Total news articles in database: ${count || 0}`);
            if (allNews && allNews.length > 0) {
                console.log('\n📝 All news articles:');
                allNews.forEach((news, index) => {
                    console.log(`${index + 1}. ${news.title_ar || news.title || 'Untitled'} (${news.id})`);
                });
            }
        }

    } catch (err) {
        console.log('❌ Unexpected error:', err.message);
    }
}

verifyNewsDeleted();
