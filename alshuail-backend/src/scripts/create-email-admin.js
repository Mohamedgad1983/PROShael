import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createEmailAdmin() {
  try {
    // Admin credentials for email login
    const adminData = {
      email: 'admin@alshuail.com',
      phone: '+96550000001',
      fullName: 'مدير النظام',
      password: 'Admin123!',
      role: 'super_admin'
    };

    log.info('Creating Email-based Admin Account...\n');

    // Hash the password
    const hashedPassword = await bcrypt.hash(adminData.password, 12);

    // Check if user exists by email
    const { data: existingUser } = await supabase
      .from('members')
      .select('id')
      .eq('email', adminData.email)
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
        log.error('Update error:', error.message);
        return;
      }
      log.info('✅ Account updated successfully!\n');
    } else {
      // Create new user
      const { error } = await supabase
        .from('members')
        .insert([{
          email: adminData.email,
          phone: adminData.phone,
          full_name: adminData.fullName,
          password_hash: hashedPassword,
          role: adminData.role
        }]);

      if (error) {
        log.error('Creation error:', error.message);
        return;
      }
      log.info('✅ Account created successfully!\n');
    }

    log.info('====================================');
    log.info('🔐 ADMIN LOGIN CREDENTIALS');
    log.info('====================================');
    log.info('📧 Email: ' + adminData.email);
    log.info('🔑 Password: ' + adminData.password);
    log.info('👤 Name: ' + adminData.fullName);
    log.info('⚡ Role: ' + adminData.role);
    log.info('====================================');
    log.info('\n🌐 Login at: http://localhost:3002');
    log.info('====================================\n');

  } catch (error) {
    log.error('Error:', error);
  }
}

// Run immediately
createEmailAdmin();