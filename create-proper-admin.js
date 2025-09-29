import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

dotenv.config({ path: './alshuail-backend/.env' });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createProperAdmin() {
  try {
    // Default super admin credentials
    const adminData = {
      email: 'admin@alshuail.com',
      phone: '0550000001',
      fullName: 'مدير النظام',
      password: 'Admin123!',
      role: 'super_admin'
    };

    console.log('Creating Super Admin Account in users table...\n');

    // Hash the password
    const hashedPassword = await bcrypt.hash(adminData.password, 12);

    // Check if user exists by phone OR email
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .or(`phone.eq.${adminData.phone},email.eq.${adminData.email}`)
      .single();

    if (existingUser) {
      // Update existing user
      const { error } = await supabase
        .from('users')
        .update({
          phone: adminData.phone,
          email: adminData.email,
          password_hash: hashedPassword,
          role: adminData.role,
          is_active: true
        })
        .eq('id', existingUser.id);

      if (error) {
        console.error('Update error:', error.message);
        return;
      }
      console.log('✅ Account updated successfully!\n');
    } else {
      // Create new user
      const { error } = await supabase
        .from('users')
        .insert([{
          phone: adminData.phone,
          email: adminData.email,
          password_hash: hashedPassword,
          role: adminData.role,
          is_active: true
        }]);

      if (error) {
        console.error('Creation error:', error.message);
        return;
      }
      console.log('✅ Account created successfully!\n');
    }

    console.log('====================================');
    console.log('🔐 SUPER ADMIN LOGIN CREDENTIALS');
    console.log('====================================');
    console.log('📧 Email: ' + adminData.email);
    console.log('📱 Phone: ' + adminData.phone);
    console.log('🔑 Password: ' + adminData.password);
    console.log('👤 Name: ' + adminData.fullName);
    console.log('⚡ Role: ' + adminData.role);
    console.log('====================================');
    console.log('\n🌐 Login at: http://localhost:3002');
    console.log('====================================\n');

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run immediately
createProperAdmin();