import { supabaseAdmin } from '../alshuail-backend/src/config/supabase.js';

async function copyMembers() {
  console.log('Copying members to temp_members...');

  const { data: members, error: fetchError } = await supabaseAdmin
    .from('members')
    .select('id, email, full_name, phone, membership_number');

  if (fetchError) {
    console.error('Error fetching members:', fetchError);
    return;
  }

  console.log(`Found ${members.length} members to copy`);

  const {  data, error } = await supabaseAdmin
    .from('temp_members')
    .insert(members);

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log(`✓ Copied ${members.length} members to temp_members`);
  }
}

copyMembers();
