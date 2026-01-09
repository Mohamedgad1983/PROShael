// Export all tables from Supabase to SQL files
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://oneiggrfzagqjbkdinin.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uZWlnZ3JmemFncWpia2RpbmluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDczNzkwMywiZXhwIjoyMDcwMzEzOTAzfQ.rBZIRsifsQiR3j5OgViWLjaBi_W8Jp0gD7HPf9fS5vI'
);

function escapeValue(val, colName) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    // Handle JSON/JSONB columns
    return "'" + JSON.stringify(val).replace(/'/g, "''") + "'";
  }
  // String values
  return "'" + String(val).replace(/'/g, "''") + "'";
}

async function exportTable(tableName) {
  console.log(`Exporting ${tableName}...`);

  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .order('created_at', { ascending: true, nullsFirst: true });

  if (error) {
    // Try without ordering
    const { data: data2, error: error2 } = await supabase
      .from(tableName)
      .select('*');
    if (error2) {
      console.error(`  Error: ${error2.message}`);
      return null;
    }
    return data2;
  }
  return data;
}

function generateSQL(tableName, rows) {
  if (!rows || rows.length === 0) return null;

  const columns = Object.keys(rows[0]);
  let sql = `-- Table: ${tableName} (${rows.length} records)\n`;
  sql += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES\n`;

  const valueRows = rows.map(row => {
    const values = columns.map(col => escapeValue(row[col], col));
    return `(${values.join(', ')})`;
  });

  sql += valueRows.join(',\n');
  sql += '\nON CONFLICT DO NOTHING;\n';

  return sql;
}

// Tables to export in dependency order (skip members, temp_members - already done)
const tablesToExport = [
  'family_branches',      // 10 rows - base table
  'users',                // 2 rows - admin users
  'roles',                // 5 rows
  'permissions',          // 15 rows
  'user_roles',           // 7 rows
  'user_role_assignments', // 6 rows
  'settings',             // 24 rows
  'system_settings',      // 1 row
  'main_categories',      // 3 rows
  'sub_categories',       // 2 rows
  'expense_categories',   // 13 rows
  'document_categories',  // 13 rows
  'document_types',       // 14 rows
  'subscription_plans',   // 4 rows
  'subscriptions',        // 346 rows - depends on members
  'initiatives',          // 3 rows
  'diya_cases',           // 3 rows
  'events',               // 3 rows
  'news_announcements',   // 5 rows
  'activities',           // 12 rows
  'notifications',        // 9 rows
  'payments',             // 2 rows
  'balance_adjustments',  // 10 rows
  'user_notification_preferences', // 346 rows
  'financial_contributions', // 852 rows
  'financial_audit_trail', // 16 rows
  'financial_access_logs', // 394 rows
  'audit_logs',           // 19 rows
  'refresh_tokens',       // 12 rows
  'device_tokens',        // 3 rows
  'documents_metadata',   // 2 rows
  'notification_logs',    // 1 row
  'expenses',             // 1 row
];

async function main() {
  console.log('Starting export of all tables...\n');

  let allSQL = '-- Al-Shuail Database Migration - All Tables\n';
  allSQL += '-- Generated: ' + new Date().toISOString() + '\n\n';

  for (const tableName of tablesToExport) {
    const rows = await exportTable(tableName);

    if (rows && rows.length > 0) {
      const sql = generateSQL(tableName, rows);
      if (sql) {
        allSQL += sql + '\n\n';
        console.log(`  ${tableName}: ${rows.length} rows exported`);

        // Also save individual file for large tables
        if (rows.length > 100) {
          fs.writeFileSync(`${tableName}_export.sql`, sql, 'utf8');
          console.log(`  -> Saved to ${tableName}_export.sql`);
        }
      }
    } else {
      console.log(`  ${tableName}: 0 rows (skipped)`);
    }
  }

  // Save combined SQL
  fs.writeFileSync('all_tables_export.sql', allSQL, 'utf8');
  console.log('\nAll tables exported to all_tables_export.sql');
}

main().catch(console.error);
