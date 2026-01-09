// Export members from Supabase to SQL files
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://oneiggrfzagqjbkdinin.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uZWlnZ3JmemFncWpia2RpbmluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDczNzkwMywiZXhwIjoyMDcwMzEzOTAzfQ.rBZIRsifsQiR3j5OgViWLjaBi_W8Jp0gD7HPf9fS5vI'
);

function escapeString(val) {
  if (val === null || val === undefined) return 'NULL';
  const str = String(val);
  return "'" + str.replace(/'/g, "''") + "'";
}

function formatValue(val, colName) {
  if (val === null || val === undefined) return 'NULL';

  // Boolean columns
  if (typeof val === 'boolean') return val ? 'true' : 'false';

  // Numeric columns (check by name patterns)
  const numericCols = ['generation_level', 'login_attempts'];
  if (numericCols.includes(colName)) return String(val);

  // Decimal columns
  const decimalCols = ['total_balance', 'balance', 'current_balance', 'total_paid',
    'payment_2021', 'payment_2022', 'payment_2023', 'payment_2024', 'payment_2025'];
  if (decimalCols.includes(colName)) return escapeString(val);

  // JSON/JSONB columns
  if (colName === 'additional_info' && typeof val === 'object') {
    return escapeString(JSON.stringify(val));
  }

  return escapeString(val);
}

async function exportMembers() {
  console.log('Fetching members from Supabase...');

  const { data: members, error } = await supabase
    .from('members')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching members:', error);
    process.exit(1);
  }

  console.log(`Found ${members.length} members`);

  if (members.length === 0) {
    console.log('No members to export');
    return;
  }

  // Get column names from first record
  const columns = Object.keys(members[0]);
  console.log(`Columns: ${columns.length}`);

  // Split into batches of 25 for manageable files
  const batchSize = 25;
  const batches = [];
  for (let i = 0; i < members.length; i += batchSize) {
    batches.push(members.slice(i, i + batchSize));
  }

  console.log(`Creating ${batches.length} batch files...`);

  for (let batchNum = 0; batchNum < batches.length; batchNum++) {
    const batch = batches[batchNum];
    const startIdx = batchNum * batchSize + 1;
    const endIdx = startIdx + batch.length - 1;

    let sql = `-- Batch ${batchNum + 1}: members ${startIdx}-${endIdx} (${batch.length} records)\n`;
    sql += `INSERT INTO members (${columns.join(', ')}) VALUES\n`;

    const valueRows = batch.map(member => {
      const values = columns.map(col => formatValue(member[col], col));
      return `(${values.join(', ')})`;
    });

    sql += valueRows.join(',\n');
    sql += '\nON CONFLICT (id) DO NOTHING;\n';

    const filename = `members_batch${batchNum + 1}.sql`;
    fs.writeFileSync(filename, sql, 'utf8');
    console.log(`Created ${filename} (${batch.length} records)`);
  }

  console.log('Export complete!');
}

exportMembers().catch(console.error);
