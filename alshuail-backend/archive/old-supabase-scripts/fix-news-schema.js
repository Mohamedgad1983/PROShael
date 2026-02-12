import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixNewsSchema() {
  console.log('🔄 Fixing news_announcements schema...');

  try {
    // Add is_published column
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE news_announcements
        ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

        UPDATE news_announcements
        SET is_published = true
        WHERE published_at IS NOT NULL AND is_published IS NULL;
      `
    });

    if (error) {
      // Try alternative approach using direct SQL
      console.log('⚠️ RPC method not available, using direct query...');

      const { error: alterError } = await supabase
        .from('news_announcements')
        .select('id')
        .limit(1);

      if (alterError) {
        console.error('❌ Error:', alterError.message);
        console.log('\n📝 Please run this SQL manually in Supabase SQL Editor:');
        console.log('\nALTER TABLE news_announcements');
        console.log('ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;');
        console.log('\nUPDATE news_announcements');
        console.log('SET is_published = true');
        console.log('WHERE published_at IS NOT NULL;');
        process.exit(1);
      }
    }

    console.log('✅ Schema fix completed successfully!');
    console.log('\n📋 The news_announcements table now has the is_published column.');

  } catch (error) {
    console.error('❌ Error fixing schema:', error);
    console.log('\n📝 Please run the SQL script manually:');
    console.log('File: add-is-published-column.sql');
    process.exit(1);
  }
}

fixNewsSchema();