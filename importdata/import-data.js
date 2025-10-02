/**
 * Al-Shuail Data Import - Node.js Version
 * Professional data import from Excel to Supabase
 */

import XLSX from 'xlsx';
import { supabaseAdmin } from '../alshuail-backend/src/config/supabase.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Family branch mappings
const FAMILY_BRANCHES = {
  'رشود': 'RSHOD',
  'الدغيش': 'DGHSH',
  'رشيد': 'RSHID',
  'العقاب': 'AQAB',
  'الاحيمر': 'AHMR',
  'العيد': 'AYD',
  'الشامخ': 'SHMKH',
  'الرشيد': 'RSHD',
  'الشبيعان': 'SHBAN',
  'المسعود': 'MSOD'
};

console.log('\n============================================================================');
console.log('           AL-SHUAIL FAMILY MANAGEMENT SYSTEM');
console.log('              Professional Data Import');
console.log('============================================================================\n');

// Step 1: Load Excel file
async function loadExcelData() {
  console.log('📂 Loading Excel file...');
  const filename = path.join(__dirname, 'نسخة رئيس الصندوق 15.xlsx');

  const workbook = XLSX.readFile(filename);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);

  console.log(`✓ Loaded ${data.length} rows from Excel\n`);
  return data;
}

// Step 2: Import family branches
async function importFamilyBranches() {
  console.log('🌳 Importing Family Branches...');

  const branchMap = {};

  for (const [nameAr, code] of Object.entries(FAMILY_BRANCHES)) {
    // Check if branch exists
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('family_branches')
      .select('id')
      .eq('branch_name', nameAr)
      .single();

    if (existing) {
      branchMap[nameAr] = existing.id;
      console.log(`  ℹ Branch '${nameAr}' already exists`);
    } else {
      // Create branch
      const { data: newBranch, error } = await supabaseAdmin
        .from('family_branches')
        .insert({
          branch_code: code,
          branch_name: nameAr,
          branch_name_ar: nameAr,
          branch_name_en: nameAr,
          description_ar: `فرع عائلة ${nameAr}`,
          description_en: `Family branch ${nameAr}`,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error(`  ✗ Error creating branch '${nameAr}':`, error.message);
      } else {
        branchMap[nameAr] = newBranch.id;
        console.log(`  ✓ Created branch: ${nameAr}`);
      }
    }
  }

  console.log(`\n✓ Family branches ready: ${Object.keys(branchMap).length} total\n`);
  return branchMap;
}

// Step 3: Check members table structure
async function checkMembersSchema() {
  console.log('🔍 Checking members table schema...');

  // Try to get table structure by attempting a minimal insert and reading the error
  const { error } = await supabaseAdmin.from('members').insert({}).select();

  if (error) {
    console.log(`  Schema check: ${error.message}\n`);

    // Get a sample member if exists
    const { data: sample } = await supabaseAdmin
      .from('members')
      .select('*')
      .limit(1)
      .single();

    if (sample) {
      console.log('  Sample member columns:', Object.keys(sample));
    }
  }

  // Return the required field found from error message
  return error?.message || '';
}

// Step 4: Import members
async function importMembers(excelData, branchMap) {
  console.log('👥 Importing Members...');
  console.log(`  Processing ${excelData.length} members...\n`);

  const memberMap = {};
  let imported = 0;
  let failed = 0;

  // First, let's check what columns the members table actually has
  const { data: sampleQuery } = await supabaseAdmin
    .from('members')
    .select('*')
    .limit(0);

  for (const row of excelData) {
    const name = row['الاسم'];
    if (!name) continue;

    const branch = row['فخذ'] || 'رشود';
    const branch_id = branchMap[branch] || branchMap['رشود'];

    // Generate a unique email from name
    const emailSafe = name.replace(/\s+/g, '_').replace(/[^\w]/g, '') + '@alshuail.family';

    const memberData = {
      email: emailSafe.toLowerCase(),
      name: name.trim(),
      phone: `+965${Math.floor(Math.random() * 90000000 + 10000000)}`, // Dummy phone
      family_branch_id: branch_id,
      is_active: true,
      membership_status: 'active'
    };

    const { data: newMember, error } = await supabaseAdmin
      .from('members')
      .insert(memberData)
      .select()
      .single();

    if (error) {
      if (failed < 3) { // Only show first 3 errors
        console.log(`  ✗ Failed: ${name} - ${error.message}`);
      }
      failed++;
    } else {
      memberMap[excelData.indexOf(row)] = newMember.id;
      imported++;

      if (imported % 50 == 0) {
        console.log(`  ... ${imported} members imported`);
      }
    }
  }

  console.log(`\n✓ Members imported: ${imported}`);
  if (failed > 0) {
    console.log(`⚠  Failed: ${failed}\n`);
  }

  return memberMap;
}

// Step 5: Import payments
async function importPayments(excelData, memberMap) {
  console.log('\n💰 Importing Payments...');

  const years = {
    'عام2021': 2021,
    'عام2022': 2022,
    'عام2023': 2023,
    'عام2024': 2024,
    'عام2025': 2025
  };

  let totalImported = 0;

  for (const [colName, year] of Object.entries(years)) {
    let yearCount = 0;

    for (let idx = 0; idx < excelData.length; idx++) {
      const row = excelData[idx];
      const memberId = memberMap[idx];

      if (!memberId) continue;

      const amount = parseFloat(row[colName]);
      if (!amount || amount <= 0) continue;

      const { error } = await supabaseAdmin
        .from('payments')
        .insert({
          payer_id: memberId,
          amount: amount,
          payment_date: `${year}-12-31`,
          payment_method: 'cash',
          status: 'completed',
          payment_type: 'annual_subscription',
          description: `Annual membership ${year}`
        });

      if (!error) yearCount++;
    }

    console.log(`  ✓ Year ${year}: ${yearCount} payments`);
    totalImported += yearCount;
  }

  console.log(`\n✓ Total payments imported: ${totalImported}\n`);
  return totalImported;
}

// Main execution
async function main() {
  try {
    const startTime = Date.now();

    const excelData = await loadExcelData();
    const branchMap = await importFamilyBranches();

    // Check schema before importing
    await checkMembersSchema();

    const memberMap = await importMembers(excelData, branchMap);
    const paymentCount = await importPayments(excelData, memberMap);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('============================================================================');
    console.log('                    IMPORT COMPLETED SUCCESSFULLY!');
    console.log('============================================================================');
    console.log(`  Members: ${Object.keys(memberMap).length}`);
    console.log(`  Payments: ${paymentCount}`);
    console.log(`  Time: ${elapsed}s`);
    console.log('============================================================================\n');

  } catch (error) {
    console.error('\n✗ Import failed:', error);
    process.exit(1);
  }
}

main();
