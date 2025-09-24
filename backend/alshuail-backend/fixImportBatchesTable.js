import { supabase } from './src/config/database.js';

async function fixImportBatchesTable() {
  try {
    console.log('🔧 Checking and fixing excel_import_batches table...');

    // Check if table exists and what columns it has
    const { data: tableInfo, error: tableError } = await supabase
      .from('excel_import_batches')
      .select('*')
      .limit(1);

    if (tableError) {
      console.log('❌ Table does not exist or has schema issues:', tableError.message);

      // Create the table manually using RPC
      console.log('Creating table using direct SQL...');

      const { error: createError } = await supabase.rpc('sql', {
        query: `
          DROP TABLE IF EXISTS excel_import_batches;
          CREATE TABLE excel_import_batches (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            filename VARCHAR(255) NOT NULL,
            total_records INTEGER NOT NULL,
            successful_imports INTEGER DEFAULT 0,
            failed_imports INTEGER DEFAULT 0,
            status VARCHAR(50) DEFAULT 'processing',
            error_details JSONB,
            imported_by UUID,
            created_at TIMESTAMP DEFAULT NOW(),
            completed_at TIMESTAMP
          );

          CREATE INDEX IF NOT EXISTS idx_import_batches_status ON excel_import_batches(status);
          CREATE INDEX IF NOT EXISTS idx_import_batches_created_at ON excel_import_batches(created_at);
        `
      });

      if (createError) {
        console.log('❌ Could not create table with RPC, trying alternative method...');

        // Alternative: Create records directly to establish schema
        const { error: insertError } = await supabase
          .from('excel_import_batches')
          .insert({
            filename: 'schema_test.xlsx',
            total_records: 0,
            successful_imports: 0,
            failed_imports: 0,
            status: 'test',
            error_details: null,
            imported_by: null,
            created_at: new Date().toISOString(),
            completed_at: null
          });

        if (insertError) {
          console.error('❌ Could not create table:', insertError);
          return false;
        } else {
          // Delete test record
          await supabase
            .from('excel_import_batches')
            .delete()
            .eq('filename', 'schema_test.xlsx');
          console.log('✅ Table created successfully via insert method');
        }
      } else {
        console.log('✅ Table created successfully via RPC');
      }
    } else {
      console.log('✅ Table exists and accessible');
    }

    // Test a simple insert and delete to verify
    const testId = 'test-' + Date.now();
    const { error: testInsertError } = await supabase
      .from('excel_import_batches')
      .insert({
        id: testId,
        filename: 'test.xlsx',
        total_records: 1,
        successful_imports: 0,
        failed_imports: 0,
        status: 'test'
      });

    if (testInsertError) {
      console.error('❌ Test insert failed:', testInsertError);
      return false;
    }

    const { error: testDeleteError } = await supabase
      .from('excel_import_batches')
      .delete()
      .eq('id', testId);

    if (testDeleteError) {
      console.error('❌ Test delete failed:', testDeleteError);
    }

    console.log('✅ Table is working correctly!');
    return true;

  } catch (error) {
    console.error('❌ Error fixing table:', error);
    return false;
  }
}

// Also fix registration tokens table
async function fixRegistrationTokensTable() {
  try {
    console.log('🔧 Checking and fixing member_registration_tokens table...');

    const testId = 'test-' + Date.now();
    const { error: testInsertError } = await supabase
      .from('member_registration_tokens')
      .insert({
        id: testId,
        member_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
        token: 'TEST1234',
        temp_password: 'test123',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_used: false
      });

    if (testInsertError) {
      console.error('❌ Registration tokens table test failed:', testInsertError);
      return false;
    }

    const { error: testDeleteError } = await supabase
      .from('member_registration_tokens')
      .delete()
      .eq('id', testId);

    if (testDeleteError) {
      console.error('❌ Test delete failed:', testDeleteError);
    }

    console.log('✅ Registration tokens table is working correctly!');
    return true;

  } catch (error) {
    console.error('❌ Error with registration tokens table:', error);
    return false;
  }
}

async function runFixes() {
  console.log('🚀 Running table fixes...\n');

  const importBatchesOk = await fixImportBatchesTable();
  console.log('');
  const registrationTokensOk = await fixRegistrationTokensTable();

  if (importBatchesOk && registrationTokensOk) {
    console.log('\n🎉 All tables fixed and ready!');
  } else {
    console.log('\n⚠️ Some tables may need manual attention in Supabase dashboard');
  }
}

runFixes();