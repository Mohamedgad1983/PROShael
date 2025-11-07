const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Supabase URL:', supabaseUrl ? 'Found' : 'Missing');
console.log('🔧 Service Key:', supabaseServiceKey ? 'Found (length: ' + supabaseServiceKey.length + ')' : 'Missing');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Read and process Excel file
async function importExcelData() {
  try {
    console.log('📊 Reading Excel file...');

    // Read the Excel file
    const filePath = path.join(__dirname, '..', 'alshuail-backend', 'AlShuail_Members_Prefilled_Import.xlsx');
    console.log(`📁 Reading file from: ${filePath}`);
    const workbook = XLSX.readFile(filePath);

    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`✅ Found ${data.length} rows in Excel file`);

    // Process each row
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const row of data) {
      try {
        // Extract member ID and payment data
        let memberNo = row['رقم العضوية\nmember_id'] || row['member_id'];
        // Strip "SH-" prefix if present
        if (memberNo && typeof memberNo === 'string') {
          memberNo = memberNo.replace(/^SH-/i, '');
        }
        const payment2021 = parseFloat(row['مدفوعات 2021\npayment_2021'] || row['payment_2021'] || 0);
        const payment2022 = parseFloat(row['مدفوعات 2022\npayment_2022'] || row['payment_2022'] || 0);
        const payment2023 = parseFloat(row['مدفوعات 2023\npayment_2023'] || row['payment_2023'] || 0);
        const payment2024 = parseFloat(row['مدفوعات 2024\npayment_2024'] || row['payment_2024'] || 0);
        const payment2025 = parseFloat(row['مدفوعات 2025\npayment_2025'] || row['payment_2025'] || 0);

        if (!memberNo) {
          console.warn('⚠️ Skipping row - no member ID found');
          continue;
        }

        console.log(`Processing member ${memberNo}...`);

        // Get member from database (use membership_number column)
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('id, membership_number')
          .eq('membership_number', memberNo)
          .maybeSingle();

        if (memberError || !member) {
          errors.push(`Member ${memberNo} not found in database`);
          errorCount++;
          continue;
        }

        // Insert payment records for each year
        const payments = [
          { year: 2021, amount: payment2021 },
          { year: 2022, amount: payment2022 },
          { year: 2023, amount: payment2023 },
          { year: 2024, amount: payment2024 },
          { year: 2025, amount: payment2025 }
        ];

        for (const payment of payments) {
          if (payment.amount > 0) {
            // Check if payment already exists
            const { data: existingPayment } = await supabase
              .from('payments_yearly')
              .select('id')
              .eq('member_id', member.id)
              .eq('year', payment.year)
              .single();

            if (existingPayment) {
              // Update existing payment
              const { error: updateError } = await supabase
                .from('payments_yearly')
                .update({
                  amount: payment.amount,
                  payment_date: `${payment.year}-12-31`,
                  payment_method: 'bank_transfer',
                  updated_at: new Date().toISOString()
                })
                .eq('id', existingPayment.id);

              if (updateError) {
                console.error(`Error updating payment for ${memberNo} year ${payment.year}:`, updateError);
                errors.push(`Failed to update payment for ${memberNo} year ${payment.year}`);
              } else {
                console.log(`  ✓ Updated ${payment.year}: ${payment.amount} SAR`);
              }
            } else {
              // Insert new payment
              const { error: insertError } = await supabase
                .from('payments_yearly')
                .insert({
                  member_id: member.id,
                  year: payment.year,
                  amount: payment.amount,
                  payment_date: `${payment.year}-12-31`,
                  payment_method: 'bank_transfer',
                  receipt_number: `IMPORT-${memberNo}-${payment.year}`,
                  notes: 'Imported from Excel spreadsheet'
                });

              if (insertError) {
                console.error(`Error inserting payment for ${memberNo} year ${payment.year}:`, insertError);
                errors.push(`Failed to insert payment for ${memberNo} year ${payment.year}`);
              } else {
                console.log(`  ✓ Inserted ${payment.year}: ${payment.amount} SAR`);
              }
            }
          }
        }

        // Update member's total balance (using current_balance column)
        const totalPaid = payment2021 + payment2022 + payment2023 + payment2024 + payment2025;

        const { error: balanceError } = await supabase
          .from('members')
          .update({
            current_balance: totalPaid,
            updated_at: new Date().toISOString()
          })
          .eq('id', member.id);

        if (balanceError) {
          console.error(`Error updating balance for ${memberNo}:`, balanceError);
          errors.push(`Failed to update balance for ${memberNo}`);
        } else {
          console.log(`  ✓ Updated total balance: ${totalPaid} SAR`);
          successCount++;
        }

      } catch (rowError) {
        console.error('Error processing row:', rowError);
        errorCount++;
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📈 IMPORT SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Successfully processed: ${successCount} members`);
    console.log(`❌ Errors encountered: ${errorCount}`);

    if (errors.length > 0) {
      console.log('\n⚠️ Error Details:');
      errors.forEach(err => console.log(`  - ${err}`));
    }

    // Verify import by getting statistics
    const { data: stats, error: statsError } = await supabase
      .from('member_statements')
      .select('compliance_status, member_id');

    if (!statsError && stats) {
      const compliant = stats.filter(s => s.compliance_status === 'compliant').length;
      const nonCompliant = stats.filter(s => s.compliance_status === 'non-compliant').length;

      console.log('\n📊 COMPLIANCE STATISTICS:');
      console.log(`  - Compliant members (≥3000 SAR): ${compliant}`);
      console.log(`  - Non-compliant members (<3000 SAR): ${nonCompliant}`);
      console.log(`  - Compliance rate: ${((compliant / (compliant + nonCompliant)) * 100).toFixed(1)}%`);
    }

  } catch (error) {
    console.error('Fatal error during import:', error);
    process.exit(1);
  }
}

// Alternative: Generate SQL statements instead of direct import
async function generateSQLStatements() {
  try {
    console.log('📊 Generating SQL statements from Excel...');

    // Read the Excel file
    const filePath = path.join(__dirname, 'alshuail-backend', 'AlShuail_Members_Prefilled_Import.xlsx');
    const workbook = XLSX.readFile(filePath);

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const sqlStatements = [];

    for (const row of data) {
      const memberNo = row['رقم العضوية\nmember_id'] || row['member_id'];
      const payment2021 = parseFloat(row['مدفوعات 2021\npayment_2021'] || row['payment_2021'] || 0);
      const payment2022 = parseFloat(row['مدفوعات 2022\npayment_2022'] || row['payment_2022'] || 0);
      const payment2023 = parseFloat(row['مدفوعات 2023\npayment_2023'] || row['payment_2023'] || 0);
      const payment2024 = parseFloat(row['مدفوعات 2024\npayment_2024'] || row['payment_2024'] || 0);
      const payment2025 = parseFloat(row['مدفوعات 2025\npayment_2025'] || row['payment_2025'] || 0);

      if (!memberNo) continue;

      // Generate SQL call to import function
      sqlStatements.push(
        `SELECT import_payments_from_excel('${memberNo}', ${payment2021}, ${payment2022}, ${payment2023}, ${payment2024}, ${payment2025});`
      );
    }

    // Save SQL to file
    const fs = require('fs');
    const sqlContent = sqlStatements.join('\n');
    fs.writeFileSync('import-payments.sql', sqlContent);

    console.log(`✅ Generated ${sqlStatements.length} SQL statements`);
    console.log('📁 Saved to import-payments.sql');
    console.log('\nTo import, run this SQL file in your Supabase SQL editor');

  } catch (error) {
    console.error('Error generating SQL:', error);
  }
}

// Main execution
async function main() {
  console.log('🚀 Al-Shuail Payment Import Tool\n');

  const args = process.argv.slice(2);

  if (args.includes('--sql')) {
    await generateSQLStatements();
  } else {
    console.log('Choose import method:');
    console.log('1. Direct import to Supabase (requires service key)');
    console.log('2. Generate SQL statements\n');
    console.log('Running direct import...\n');
    await importExcelData();
  }
}

// Run the import
main().catch(console.error);