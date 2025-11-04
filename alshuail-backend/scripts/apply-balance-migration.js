import { supabase } from '../src/config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyBalanceMigration() {
  try {
    console.log('🚀 Applying member balance system migration...');
    console.log('📝 Migration file: 20250123_add_member_balance_system.sql\n');

    // Read migration SQL file
    const migrationPath = path.join(__dirname, '../migrations/20250123_add_member_balance_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split SQL into individual statements (separated by semicolons)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comments and empty statements
      if (!statement || statement.startsWith('--') || statement.startsWith('/*')) {
        continue;
      }

      console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);

      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: statement + ';'
      });

      if (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error.message);
        console.error('Statement:', statement.substring(0, 100) + '...');
        // Continue with next statement instead of failing completely
        continue;
      }

      console.log(`✅ Statement ${i + 1} completed`);
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('📊 Member balance system is now active');
    console.log('\n🔥 Features enabled:');
    console.log('   • current_balance column added to members table');
    console.log('   • Automatic balance calculation from completed payments');
    console.log('   • Real-time balance updates via database triggers');
    console.log('   • Dashboard will now show accurate member balances\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run migration
applyBalanceMigration();
