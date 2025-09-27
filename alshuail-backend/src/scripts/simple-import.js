import { supabase } from '../config/database.js';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const simpleImport = async () => {
  console.log('🚀 Starting Simple Member Import...\n');

  try {
    // Read Excel file
    const filePath = path.join(process.cwd(), 'AlShuail_Members_Prefilled_Import.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 Found ${data.length} members to import\n`);

    let successCount = 0;
    let errorCount = 0;

    // Process each member
    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      // Calculate total balance
      const payment2021 = parseFloat(row['مدفوعات 2021\npayment_2021'] || 0);
      const payment2022 = parseFloat(row['مدفوعات 2022\npayment_2022'] || 0);
      const payment2023 = parseFloat(row['مدفوعات 2023\npayment_2023'] || 0);
      const payment2024 = parseFloat(row['مدفوعات 2024\npayment_2024'] || 0);
      const payment2025 = parseFloat(row['مدفوعات 2025\npayment_2025'] || 0);
      const totalBalance = payment2021 + payment2022 + payment2023 + payment2024 + payment2025;

      // Member data - only essential fields that exist in database
      const memberData = {
        membership_number: row['رقم العضوية\nmember_id'] || `SH-${10001 + i}`,
        full_name: row['الاسم الكامل (عربي)\nfull_name_ar'] || `عضو ${i + 1}`,
        phone: row['رقم الجوال\nphone_number'] || `050${String(1000000 + i).padStart(7, '0')}`,
        is_active: true
      };

      // Only add email if it's not empty
      const emailValue = row['البريد الإلكتروني\nemail'];
      if (emailValue && emailValue.trim() !== '') {
        memberData.email = emailValue;
      }

      try {
        // Insert or update member
        const { data: member, error: memberError } = await supabase
          .from('members')
          .upsert(memberData, {
            onConflict: 'membership_number'
          })
          .select()
          .single();

        if (memberError) {
          // Try insert without conflict resolution
          const { data: newMember, error: insertError } = await supabase
            .from('members')
            .insert(memberData)
            .select()
            .single();

          if (insertError) {
            throw insertError;
          }
          member = newMember;
        }

        // Create payment records if member was successfully created
        if (member) {
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
                title: `اشتراك ${yearData.year}`,
                reference_number: `${memberData.membership_number}-${yearData.year}`
              });
            }
          }

          if (payments.length > 0) {
            await supabase.from('payments').insert(payments);
          }
        }

        successCount++;
        const status = totalBalance >= 3000 ? '✅' : '❌';
        const shortfall = Math.max(0, 3000 - totalBalance);
        console.log(`${status} [${i + 1}/${data.length}] ${memberData.full_name}`);
        console.log(`   الرصيد: ${totalBalance} ريال ${shortfall > 0 ? `(النقص: ${shortfall} ريال)` : '(مكتمل)'}`);

      } catch (error) {
        errorCount++;
        console.error(`❌ خطأ في ${memberData.full_name}: ${error.message}`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 ملخص الاستيراد');
    console.log('='.repeat(50));
    console.log(`✅ تم استيراد: ${successCount} عضو`);
    console.log(`❌ فشل: ${errorCount} عضو`);

    // Check compliance
    const { data: allPayments } = await supabase
      .from('payments')
      .select('payer_id, amount')
      .eq('status', 'completed');

    const memberBalances = {};
    allPayments?.forEach(payment => {
      memberBalances[payment.payer_id] = (memberBalances[payment.payer_id] || 0) + parseFloat(payment.amount);
    });

    const compliantCount = Object.values(memberBalances).filter(balance => balance >= 3000).length;
    const totalMembers = Object.keys(memberBalances).length;

    console.log(`\n💰 حالة الصندوق:`);
    console.log(`   - أعضاء فوق 3000 ريال: ${compliantCount} (${((compliantCount / totalMembers) * 100).toFixed(1)}%)`);
    console.log(`   - أعضاء دون 3000 ريال: ${totalMembers - compliantCount} (${(((totalMembers - compliantCount) / totalMembers) * 100).toFixed(1)}%)`);

    console.log('\n✨ اكتملت عملية الاستيراد!');
    console.log('🚀 لوحة الأزمة ستعرض الآن جميع أرصدة الأعضاء');

  } catch (error) {
    console.error('❌ خطأ كبير:', error);
  }
};

// Run import
simpleImport().then(() => {
  console.log('\n👋 انتهى...');
  process.exit(0);
}).catch(error => {
  console.error('خطأ:', error);
  process.exit(1);
});