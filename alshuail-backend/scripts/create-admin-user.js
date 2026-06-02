#!/usr/bin/env node

/**
 * Create admin@alshuail.com user in PostgreSQL database
 *
 * Usage: ADMIN_INITIAL_PASSWORD="..." node scripts/create-admin-user.js
 *    or: node scripts/create-admin-user.js --password="..."
 */

import pkg from 'pg';
const { Client } = pkg;
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const EMAIL = 'admin@alshuail.com';
const PHONE = '0551234567';

function getPassword() {
  const passwordArg = process.argv.find((arg) => arg.startsWith('--password='));
  const password = process.env.ADMIN_INITIAL_PASSWORD || passwordArg?.split('=')[1];

  if (!password || password.length < 8) {
    console.error('ADMIN_INITIAL_PASSWORD or --password must be at least 8 characters.');
    process.exit(1);
  }

  return password;
}

async function createAdminUser() {
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
    console.log('✅ Connected to database\n');

    // Generate password hash
    console.log('🔐 Generating password hash...');
    const passwordHash = await bcrypt.hash(password, 10);
    console.log('✅ Password hash generated\n');

    // Insert or update admin user
    console.log('👤 Creating/updating admin user...');
    const query = `
      INSERT INTO public.users (
        email,
        phone,
        password_hash,
        role,
        is_active,
        full_name_ar,
        full_name_en,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      ON CONFLICT (email)
      DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active,
        phone = EXCLUDED.phone,
        updated_at = NOW()
      RETURNING id, email, role;
    `;

    const values = [
      EMAIL,
      PHONE,
      passwordHash,
      'super_admin',
      true,
      'المدير الأعلى',
      'Super Administrator'
    ];

    const result = await client.query(query, values);
    const user = result.rows[0];

    console.log('✅ Admin user created/updated successfully!\n');
    console.log('📋 User Details:');
    console.log(`   ID:       ${user.id}`);
    console.log(`   Email:    ${user.email}`);
    console.log(`   Phone:    ${PHONE}`);
    console.log(`   Role:     ${user.role}`);
    console.log('   Password: configured from operator input');
    console.log('\n🎉 You can now login to the admin dashboard!');
    console.log(`   URL: https://alshailfund.com/admin/login`);

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure PostgreSQL is running');
    console.error('2. Check .env file has correct database credentials');
    console.error('3. Verify the users table exists (run migrations first)');
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the script
createAdminUser();
