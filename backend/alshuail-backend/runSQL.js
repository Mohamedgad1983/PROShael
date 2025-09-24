import { supabase } from './src/config/database.js';
import fs from 'fs';
import path from 'path';

async function runSQLScript() {
  try {
    const sqlPath = path.join(process.cwd(), 'setupDatabase.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');

    // Split the SQL script into individual statements
    const statements = sqlScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`🚀 Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      if (statement.trim()) {
        try {
          console.log(`Executing statement ${i + 1}/${statements.length}...`);

          const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: statement + ';'
          });

          if (error) {
            console.log(`Statement ${i + 1} error (may be expected):`, error.message);
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.log(`Statement ${i + 1} error:`, err.message);
        }
      }
    }

    console.log('✅ SQL script execution completed!');

    // Test database connectivity after setup
    const { data: testData, error: testError } = await supabase
      .from('members')
      .select('*')
      .limit(1);

    if (testError) {
      console.log('❌ Test query failed:', testError.message);
    } else {
      console.log('✅ Database test successful, found', testData?.length || 0, 'members');
    }

  } catch (error) {
    console.error('❌ Error running SQL script:', error.message);
  }
}

runSQLScript().then(() => process.exit(0));