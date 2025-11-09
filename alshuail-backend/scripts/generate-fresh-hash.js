import bcrypt from 'bcryptjs';

async function generateFreshHash() {
  const password = 'Admin2024@SAF'; // Use the original password the user expects
  const saltRounds = 10;

  console.log('Generating fresh hash for:', password);
  const hash = await bcrypt.hash(password, saltRounds);
  console.log('New hash:', hash);

  // Verify it works
  const isValid = await bcrypt.compare(password, hash);
  console.log('Verification:', isValid ? 'SUCCESS' : 'FAILED');

  console.log('\nSQL Update command:');
  console.log(`UPDATE users SET password_hash = '${hash}' WHERE email = 'admin@alshuail.com';`);
}

generateFreshHash();