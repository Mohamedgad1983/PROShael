// Enable Password Change Requirement for Test User
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://fqbhypzbjmqwhxqtrwnm.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxYmh5cHpiam1xd2h4cXRyd25tIiwicm9sZSI6InNlcnZpY2UiLCJpYXQiOjE3MzQ3MDQxNDIsImV4cCI6MjA1MDI4MDE0Mn0.Px3tjCKMVNMSQbOd4qiH5PKg7IvN6d_MZIqxXN5oHlw'
);

async function enablePasswordChange() {
  console.log('🔄 Enabling password change requirement for test user...');

  const { data, error } = await supabase
    .from('members')
    .update({
      requires_password_change: true,
      is_first_login: true
    })
    .eq('phone', '0555555555')
    .select('full_name, phone, requires_password_change, is_first_login');

  if (error) {
    console.error('❌ Error:', error.message);
    return false;
  }

  console.log('✅ Updated member:', data[0]);
  return true;
}

enablePasswordChange().then(success => {
  process.exit(success ? 0 : 1);
});