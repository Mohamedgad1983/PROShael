// ============================================
// AL-SHUAIL FAMILY MANAGEMENT SYSTEM
// Password Hash Generator for Default Password
// ============================================
// Purpose: Generate bcrypt hash for "123456"
// Usage: node generate-default-password-hash.js
// ============================================

import bcrypt from 'bcrypt';

console.log('\n🔐 AL-SHUAIL PASSWORD HASH GENERATOR\n');
console.log('Generating bcrypt hash for default password: "123456"\n');

const defaultPassword = '123456';
const saltRounds = 10;

async function generateAndVerifyHash() {
  try {
    // Generate the hash
    console.log('⏳ Generating hash...\n');
    const hash = await bcrypt.hash(defaultPassword, saltRounds);

    console.log('✅ HASH GENERATED SUCCESSFULLY!\n');
    console.log('='.repeat(70));
    console.log('COPY THIS HASH FOR YOUR SQL SCRIPT:');
    console.log('='.repeat(70));
    console.log(hash);
    console.log('='.repeat(70));
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Copy the hash above');
    console.log('2. Open the SQL script: scripts/setup-default-passwords.sql');
    console.log('3. Replace YOUR_GENERATED_HASH_HERE with this hash');
    console.log('4. Run the SQL script in Supabase Dashboard\n');

    // Verify the hash works
    console.log('🔍 VERIFYING HASH...\n');
    const isValid = await bcrypt.compare(defaultPassword, hash);

    if (isValid) {
      console.log('✅ VERIFICATION SUCCESSFUL!');
      console.log('   Password "123456" matches the generated hash\n');
      console.log('🚀 Ready to use in production!\n');
    } else {
      console.log('❌ VERIFICATION FAILED!');
      console.log('   Something went wrong - DO NOT USE THIS HASH\n');
      process.exit(1);
    }

    // Generate a second hash for comparison
    console.log('='.repeat(70));
    console.log('GENERATING SECOND HASH FOR VERIFICATION (Optional)');
    console.log('='.repeat(70));
    const hash2 = await bcrypt.hash(defaultPassword, saltRounds);
    console.log(hash2);
    console.log('='.repeat(70));
    console.log('\n💡 NOTE: Each hash is unique due to random salt,');
    console.log('   but both will validate password "123456" correctly.\n');

    console.log('✅ ALL DONE! Copy the first hash to your SQL script.\n');

  } catch (error) {
    console.error('❌ ERROR:', error);
    process.exit(1);
  }
}

// Run the generator
generateAndVerifyHash();
