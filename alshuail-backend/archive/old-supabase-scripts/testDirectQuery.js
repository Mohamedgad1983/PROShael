import { supabase } from './src/config/database.js';

async function testDirectQuery() {
  try {
    console.log('Testing direct Supabase queries...');

    // Test simple events query
    console.log('1. Testing simple events query...');
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .limit(5);

    if (eventsError) {
      console.log('Events query error:', eventsError.message);
    } else {
      console.log('✅ Events found:', events?.length || 0);
      if (events?.length > 0) {
        console.log('First event:', JSON.stringify(events[0], null, 2));
      }
    }

    // Test simple members query
    console.log('2. Testing simple members query...');
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('*')
      .limit(5);

    if (membersError) {
      console.log('Members query error:', membersError.message);
    } else {
      console.log('✅ Members found:', members?.length || 0);
    }

    // Test events with specific columns only
    console.log('3. Testing events with specific columns...');
    const { data: specificEvents, error: specificError } = await supabase
      .from('events')
      .select('id, title, description, start_date, status')
      .limit(5);

    if (specificError) {
      console.log('Specific events query error:', specificError.message);
    } else {
      console.log('✅ Specific events found:', specificEvents?.length || 0);
    }

    // Test with order by
    console.log('4. Testing events with order by...');
    const { data: orderedEvents, error: orderError } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);

    if (orderError) {
      console.log('Ordered events query error:', orderError.message);
    } else {
      console.log('✅ Ordered events found:', orderedEvents?.length || 0);
    }

    // Test activities table
    console.log('5. Testing activities table...');
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('*')
      .limit(3);

    if (activitiesError) {
      console.log('Activities query error:', activitiesError.message);
    } else {
      console.log('✅ Activities found:', activities?.length || 0);
    }

    // Test notifications
    console.log('6. Testing notifications table...');
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('*')
      .limit(3);

    if (notificationsError) {
      console.log('Notifications query error:', notificationsError.message);
    } else {
      console.log('✅ Notifications found:', notifications?.length || 0);
    }

    // Test diyas table
    console.log('7. Testing diyas table...');
    const { data: diyas, error: diyasError } = await supabase
      .from('diyas')
      .select('*')
      .limit(3);

    if (diyasError) {
      console.log('Diyas query error:', diyasError.message);
    } else {
      console.log('✅ Diyas found:', diyas?.length || 0);
    }

    console.log('✅ Direct query testing completed!');

  } catch (error) {
    console.error('❌ Error in direct query testing:', error.message);
  }
}

testDirectQuery().then(() => process.exit(0));