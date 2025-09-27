import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function addPasswordColumn() {
  console.log('Adding password_hash column to users table...\n');

  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_hash TEXT;

      COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password for admin authentication';
    `
  });

  if (error) {
    console.error('❌ Error:', error.message);
    console.log('\nAlternative: Run this SQL directly in Supabase SQL Editor:');
    console.log('---');
    console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;');
    console.log('---');
    process.exit(1);
  }

  console.log('✅ password_hash column added successfully!');
  process.exit(0);
}

addPasswordColumn();