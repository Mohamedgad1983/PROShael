import { supabase } from './src/config/database.js';
import bcrypt from 'bcryptjs';

async function resetAdminPassword() {
  try {
    // New password
    const newPassword = '123456';
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update admin password
    const { data, error } = await supabase
      .from('users')
      .update({
        password_hash: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('email', 'admin@alshuail.com')
      .select()
      .single();

    if (error) {
      console.error('Error updating password:', error);
      return;
    }

    console.log('✅ Password updated successfully!');
    console.log('📧 Email: admin@alshuail.com');
    console.log('🔑 New Password: 123456');
    console.log('\nYou can now login with these credentials.');

  } catch (error) {
    console.error('Error:', error);
  }

  process.exit(0);
}

resetAdminPassword();