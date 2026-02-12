import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createAdmin() {
  const email = 'admin@alshuail.com';
  const password = 'Admin123';
  const hashedPassword = await bcrypt.hash(password, 12);

  const { data, error } = await supabase
    .from('users')
    .insert({
      email: email,
      password_hash: hashedPassword,
      full_name: 'المسؤول العام',
      is_active: true,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log('✅ Admin created successfully!');
  console.log('Email:', email);
  console.log('Password: Admin123');
  process.exit(0);
}

createAdmin();