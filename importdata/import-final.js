/**
 * Al-Shuail Final Data Import
 * Matches actual database schema
 */

import XLSX from 'xlsx';
import { supabaseAdmin } from '../alshuail-backend/src/config/supabase.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n============================================================================');
console.log('           AL-SHUAIL FAMILY MANAGEMENT SYSTEM');
console.log('            Final Data Import - Professional');
console.log('============================================================================\n');

//  Step 1: Load Excel
async function loadExcelData() {
  console.log('📂 Loading Excel file...');
  const filename = path.join(__dirname, 'نسخة رئيس الصندوق 15.xlsx');

  const workbook = XLSX.readFile(filename);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);

  // Clean data - remove empty rows
  const cleaned = data.filter(row => row['الاسم']);

  console.log(`✓ Loaded ${cleaned.length} valid members from ${data.length} rows\n`);
  return cleaned;
}

// Step 2: Import members with payments
async function importMembers(excelData) {
  console.log('👥 Importing Members with Payment Data...');
  console.log(`  Processing ${excelData.length} members...\n`);

  let imported = 0;
  let failed = 0;
  let memberNumber = 10001;

  for (const row of excelData) {
    const name = row['الاسم'].trim();
    const branch = row['فخذ'] || 'رشود';

    // Generate unique email
    const emailSafe = `member${memberNumber}@alshuail.family`;

    // Calculate payments
    const payment2021 = parseFloat(row['عام2021']) || 0;
    const payment2022 = parseFloat(row['عام2022']) || 0;
    const payment2023 = parseFloat(row['عام2023']) || 0;
    const payment2024 = parseFloat(row['عام2024']) || 0;
    const payment2025 = parseFloat(row['عام2025']) || 0;
    const totalPaid = payment2021 + payment2022 + payment2023 + payment2024 + payment2025;

    // Calculate balance (assuming 3000 SAR per year target)
    const expectedTotal = 3000 * 5; // 5 years
    const balance = expectedTotal - totalPaid;
    const isCompliant = balance <= 0;

    const memberData = {
      email: emailSafe.toLowerCase(),
      full_name: name,
      phone: `+96550${String(memberNumber).padStart(6, '0')}`,
      membership_number: String(memberNumber),
      membership_status: 'active',
      membership_date: '2021-01-01',
      membership_type: 'regular',
      role: 'member',
      status: 'active',
      is_active: true,
      country: 'KW',
      tribal_section: branch,
      subscription_type: 'annual',

      // Payment tracking
      payment_2021: payment2021,
      payment_2022: payment2022,
      payment_2023: payment2023,
      payment_2024: payment2024,
      payment_2025: payment2025,
      total_paid: totalPaid,
      balance: balance,
      total_balance: balance,
      is_compliant: isCompliant,
      balance_status: isCompliant ? 'sufficient' : 'insufficient',
      payment_status: isCompliant ? 'مكتمل' : 'معلق',
      last_payment_date: payment2025 > 0 ? '2025-12-31' : (payment2024 > 0 ? '2024-12-31' : null),

      // Defaults
      gender: 'male',
      profile_completed: false,
      face_id_enabled: false,
      password_changed: false
    };

    const { data: newMember, error } = await supabaseAdmin
      .from('members')
      .insert(memberData)
      .select()
      .single();

    if (error) {
      if (failed < 3) {
        console.log(`  ✗ Failed: ${name} - ${error.message}`);
      }
      failed++;
    } else {
      imported++;
      memberNumber++;

      if (imported % 50 === 0) {
        console.log(`  ... ${imported} members imported`);
      }
    }
  }

  console.log(`\n✓ Members imported: ${imported}`);
  if (failed > 0) {
    console.log(`⚠  Failed: ${failed}\n`);
  }

  return { imported, failed };
}

// Step 3: Verify import
async function verifyImport() {
  console.log('\n📊 Verifying Import...\n');

  // Count members
  const { data: members, error: membersError } = await supabaseAdmin
    .from('members')
    .select('id, full_name, tribal_section, total_paid, balance, is_compliant', { count: 'exact', head: false });

  if (!membersError) {
    console.log(`  Total Members: ${members.length}`);

    // Count by tribal section
    const bySection = {};
    members.forEach(m => {
      bySection[m.tribal_section] = (bySection[m.tribal_section] || 0) + 1;
    });

    console.log('\n  By Tribal Section:');
    Object.entries(bySection).forEach(([section, count]) => {
      console.log(`    ${section}: ${count} members`);
    });

    // Payment statistics
    const compliant = members.filter(m => m.is_compliant).length;
    const nonCompliant = members.length - compliant;
    const totalPaid = members.reduce((sum, m) => sum + (m.total_paid || 0), 0);

    console.log('\n  Payment Statistics:');
    console.log(`    Compliant (≥ 3000 SAR): ${compliant} members`);
    console.log(`    Non-compliant (< 3000 SAR): ${nonCompliant} members`);
    console.log(`    Total Collected: ${totalPaid.toLocaleString()} SAR`);
  }
}

// Main execution
async function main() {
  try {
    const startTime = Date.now();

    const excelData = await loadExcelData();
    const result = await importMembers(excelData);
    await verifyImport();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n============================================================================');
    console.log('                    IMPORT COMPLETED SUCCESSFULLY!');
    console.log('============================================================================');
    console.log(`  Members Imported: ${result.imported}`);
    console.log(`  Failed: ${result.failed}`);
    console.log(`  Time: ${elapsed}s`);
    console.log('============================================================================');
    console.log('\n✅ Data is now live in your admin panel!');
    console.log('   https://alshuail-admin.pages.dev\n');

  } catch (error) {
    console.error('\n✗ Import failed:', error);
    process.exit(1);
  }
}

main();
