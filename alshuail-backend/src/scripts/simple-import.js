import { query } from '../services/database.js';
import XLSX from 'xlsx';
import _fs from 'fs';
import path from 'path';
import { log } from '../utils/logger.js';

const simpleImport = async () => {
  log.info('Starting Simple Member Import...\n');

  try {
    // Read Excel file
    const filePath = path.join(process.cwd(), 'AlShuail_Members_Prefilled_Import.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    log.info(`Found ${data.length} members to import\n`);

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
        // Insert or update member via upsert
        let member;
        try {
          const { rows: upsertRows } = await query(
            `INSERT INTO members (membership_number, full_name, phone, is_active${memberData.email ? ', email' : ''})
             VALUES ($1, $2, $3, $4${memberData.email ? ', $5' : ''})
             ON CONFLICT (membership_number) DO UPDATE SET
               full_name = EXCLUDED.full_name,
               phone = EXCLUDED.phone,
               is_active = EXCLUDED.is_active
             RETURNING *`,
            memberData.email
              ? [memberData.membership_number, memberData.full_name, memberData.phone, memberData.is_active, memberData.email]
              : [memberData.membership_number, memberData.full_name, memberData.phone, memberData.is_active]
          );
          member = upsertRows[0];
        } catch (upsertErr) {
          // Try plain insert without conflict resolution
          const { rows: insertRows } = await query(
            `INSERT INTO members (membership_number, full_name, phone, is_active)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [memberData.membership_number, memberData.full_name, memberData.phone, memberData.is_active]
          );
          member = insertRows[0];
        }

        // Create payment records if member was successfully created
        if (member) {
          const years = [
            { year: 2021, amount: payment2021 },
            { year: 2022, amount: payment2022 },
            { year: 2023, amount: payment2023 },
            { year: 2024, amount: payment2024 },
            { year: 2025, amount: payment2025 }
          ];

          for (const yearData of years) {
            if (yearData.amount > 0) {
              try {
                await query(
                  `INSERT INTO payments (payer_id, amount, category, payment_method, status, title, reference_number)
                   VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                  [
                    member.id,
                    yearData.amount,
                    'subscription',
                    'bank_transfer',
                    'completed',
                    `اشتراك ${yearData.year}`,
                    `${memberData.membership_number}-${yearData.year}`
                  ]
                );
              } catch (_payErr) {
                // Payment might already exist, skip
              }
            }
          }
        }

        successCount++;
        const status = totalBalance >= 3000 ? 'OK' : 'LOW';
        const shortfall = Math.max(0, 3000 - totalBalance);
        log.info(`[${status}] [${i + 1}/${data.length}] ${memberData.full_name}`);
        log.info(`   الرصيد: ${totalBalance} ريال ${shortfall > 0 ? `(النقص: ${shortfall} ريال)` : '(مكتمل)'}`);

      } catch (error) {
        errorCount++;
        log.error(`خطأ في ${memberData.full_name}: ${error.message}`);
      }
    }

    // Summary
    log.info(`\n${'='.repeat(50)}`);
    log.info('ملخص الاستيراد');
    log.info('='.repeat(50));
    log.info(`تم استيراد: ${successCount} عضو`);
    log.info(`فشل: ${errorCount} عضو`);

    // Check compliance
    const { rows: allPayments } = await query(
      "SELECT payer_id, amount FROM payments WHERE status = 'completed'"
    );

    const memberBalances = {};
    allPayments?.forEach(payment => {
      memberBalances[payment.payer_id] = (memberBalances[payment.payer_id] || 0) + parseFloat(payment.amount);
    });

    const compliantCount = Object.values(memberBalances).filter(balance => balance >= 3000).length;
    const totalMembers = Object.keys(memberBalances).length;

    log.info(`\nحالة الصندوق:`);
    log.info(`   - أعضاء فوق 3000 ريال: ${compliantCount} (${((compliantCount / totalMembers) * 100).toFixed(1)}%)`);
    log.info(`   - أعضاء دون 3000 ريال: ${totalMembers - compliantCount} (${(((totalMembers - compliantCount) / totalMembers) * 100).toFixed(1)}%)`);

    log.info('\nاكتملت عملية الاستيراد!');

  } catch (error) {
    log.error('خطأ كبير:', error);
  }
};

// Run import
simpleImport().then(() => {
  log.info('\nانتهى...');
  process.exit(0);
}).catch(error => {
  log.error('خطأ:', error);
  process.exit(1);
});
