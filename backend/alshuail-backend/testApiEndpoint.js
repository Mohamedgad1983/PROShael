import { supabase } from './src/config/database.js';

async function testAPIQueries() {
  try {
    console.log('🚀 Testing exact queries from API controllers...');

    // Test the exact query from occasions controller
    console.log('1. Testing occasions controller query...');

    const limit = 50;
    const offset = 0;

    let query = supabase
      .from('events')
      .select('*')
      .order('start_date', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: occasions, error, count } = await query;

    if (error) {
      console.log('❌ Occasions query error:', error.message);
      console.log('Error details:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Occasions query successful!');
      console.log('Found', occasions?.length || 0, 'occasions');

      if (occasions?.length > 0) {
        const enhancedOccasions = occasions.map(occasion => ({
          ...occasion,
          days_until_event: occasion.start_date ?
            Math.ceil((new Date(occasion.start_date) - new Date()) / (1000 * 60 * 60 * 24)) : null,
          attendance_rate: occasion.max_attendees && occasion.current_attendees ?
            Math.round((occasion.current_attendees / occasion.max_attendees) * 100) : 0,
          is_full: occasion.max_attendees ? (occasion.current_attendees || 0) >= occasion.max_attendees : false
        }));

        console.log('Enhanced first occasion:', JSON.stringify(enhancedOccasions[0], null, 2));
      }
    }

    // Test initiatives query
    console.log('2. Testing initiatives controller query...');

    const { data: initiatives, error: initError } = await supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false })
      .range(0, 49);

    if (initError) {
      console.log('❌ Initiatives query error:', initError.message);
    } else {
      console.log('✅ Initiatives query successful!');
      console.log('Found', initiatives?.length || 0, 'initiatives');
    }

    // Test notifications query
    console.log('3. Testing notifications controller query...');

    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .range(0, 49);

    if (notifError) {
      console.log('❌ Notifications query error:', notifError.message);
    } else {
      console.log('✅ Notifications query successful!');
      console.log('Found', notifications?.length || 0, 'notifications');
    }

    console.log('✅ API query testing completed!');

  } catch (error) {
    console.error('❌ Error in API query testing:', error.message);
  }
}

testAPIQueries().then(() => process.exit(0));