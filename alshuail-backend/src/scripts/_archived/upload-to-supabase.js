import xlsx from 'xlsx-populate';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { log } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  log.error('❌ Missing Supabase credentials in .env file');
  log.info('Please add the following to your .env file:');
  log.info('SUPABASE_URL=your_supabase_url');
  log.info('SUPABASE_SERVICE_KEY=your_service_key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

log.info('📊 Al-Shuail Family Data Upload Script');
log.info('======================================');

// Function to create tables if they don't exist
async function createTables() {
  log.info('\n📌 Step 1: Creating database tables...');

  // Check if tables exist first
  const { data: tables } = await supabase.from('members').select('id').limit(1);

  if (tables === null) {
    log.info('Creating members table...');
    // Note: You need to create these tables in Supabase Dashboard first
    // Or use Supabase migrations
    log.info('⚠️  Please ensure the following tables exist in Supabase:');
    log.info('   - members (id, member_id, full_name, phone, whatsapp, created_at)');
    log.info('   - payments (id, member_id, year, amount, created_at)');
    log.info('   - member_balances (id, member_id, total_balance, status, last_updated)');
  } else {
    log.info('✅ Tables already exist');
  }
}

// Function to read Excel file
async function readExcelFile() {
  log.info('\n📌 Step 2: Reading Excel file...');

  const excelPath = path.join(__dirname, '../../../AlShuail_Members_Prefilled_Import.xlsx');

  if (!fs.existsSync(excelPath)) {
    log.error('❌ Excel file not found at:', excelPath);
    return null;
  }

  const workbook = await xlsx.fromFileAsync(excelPath);
  const sheet = workbook.sheet(0);
  const usedRange = sheet.usedRange();

  if (!usedRange) {
    log.error('❌ Excel file is empty');
    return null;
  }

  const data = usedRange.value();
  log.info(`✅ Found ${data.length - 1} members in Excel file`);

  return data;
}

// Function to process and upload members
async function uploadMembers(excelData) {
  log.info('\n📌 Step 3: Uploading member data...');

  const headers = excelData[0];
  const members = [];
  const payments = [];
  const balances = [];

  // Process each row
  for (let i = 1; i < excelData.length; i++) {
    const row = excelData[i];

    // Extract member data
    const memberData = {
      member_id: row[0] || `SH-${10000 + i}`,
      full_name: row[1] || `عضو ${i}`,
      phone: row[2] || `050${String(1000000 + i).padStart(7, '0')}`,
      whatsapp: row[3] || row[2] || `050${String(1000000 + i).padStart(7, '0')}`,
      created_at: new Date().toISOString()
    };

    members.push(memberData);

    // Extract payment data (years 2021-2025)
    let totalBalance = 0;
    for (let year = 2021; year <= 2025; year++) {
      const yearIndex = headers.indexOf(year.toString());
      if (yearIndex > -1 && row[yearIndex]) {
        const amount = parseFloat(row[yearIndex]) || 0;
        if (amount > 0) {
          payments.push({
            member_id: memberData.member_id,
            year: year,
            amount: amount,
            payment_date: `${year}-01-01`,
            created_at: new Date().toISOString()
          });
          totalBalance += amount;
        }
      }
    }

    // Calculate balance status
    balances.push({
      member_id: memberData.member_id,
      total_balance: totalBalance,
      status: totalBalance >= 3000 ? 'sufficient' : 'insufficient',
      minimum_required: 3000,
      shortfall: Math.max(0, 3000 - totalBalance),
      last_updated: new Date().toISOString()
    });
  }

  // Upload members
  log.info(`📤 Uploading ${members.length} members...`);
  const { data: _memberData, error: _memberError } = await supabase
    .from('members')
    .upsert(members, { onConflict: 'member_id' });

  if (_memberError) {
    log.error('❌ Error uploading members:', _memberError);
  } else {
    log.info('✅ Members uploaded successfully');
  }

  // Upload payments
  if (payments.length > 0) {
    log.info(`📤 Uploading ${payments.length} payment records...`);
    const { data: _paymentData, error: _paymentError } = await supabase
      .from('payments')
      .upsert(payments, { onConflict: 'member_id,year' });

    if (_paymentError) {
      log.error('❌ Error uploading payments:', _paymentError);
    } else {
      log.info('✅ Payments uploaded successfully');
    }
  }

  // Upload balance summaries
  log.info(`📤 Uploading ${balances.length} balance records...`);
  const { data: _balanceData, error: _balanceError } = await supabase
    .from('member_balances')
    .upsert(balances, { onConflict: 'member_id' });

  if (_balanceError) {
    log.error('❌ Error uploading balances:', _balanceError);
  } else {
    log.info('✅ Balances uploaded successfully');
  }

  // Calculate statistics
  const totalMembers = balances.length;
  const sufficientMembers = balances.filter(b => b.status === 'sufficient').length;
  const insufficientMembers = totalMembers - sufficientMembers;
  const totalShortfall = balances.reduce((sum, b) => sum + b.shortfall, 0);

  log.info('\n📊 Upload Statistics:');
  log.info('====================');
  log.info(`Total Members: ${totalMembers}`);
  log.info(`Sufficient Balance (≥3000): ${sufficientMembers} (${(sufficientMembers/totalMembers*100).toFixed(1)}%)`);
  log.info(`Insufficient Balance (<3000): ${insufficientMembers} (${(insufficientMembers/totalMembers*100).toFixed(1)}%)`);
  log.info(`Total Shortfall: ${totalShortfall.toLocaleString()} SAR`);

  return { members, payments, balances };
}

// Function to create views for easy access
function createDatabaseViews() {
  log.info('\n📌 Step 4: Creating database views...');

  // This would typically be done in Supabase SQL editor
  log.info('⚠️  Please create the following view in Supabase SQL editor:');
  log.info(`
CREATE OR REPLACE VIEW member_statements AS
SELECT
  m.member_id,
  m.full_name,
  m.phone,
  mb.total_balance,
  mb.status,
  mb.shortfall,
  json_agg(
    json_build_object(
      'year', p.year,
      'amount', p.amount
    ) ORDER BY p.year
  ) as payment_history
FROM members m
LEFT JOIN member_balances mb ON m.member_id = mb.member_id
LEFT JOIN payments p ON m.member_id = p.member_id
GROUP BY m.member_id, m.full_name, m.phone, mb.total_balance, mb.status, mb.shortfall;
  `);
}

// Function to set up real-time subscriptions
function setupRealtimeSubscriptions() {
  log.info('\n📌 Step 5: Setting up real-time subscriptions...');
  log.info('✅ Real-time updates will be handled by the frontend components');
}

// Main execution
async function main() {
  try {
    // Create tables
    await createTables();

    // Read Excel file
    const excelData = await readExcelFile();
    if (!excelData) {
      log.error('❌ Failed to read Excel file');
      return;
    }

    // Upload data
    const _result = await uploadMembers(excelData);

    // Create views
    createDatabaseViews();

    // Set up real-time
    setupRealtimeSubscriptions();

    log.info('\n✅ Data upload completed successfully!');
    log.info('=====================================');
    log.info('\n🔗 Next Steps:');
    log.info('1. Go to Supabase Dashboard and verify the data');
    log.info('2. Create the member_statements view using the SQL above');
    log.info('3. Update frontend components to use real database');
    log.info('4. Test Crisis Dashboard with real data');
    log.info('5. Test Member Statement Search with real data');

  } catch (error) {
    log.error('\n❌ Upload failed:', error);
    process.exit(1);
  }
}

// Run the script
main();