import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function addIsPublishedColumn() {
  console.log('🔄 Adding is_published column to news_announcements table...\n');

  const sql = `
    -- Add is_published column
    ALTER TABLE news_announcements
    ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

    -- Update existing records
    UPDATE news_announcements
    SET is_published = (published_at IS NOT NULL)
    WHERE is_published IS NULL;

    -- Add index
    CREATE INDEX IF NOT EXISTS idx_news_is_published
    ON news_announcements(is_published);
  `;

  try {
    // Use the Supabase REST API to execute raw SQL
    const { data, error } = await supabase.rpc('exec', { sql });

    if (error) {
      console.log('⚠️  Direct RPC execution not available.');
      console.log('📝 Please run this SQL manually in Supabase SQL Editor:\n');
      console.log(sql);
      console.log('\n💡 Steps:');
      console.log('1. Go to https://supabase.com/dashboard');
      console.log('2. Select your project');
      console.log('3. Go to SQL Editor');
      console.log('4. Paste the SQL above');
      console.log('5. Click RUN\n');
      return;
    }

    console.log('✅ Column added successfully!');
    console.log(data);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📝 Please add the column manually using Supabase SQL Editor');
    console.log('See SUPABASE_SCHEMA_FIX.md for instructions');
  }
}

addIsPublishedColumn();
