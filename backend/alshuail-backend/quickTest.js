import { supabase } from './src/config/database.js';

async function quickTest() {
  try {
    console.log('Testing database connection...');

    // Test basic members table access
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('*')
      .limit(1);

    if (membersError) {
      console.error('Members table error:', membersError);
      return;
    }

    console.log('✅ Members table accessible');
    console.log('Sample member:', members?.[0] || 'No members found');

    // Test if new columns exist
    const { data: testColumns, error: columnsError } = await supabase
      .from('members')
      .select('profile_completed, social_security_beneficiary, whatsapp_number')
      .limit(1);

    if (columnsError) {
      console.error('New columns error:', columnsError);
      console.log('❌ New columns not found, need to run schema update manually');
      return;
    }

    console.log('✅ New columns accessible');

    // Test import batches table
    const { data: batches, error: batchesError } = await supabase
      .from('excel_import_batches')
      .select('*')
      .limit(1);

    if (batchesError) {
      console.error('Import batches error:', batchesError);
      return;
    }

    console.log('✅ Import batches table accessible');

    // Test registration tokens table
    const { data: tokens, error: tokensError } = await supabase
      .from('member_registration_tokens')
      .select('*')
      .limit(1);

    if (tokensError) {
      console.error('Registration tokens error:', tokensError);
      return;
    }

    console.log('✅ Registration tokens table accessible');
    console.log('🎉 All database tables are ready!');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

quickTest();