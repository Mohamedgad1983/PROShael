import bcrypt from 'bcryptjs';

async function setPassword() {
  const password = 'Admin@123';
  const saltRounds = 10;

  console.log('Generating hash for password:', password);
  const hash = await bcrypt.hash(password, saltRounds);
  console.log('Generated hash:', hash);

  // Verify it works
  const isValid = await bcrypt.compare(password, hash);
  console.log('Verification:', isValid ? 'SUCCESS' : 'FAILED');

  console.log('\nSQL Update command:');
  console.log(`UPDATE users SET password_hash = '${hash}' WHERE email = 'admin@alshuail.com';`);
}

setPassword();