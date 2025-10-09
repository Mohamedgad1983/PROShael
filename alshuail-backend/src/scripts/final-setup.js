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

log.info('🚀 Final Setup with Correct Table Structure');
log.info('==========================================\n');

// Helper function to generate reference number
function generateReference() {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SH-${timestamp}-${random}`;
}

async function finalSetup() {
  try {
    // STEP 1: Get all existing members
    log.info('📖 Step 1: Fetching existing members...');
    const { data: members, error: memberError } = await supabase
      .from('members')
      .select('*')
      .order('created_at');

    if (memberError) {
      log.error('❌ Error fetching members:', memberError);
      return;
    }

    log.info(`✅ Found ${members.length} members\n`);

    // STEP 2: Create subscriptions for each member (with correct columns)
    log.info('📋 Step 2: Creating annual subscriptions...');
    const subscriptions = [];

    for (const member of members) {
      subscriptions.push({
        member_id: member.id,
        plan_name: 'الاشتراك السنوي 2024',
        amount: 3000, // Must be multiple of 50
        duration_months: 12,
        status: 'active',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        created_at: new Date().toISOString()
      });
    }

    // Insert subscriptions
    const { data: createdSubs, error: subError } = await supabase
      .from('subscriptions')
      .insert(subscriptions)
      .select();

    if (subError) {
      log.error('❌ Error creating subscriptions:', subError.message);

      // Check if subscriptions already exist
      const { data: existingSubs, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*');

      if (!fetchError && existingSubs && existingSubs.length > 0) {
        log.info(`✅ Found ${existingSubs.length} existing subscriptions\n`);
      }
    } else {
      log.info(`✅ Created ${createdSubs.length} subscriptions\n`);
    }

    // STEP 3: Add payments (no subscription_id needed!)
    log.info('💰 Step 3: Adding payment records...');
    const payments = [];

    // Generate realistic payments for each member
    for (const member of members) {
      // Generate payments for years 2021-2024
      const years = [2021, 2022, 2023, 2024];

      years.forEach(year => {
        // 70% chance of payment each year (realistic scenario)
        if (Math.random() < 0.7) {
          const amount = 500 + Math.floor(Math.random() * 20) * 50; // 500-1500 SAR (multiples of 50)

          payments.push({
            payer_id: member.id,
            amount: amount,
            category: 'subscription', // Valid category
            payment_method: Math.random() > 0.5 ? 'cash' : 'bank_transfer',
            status: 'paid', // Valid status
            reference_number: generateReference(),
            title: `اشتراك سنة ${year}`,
            description: `المساهمة السنوية للعضو ${member.full_name} لعام ${year}`,
            notes: `دفعة العام ${year}`,
            created_at: new Date(`${year}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-15`).toISOString()
          });
        }
      });

      // Add a 2025 payment for some members (30% chance)
      if (Math.random() < 0.3) {
        payments.push({
          payer_id: member.id,
          amount: 1000,
          category: 'subscription',
          payment_method: 'bank_transfer',
          status: 'paid',
          reference_number: generateReference(),
          title: 'اشتراك سنة 2025',
          description: `المساهمة السنوية للعضو ${member.full_name} لعام 2025`,
          notes: 'دفعة مقدمة 2025',
          created_at: new Date('2025-01-10').toISOString()
        });
      }
    }

    log.info(`📤 Uploading ${payments.length} payment records...`);

    // Upload payments in batches
    const batchSize = 10;
    let successCount = 0;

    for (let i = 0; i < payments.length; i += batchSize) {
      const batch = payments.slice(i, i + batchSize);
      const { data: insertedPayments, error: paymentError } = await supabase
        .from('payments')
        .insert(batch)
        .select();

      if (paymentError) {
        log.error(`❌ Error in batch ${Math.floor(i/batchSize) + 1}:`, paymentError.message);
      } else {
        successCount += insertedPayments.length;
        log.info(`✅ Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(payments.length/batchSize)} uploaded`);
      }
    }

    log.info(`\n✅ Successfully uploaded ${successCount} payments\n`);

    // STEP 4: Calculate and display statistics
    log.info('📊 Step 4: Calculating final statistics...');

    const { data: allPayments, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('status', 'paid');

    if (!fetchError && allPayments) {
      // Calculate balance for each member
      const memberBalances = {};

      members.forEach(member => {
        memberBalances[member.id] = {
          name: member.full_name,
          total: 0,
          payments: 0
        };
      });

      allPayments.forEach(payment => {
        if (memberBalances[payment.payer_id]) {
          memberBalances[payment.payer_id].total += parseFloat(payment.amount);
          memberBalances[payment.payer_id].payments += 1;
        }
      });

      // Calculate statistics
      let sufficientCount = 0;
      let insufficientCount = 0;
      let totalShortfall = 0;
      let totalCollected = 0;

      Object.entries(memberBalances).forEach(([memberId, data]) => {
        totalCollected += data.total;
        if (data.total >= 3000) {
          sufficientCount++;
          log.info(`✅ ${data.name}: ${data.total} SAR (كافي)`);
        } else {
          insufficientCount++;
          const shortfall = 3000 - data.total;
          totalShortfall += shortfall;
          log.info(`❌ ${data.name}: ${data.total} SAR (نقص ${shortfall} SAR)`);
        }
      });

      log.info('\n════════════════════════════════════');
      log.info('📊 إحصائيات نهائية - FINAL STATISTICS');
      log.info('════════════════════════════════════');
      log.info(`👥 إجمالي الأعضاء: ${members.length}`);
      log.info(`💳 إجمالي المدفوعات: ${allPayments.length}`);
      log.info(`💰 إجمالي المحصل: ${totalCollected.toLocaleString()} ريال`);
      log.info(`\n✅ رصيد كافي (≥3000): ${sufficientCount} عضو (${(sufficientCount/members.length*100).toFixed(1)}%)`);
      log.info(`❌ رصيد غير كافي (<3000): ${insufficientCount} عضو (${(insufficientCount/members.length*100).toFixed(1)}%)`);
      log.info(`💸 إجمالي النقص: ${totalShortfall.toLocaleString()} ريال`);
      log.info(`📊 متوسط الرصيد: ${(totalCollected/members.length).toFixed(0)} ريال للعضو`);
    }

    log.info('\n✅ تم الإعداد بنجاح! - Setup Complete!');
    log.info('════════════════════════════════════\n');
    log.info('📋 يمكنك الآن - You can now:');
    log.info('1. افتح - Open: http://localhost:3002');
    log.info('2. اضغط "🚨 لوحة الأزمة" لرؤية البيانات الحقيقية');
    log.info('3. اضغط "📋 البحث عن كشف" للبحث عن كشوفات الأعضاء');
    log.info('\n💡 البيانات تظهر سيناريو واقعي:');
    log.info('   - بعض الأعضاء دفعوا كل السنوات');
    log.info('   - بعض الأعضاء لديهم مدفوعات ناقصة');
    log.info('   - المبالغ متنوعة (500-1500 ريال)');

  } catch (error) {
    log.error('\n❌ Error:', error);
  }
}

// Run the final setup
finalSetup();