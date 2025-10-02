import { supabaseAdmin } from '../alshuail-backend/src/config/supabase.js';

async function checkSchema() {
  // Try to get from backup table
  const { data: sample, error } = await supabaseAdmin
    .from('members_backup_20250928_1039')
    .select('*')
    .limit(1)
    .single();

  if (!error && sample) {
    console.log('\nMembers table columns (from backup):');
    console.log(JSON.stringify(Object.keys(sample), null, 2));
    console.log('\nSample member data:');
    console.log(JSON.stringify(sample, null, 2));
  } else {
    console.log('Error:', error);
  }
}

checkSchema();
