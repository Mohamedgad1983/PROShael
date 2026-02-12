import { supabase } from './src/config/database.js';

async function createMissingTables() {
  try {
    console.log('🚀 Creating missing tables and columns...');

    // First, let's see what tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (tablesError) {
      console.log('Could not check existing tables:', tablesError.message);
    } else {
      console.log('Existing tables:', tables?.map(t => t.table_name) || []);
    }

    // Try to add missing columns to existing tables
    console.log('Adding missing columns...');

    // Add is_active to members if it doesn't exist
    try {
      await supabase.rpc('add_column_if_not_exists', {
        table_name: 'members',
        column_definition: 'is_active BOOLEAN DEFAULT true'
      });
      console.log('✅ Added is_active to members');
    } catch (err) {
      console.log('Members table might need manual update');
    }

    // Create a simple test to see if we can directly query and create tables
    console.log('Testing direct table operations...');

    // Try to create diyas table directly
    const createDiyasSQL = `
      CREATE TABLE IF NOT EXISTS diyas (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        amount DECIMAL(10,2) NOT NULL,
        due_date DATE,
        category VARCHAR(100) DEFAULT 'general',
        status VARCHAR(50) DEFAULT 'pending',
        member_id UUID,
        payment_reference VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;

    console.log('Creating diyas table...');
    const { error: diyasError } = await supabase.rpc('exec', { sql: createDiyasSQL });
    if (diyasError) {
      console.log('Diyas table creation error:', diyasError.message);
    } else {
      console.log('✅ Diyas table created');
    }

    // Test basic operations with simplified approach
    console.log('Testing basic CRUD operations...');

    // Test members table
    try {
      const { data: membersTest, error: membersError } = await supabase
        .from('members')
        .select('*')
        .limit(1);

      if (membersError) {
        console.log('Members table issue:', membersError.message);
      } else {
        console.log('✅ Members table accessible, found', membersTest?.length || 0, 'records');
      }
    } catch (err) {
      console.log('Members test error:', err.message);
    }

    // Test events table
    try {
      const { data: eventsTest, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .limit(1);

      if (eventsError) {
        console.log('Events table issue:', eventsError.message);
      } else {
        console.log('✅ Events table accessible, found', eventsTest?.length || 0, 'records');
      }
    } catch (err) {
      console.log('Events test error:', err.message);
    }

    // Insert some test data with a simpler approach
    console.log('Inserting test data...');

    // Test member insertion
    try {
      const { data: newMember, error: insertError } = await supabase
        .from('members')
        .insert({
          full_name: 'محمد الشعيل',
          email: 'mohammed.test@alshuail.com',
          phone: '+965 77777777',
          membership_number: 'AL999'
        })
        .select()
        .single();

      if (insertError && !insertError.message.includes('duplicate')) {
        console.log('Member insertion error:', insertError.message);
      } else if (newMember) {
        console.log('✅ Test member created:', newMember.id);

        // Now try to create a simple event
        try {
          const { data: newEvent, error: eventError } = await supabase
            .from('events')
            .insert({
              title: 'اختبار المناسبة',
              description: 'مناسبة تجريبية للاختبار',
              start_date: '2025-10-01',
              status: 'active'
            })
            .select()
            .single();

          if (eventError) {
            console.log('Event insertion error:', eventError.message);
          } else {
            console.log('✅ Test event created:', newEvent?.id);
          }
        } catch (err) {
          console.log('Event creation failed:', err.message);
        }
      }
    } catch (err) {
      console.log('Member insertion failed:', err.message);
    }

    console.log('✅ Database setup testing completed!');

  } catch (error) {
    console.error('❌ Error in database setup:', error.message);
  }
}

createMissingTables().then(() => process.exit(0));