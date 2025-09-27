import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createQuickAdmin() {
  try {
    // Default super admin credentials
    const adminData = {
      phone: '+96550000001',
      fullName: 'مدير النظام',
      password: 'Admin123!',
      role: 'super_admin'
    };

    console.log('Creating Super Admin Account...\n');

    // Hash the password
    const hashedPassword = await bcrypt.hash(adminData.password, 12);

    // Check if user exists by phone OR email
    const { data: existingUser } = await supabase
      .from('members')
      .select('id')
      .or(`phone.eq.${adminData.phone},email.eq.admin@alshuail.com`)
      .single();

    if (existingUser) {
      // Update existing user
      const { error } = await supabase
        .from('members')
        .update({
          phone: adminData.phone,
          full_name: adminData.fullName,
          password_hash: hashedPassword,
          role: adminData.role
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
        .from('members')
        .insert([{
          phone: adminData.phone,
          email: 'admin@alshuail.com',
          full_name: adminData.fullName,
          password_hash: hashedPassword,
          role: adminData.role
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
createQuickAdmin();