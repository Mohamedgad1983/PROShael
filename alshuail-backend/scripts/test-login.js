#!/usr/bin/env node

/**
 * Test login function directly to see detailed errors
 */

import dotenv from 'dotenv';
dotenv.config();

import('../src/routes/auth.js').then(async (authModule) => {
  console.log('Testing login with admin@alshuail.com...\n');

  // Simulate a login request
  const testEmail = 'admin@alshuail.com';
  const testPassword = 'Admin@123456';

  try {
    // Import the query function to test database directly
    const { query } = await import('../src/services/database.js');
    const bcrypt = await import('bcryptjs');

    console.log('1. Checking if user exists...');
    const result = await query(
      'SELECT id, email, password_hash, role, is_active FROM users WHERE email = $1',
      [testEmail]
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found!');
      process.exit(1);
    }

    const user = result.rows[0];
    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      has_password: !!user.password_hash
    });

    console.log('\n2. Testing password comparison...');
    const passwordMatch = await bcrypt.default.compare(testPassword, user.password_hash);
    console.log('Password match result:', passwordMatch);

    if (!passwordMatch) {
      console.log('❌ Password does not match!');
      process.exit(1);
    }

    console.log('✅ Password matches!');

    console.log('\n3. Checking JWT_SECRET...');
    if (!process.env.JWT_SECRET) {
      console.log('❌ JWT_SECRET not set!');
      process.exit(1);
    }
    console.log('✅ JWT_SECRET is set');

    console.log('\n4. Testing JWT token generation...');
    const jwt = await import('jsonwebtoken');
    const token = jwt.default.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log('✅ JWT token generated successfully');
    console.log('Token preview:', token.substring(0, 50) + '...');

    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('\nThe authentication logic should work.');
    console.log('The issue might be in the HTTP request handling or middleware.');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }

  process.exit(0);
}).catch(err => {
  console.error('Failed to load auth module:', err);
  process.exit(1);
});
