import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Get database URL from environment
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.log('\n⚠️ No database connection found in environment variables.');
  console.log('\n📝 To add the missing columns, you need to:');
  console.log('1. Go to your Supabase Dashboard (https://app.supabase.com)');
  console.log('2. Select your project');
  console.log('3. Go to Table Editor → members table');
  console.log('4. Click "Add column" and add these columns:');
  console.log('   - gender (type: text/varchar)');
  console.log('   - tribal_section (type: text/varchar)');
  console.log('   - national_id (type: text/varchar)');
  console.log('   - date_of_birth (type: date)');
  console.log('   - city (type: text/varchar)');
  console.log('   - district (type: text/varchar)');
  console.log('   - address (type: text)');
  console.log('   - occupation (type: text/varchar)');
  console.log('   - employer (type: text/varchar)');
  console.log('\nOr run the SQL script at: database-scripts/add-gender-tribal-columns.sql');
  process.exit(0);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function checkColumns() {
  try {
    console.log('🔍 Checking members table columns...\n');

    const query = `
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'members'
      ORDER BY ordinal_position;
    `;

    const result = await pool.query(query);

    console.log('Current columns in members table:');
    console.log('--------------------------------');
    result.rows.forEach(col => {
      const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      console.log(`✓ ${col.column_name}: ${col.data_type}${length}`);
    });

    const existingColumns = result.rows.map(row => row.column_name);
    const requiredColumns = ['gender', 'tribal_section', 'national_id', 'date_of_birth', 'city', 'district', 'address', 'occupation', 'employer'];
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

    if (missingColumns.length > 0) {
      console.log('\n❗ Missing columns:');
      console.log('------------------');
      missingColumns.forEach(col => {
        console.log(`✗ ${col}`);
      });
      console.log('\n📝 To add these columns, run the SQL script at:');
      console.log('   database-scripts/add-gender-tribal-columns.sql');
    } else {
      console.log('\n✅ All required columns exist!');
    }

  } catch (error) {
    console.error('Error checking columns:', error.message);
    console.log('\n📝 Manual steps to add columns in Supabase:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to Table Editor → members table');
    console.log('3. Click "Add column" for each missing column');
  } finally {
    await pool.end();
  }
}

checkColumns();