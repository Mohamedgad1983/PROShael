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

log.info('🚀 WORKING UPLOAD - CREATING SUBSCRIPTIONS THEN PAYMENTS');
log.info('========================================================\n');

async function workingUpload() {
  try {
    // STEP 1: Get subscription plan
    log.info('📋 Getting subscription plan...');
    const { data: plans } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .limit(1);

    const planId = plans?.[0]?.id || 'efb37762-1507-4743-b0d8-412cb1b26710';
    log.info(`✅ Using plan ID: ${planId}\n`);

    // STEP 2: Get all members
    log.info('👥 Getting all members...');
    const { data: members } = await supabase
      .from('members')
      .select('id, membership_number, full_name, phone');

    log.info(`✅ Found ${members.length} members\n`);

    // STEP 3: Create subscriptions for members that don't have one
    log.info('📝 Creating subscriptions for members...');
    let createdCount = 0;

    for (const member of members) {
      // Check if subscription exists
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('member_id', member.id)
        .limit(1);

      if (!existingSub || existingSub.length === 0) {
        // Create subscription
        const { data: newSub, error } = await supabase
          .from('subscriptions')
          .insert({
            subscriber_id: member.id, // Required field
            member_id: member.id,
            plan_id: planId,
            amount: 50,
            currency: 'SAR',
            status: 'active',
            start_date: '2021-01-01',
            end_date: '2025-12-31'
          })
          .select('id')
          .single();

        if (newSub) {
          createdCount++;
          log.info(`  ✅ Created subscription for ${member.full_name}`);
        } else if (error) {
          log.info(`  ⚠️ Failed for ${member.full_name}: ${error.message}`);
        }
      }
    }

    log.info(`\n✅ Created ${createdCount} new subscriptions\n`);

    // STEP 4: Get all subscriptions
    log.info('📖 Getting all subscriptions...');
    const { data: allSubscriptions } = await supabase
      .from('subscriptions')
      .select('id, member_id');

    // Create member_id to subscription_id mapping
    const memberToSub = {};
    allSubscriptions.forEach(sub => {
      memberToSub[sub.member_id] = sub.id;
    });

    log.info(`✅ Found ${allSubscriptions.length} total subscriptions\n`);

    // STEP 5: Read Excel and process payments
    log.info('📖 Reading Excel file for payments...');
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

    log.info('📅 Processing payments for years:', Object.keys(yearColumns));

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

    log.info('\n💰 Processing member payments...\n');

    for (let i = 1; i < rawData.length && i <= 200; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) {continue;}

      const membershipNumber = row[0];
      const memberName = row[1] || `Member ${i}`;
      const phone = row[3];

      // Find member in database
      const dbMember = memberByPhone[phone] || memberByNumber[membershipNumber];

      if (dbMember && memberToSub[dbMember.id]) {
        processedCount++;
        let memberTotal = 0;
        const subscriptionId = memberToSub[dbMember.id];

        // Process each year's payment
        for (const [year, colIndex] of Object.entries(yearColumns)) {
          const amount = parseFloat(row[colIndex]) || 0;

          if (amount > 0) {
            memberTotal += amount;
            totalAmount += amount;

            payments.push({
              payer_id: dbMember.id,
              beneficiary_id: dbMember.id,
              subscription_id: subscriptionId, // Now we have valid subscription ID!
              amount: amount,
              payment_date: `${year}-06-15`,
              payment_method: 'bank_transfer',
              category: 'subscription',
              status: 'approved',
              reference_number: `PAY-${year}-${membershipNumber}-${Math.random().toString(36).substr(2, 6)}`,
              notes: `Payment for ${year}`
            });
          }
        }

        if (memberTotal > 0) {
          const status = memberTotal >= 3000 ? '✅' : '❌';
          log.info(`${status} ${processedCount}. ${memberName}: ${memberTotal} SAR`);
        }
      }
    }

    log.info(`\n📤 Uploading ${payments.length} payments (Total: ${totalAmount} SAR)...\n`);

    // Upload payments in small batches
    if (payments.length > 0) {
      const batchSize = 5;
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < payments.length; i += batchSize) {
        const batch = payments.slice(i, i + batchSize);

        const { data, error } = await supabase
          .from('payments')
          .insert(batch)
          .select();

        if (error) {
          failCount++;
          log.error(`❌ Batch ${Math.floor(i/batchSize) + 1}: ${error.message}`);
        } else if (data) {
          successCount += data.length;
          log.info(`✅ Batch ${Math.floor(i/batchSize) + 1}: Uploaded ${data.length} payments`);
        }
      }

      if (successCount > 0) {
        log.info(`\n🎉 SUCCESS: ${successCount} payments uploaded!`);
      }
    }

    // STEP 6: Show final statistics
    log.info('\n📊 CHECKING DATABASE FOR ALL PAYMENTS...');

    const { data: allPayments } = await supabase
      .from('payments')
      .select('payer_id, amount')
      .in('status', ['approved', 'pending']);

    if (allPayments && allPayments.length > 0) {
      const balances = {};

      // Calculate total for each member
      allPayments.forEach(p => {
        balances[p.payer_id] = (balances[p.payer_id] || 0) + parseFloat(p.amount);
      });

      const sufficient = Object.values(balances).filter(b => b >= 3000).length;
      const insufficient = Object.values(balances).filter(b => b < 3000).length;
      const totalMembers = Object.keys(balances).length;

      log.info('\n========================================');
      log.info('📊 FINAL DATABASE STATISTICS');
      log.info('========================================');
      log.info(`Total members with payments: ${totalMembers}`);
      log.info(`Total payment records: ${allPayments.length}`);
      log.info(`\n✅ Members with balance ≥3000 SAR: ${sufficient} (${(sufficient/totalMembers*100).toFixed(1)}%)`);
      log.info(`❌ Members with balance <3000 SAR: ${insufficient} (${(insufficient/totalMembers*100).toFixed(1)}%)`);
    }

    log.info('\n✅ COMPLETE! Your data is now in the database!');
    log.info('========================================');
    log.info('Open http://localhost:3002 and check:');
    log.info('1. 🚨 لوحة الأزمة - Crisis Dashboard with real balances');
    log.info('2. 📋 البحث عن كشف - Member Statement Search');

  } catch (error) {
    log.error('\n❌ Error:', error.message);
    log.error(error);
  }
}

// Run it!
workingUpload();