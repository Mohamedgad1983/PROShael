import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import _fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { log } from '../utils/logger.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate required environment variables
if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL is required in environment variables');
}
if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_KEY is required in environment variables');
}

// Load Supabase credentials from environment
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Initialize Supabase client with environment credentials
const supabase = createClient(supabaseUrl, supabaseServiceKey);

log.info('🚀 DIRECT EXCEL UPLOAD - REAL DATA');
log.info('=====================================\n');

async function uploadRealData() {
  try {
    // STEP 1: Read the ACTUAL Excel file
    log.info('📖 Reading YOUR Excel file with REAL data...');
    const excelPath = path.join(__dirname, '../../../AlShuail_Members_Prefilled_Import.xlsx');

    if (!_fs.existsSync(excelPath)) {
      log.error('❌ Excel file not found at:', excelPath);
      return;
    }

    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    log.info(`✅ Found ${rawData.length - 1} rows in Excel\n`);

    // STEP 2: Get column headers
    const headers = rawData[0];
    log.info('📋 Excel columns found:', headers);

    // Find year columns (2021, 2022, 2023, 2024, 2025)
    const yearColumns = {};
    headers.forEach((header, index) => {
      if (header && header.toString().match(/202[1-5]/)) {
        // Extract just the year from the column name
        const yearMatch = header.toString().match(/(202[1-5])/);
        if (yearMatch) {
          yearColumns[yearMatch[1]] = index;
        }
      }
    });
    log.info('📅 Year columns:', Object.keys(yearColumns));

    // STEP 3: Process each member's REAL data
    log.info('\n💰 Processing REAL payment data from Excel...\n');

    let totalMembers = 0;
    let membersWithPayments = 0;
    const totalPaymentsToAdd = [];

    for (let i = 1; i < rawData.length && i <= 50; i++) { // Process first 50 members
      const row = rawData[i];
      if (!row || row.length === 0) {continue;}

      totalMembers++;

      // Get member data from Excel
      const memberName = row[1] || `Member ${i}`; // Column B - الاسم الكامل
      const phone = row[2] || `050${String(1000000 + i).padStart(7, '0')}`; // Column C - رقم الهاتف
      const memberId = row[0] || `SH-${10000 + i}`; // Column A - رقم العضوية

      log.info(`\n👤 Member ${i}: ${memberName}`);

      // Check if this member exists in database
      const { data: existingMember, error: _memberError } = await supabase
        .from('members')
        .select('id')
        .or(`phone.eq.${phone},membership_number.eq.${memberId}`)
        .single();

      let dbMemberId;

      if (existingMember) {
        dbMemberId = existingMember.id;
        log.info(`   ✅ Found in database with ID: ${dbMemberId}`);
      } else {
        // Create member if not exists
        const { data: newMember, error: _createError } = await supabase
          .from('members')
          .insert({
            membership_number: memberId,
            full_name: memberName,
            phone: phone,
            email: `member${memberId}@alshuail.com`, // Add dummy email
            status: 'active'
          })
          .select('id')
          .single();

        if (newMember) {
          dbMemberId = newMember.id;
          log.info(`   ✅ Created new member with ID: ${dbMemberId}`);
        } else {
          log.info(`   ❌ Could not create member:`, _createError?.message);
          continue;
        }
      }

      // Process payments for each year
      let memberTotal = 0;
      for (const [year, colIndex] of Object.entries(yearColumns)) {
        const amount = parseFloat(row[colIndex]) || 0;

        if (amount > 0) {
          memberTotal += amount;
          log.info(`   💵 Year ${year}: ${amount} SAR`);

          totalPaymentsToAdd.push({
            payer_id: dbMemberId,
            amount: amount,
            category: 'subscription',
            payment_method: 'bank_transfer',
            status: 'paid',
            reference_number: `SH-${year}-${memberId}`,
            notes: `Annual payment for ${year}`,
            created_at: new Date(`${year}-06-15`).toISOString()
          });
        }
      }

      if (memberTotal > 0) {
        membersWithPayments++;
        log.info(`   📊 Total: ${memberTotal} SAR - ${memberTotal >= 3000 ? '✅ SUFFICIENT' : '❌ INSUFFICIENT'}`);
      } else {
        log.info(`   ⚠️ No payments found`);
      }
    }

    // STEP 4: Upload all payments to database
    log.info(`\n📤 Uploading ${totalPaymentsToAdd.length} REAL payments to database...`);

    if (totalPaymentsToAdd.length > 0) {
      // Upload in small batches
      const batchSize = 5;
      let successCount = 0;

      for (let i = 0; i < totalPaymentsToAdd.length; i += batchSize) {
        const batch = totalPaymentsToAdd.slice(i, i + batchSize);

        // Remove any fields that don't exist in your table
        const cleanBatch = batch.map(payment => {
          const { description: _description, payment_type: _payment_type, subscription_id: _subscription_id, title: _title, ...cleanPayment } = payment;
          return cleanPayment;
        });

        const { data: _data, error } = await supabase
          .from('payments')
          .insert(cleanBatch)
          .select();

        if (error) {
          log.error(`❌ Batch ${Math.floor(i/batchSize) + 1} error:`, error.message);
        } else if (_data) {
          successCount += _data.length;
          log.info(`✅ Batch ${Math.floor(i/batchSize) + 1}: ${_data.length} payments uploaded`);
        }
      }

      log.info(`\n✅ SUCCESS: ${successCount} payments uploaded!`);
    }

    // STEP 5: Show final statistics
    log.info(`\n${  '='.repeat(50)}`);
    log.info('📊 FINAL RESULTS FROM YOUR EXCEL DATA');
    log.info('='.repeat(50));
    log.info(`Total members processed: ${totalMembers}`);
    log.info(`Members with payments: ${membersWithPayments}`);
    log.info(`Total payment records: ${totalPaymentsToAdd.length}`);

    // Get updated statistics from database
    const { data: allPayments } = await supabase
      .from('payments')
      .select('payer_id, amount')
      .eq('status', 'paid');

    if (allPayments) {
      const balances = {};
      allPayments.forEach(p => {
        balances[p.payer_id] = (balances[p.payer_id] || 0) + parseFloat(p.amount);
      });

      const sufficient = Object.values(balances).filter(b => b >= 3000).length;
      const insufficient = Object.values(balances).filter(b => b < 3000).length;

      log.info(`\n✅ Members with balance ≥3000 SAR: ${sufficient}`);
      log.info(`❌ Members with balance <3000 SAR: ${insufficient}`);
    }

    log.info('\n🎉 DONE! Now you can:');
    log.info('1. Open http://localhost:3002');
    log.info('2. Click "🚨 لوحة الأزمة" to see REAL member balances');
    log.info('3. Click "📋 البحث عن كشف" to search REAL payment data');

  } catch (error) {
    log.error('\n❌ Error:', error);
  }
}

// RUN IT NOW!
uploadRealData();