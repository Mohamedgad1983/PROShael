import { supabase } from './src/config/database.js';

async function createTestEvent() {
  try {
    // First check what status values are allowed
    console.log('Creating test event...');

    // Get a member ID first
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id')
      .limit(1);

    if (membersError || !members?.length) {
      console.log('No members found:', membersError?.message);
      return;
    }

    const memberId = members[0].id;
    console.log('Using member ID:', memberId);

    // Try different status values to see what works
    const statusOptions = ['active', 'pending', 'completed', 'cancelled'];

    for (const status of statusOptions) {
      try {
        const { data: newEvent, error: eventError } = await supabase
          .from('events')
          .insert({
            title: `اختبار المناسبة - ${status}`,
            description: `مناسبة تجريبية للاختبار بحالة ${status}`,
            start_date: '2025-10-01',
            status: status,
            organizer: memberId
          })
          .select()
          .single();

        if (eventError) {
          console.log(`Status '${status}' failed:`, eventError.message);
        } else {
          console.log(`✅ Event created with status '${status}':`, newEvent.id);
          break; // Success, stop trying
        }
      } catch (err) {
        console.log(`Status '${status}' error:`, err.message);
      }
    }

    // Now test the API endpoint
    console.log('Testing occasions API endpoint...');

  } catch (error) {
    console.error('❌ Error creating test event:', error.message);
  }
}

createTestEvent().then(() => process.exit(0));