#!/usr/bin/env node

/**
 * Reset admin@alshuail.com password to Admin@123456
 */

import pkg from 'pg';
const { Client } = pkg;
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const PASSWORD = 'Admin@123456';
const EMAIL = 'admin@alshuail.com';

async function resetPassword() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'alshuail_db',
    user: process.env.DB_USER || 'alshuail',
    password: process.env.DB_PASSWORD
  });

  try {
    console.log('🔗 Connecting to database...');
    await client.connect();
    console.log('✅ Connected\n');

    console.log('🔐 Generating new password hash...');
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
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
    console.log(`   Password: ${PASSWORD}`);
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
