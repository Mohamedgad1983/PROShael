#!/usr/bin/env node

/**
 * Reset admin@alshuail.com password.
 *
 * Usage: ADMIN_RESET_PASSWORD="..." node scripts/reset-admin-password.js
 *    or: node scripts/reset-admin-password.js --password="..."
 */

import pkg from 'pg';
const { Client } = pkg;
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const EMAIL = 'admin@alshuail.com';

function getPassword() {
  const passwordArg = process.argv.find((arg) => arg.startsWith('--password='));
  const password = process.env.ADMIN_RESET_PASSWORD || passwordArg?.split('=')[1];

  if (!password || password.length < 8) {
    console.error('ADMIN_RESET_PASSWORD or --password must be at least 8 characters.');
    process.exit(1);
  }

  return password;
}

async function resetPassword() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'alshuail_db',
    user: process.env.DB_USER || 'alshuail',
    password: process.env.DB_PASSWORD
  });

  try {
    const password = getPassword();

    console.log('🔗 Connecting to database...');
    await client.connect();
    console.log('✅ Connected\n');

    console.log('🔐 Generating new password hash...');
    const passwordHash = await bcrypt.hash(password, 10);
    console.log('✅ Hash generated\n');

    console.log('👤 Updating admin password...');
    const result = await client.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2 RETURNING id, email',
      [passwordHash, EMAIL]
    );

    if (result.rowCount === 0) {
      console.log('❌ Admin user not found!');
      process.exit(1);
    }

    console.log('✅ Password updated successfully!\n');
    console.log('📋 Login Credentials:');
    console.log(`   Email: ${EMAIL}`);
    console.log('   Password: configured from operator input');
    console.log(`   URL: https://alshailfund.com/admin/login`);
    console.log('\n🎉 You can now login!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

resetPassword();
