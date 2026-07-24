const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://oneiggrfzagqjbkdinin.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uZWlnZ3JmemFncWpia2RpbmluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDczNzkwMywiZXhwIjoyMDcwMzEzOTAzfQ.rBZIRsifsQiR3j5OgViWLjaBi_W8Jp0gD7HPf9fS5vI'
);

async function check() {
  const { data: members, error } = await supabase
    .from('members')
    .select('id, full_name, membership_number, current_balance, created_at')
    .in('membership_number', ['10345', '10346', '10347']);
  
  console.log('=== MEMBERS 10345, 10346, 10347 ===');
  if (error) { console.log('Error:', error.message); return; }
  console.log(JSON.stringify(members, null, 2));
  
  if (members && members.length > 0) {
    const memberIds = members.map(m => m.id);
    const { data: adj } = await supabase
      .from('balance_adjustments')
      .select('*')
      .in('member_id', memberIds);
    
    console.log('=== BALANCE ADJUSTMENTS ===');
    console.log(JSON.stringify(adj, null, 2));
  }
}
check();
