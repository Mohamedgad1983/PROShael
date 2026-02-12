import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createTestAdmin() {
  console.log('🔄 Creating test admin user for local development...');

  // Test admin details - matching the demo credentials shown in LoginPage.js
  const phone = '+96550123456';
  const password = '123456';
  const hashedPassword = await bcrypt.hash(password, 12);

  // First check if user already exists with this phone
  const { data: existingUser, error: checkError } = await supabase
    .from('users')
    .select('id, phone, email')
    .eq('phone', phone)
    .single();

  if (existingUser) {
    console.log('⚠️ User with this phone already exists');

    // Update the password for the existing user
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: hashedPassword,
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingUser.id);

    if (updateError) {
      console.error('❌ Error updating user:', updateError.message);
      process.exit(1);
    }

    console.log('✅ Updated existing admin user successfully!');
    console.log('Phone:', phone);
    console.log('Password:', password);
    console.log('You can now login with any role from the dropdown');
    process.exit(0);
  }

  // Create new user if doesn't exist
  const { data, error } = await supabase
    .from('users')
    .insert({
      phone: phone,
      email: `test.admin@alshuail.com`, // Optional email
      password_hash: hashedPassword,
      role: 'super_admin', // Default role, but can be overridden during login
      is_active: true,
      status: 'active',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating admin:', error.message);

    // If it's a unique constraint error, suggest updating instead
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      console.log('💡 Try running this script again to update the existing user');
    }
    process.exit(1);
  }

  console.log('✅ Test admin created successfully!');
  console.log('');
  console.log('=== LOGIN CREDENTIALS ===');
  console.log('Phone:', phone);
  console.log('Password:', password);
  console.log('');
  console.log('📝 Notes:');
  console.log('- You can select any role from the dropdown when logging in');
  console.log('- The role selection will determine your permissions');
  console.log('- This is for testing different role functionalities');

  process.exit(0);
}

createTestAdmin();