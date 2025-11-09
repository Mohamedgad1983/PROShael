import bcrypt from 'bcryptjs';

async function verifyHash() {
  const password = 'Admin123@SAF';
  const storedHash = '$2a$10$ji6hWGEpNXhRu4is4.GiKOPQ5xeZdfjhQNMVW390UqSwMivW9iXT.';

  console.log('Password:', password);
  console.log('Stored hash:', storedHash);

  const isValid = await bcrypt.compare(password, storedHash);
  console.log('Hash verification:', isValid ? 'SUCCESS' : 'FAILED');

  // Try with the old password too
  const oldPassword = 'Admin2024@SAF';
  const isOldValid = await bcrypt.compare(oldPassword, storedHash);
  console.log('Old password check:', isOldValid ? 'SUCCESS' : 'FAILED');
}

verifyHash();