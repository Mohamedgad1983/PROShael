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

log.info('💰 SIMPLE PAYMENT UPLOAD - DIRECT TO DATABASE');
log.info('=============================================\n');

async function uploadPayments() {
  try {
    // Read Excel file
    log.info('📖 Reading Excel file...');
    const excelPath = path.join(__dirname, '../../../AlShuail_Members_Prefilled_Import.xlsx');

    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const headers = rawData[0];

    // Find year columns
    const yearColumns = {};
    headers.forEach((header, index) => {
      if (header && header.toString().match(/202[1-5]/)) {
        const yearMatch = header.toString().match(/(202[1-5])/);
        if (yearMatch) {
          yearColumns[yearMatch[1]] = index;
        }
      }
    });

    log.info('📅 Found payment years:', Object.keys(yearColumns));
    log.info(`📊 Processing ${rawData.length - 1} members\n`);

    // Get all existing members
    const { data: members } = await supabase
      .from('members')
      .select('id, membership_number, full_name, phone');

    // Create lookup maps
    const memberByPhone = {};
    const memberByNumber = {};
    members.forEach(m => {
      if (m.phone) {memberByPhone[m.phone] = m;}
      if (m.membership_number) {memberByNumber[m.membership_number] = m;}
    });

    // Process payments
    const payments = [];
    let processedCount = 0;
    let totalAmount = 0;

    for (let i = 1; i < rawData.length && i <= 100; i++) { // Process first 100
      const row = rawData[i];
      if (!row || row.length === 0) {continue;}

      const membershipNumber = row[0];
      const memberName = row[1];
      const phone = row[3];

      // Find member in database
      const dbMember = memberByPhone[phone] || memberByNumber[membershipNumber];

      if (dbMember) {
        processedCount++;
        log.info(`Processing ${processedCount}: ${memberName}`);

        // Process each year's payment
        for (const [year, colIndex] of Object.entries(yearColumns)) {
          const amount = parseFloat(row[colIndex]) || 0;

          if (amount > 0) {
            totalAmount += amount;
            payments.push({
              payer_id: dbMember.id,
              amount: amount,
              category: 'subscription',
              payment_method: 'bank_transfer',
              status: 'paid',
              reference_number: `REF-${year}-${membershipNumber}-${Date.now()}`,
              title: `Payment ${year}`,
              description: `Annual subscription payment for ${year}`,
              notes: `Member: ${memberName}, Year: ${year}`,
              created_at: new Date(`${year}-06-15`).toISOString()
            });
          }
        }
      }
    }

    log.info(`\n📤 Uploading ${payments.length} payments (Total: ${totalAmount} SAR)...\n`);

    // Upload in small batches
    if (payments.length > 0) {
      const batchSize = 5;
      let successCount = 0;

      for (let i = 0; i < payments.length; i += batchSize) {
        const batch = payments.slice(i, i + batchSize);

        const { data: _data, error } = await supabase
          .from('payments')
          .insert(batch)
          .select();

        if (error) {
          log.error(`❌ Batch ${Math.floor(i/batchSize) + 1} failed:`, error.message);
        } else if (_data) {
          successCount += _data.length;
          log.info(`✅ Batch ${Math.floor(i/batchSize) + 1}: Uploaded ${_data.length} payments`);
        }
      }

      log.info(`\n🎉 SUCCESS: ${successCount} payments uploaded!`);
    }

    // Show statistics
    log.info('\n📊 CALCULATING MEMBER BALANCES...');

    const { data: allPayments } = await supabase
      .from('payments')
      .select('payer_id, amount')
      .eq('status', 'paid');

    if (allPayments && allPayments.length > 0) {
      const balances = {};

      // Calculate total for each member
      allPayments.forEach(p => {
        balances[p.payer_id] = (balances[p.payer_id] || 0) + parseFloat(p.amount);
      });

      const sufficient = Object.values(balances).filter(b => b >= 3000).length;
      const insufficient = Object.values(balances).filter(b => b < 3000).length;
      const totalMembers = Object.keys(balances).length;

      log.info('\n================================');
      log.info('📊 FINAL DATABASE STATISTICS');
      log.info('================================');
      log.info(`Total unique members with payments: ${totalMembers}`);
      log.info(`Total payment records: ${allPayments.length}`);
      log.info(`✅ Members with balance ≥3000 SAR: ${sufficient} (${(sufficient/totalMembers*100).toFixed(1)}%)`);
      log.info(`❌ Members with balance <3000 SAR: ${insufficient} (${(insufficient/totalMembers*100).toFixed(1)}%)`);

      // Show some sample members
      log.info('\n📋 Sample Member Balances:');
      const sampleMembers = Object.entries(balances).slice(0, 5);
      for (const [memberId, balance] of sampleMembers) {
        const member = members.find(m => m.id === memberId);
        if (member) {
          const status = balance >= 3000 ? '✅' : '❌';
          log.info(`${status} ${member.full_name}: ${balance} SAR`);
        }
      }
    } else {
      log.info('⚠️ No payments found in database');
    }

    log.info('\n✅ UPLOAD COMPLETE!');
    log.info('Now you can open http://localhost:3002 and:');
    log.info('1. Click "🚨 لوحة الأزمة" to see real member balances');
    log.info('2. Click "📋 البحث عن كشف" to search payment history');

  } catch (error) {
    log.error('\n❌ Error:', error.message);
    log.error(error);
  }
}

// Run it
uploadPayments();