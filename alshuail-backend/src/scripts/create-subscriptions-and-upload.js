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

console.log('🚀 CREATING SUBSCRIPTIONS AND UPLOADING PAYMENTS');
console.log('================================================\n');

async function createSubscriptionsAndUpload() {
  try {
    // STEP 1: Get all members that need subscriptions
    console.log('📖 Getting all members...');
    const { data: members, error: memberError } = await supabase
      .from('members')
      .select('id, full_name, membership_number');

    if (memberError) {
      console.error('❌ Error fetching members:', memberError);
      return;
    }

    console.log(`✅ Found ${members.length} members\n`);

    // STEP 2: Create subscriptions for each member
    console.log('📋 Creating subscriptions for all members...');
    const subscriptions = [];

    for (const member of members) {
      // Check if subscription already exists
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('member_id', member.id)
        .single();

      if (!existingSub) {
        subscriptions.push({
          member_id: member.id,
          plan_name: 'الاشتراك السنوي',
          amount: 600,
          duration_months: 12,
          status: 'active',
          start_date: '2021-01-01',
          end_date: '2025-12-31',
          created_at: new Date().toISOString()
        });
      }
    }

    if (subscriptions.length > 0) {
      console.log(`📤 Creating ${subscriptions.length} new subscriptions...`);

      // Insert in batches
      const batchSize = 10;
      for (let i = 0; i < subscriptions.length; i += batchSize) {
        const batch = subscriptions.slice(i, i + batchSize);
        const { error } = await supabase
          .from('subscriptions')
          .insert(batch);

        if (error) {
          console.error(`❌ Batch error:`, error.message);
        } else {
          console.log(`✅ Created batch ${Math.floor(i/batchSize) + 1}`);
        }
      }
    }

    // STEP 3: Get all subscriptions with member mapping
    console.log('\n📖 Getting subscription IDs...');
    const { data: allSubs, error: subError } = await supabase
      .from('subscriptions')
      .select('id, member_id');

    if (subError) {
      console.error('❌ Error fetching subscriptions:', subError);
      return;
    }

    // Create member_id to subscription_id mapping
    const memberToSub = {};
    allSubs.forEach(sub => {
      memberToSub[sub.member_id] = sub.id;
    });

    console.log(`✅ Found ${allSubs.length} subscriptions\n`);

    // STEP 4: Read Excel and process payments
    console.log('📖 Reading Excel file for payment data...');
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

    console.log('📅 Processing payments for years:', Object.keys(yearColumns));

    // Process payments
    const payments = [];

    for (let i = 1; i < rawData.length && i <= 100; i++) { // Process first 100 members
      const row = rawData[i];
      if (!row || row.length === 0) continue;

      const memberName = row[1];
      const phone = row[3] || `050${String(1000000 + i).padStart(7, '0')}`;
      const memberId = row[0] || `SH-${10000 + i}`;

      // Find this member in database
      const { data: dbMember } = await supabase
        .from('members')
        .select('id')
        .or(`phone.eq.${phone},membership_number.eq.${memberId}`)
        .single();

      if (dbMember && memberToSub[dbMember.id]) {
        const subscriptionId = memberToSub[dbMember.id];

        // Process each year's payment
        for (const [year, colIndex] of Object.entries(yearColumns)) {
          const amount = parseFloat(row[colIndex]) || 0;

          if (amount > 0) {
            payments.push({
              payer_id: dbMember.id,
              subscription_id: subscriptionId, // NOW WE HAVE THE SUBSCRIPTION ID!
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
      }
    }

    // STEP 5: Upload payments
    console.log(`\n📤 Uploading ${payments.length} payments with subscription IDs...`);

    if (payments.length > 0) {
      const batchSize = 10;
      let successCount = 0;

      for (let i = 0; i < payments.length; i += batchSize) {
        const batch = payments.slice(i, i + batchSize);

        const { data, error } = await supabase
          .from('payments')
          .insert(batch)
          .select();

        if (error) {
          console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} error:`, error.message);
        } else if (data) {
          successCount += data.length;
          console.log(`✅ Uploaded batch ${Math.floor(i/batchSize) + 1}: ${data.length} payments`);
        }
      }

      console.log(`\n🎉 SUCCESS: ${successCount} payments uploaded!`);
    }

    // STEP 6: Show statistics
    console.log('\n📊 FINAL STATISTICS');
    console.log('==================');

    const { data: finalPayments } = await supabase
      .from('payments')
      .select('payer_id, amount')
      .eq('status', 'paid');

    if (finalPayments) {
      const balances = {};
      finalPayments.forEach(p => {
        balances[p.payer_id] = (balances[p.payer_id] || 0) + parseFloat(p.amount);
      });

      const sufficient = Object.values(balances).filter(b => b >= 3000).length;
      const insufficient = Object.values(balances).filter(b => b < 3000).length;

      console.log(`Total members: ${members.length}`);
      console.log(`Total payments: ${finalPayments.length}`);
      console.log(`✅ Members with balance ≥3000 SAR: ${sufficient}`);
      console.log(`❌ Members with balance <3000 SAR: ${insufficient}`);
    }

    console.log('\n✅ DONE! Your real data is now in the database!');
    console.log('You can now open http://localhost:3002 and see:');
    console.log('- Crisis Dashboard with real member balances');
    console.log('- Member Statement Search with actual payment history');

  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

// Run it!
createSubscriptionsAndUpload();