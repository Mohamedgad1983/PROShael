import bcrypt from 'bcryptjs';

async function generateHash() {
  const password = 'Admin123@SAF';
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  console.log('New password hash:', hash);

  // Verify it works
  const isValid = await bcrypt.compare(password, hash);
  console.log('Verification:', isValid ? 'SUCCESS' : 'FAILED');
}

generateHash();