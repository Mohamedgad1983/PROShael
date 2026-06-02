import bcrypt from 'bcryptjs';

async function verifyHash() {
  const password = process.env.PASSWORD_TO_VERIFY || process.argv[2];
  const storedHash = process.env.PASSWORD_HASH_TO_VERIFY || process.argv[3];

  if (!password || !storedHash) {
    console.error('Usage: PASSWORD_TO_VERIFY="..." PASSWORD_HASH_TO_VERIFY="..." node scripts/verify-hash.js');
    process.exit(1);
  }

  const isValid = await bcrypt.compare(password, storedHash);
  console.log('Hash verification:', isValid ? 'SUCCESS' : 'FAILED');
}

verifyHash();
