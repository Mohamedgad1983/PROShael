import { supabase } from '../config/database.js';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const importMembers = async () => {
  console.log('🚀 Starting Member Import Process...\n');

  try {
    // Read Excel file
    const filePath = path.join(process.cwd(), 'AlShuail_Members_Prefilled_Import.xlsx');

    if (!fs.existsSync(filePath)) {
      console.error('❌ Excel file not found at:', filePath);
      return;
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 Found ${data.length} members in Excel file\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process each member
    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      // Extract data (handle both Arabic and English column headers)
      // Only use columns that exist in the members table
      const memberData = {
        membership_number: row['رقم العضوية\nmember_id'] || `SH-${10001 + i}`,
        full_name: row['الاسم الكامل (عربي)\nfull_name_ar'] || row['الاسم الكامل'],
        phone: row['رقم الجوال\nphone_number'] || row['رقم الهاتف'],
        email: row['البريد الإلكتروني\nemail'] || '',
        is_active: true,
        joined_date: new Date('2021-01-01').toISOString(),
        family_id: null  // Will be used for tribal section grouping later
      };

      // Store additional data for later use
      const additionalData = {
        full_name_en: row['Full Name (English)\nfull_name_en'] || '',
        country: row['البلد\ncountry'] || 'SA',
        tribal_section: row['الفخذ\ntribal_section'] || '',
        national_id: row['رقم الهوية\nnational_id'] || '',
        address: row['العنوان\naddress'] || '',
        subscription_type: row['نوع الاشتراك\nsubscription_type'] || 'monthly',
        subscription_quantity: parseInt(row['كمية الاشتراك\nsubscription_quantity'] || 1),
        notes: row['ملاحظات\nnotes'] || ''
      };

      // Calculate total balance from payment history
      const payment2021 = parseFloat(row['مدفوعات 2021\npayment_2021'] || 0);
      const payment2022 = parseFloat(row['مدفوعات 2022\npayment_2022'] || 0);
      const payment2023 = parseFloat(row['مدفوعات 2023\npayment_2023'] || 0);
      const payment2024 = parseFloat(row['مدفوعات 2024\npayment_2024'] || 0);
      const payment2025 = parseFloat(row['مدفوعات 2025\npayment_2025'] || 0);

      const totalBalance = payment2021 + payment2022 + payment2023 + payment2024 + payment2025;

      try {
        // 1. Insert member
        const { data: member, error: memberError } = await supabase
          .from('members')
          .upsert({
            ...memberData,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'membership_number'
          })
          .select()
          .single();

        if (memberError) {
          throw memberError;
        }

        // 2. Create payment records for each year
        const payments = [];
        const years = [
          { year: 2021, amount: payment2021 },
          { year: 2022, amount: payment2022 },
          { year: 2023, amount: payment2023 },
          { year: 2024, amount: payment2024 },
          { year: 2025, amount: payment2025 }
        ];

        for (const yearData of years) {
          if (yearData.amount > 0) {
            payments.push({
              payer_id: member.id,
              amount: yearData.amount,
              category: 'subscription',
              payment_method: 'bank_transfer',
              status: 'completed',
              title: `اشتراك سنة ${yearData.year}`,
              description: `دفعة اشتراك للعام ${yearData.year}`,
              reference_number: `${memberData.membership_number}-${yearData.year}`,
              created_at: new Date(`${yearData.year}-01-01`).toISOString()
            });
          }
        }

        // Insert all payments
        if (payments.length > 0) {
          const { error: paymentError } = await supabase
            .from('payments')
            .upsert(payments, {
              onConflict: 'reference_number'
            });

          if (paymentError) {
            console.warn(`⚠️ Payment error for ${memberData.full_name}:`, paymentError.message);
          }
        }

        // 3. Create subscription record
        if (additionalData.subscription_quantity > 0) {
          const { error: subError } = await supabase
            .from('subscriptions')
            .upsert({
              member_id: member.id,
              plan_name: additionalData.subscription_type === 'monthly' ? 'اشتراك شهري' : 'اشتراك سنوي',
              amount: additionalData.subscription_quantity * 50, // 50 SAR per unit
              duration_months: additionalData.subscription_type === 'monthly' ? 1 : 12,
              status: 'active',
              start_date: new Date().toISOString(),
              end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            }, {
              onConflict: 'member_id'
            });

          if (subError) {
            console.warn(`⚠️ Subscription error for ${memberData.full_name}:`, subError.message);
          }
        }

        successCount++;
        const status = totalBalance >= 3000 ? '✅' : '❌';
        console.log(`${status} [${i + 1}/${data.length}] ${memberData.full_name} - Balance: ${totalBalance} SAR`);

      } catch (error) {
        errorCount++;
        errors.push({
          member: memberData.full_name,
          error: error.message
        });
        console.error(`❌ Error importing ${memberData.full_name}:`, error.message);
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Successfully imported: ${successCount} members`);
    console.log(`❌ Failed imports: ${errorCount} members`);

    // Calculate compliance statistics
    const { data: allMembers } = await supabase
      .from('members')
      .select('id');

    const { data: payments } = await supabase
      .from('payments')
      .select('payer_id, amount')
      .eq('status', 'completed');

    const memberBalances = {};
    payments?.forEach(payment => {
      memberBalances[payment.payer_id] = (memberBalances[payment.payer_id] || 0) + parseFloat(payment.amount);
    });

    const compliantCount = Object.values(memberBalances).filter(balance => balance >= 3000).length;
    const nonCompliantCount = allMembers?.length - compliantCount;

    console.log(`\n💰 Financial Status:`);
    console.log(`   - Members above 3000 SAR: ${compliantCount} (${((compliantCount / allMembers?.length) * 100).toFixed(1)}%)`);
    console.log(`   - Members below 3000 SAR: ${nonCompliantCount} (${((nonCompliantCount / allMembers?.length) * 100).toFixed(1)}%)`);

    if (errors.length > 0) {
      console.log('\n⚠️ Import Errors:');
      errors.forEach(err => {
        console.log(`   - ${err.member}: ${err.error}`);
      });
    }

    console.log('\n✨ Import process completed!');
    console.log('🚀 Crisis Dashboard will now show all member balances');

  } catch (error) {
    console.error('❌ Fatal error during import:', error);
  }
};

// Run the import
importMembers().then(() => {
  console.log('\n👋 Exiting...');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});