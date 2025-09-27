import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createAdmin() {
  try {
    const hashedPassword = await bcrypt.hash('Admin123456', 12);

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'admin@alshuail.com')
      .single();

    if (existing) {
      const { error } = await supabase
        .from('users')
        .update({
          password_hash: hashedPassword,
          role: 'super_admin',
          is_active: true
        })
        .eq('id', existing.id);

      if (error) throw error;
      console.log('✅ Admin updated in users table');
    } else {
      const { error } = await supabase
        .from('users')
        .insert([{
          email: 'admin@alshuail.com',
          phone: '+96550000001',
          password_hash: hashedPassword,
          role: 'super_admin',
          is_active: true
        }]);

      if (error) throw error;
      console.log('✅ Admin created in users table');
    }

    console.log('\n📧 Email: admin@alshuail.com');
    console.log('🔑 Password: Admin123456');
    console.log('🌐 Login at: http://localhost:3002\n');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

createAdmin();