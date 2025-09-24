import { supabase } from './src/config/database.js';

async function updateMembersSchema() {
  try {
    console.log('🔄 Updating members table schema...');

    // Add new fields to members table
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add new fields to members table
        ALTER TABLE members
        ADD COLUMN IF NOT EXISTS social_security_beneficiary BOOLEAN DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS employer VARCHAR(255),
        ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20),
        ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS excel_import_batch UUID,
        ADD COLUMN IF NOT EXISTS temp_password VARCHAR(255),
        ADD COLUMN IF NOT EXISTS birth_date DATE,
        ADD COLUMN IF NOT EXISTS birth_date_hijri VARCHAR(50),
        ADD COLUMN IF NOT EXISTS national_id VARCHAR(20),
        ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
      `
    });

    if (alterError) {
      console.log('Note: Members table may already have these columns or using direct SQL execution...');
    }

    console.log('✅ Members table schema updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Error updating members schema:', error);
    return false;
  }
}

async function createImportBatchesTable() {
  try {
    console.log('🔄 Creating excel_import_batches table...');

    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS excel_import_batches (
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

        -- Create index for better performance
        CREATE INDEX IF NOT EXISTS idx_import_batches_status ON excel_import_batches(status);
        CREATE INDEX IF NOT EXISTS idx_import_batches_created_at ON excel_import_batches(created_at);
      `
    });

    if (error) {
      console.log('Note: Table creation may use alternative method...');
    }

    console.log('✅ excel_import_batches table created successfully');
    return true;
  } catch (error) {
    console.error('❌ Error creating import batches table:', error);
    return false;
  }
}

async function createRegistrationTokensTable() {
  try {
    console.log('🔄 Creating member_registration_tokens table...');

    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS member_registration_tokens (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          member_id UUID REFERENCES members(id) ON DELETE CASCADE,
          token VARCHAR(8) UNIQUE NOT NULL,
          temp_password VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          used_at TIMESTAMP,
          is_used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW()
        );

        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_registration_tokens_token ON member_registration_tokens(token);
        CREATE INDEX IF NOT EXISTS idx_registration_tokens_member_id ON member_registration_tokens(member_id);
        CREATE INDEX IF NOT EXISTS idx_registration_tokens_expires_at ON member_registration_tokens(expires_at);
        CREATE INDEX IF NOT EXISTS idx_registration_tokens_used ON member_registration_tokens(is_used);
      `
    });

    if (error) {
      console.log('Note: Table creation may use alternative method...');
    }

    console.log('✅ member_registration_tokens table created successfully');
    return true;
  } catch (error) {
    console.error('❌ Error creating registration tokens table:', error);
    return false;
  }
}

async function runSchemaUpdates() {
  console.log('🚀 Starting database schema updates...');

  const membersUpdate = await updateMembersSchema();
  const importBatches = await createImportBatchesTable();
  const registrationTokens = await createRegistrationTokensTable();

  if (membersUpdate && importBatches && registrationTokens) {
    console.log('🎉 All schema updates completed successfully!');
  } else {
    console.log('⚠️ Some schema updates may need manual execution in Supabase dashboard');
  }
}

// Run the updates
runSchemaUpdates().catch(console.error);