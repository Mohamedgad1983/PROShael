import bcrypt from 'bcryptjs';

async function generateHash() {
  const password = process.env.PASSWORD_TO_HASH || process.argv[2];
  if (!password || password.length < 8) {
    console.error('Usage: PASSWORD_TO_HASH="..." node scripts/reset-password.js');
    process.exit(1);
  }

  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  console.log('New password hash:', hash);

  // Verify it works
  const isValid = await bcrypt.compare(password, hash);
  console.log('Verification:', isValid ? 'SUCCESS' : 'FAILED');
}

generateHash();
