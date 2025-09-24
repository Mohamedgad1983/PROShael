import dotenv from 'dotenv';
import { initializeTestData } from './src/utils/initializeTestData.js';

dotenv.config();

async function main() {
  console.log('Starting test data initialization...');
  const success = await initializeTestData();

  if (success) {
    console.log('✅ All test data initialized successfully!');
  } else {
    console.log('❌ Some errors occurred during initialization');
  }

  process.exit(0);
}

main().catch(console.error);