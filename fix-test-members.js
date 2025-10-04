require('dotenv').config({ path: './alshuail-backend/.env' });
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function setupTestMembers() {
  console.log('Setting up test members with password 123456...\n');

  const testMembers = [
    {
      phone: '0555555555',
      full_name: 'سارة الشعيل',
      membership_number: 'SH002',
      balance: 3500,
      minimum_balance: 3000
    },
    {
      phone: '0599000001',
      full_name: 'أحمد محمد الشعيل',
      membership_number: 'SH001',
      balance: 2500,
      minimum_balance: 3000
    },
    {
      phone: '0512345678',
      full_name: 'خالد عبدالله',
      membership_number: 'SH003',
      balance: 1800,
      minimum_balance: 3000
    }
  ];

  const tempPassword = '123456';
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  for (const member of testMembers) {
    try {
      // First check if member exists
      const { data: existing } = await supabase
        .from('members')
        .select('id, phone, full_name')
        .eq('phone', member.phone)
        .single();

      if (existing) {
        // Update existing member
        const { error } = await supabase
          .from('members')
          .update({
            temp_password: tempPassword,
            password_hash: null, // Clear password_hash to allow first-time login with temp_password
            membership_status: 'active'
          })
          .eq('phone', member.phone);

        if (error) {
          console.log(`Error updating ${member.phone}:`, error.message);
        } else {
          console.log(`✅ Updated ${member.full_name} (${member.phone}) - Password: 123456`);
        }
      } else {
        // Insert new member
        const { error } = await supabase
          .from('members')
          .insert({
            ...member,
            temp_password: tempPassword,
            password_hash: null,
            membership_status: 'active',
            created_at: new Date().toISOString()
          });

        if (error) {
          console.log(`Error creating ${member.phone}:`, error.message);
        } else {
          console.log(`✅ Created ${member.full_name} (${member.phone}) - Password: 123456`);
        }
      }
    } catch (error) {
      console.log(`Error processing ${member.phone}:`, error.message);
    }
  }

  console.log('\n📱 Test Members Ready:');
  console.log('Phone: 0555555555, Password: 123456');
  console.log('Phone: 0599000001, Password: 123456');
  console.log('Phone: 0512345678, Password: 123456');
}

setupTestMembers().catch(console.error);