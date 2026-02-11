import { query } from '../services/database.js';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { log } from '../utils/logger.js';

const importMembers = async () => {
  log.info('Starting Member Import Process...\n');

  try {
    // Read Excel file
    const filePath = path.join(process.cwd(), 'AlShuail_Members_Prefilled_Import.xlsx');

    if (!fs.existsSync(filePath)) {
      log.error('Excel file not found at:', filePath);
      return;
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    log.info(`Found ${data.length} members in Excel file\n`);

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
        // 1. Upsert member
        const { rows: memberRows } = await query(
          `INSERT INTO members (membership_number, full_name, phone, email, is_active, joined_date, family_id, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (membership_number) DO UPDATE SET
             full_name = EXCLUDED.full_name,
             phone = EXCLUDED.phone,
             email = EXCLUDED.email,
             is_active = EXCLUDED.is_active,
             updated_at = EXCLUDED.updated_at
           RETURNING *`,
          [
            memberData.membership_number,
            memberData.full_name,
            memberData.phone,
            memberData.email,
            memberData.is_active,
            memberData.joined_date,
            memberData.family_id,
            new Date().toISOString()
          ]
        );

        const member = memberRows[0];

        // 2. Create payment records for each year
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
                `INSERT INTO payments (payer_id, amount, category, payment_method, status, title, description, reference_number, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (reference_number) DO NOTHING`,
                [
                  member.id,
                  yearData.amount,
                  'subscription',
                  'bank_transfer',
                  'completed',
                  `اشتراك سنة ${yearData.year}`,
                  `دفعة اشتراك للعام ${yearData.year}`,
                  `${memberData.membership_number}-${yearData.year}`,
                  new Date(`${yearData.year}-01-01`).toISOString()
                ]
              );
            } catch (payErr) {
              log.warn(`Payment error for ${memberData.full_name}:`, payErr.message);
            }
          }
        }

        // 3. Create subscription record
        if (additionalData.subscription_quantity > 0) {
          try {
            await query(
              `INSERT INTO subscriptions (member_id, plan_name, amount, duration_months, status, start_date, end_date)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (member_id) DO UPDATE SET
                 plan_name = EXCLUDED.plan_name,
                 amount = EXCLUDED.amount,
                 status = EXCLUDED.status`,
              [
                member.id,
                additionalData.subscription_type === 'monthly' ? 'اشتراك شهري' : 'اشتراك سنوي',
                additionalData.subscription_quantity * 50,
                additionalData.subscription_type === 'monthly' ? 1 : 12,
                'active',
                new Date().toISOString(),
                new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
              ]
            );
          } catch (subErr) {
            log.warn(`Subscription error for ${memberData.full_name}:`, subErr.message);
          }
        }

        successCount++;
        const status = totalBalance >= 3000 ? 'OK' : 'LOW';
        log.info(`[${status}] [${i + 1}/${data.length}] ${memberData.full_name} - Balance: ${totalBalance} SAR`);

      } catch (error) {
        errorCount++;
        errors.push({
          member: memberData.full_name,
          error: error.message
        });
        log.error(`Error importing ${memberData.full_name}:`, error.message);
      }
    }

    // Print summary
    log.info(`\n${'='.repeat(50)}`);
    log.info('IMPORT SUMMARY');
    log.info('='.repeat(50));
    log.info(`Successfully imported: ${successCount} members`);
    log.info(`Failed imports: ${errorCount} members`);

    // Calculate compliance statistics
    const { rows: allMembers } = await query('SELECT id FROM members');

    const { rows: payments } = await query(
      "SELECT payer_id, amount FROM payments WHERE status = 'completed'"
    );

    const memberBalances = {};
    payments?.forEach(payment => {
      memberBalances[payment.payer_id] = (memberBalances[payment.payer_id] || 0) + parseFloat(payment.amount);
    });

    const compliantCount = Object.values(memberBalances).filter(balance => balance >= 3000).length;
    const nonCompliantCount = allMembers?.length - compliantCount;

    log.info(`\nFinancial Status:`);
    log.info(`   - Members above 3000 SAR: ${compliantCount} (${((compliantCount / allMembers?.length) * 100).toFixed(1)}%)`);
    log.info(`   - Members below 3000 SAR: ${nonCompliantCount} (${((nonCompliantCount / allMembers?.length) * 100).toFixed(1)}%)`);

    if (errors.length > 0) {
      log.info('\nImport Errors:');
      errors.forEach(err => {
        log.info(`   - ${err.member}: ${err.error}`);
      });
    }

    log.info('\nImport process completed!');

  } catch (error) {
    log.error('Fatal error during import:', error);
  }
};

// Run the import
importMembers().then(() => {
  log.info('\nExiting...');
  process.exit(0);
}).catch(error => {
  log.error('Fatal error:', error);
  process.exit(1);
});
