/**
 * Diya Contributions Import - Node.js Version
 * Professional import matching actual database schema
 */

import XLSX from 'xlsx';
import { supabaseAdmin } from '../alshuail-backend/src/config/supabase.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('          AL-SHUAIL DIYA CONTRIBUTIONS IMPORT');
console.log('═══════════════════════════════════════════════════════════════\n');

const DIYA_ACTIVITIES = {
  'دية نادر': 'e6a111c6-53b0-481a-af45-02fdd565a916',
  'دية شرهان1': '36666c2f-78d1-4103-b97a-a752278f6660',
  'دية شرهان2': 'b380545b-bcf7-40d0-b10e-2cb9ae04ede2'
};

async function loadExcelData() {
  console.log('📂 Loading Excel file...');
  const filename = path.join(__dirname, '../importdata/نسخة رئيس الصندوق 15.xlsx');

  const workbook = XLSX.readFile(filename);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);

  const cleaned = data.filter(row => row['الاسم']);
  console.log(`✓ Loaded ${cleaned.length} valid members\n`);
  return cleaned;
}

async function getMembers() {
  console.log('👥 Fetching existing members...');
  const { data: members, error } = await supabaseAdmin
    .from('members')
    .select('id, membership_number');

  if (error) throw error;

  const memberMap = {};
  members.forEach(m => {
    memberMap[m.membership_number] = m.id;
  });

  console.log(`✓ Found ${members.length} members\n`);
  return memberMap;
}

async function importDiyaContributions(excelData, memberMap) {
  console.log('💰 Importing Diya Contributions...\n');

  const diyaColumns = {
    'دية نادر': DIYA_ACTIVITIES['دية نادر'],
    'دية شرهان1': DIYA_ACTIVITIES['دية شرهان1'],
    'دية شرهان2': DIYA_ACTIVITIES['دية شرهان2']
  };

  let totalImported = 0;
  let memberNumber = 10001;

  for (const [columnName, activityId] of Object.entries(diyaColumns)) {
    console.log(`  Processing ${columnName}...`);

    let imported = 0;
    const contributions = [];

    for (const row of excelData) {
      const amount = parseFloat(row[columnName]);
      if (!amount || amount <= 0) {
        memberNumber++;
        continue;
      }

      const memberId = memberMap[String(memberNumber)];
      if (!memberId) {
        memberNumber++;
        continue;
      }

      contributions.push({
        contributor_id: memberId,
        activity_id: activityId,
        contribution_amount: amount,
        contribution_date: '2024-12-31',
        payment_method: 'cash',
        status: 'approved'
      });

      memberNumber++;
    }

    // Batch insert for better performance
    if (contributions.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('financial_contributions')
        .insert(contributions)
        .select();

      if (error) {
        console.log(`  ✗ Error: ${error.message}`);
      } else {
        imported = data.length;
        console.log(`  ✓ ${columnName}: ${imported} contributions imported`);
        totalImported += imported;
      }
    }

    // Reset for next column
    memberNumber = 10001;
  }

  console.log(`\n✓ Total contributions imported: ${totalImported}\n`);
  return totalImported;
}

async function verify() {
  console.log('📊 Verifying Import...\n');

  for (const [name, activityId] of Object.entries(DIYA_ACTIVITIES)) {
    const { data, error } = await supabaseAdmin
      .from('financial_contributions')
      .select('contribution_amount')
      .eq('activity_id', activityId);

    if (!error && data) {
      const count = data.length;
      const total = data.reduce((sum, c) => sum + parseFloat(c.contribution_amount || 0), 0);
      console.log(`  ${name}: ${count} contributions = ${total.toLocaleString()} SAR`);
    }
  }
}

async function main() {
  try {
    const startTime = Date.now();

    const excelData = await loadExcelData();
    const memberMap = await getMembers();
    const totalImported = await importDiyaContributions(excelData, memberMap);
    await verify();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                 IMPORT COMPLETED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Total Imported: ${totalImported} contributions`);
    console.log(`  Time: ${elapsed}s`);
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n✗ Import failed:', error);
    process.exit(1);
  }
}

main();
