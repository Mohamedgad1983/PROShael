import bcrypt from 'bcryptjs';

async function generateFreshHash() {
  const password = process.env.PASSWORD_TO_HASH || process.argv[2];
  if (!password || password.length < 8) {
    console.error('Usage: PASSWORD_TO_HASH="..." node scripts/generate-fresh-hash.js');
    process.exit(1);
  }

  const saltRounds = 10;

  console.log('Generating fresh password hash...');
  const hash = await bcrypt.hash(password, saltRounds);
  console.log('New hash:', hash);

  // Verify it works
  const isValid = await bcrypt.compare(password, hash);
  console.log('Verification:', isValid ? 'SUCCESS' : 'FAILED');

  console.log('\nSQL Update command:');
  console.log(`UPDATE users SET password_hash = '${hash}' WHERE email = 'admin@alshuail.com';`);
}

generateFreshHash();
