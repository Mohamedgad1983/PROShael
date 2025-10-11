import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import _fs from 'fs';
import { log } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  log.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addMemberColumns() {
  try {
    log.info('🔄 Starting to add missing columns to members table...\n');

    // SQL commands to add columns
    const sqlCommands = [
      "ALTER TABLE members ADD COLUMN IF NOT EXISTS gender VARCHAR(20)",
      "ALTER TABLE members ADD COLUMN IF NOT EXISTS tribal_section VARCHAR(100)",
      "ALTER TABLE members ADD COLUMN IF NOT EXISTS national_id VARCHAR(50)",
      "ALTER TABLE members ADD COLUMN IF NOT EXISTS date_of_birth DATE",
      "ALTER TABLE members ADD COLUMN IF NOT EXISTS city VARCHAR(100)",
      "ALTER TABLE members ADD COLUMN IF NOT EXISTS district VARCHAR(100)",
      "ALTER TABLE members ADD COLUMN IF NOT EXISTS address TEXT",
      "ALTER TABLE members ADD COLUMN IF NOT EXISTS occupation VARCHAR(100)",
      "ALTER TABLE members ADD COLUMN IF NOT EXISTS employer VARCHAR(100)",
      "ALTER TABLE members ADD COLUMN IF NOT EXISTS nationality VARCHAR(50) DEFAULT 'سعودي'",
      "ALTER TABLE members ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false",
      "ALTER TABLE members ADD COLUMN IF NOT EXISTS membership_status VARCHAR(20) DEFAULT 'active'",
      "ALTER TABLE members ADD COLUMN IF NOT EXISTS membership_date DATE",
      "ALTER TABLE members ADD COLUMN IF NOT EXISTS membership_type VARCHAR(50) DEFAULT 'regular'",
      "ALTER TABLE members ADD COLUMN IF NOT EXISTS notes TEXT",
      "ALTER TABLE members ADD COLUMN IF NOT EXISTS password VARCHAR(255)"
    ];

    // Execute each command
    for (const sql of sqlCommands) {
      log.info(`Executing: ${sql.substring(0, 50)}...`);
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(err => {
        // If RPC doesn't exist, we'll note it
        log.info(`⚠️ Note: RPC function might not exist. Column may already exist or need manual addition.`);
        return { error: err };
      });

      if (error && !error.message?.includes('already exists')) {
        log.info(`⚠️ Warning: ${error.message}`);
      } else {
        log.info(`✅ Success`);
      }
    }

    // Check current columns
    log.info('\n📊 Checking current members table structure...\n');

    const { data: members, error: _queryError } = await supabase
      .from('members')
      .select('*')
      .limit(1);

    if (!_queryError && members && members.length > 0) {
      const columns = Object.keys(members[0]);
      log.info('Current columns in members table:');
      columns.forEach(col => {
        log.info(`  - ${col}`);
      });

      // Check for our specific columns
      const requiredColumns = ['gender', 'tribal_section', 'national_id', 'city', 'district', 'address', 'occupation', 'employer'];
      const missingColumns = requiredColumns.filter(col => !columns.includes(col));

      if (missingColumns.length > 0) {
        log.info('\n❗ Missing columns that need to be added manually in Supabase Dashboard:');
        missingColumns.forEach(col => {
          log.info(`  - ${col}`);
        });
        log.info('\n📝 To add these columns manually:');
        log.info('1. Go to your Supabase Dashboard');
        log.info('2. Navigate to Table Editor > members table');
        log.info('3. Click "Add column" and add each missing column');
        log.info('4. Use VARCHAR(100) for text fields, DATE for date_of_birth');
      } else {
        log.info('\n✅ All required columns are present!');
      }
    }

    log.info('\n✨ Process completed!');

  } catch (error) {
    log.error('❌ Error:', error);
  }
}

// Run the script
addMemberColumns();