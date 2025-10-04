// Check if test member exists in database
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://fqbhypzbjmqwhxqtrwnm.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxYmh5cHpiam1xd2h4cXRyd25tIiwicm9sZSI6InNlcnZpY2UiLCJpYXQiOjE3MzQ3MDQxNDIsImV4cCI6MjA1MDI4MDE0Mn0.Px3tjCKMVNMSQbOd4qiH5PKg7IvN6d_MZIqxXN5oHlw'
);

async function checkMember() {
  console.log('🔍 Checking for test member in database...');

  // Check by phone number
  const { data: memberByPhone, error: phoneError } = await supabase
    .from('members')
    .select('id, full_name, phone, membership_status, balance')
    .eq('phone', '0555555555')
    .single();

  if (memberByPhone) {
    console.log('✅ Member found by phone:', memberByPhone);
  } else {
    console.log('❌ Member not found by phone 0555555555');
  }

  // Check by the test ID we've been using
  const testId = '147b3021-a6a3-4cd7-af2c-67ad11734aa0';
  const { data: memberById, error: idError } = await supabase
    .from('members')
    .select('id, full_name, phone, membership_status, balance')
    .eq('id', testId)
    .single();

  if (memberById) {
    console.log('✅ Member found by ID:', memberById);
  } else {
    console.log('❌ Member not found by ID:', testId);

    // If not found, create the member
    console.log('\n🔄 Creating test member...');
    const { data: newMember, error: createError } = await supabase
      .from('members')
      .update({
        membership_status: 'active',
        balance: 5000
      })
      .eq('phone', '0555555555')
      .select('id, full_name, phone, membership_status, balance');

    if (createError) {
      console.error('❌ Error updating member:', createError);
    } else {
      console.log('✅ Member updated:', newMember);
    }
  }
}

checkMember().then(() => process.exit(0));