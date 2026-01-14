import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { log } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Validate required environment variables
if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL is required in environment variables');
}
if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_KEY is required in environment variables');
}

// Load Supabase credentials from environment
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

log.info('🚀 Complete Setup: Subscriptions + Payments');
log.info('==========================================\n');

async function completeSetup() {
  try {
    // STEP 1: Get all existing members
    log.info('📖 Step 1: Fetching existing members...');
    const { data: members, error: _memberError } = await supabase
      .from('members')
      .select('*')
      .order('created_at');

    if (_memberError) {
      log.error('❌ Error fetching members:', _memberError);
      return;
    }

    log.info(`✅ Found ${members.length} members\n`);

    // STEP 2: Create subscriptions for each member
    log.info('📋 Step 2: Creating subscriptions for members...');
    const subscriptions = [];

    for (const member of members) {
      subscriptions.push({
        member_id: member.id,
        quantity: 1,
        start_date: '2021-01-01',
        end_date: '2025-12-31',
        status: 'active',
        amount: 3000, // Annual subscription
        currency: 'SAR',
        created_at: new Date().toISOString()
      });
    }

    // Insert subscriptions
    let createdSubs;
    const { data: subsData, error: _subError } = await supabase
      .from('subscriptions')
      .insert(subscriptions)
      .select();

    if (_subError) {
      log.error('❌ Error creating subscriptions:', _subError);

      // Try to get existing subscriptions if they already exist
      const { data: existingSubs, error: _fetchError } = await supabase
        .from('subscriptions')
        .select('*');

      if (!_fetchError && existingSubs && existingSubs.length > 0) {
        log.info(`✅ Using ${existingSubs.length} existing subscriptions`);
        createdSubs = existingSubs;
      } else {
        log.error('Could not create or fetch subscriptions');
        return;
      }
    } else {
      createdSubs = subsData;
      log.info(`✅ Created ${createdSubs.length} subscriptions\n`);
    }

    // STEP 3: Add payments linked to subscriptions
    log.info('💰 Step 3: Adding payment records...');
    const payments = [];

    // Create a map of member_id to subscription_id
    const subMap = {};
    if (createdSubs) {
      createdSubs.forEach(sub => {
        subMap[sub.member_id] = sub.id;
      });
    }

    // Generate payments for each member
    for (const member of members) {
      const subscriptionId = subMap[member.id];

      if (!subscriptionId) {
        log.info(`⚠️ No subscription found for member ${member.full_name}`);
        continue;
      }

      // Generate random payments for years 2021-2025
      const years = [2021, 2022, 2023, 2024, 2025];

      years.forEach(year => {
        // 70% chance of payment each year
        if (Math.random() < 0.7) {
          const amount = 500 + Math.floor(Math.random() * 1000); // 500-1500 SAR

          payments.push({
            reference_number: `SH${year}${String(member.id).slice(0, 8)}`,
            payer_id: member.id,
            subscription_id: subscriptionId,
            amount: amount,
            currency: 'SAR',
            status: 'completed',
            category: 'contribution',
            payment_method: Math.random() > 0.5 ? 'cash' : 'bank_transfer',
            title: `مساهمة ${year}`,
            notes: `المساهمة السنوية لعام ${year}`,
            created_at: new Date(`${year}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-15`).toISOString()
          });
        }
      });
    }

    log.info(`📤 Uploading ${payments.length} payment records...`);

    // Upload payments in batches
    const batchSize = 20;
    let successCount = 0;

    for (let i = 0; i < payments.length; i += batchSize) {
      const batch = payments.slice(i, i + batchSize);
      const { data: insertedPayments, error: _paymentError } = await supabase
        .from('payments')
        .insert(batch)
        .select();

      if (_paymentError) {
        log.error(`❌ Error uploading batch ${Math.floor(i/batchSize) + 1}:`, _paymentError.message);
      } else {
        successCount += insertedPayments.length;
        log.info(`✅ Uploaded batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(payments.length/batchSize)}`);
      }
    }

    log.info(`\n✅ Successfully uploaded ${successCount} payments\n`);

    // STEP 4: Calculate and display statistics
    log.info('📊 Step 4: Calculating statistics...');

    // Get all payments to calculate balances
    const { data: allPayments, error: _fetchError2 } = await supabase
      .from('payments')
      .select('*')
      .eq('status', 'completed');

    if (!_fetchError2 && allPayments) {
      // Calculate balance for each member
      const memberBalances = {};

      allPayments.forEach(payment => {
        if (!memberBalances[payment.payer_id]) {
          memberBalances[payment.payer_id] = {
            total: 0,
            payments: 0
          };
        }
        memberBalances[payment.payer_id].total += parseFloat(payment.amount);
        memberBalances[payment.payer_id].payments += 1;
      });

      // Count members by balance status
      let sufficientCount = 0;
      let insufficientCount = 0;
      let totalShortfall = 0;
      let totalCollected = 0;

      Object.entries(memberBalances).forEach(([_memberId, data]) => {
        totalCollected += data.total;
        if (data.total >= 3000) {
          sufficientCount++;
        } else {
          insufficientCount++;
          totalShortfall += (3000 - data.total);
        }
      });

      // Find members without any payments
      const membersWithoutPayments = members.filter(m => !memberBalances[m.id]);
      insufficientCount += membersWithoutPayments.length;
      totalShortfall += (membersWithoutPayments.length * 3000);

      log.info('\n📊 FINAL STATISTICS');
      log.info('==================');
      log.info(`Total Members: ${members.length}`);
      log.info(`Total Payments: ${allPayments.length}`);
      log.info(`Total Collected: ${totalCollected.toLocaleString()} SAR`);
      log.info(`\n✅ Sufficient Balance (≥3000): ${sufficientCount} members (${(sufficientCount/members.length*100).toFixed(1)}%)`);
      log.info(`❌ Insufficient Balance (<3000): ${insufficientCount} members (${(insufficientCount/members.length*100).toFixed(1)}%)`);
      log.info(`💰 Total Shortfall: ${totalShortfall.toLocaleString()} SAR`);
      log.info(`📊 Average Balance: ${(totalCollected/members.length).toFixed(0)} SAR per member`);
    }

    log.info('\n✅ Setup completed successfully!');
    log.info('================================\n');
    log.info('📋 You can now:');
    log.info('1. Open http://localhost:3002');
    log.info('2. Click "🚨 لوحة الأزمة" to see Crisis Dashboard with real data');
    log.info('3. Click "📋 البحث عن كشف" to search member statements');
    log.info('4. The data shows realistic payment patterns:');
    log.info('   - Some members paid all years');
    log.info('   - Some members missed payments');
    log.info('   - Varying payment amounts (500-1500 SAR per year)');

  } catch (error) {
    log.error('\n❌ Error:', error.message);
  }
}

// Run the complete setup
completeSetup();