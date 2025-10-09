import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Supabase configuration - using service key for table creation
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

log.info('🔨 Creating Tables in Supabase');
log.info('===============================\n');

async function createTables() {
  try {
    // Create members table
    log.info('Creating members table...');
    const { error: membersError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS members (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          member_id VARCHAR(50) UNIQUE NOT NULL,
          full_name VARCHAR(255) NOT NULL,
          phone VARCHAR(20) NOT NULL,
          whatsapp VARCHAR(20),
          email VARCHAR(255),
          address TEXT,
          join_date DATE DEFAULT CURRENT_DATE,
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (membersError) {
      // Try alternative approach
      log.info('Using direct table creation...');
    }

    // Create payments table
    log.info('Creating payments table...');
    const { error: paymentsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS payments (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          member_id VARCHAR(50) NOT NULL,
          year INTEGER NOT NULL,
          amount DECIMAL(10,2) NOT NULL DEFAULT 0,
          payment_date DATE,
          payment_method VARCHAR(50),
          receipt_number VARCHAR(100),
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(member_id, year)
        );
      `
    });

    // Create member_balances table
    log.info('Creating member_balances table...');
    const { error: balancesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS member_balances (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          member_id VARCHAR(50) UNIQUE NOT NULL,
          total_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
          status VARCHAR(20) NOT NULL,
          minimum_required DECIMAL(10,2) DEFAULT 3000,
          shortfall DECIMAL(10,2) DEFAULT 0,
          last_payment_date DATE,
          last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    log.info('\n✅ Tables creation attempted!');
    log.info('\n📝 Please go to your Supabase Dashboard and:');
    log.info('1. Open SQL Editor');
    log.info('2. Copy the SQL from: supabase-setup.sql');
    log.info('3. Run it manually');
    log.info('\nThis will ensure all tables, indexes, and views are created properly.');

  } catch (error) {
    log.error('Error:', error.message);
    log.info('\n⚠️ Automatic table creation failed.');
    log.info('Please create tables manually in Supabase SQL Editor.');
  }
}

// Run the script
createTables();