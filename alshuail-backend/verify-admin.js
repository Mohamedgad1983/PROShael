import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function verify() {
  const { data } = await supabase
    .from('users')
    .select('email, password_hash')
    .eq('email', 'admin@alshuail.com')
    .single();

  console.log('Email:', data.email);
  console.log('Has password_hash:', !!data.password_hash);
  if (data.password_hash) {
    console.log('Hash length:', data.password_hash.length);
    console.log('Hash starts with:', data.password_hash.substring(0, 10));
  }
  process.exit(0);
}

verify();