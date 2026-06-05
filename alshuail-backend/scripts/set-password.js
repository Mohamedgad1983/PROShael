import bcrypt from 'bcryptjs';

async function setPassword() {
  const password = process.env.PASSWORD_TO_HASH || process.argv[2];
  if (!password || password.length < 8) {
    console.error('Usage: PASSWORD_TO_HASH="..." node scripts/set-password.js');
    process.exit(1);
  }

  const saltRounds = 10;

  console.log('Generating password hash...');
  const hash = await bcrypt.hash(password, saltRounds);
  console.log('Generated hash:', hash);

  // Verify it works
  const isValid = await bcrypt.compare(password, hash);
  console.log('Verification:', isValid ? 'SUCCESS' : 'FAILED');

  console.log('\nSQL Update command:');
  console.log(`UPDATE users SET password_hash = '${hash}' WHERE email = 'admin@alshuail.com';`);
}

setPassword();
