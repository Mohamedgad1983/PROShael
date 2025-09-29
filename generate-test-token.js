import jwt from 'jsonwebtoken';

// Use the same JWT secret as the backend
const JWT_SECRET = 'alshuail-super-secure-jwt-secret-key-2024-production-ready-32chars';

// Create a test user payload
const payload = {
  id: '628bd855-2cc4-42ac-a2c6-a392d73aa2e8',
  user_id: '628bd855-2cc4-42ac-a2c6-a392d73aa2e8',
  email: 'admin@alshuail.com',
  role: 'admin'
};

// Generate token with 7 days expiry
const token = jwt.sign(payload, JWT_SECRET, {
  expiresIn: '7d'
});

console.log('🔑 Generated Test Token:');
console.log('═══════════════════════════════════════\n');
console.log(token);
console.log('\n═══════════════════════════════════════');
console.log('✅ Token Details:');
console.log('   User ID:', payload.id);
console.log('   Email:', payload.email);
console.log('   Role:', payload.role);
console.log('   Expires in: 7 days');

// Verify the token works
try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('\n✅ Token verification successful!');
  console.log('   Decoded payload:', decoded);
} catch (error) {
  console.error('\n❌ Token verification failed:', error.message);
}