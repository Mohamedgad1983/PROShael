// ============================================
// AL-SHUAIL - SET OPERATOR-SUPPLIED PASSWORD FOR ALL MEMBERS
// ============================================
// Usage: DEFAULT_MEMBER_PASSWORD="..." node scripts/set-all-members-password.js
//    or: node scripts/set-all-members-password.js --password="..."
// This script:
//   1. Generates a bcrypt hash for the supplied password
//   2. Updates all members with this password
//   3. Sets requires_password_change = true
// ============================================

import bcrypt from 'bcrypt';
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'alshuail_db',
  user: process.env.DB_USER || 'alshuail',
  password: process.env.DB_PASSWORD,
  ssl: false
});

const SALT_ROUNDS = 12;

function getDefaultPassword() {
  const passwordArg = process.argv.find((arg) => arg.startsWith('--password='));
  const password = process.env.DEFAULT_MEMBER_PASSWORD || passwordArg?.split('=')[1];

  if (!password || password.length < 8) {
    console.error('DEFAULT_MEMBER_PASSWORD or --password must be at least 8 characters.');
    process.exit(1);
  }

  return password;
}

async function run() {
  const defaultPassword = getDefaultPassword();

  console.log('\n🔐 AL-SHUAIL - BULK PASSWORD RESET');
  console.log('='.repeat(50));
  console.log('Default password: configured from operator input');
  console.log('');

  try {
    console.log('⏳ Generating bcrypt hash...');
    const hash = await bcrypt.hash(defaultPassword, SALT_ROUNDS);
    console.log('✅ Hash generated:', `${hash.substring(0, 30)}...`);
    console.log('');

    const valid = await bcrypt.compare(defaultPassword, hash);
    if (!valid) {
      console.log('❌ Hash verification FAILED! Aborting.');
      process.exit(1);
    }
    console.log('✅ Hash verified successfully');
    console.log('');

    const countResult = await pool.query(
      "SELECT COUNT(*) as total FROM members WHERE role = 'member' OR role IS NULL"
    );
    const totalMembers = countResult.rows[0].total;
    console.log(`📊 Total regular members: ${totalMembers}`);
    console.log('');

    console.log('⏳ Updating passwords for all members...');
    const updateResult = await pool.query(`
      UPDATE members
      SET
        password_hash = $1,
        is_first_login = true,
        requires_password_change = true,
        login_attempts = 0,
        account_locked_until = NULL,
        updated_at = NOW()
      WHERE role = 'member' OR role IS NULL
    `, [hash]);

    console.log(`✅ Updated ${updateResult.rowCount} members`);
    console.log('');

    try {
      const usersUpdateResult = await pool.query(`
        UPDATE users
        SET
          password_hash = $1,
          must_change_password = true,
          updated_at = NOW()
        WHERE role = 'member' OR role IS NULL
      `, [hash]);
      console.log(`✅ Updated ${usersUpdateResult.rowCount} users (users table)`);
    } catch (e) {
      console.log('ℹ️  Users table update skipped:', e.message.substring(0, 60));
    }
    console.log('');

    console.log('📋 Sample members (first 5):');
    console.log('-'.repeat(50));
    const sampleResult = await pool.query(`
      SELECT
        full_name,
        phone,
        membership_number,
        CASE WHEN password_hash IS NOT NULL THEN '✅' ELSE '❌' END as has_password
      FROM members
      WHERE role = 'member' OR role IS NULL
      ORDER BY created_at DESC
      LIMIT 5
    `);
    sampleResult.rows.forEach((row) => {
      console.log(`  ${row.has_password} ${row.full_name || 'N/A'} | ${row.phone || 'N/A'} | ${row.membership_number || 'N/A'}`);
    });
    console.log('');

    console.log('='.repeat(50));
    console.log('🎉 ALL DONE!');
    console.log('='.repeat(50));
    console.log('  Password: configured from operator input');
    console.log(`  Members updated: ${updateResult.rowCount}`);
    console.log('  Force password change: YES');
    console.log('');
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

run();
