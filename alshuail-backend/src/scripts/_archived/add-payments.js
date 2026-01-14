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

log.info('💰 Adding Payment Data to Existing Members');
log.info('==========================================\n');

async function addPayments() {
  try {
    // Get all existing members
    log.info('📖 Fetching existing members...');
    const { data: members, error: _memberError } = await supabase
      .from('members')
      .select('*')
      .order('created_at');

    if (_memberError) {
      log.error('❌ Error fetching members:', _memberError);
      return;
    }

    log.info(`✅ Found ${members.length} members\n`);

    // Add sample payments for each member
    log.info('💳 Adding payment history for each member...');
    const payments = [];

    members.forEach((member, _index) => {
      // Generate realistic payment history for 2021-2025
      const years = [2021, 2022, 2023, 2024, 2025];

      years.forEach(year => {
        // Some members paid, some didn't (realistic scenario)
        const shouldPay = Math.random() > 0.3; // 70% payment rate

        if (shouldPay) {
          const amount = 500 + Math.floor(Math.random() * 1000); // 500-1500 SAR per year

          payments.push({
            payer_id: member.id,
            amount: amount,
            payment_type: 'contribution',
            payment_method: Math.random() > 0.5 ? 'cash' : 'bank_transfer',
            category: 'annual_contribution',
            title: `مساهمة سنوية ${year}`,
            status: 'completed',
            payment_date: `${year}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
            created_at: new Date().toISOString()
          });
        }
      });
    });

    log.info(`📤 Uploading ${payments.length} payment records...`);

    // Upload payments in batches to avoid timeout
    const batchSize = 50;
    for (let i = 0; i < payments.length; i += batchSize) {
      const batch = payments.slice(i, i + batchSize);
      const { error: _paymentError } = await supabase
        .from('payments')
        .insert(batch);

      if (_paymentError) {
        log.error('❌ Error uploading batch:', _paymentError);
      } else {
        log.info(`✅ Uploaded batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(payments.length/batchSize)}`);
      }
    }

    // Calculate and display statistics
    log.info('\n📊 Payment Statistics:');
    log.info('=====================');

    // Get all payments to calculate balances
    const { data: allPayments, error: _fetchError } = await supabase
      .from('payments')
      .select('*');

    if (!_fetchError && allPayments) {
      // Calculate balance for each member
      const memberBalances = {};
      allPayments.forEach(payment => {
        if (!memberBalances[payment.payer_id]) {
          memberBalances[payment.payer_id] = 0;
        }
        memberBalances[payment.payer_id] += parseFloat(payment.amount);
      });

      // Count members by balance status
      let sufficientCount = 0;
      let insufficientCount = 0;
      let totalShortfall = 0;

      Object.values(memberBalances).forEach(balance => {
        if (balance >= 3000) {
          sufficientCount++;
        } else {
          insufficientCount++;
          totalShortfall += (3000 - balance);
        }
      });

      log.info(`Total Members: ${members.length}`);
      log.info(`Total Payments: ${allPayments.length}`);
      log.info(`Members with Sufficient Balance (≥3000): ${sufficientCount} (${(sufficientCount/members.length*100).toFixed(1)}%)`);
      log.info(`Members with Insufficient Balance (<3000): ${insufficientCount} (${(insufficientCount/members.length*100).toFixed(1)}%)`);
      log.info(`Total Shortfall: ${totalShortfall.toLocaleString()} SAR`);
    }

    log.info('\n✅ Payment data added successfully!');
    log.info('\n📋 Next Steps:');
    log.info('1. Test Crisis Dashboard at http://localhost:3002');
    log.info('2. Click on "🚨 لوحة الأزمة" to see member balances');
    log.info('3. Test "📋 البحث عن كشف" to search member statements');

  } catch (error) {
    log.error('\n❌ Error:', error.message);
  }
}

// Run the script
addPayments();