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

console.log('🚀 IMPORTING NEW EXCEL DATA (289 MEMBERS)');
console.log('==========================================\n');

async function importNewExcel() {
  try {
    // STEP 1: Read the new Excel file
    console.log('📖 Reading Excel file: AlShuail_Members.xlsx');
    const excelPath = path.join(__dirname, '../../../../AlShuail_Members.xlsx');

    if (!fs.existsSync(excelPath)) {
      console.error('❌ Excel file not found at:', excelPath);
      return;
    }

    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log(`✅ Found ${rawData.length - 1} data rows\n`);

    // STEP 2: Get subscription plan
    console.log('📋 Getting subscription plan...');
    const { data: plans } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .limit(1);

    const planId = plans?.[0]?.id || 'efb37762-1507-4743-b0d8-412cb1b26710';
    console.log(`✅ Using plan ID: ${planId}\n`);

    // STEP 3: Get existing members from database
    console.log('👥 Getting existing members from database...');
    const { data: existingMembers } = await supabase
      .from('members')
      .select('id, membership_number, phone, full_name');

    console.log(`✅ Found ${existingMembers?.length || 0} existing members\n`);

    // Create lookup maps for existing members
    const memberByPhone = {};
    const memberByNumber = {};
    if (existingMembers) {
      existingMembers.forEach(m => {
        if (m.phone) memberByPhone[m.phone] = m;
        if (m.membership_number) memberByNumber[m.membership_number] = m;
      });
    }

    // STEP 4: Process Excel data
    const headers = rawData[0];
    const membersToInsert = [];
    const membersToUpdate = [];
    const paymentsToInsert = [];

    let newMembersCount = 0;
    let updatedMembersCount = 0;
    let totalPaymentsCount = 0;
    let totalAmount = 0;

    console.log('🔄 Processing member data...\n');

    // Process each row
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue;

      // Extract data from row (based on column positions from analysis)
      const membershipNumber = row[0]?.toString() || '';
      const fullNameAr = row[1] || '';
      const fullNameEn = row[2] || ''; // We'll skip this as requested
      const phone = row[3]?.toString() || '';
      const country = row[4] || 'SA';
      const tribalSection = row[5] || '';
      const nationalId = row[6]?.toString() || '';
      const email = row[7] || '';
      const address = row[8] || '';
      const payment2021 = parseFloat(row[9]) || 0;
      const payment2022 = parseFloat(row[10]) || 0;
      const payment2023 = parseFloat(row[11]) || 0;
      const payment2024 = parseFloat(row[12]) || 0;
      const payment2025 = parseFloat(row[13]) || 0;
      const totalBalance = parseFloat(row[14]) || (payment2021 + payment2022 + payment2023 + payment2024 + payment2025);
      const balanceStatus = row[15] || (totalBalance >= 3000 ? 'sufficient' : 'insufficient');
      const subscriptionType = row[16] || 'monthly';

      // Skip if no name or member ID
      if (!fullNameAr && !membershipNumber) continue;

      // Format phone number (ensure it's in correct format)
      const formattedPhone = phone.startsWith('0') ? phone : `0${phone}`;

      // Check if member exists
      let existingMember = memberByPhone[formattedPhone] || memberByNumber[membershipNumber];

      if (existingMember) {
        // Update existing member
        membersToUpdate.push({
          id: existingMember.id,
          data: {
            full_name: fullNameAr,
            membership_number: membershipNumber,
            phone: formattedPhone,
            email: email || existingMember.email,
            national_id: nationalId,
            country: country,
            tribal_section: tribalSection,
            address: address,
            subscription_type: subscriptionType,
            total_balance: totalBalance,
            balance_status: balanceStatus,
            updated_at: new Date().toISOString()
          }
        });
        updatedMembersCount++;
      } else {
        // Create new member
        const newMember = {
          membership_number: membershipNumber,
          full_name: fullNameAr,
          phone: formattedPhone,
          email: email || `member${membershipNumber}@alshuail.com`,
          national_id: nationalId,
          country: country,
          tribal_section: tribalSection,
          address: address,
          subscription_type: subscriptionType,
          total_balance: totalBalance,
          balance_status: balanceStatus,
          membership_status: 'active',
          role: 'member',
          status: 'active',
          is_active: true,
          created_at: new Date().toISOString()
        };
        membersToInsert.push(newMember);
        newMembersCount++;
      }

      // Process payments (we'll add these after members are created)
      const payments = [
        { year: 2021, amount: payment2021 },
        { year: 2022, amount: payment2022 },
        { year: 2023, amount: payment2023 },
        { year: 2024, amount: payment2024 },
        { year: 2025, amount: payment2025 }
      ];

      payments.forEach(p => {
        if (p.amount > 0) {
          paymentsToInsert.push({
            membershipNumber: membershipNumber,
            phone: formattedPhone,
            amount: p.amount,
            year: p.year
          });
          totalPaymentsCount++;
          totalAmount += p.amount;
        }
      });
    }

    console.log('📊 Processing Summary:');
    console.log(`  - New members to create: ${newMembersCount}`);
    console.log(`  - Existing members to update: ${updatedMembersCount}`);
    console.log(`  - Total payments to create: ${totalPaymentsCount}`);
    console.log(`  - Total amount: ${totalAmount.toFixed(2)} SAR\n`);

    // STEP 5: Insert new members
    if (membersToInsert.length > 0) {
      console.log(`📤 Inserting ${membersToInsert.length} new members...`);
      const batchSize = 10;
      let insertedCount = 0;

      for (let i = 0; i < membersToInsert.length; i += batchSize) {
        const batch = membersToInsert.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from('members')
          .insert(batch)
          .select();

        if (error) {
          console.error(`❌ Error inserting batch ${Math.floor(i/batchSize) + 1}:`, error.message);
        } else {
          insertedCount += data.length;
          console.log(`  ✅ Batch ${Math.floor(i/batchSize) + 1}: Inserted ${data.length} members`);
        }
      }
      console.log(`✅ Successfully inserted ${insertedCount} new members\n`);
    }

    // STEP 6: Update existing members
    if (membersToUpdate.length > 0) {
      console.log(`📤 Updating ${membersToUpdate.length} existing members...`);
      let updatedCount = 0;

      for (const member of membersToUpdate) {
        const { error } = await supabase
          .from('members')
          .update(member.data)
          .eq('id', member.id);

        if (!error) {
          updatedCount++;
        }
      }
      console.log(`✅ Successfully updated ${updatedCount} members\n`);
    }

    // STEP 7: Get all members again (including newly created ones)
    console.log('🔄 Getting updated member list...');
    const { data: allMembers } = await supabase
      .from('members')
      .select('id, membership_number, phone');

    // Update lookup maps
    const memberIdByPhone = {};
    const memberIdByNumber = {};
    allMembers?.forEach(m => {
      if (m.phone) memberIdByPhone[m.phone] = m.id;
      if (m.membership_number) memberIdByNumber[m.membership_number] = m.id;
    });

    // STEP 8: Create subscriptions for new members
    console.log('📝 Creating subscriptions for members...');
    const subscriptionsCreated = [];

    for (const member of allMembers || []) {
      // Check if subscription exists
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('member_id', member.id)
        .limit(1);

      if (!existingSub || existingSub.length === 0) {
        subscriptionsCreated.push({
          subscriber_id: member.id,
          member_id: member.id,
          plan_id: planId,
          amount: 50,
          currency: 'SAR',
          status: 'active',
          start_date: '2021-01-01',
          end_date: '2025-12-31'
        });
      }
    }

    if (subscriptionsCreated.length > 0) {
      const { data, error } = await supabase
        .from('subscriptions')
        .insert(subscriptionsCreated)
        .select();

      console.log(`✅ Created ${data?.length || 0} new subscriptions\n`);
    }

    // STEP 9: Get all subscriptions
    const { data: allSubscriptions } = await supabase
      .from('subscriptions')
      .select('id, member_id');

    const subscriptionByMemberId = {};
    allSubscriptions?.forEach(s => {
      subscriptionByMemberId[s.member_id] = s.id;
    });

    // STEP 10: Insert payments
    console.log(`💰 Creating ${paymentsToInsert.length} payment records...`);
    const finalPayments = [];

    for (const payment of paymentsToInsert) {
      const memberId = memberIdByPhone[payment.phone] || memberIdByNumber[payment.membershipNumber];
      const subscriptionId = memberId ? subscriptionByMemberId[memberId] : null;

      if (memberId && subscriptionId) {
        finalPayments.push({
          payer_id: memberId,
          beneficiary_id: memberId,
          subscription_id: subscriptionId,
          amount: payment.amount,
          payment_date: `${payment.year}-06-15`,
          payment_method: 'bank_transfer',
          category: 'subscription',
          status: 'approved',
          reference_number: `IMP-${payment.year}-${payment.membershipNumber}`,
          notes: `Imported from Excel - ${payment.year}`,
          import_year: payment.year,
          excel_import_batch: 'import-2024-12-26',
          created_at: new Date().toISOString()
        });
      }
    }

    if (finalPayments.length > 0) {
      const batchSize = 10;
      let paymentInsertCount = 0;

      for (let i = 0; i < finalPayments.length; i += batchSize) {
        const batch = finalPayments.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from('payments')
          .insert(batch)
          .select();

        if (error) {
          console.error(`❌ Payment batch error:`, error.message);
        } else {
          paymentInsertCount += data.length;
          console.log(`  ✅ Payment batch ${Math.floor(i/batchSize) + 1}: Created ${data.length} payments`);
        }
      }
      console.log(`✅ Successfully created ${paymentInsertCount} payment records\n`);
    }

    // STEP 11: Final verification
    console.log('📊 FINAL VERIFICATION:');
    console.log('======================\n');

    // Count members by balance status
    const { data: statusCount } = await supabase
      .from('members')
      .select('balance_status');

    const sufficient = statusCount?.filter(m => m.balance_status === 'sufficient').length || 0;
    const insufficient = statusCount?.filter(m => m.balance_status === 'insufficient').length || 0;

    console.log('✅ IMPORT COMPLETE!');
    console.log(`  - Total members in database: ${statusCount?.length || 0}`);
    console.log(`  - Members with sufficient balance (≥3000): ${sufficient}`);
    console.log(`  - Members with insufficient balance (<3000): ${insufficient}`);
    console.log(`  - Total payment records created: ${paymentInsertCount || 0}`);
    console.log(`  - Total amount imported: ${totalAmount.toFixed(2)} SAR`);

    console.log('\n🎉 Your Crisis Dashboard should now show REAL data!');
    console.log('   Open http://localhost:3002 and check:');
    console.log('   1. 🚨 لوحة الأزمة - Crisis Dashboard');
    console.log('   2. 📋 البحث عن كشف - Member Statement Search');

  } catch (error) {
    console.error('\n❌ Import error:', error.message);
    console.error(error);
  }
}

// Run the import
importNewExcel();