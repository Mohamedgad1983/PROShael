import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

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

console.log('💰 SIMPLE PAYMENT UPLOAD - DIRECT TO DATABASE');
console.log('=============================================\n');

async function uploadPayments() {
  try {
    // Read Excel file
    console.log('📖 Reading Excel file...');
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

    console.log('📅 Found payment years:', Object.keys(yearColumns));
    console.log(`📊 Processing ${rawData.length - 1} members\n`);

    // Get all existing members
    const { data: members } = await supabase
      .from('members')
      .select('id, membership_number, full_name, phone');

    // Create lookup maps
    const memberByPhone = {};
    const memberByNumber = {};
    members.forEach(m => {
      if (m.phone) memberByPhone[m.phone] = m;
      if (m.membership_number) memberByNumber[m.membership_number] = m;
    });

    // Process payments
    const payments = [];
    let processedCount = 0;
    let totalAmount = 0;

    for (let i = 1; i < rawData.length && i <= 100; i++) { // Process first 100
      const row = rawData[i];
      if (!row || row.length === 0) continue;

      const membershipNumber = row[0];
      const memberName = row[1];
      const phone = row[3];

      // Find member in database
      let dbMember = memberByPhone[phone] || memberByNumber[membershipNumber];

      if (dbMember) {
        processedCount++;
        console.log(`Processing ${processedCount}: ${memberName}`);

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

    console.log(`\n📤 Uploading ${payments.length} payments (Total: ${totalAmount} SAR)...\n`);

    // Upload in small batches
    if (payments.length > 0) {
      const batchSize = 5;
      let successCount = 0;

      for (let i = 0; i < payments.length; i += batchSize) {
        const batch = payments.slice(i, i + batchSize);

        const { data, error } = await supabase
          .from('payments')
          .insert(batch)
          .select();

        if (error) {
          console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} failed:`, error.message);
        } else if (data) {
          successCount += data.length;
          console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: Uploaded ${data.length} payments`);
        }
      }

      console.log(`\n🎉 SUCCESS: ${successCount} payments uploaded!`);
    }

    // Show statistics
    console.log('\n📊 CALCULATING MEMBER BALANCES...');

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

      console.log('\n================================');
      console.log('📊 FINAL DATABASE STATISTICS');
      console.log('================================');
      console.log(`Total unique members with payments: ${totalMembers}`);
      console.log(`Total payment records: ${allPayments.length}`);
      console.log(`✅ Members with balance ≥3000 SAR: ${sufficient} (${(sufficient/totalMembers*100).toFixed(1)}%)`);
      console.log(`❌ Members with balance <3000 SAR: ${insufficient} (${(insufficient/totalMembers*100).toFixed(1)}%)`);

      // Show some sample members
      console.log('\n📋 Sample Member Balances:');
      const sampleMembers = Object.entries(balances).slice(0, 5);
      for (const [memberId, balance] of sampleMembers) {
        const member = members.find(m => m.id === memberId);
        if (member) {
          const status = balance >= 3000 ? '✅' : '❌';
          console.log(`${status} ${member.full_name}: ${balance} SAR`);
        }
      }
    } else {
      console.log('⚠️ No payments found in database');
    }

    console.log('\n✅ UPLOAD COMPLETE!');
    console.log('Now you can open http://localhost:3002 and:');
    console.log('1. Click "🚨 لوحة الأزمة" to see real member balances');
    console.log('2. Click "📋 البحث عن كشف" to search payment history');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

// Run it
uploadPayments();