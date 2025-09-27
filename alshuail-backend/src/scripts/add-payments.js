import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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

console.log('💰 Adding Payment Data to Existing Members');
console.log('==========================================\n');

async function addPayments() {
  try {
    // Get all existing members
    console.log('📖 Fetching existing members...');
    const { data: members, error: memberError } = await supabase
      .from('members')
      .select('*')
      .order('created_at');

    if (memberError) {
      console.error('❌ Error fetching members:', memberError);
      return;
    }

    console.log(`✅ Found ${members.length} members\n`);

    // Add sample payments for each member
    console.log('💳 Adding payment history for each member...');
    const payments = [];

    members.forEach((member, index) => {
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

    console.log(`📤 Uploading ${payments.length} payment records...`);

    // Upload payments in batches to avoid timeout
    const batchSize = 50;
    for (let i = 0; i < payments.length; i += batchSize) {
      const batch = payments.slice(i, i + batchSize);
      const { error: paymentError } = await supabase
        .from('payments')
        .insert(batch);

      if (paymentError) {
        console.error('❌ Error uploading batch:', paymentError);
      } else {
        console.log(`✅ Uploaded batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(payments.length/batchSize)}`);
      }
    }

    // Calculate and display statistics
    console.log('\n📊 Payment Statistics:');
    console.log('=====================');

    // Get all payments to calculate balances
    const { data: allPayments, error: fetchError } = await supabase
      .from('payments')
      .select('*');

    if (!fetchError && allPayments) {
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

      console.log(`Total Members: ${members.length}`);
      console.log(`Total Payments: ${allPayments.length}`);
      console.log(`Members with Sufficient Balance (≥3000): ${sufficientCount} (${(sufficientCount/members.length*100).toFixed(1)}%)`);
      console.log(`Members with Insufficient Balance (<3000): ${insufficientCount} (${(insufficientCount/members.length*100).toFixed(1)}%)`);
      console.log(`Total Shortfall: ${totalShortfall.toLocaleString()} SAR`);
    }

    console.log('\n✅ Payment data added successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Test Crisis Dashboard at http://localhost:3002');
    console.log('2. Click on "🚨 لوحة الأزمة" to see member balances');
    console.log('3. Test "📋 البحث عن كشف" to search member statements');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

// Run the script
addPayments();