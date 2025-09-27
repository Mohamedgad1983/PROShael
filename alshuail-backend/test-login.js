import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testLogin() {
  const email = 'admin@alshuail.com';
  const password = 'Admin123';

  console.log('Testing login for:', email);
  console.log('Password:', password);
  console.log('');

  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, password_hash, is_active')
    .eq('email', email)
    .single();

  if (error) {
    console.error('❌ User not found:', error.message);
    process.exit(1);
  }

  console.log('✅ User found');
  console.log('  Email:', user.email);
  console.log('  Active:', user.is_active);
  console.log('  Has password_hash:', !!user.password_hash);

  if (!user.password_hash) {
    console.error('❌ No password_hash set!');
    process.exit(1);
  }

  console.log('  Hash:', user.password_hash.substring(0, 20) + '...');
  console.log('');

  const match = await bcrypt.compare(password, user.password_hash);
  console.log('Password match:', match);

  if (!match) {
    console.error('❌ Password does NOT match!');
    process.exit(1);
  }

  console.log('✅ Login would succeed!');
  process.exit(0);
}

testLogin();