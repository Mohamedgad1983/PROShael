#!/usr/bin/env node

/**
 * Test database connection and check if admin user exists
 *
 * Usage: node scripts/test-database-connection.js
 */

import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testConnection() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'alshuail_db',
    user: process.env.DB_USER || 'alshuail',
    password: process.env.DB_PASSWORD
  });

  try {
    console.log('🔗 Testing database connection...');
    console.log(`   Host: ${client.host}`);
    console.log(`   Port: ${client.port}`);
    console.log(`   Database: ${client.database}`);
    console.log(`   User: ${client.user}\n`);

    await client.connect();
    console.log('✅ Database connected successfully!\n');

    // Check if users table exists
    console.log('📋 Checking if users table exists...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'users'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('✅ users table exists\n');

      // Check for admin user
      console.log('👤 Checking for admin@alshuail.com...');
      const userCheck = await client.query(
        'SELECT id, email, role, is_active, password_hash IS NOT NULL as has_password FROM users WHERE email = $1',
        ['admin@alshuail.com']
      );

      if (userCheck.rows.length > 0) {
        const user = userCheck.rows[0];
        console.log('✅ Admin user found!');
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Active: ${user.is_active}`);
        console.log(`   Has Password: ${user.has_password}\n`);

        if (!user.has_password) {
          console.log('⚠️  WARNING: Admin user has no password hash!');
          console.log('   Run: node scripts/create-admin-user.js\n');
        }
      } else {
        console.log('❌ Admin user NOT found!');
        console.log('   Run: node scripts/create-admin-user.js\n');
      }

      // Count total users
      const countResult = await client.query('SELECT COUNT(*) FROM users');
      console.log(`📊 Total users in database: ${countResult.rows[0].count}`);

    } else {
      console.log('❌ users table does NOT exist!');
      console.log('   You need to run database migrations first.\n');
    }

  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error(`   Error: ${error.message}\n`);

    console.log('💡 Troubleshooting:');
    console.log('1. Check if PostgreSQL is running: sudo systemctl status postgresql');
    console.log('2. Verify .env file has correct credentials');
    console.log('3. Check database exists: psql -U alshuail -d alshuail_db -h localhost -c "\\dt"');

    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the test
testConnection();
