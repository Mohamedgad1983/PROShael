// Fix script to update dashboardController.js
// This script fixes the column name issues

import fs from 'fs';
import path from 'path';

const controllerPath = './alshuail-backend/src/controllers/dashboardController.js';

// Read the file
let content = fs.readFileSync(controllerPath, 'utf8');

// Fix the column references
// Line 89: Change member_id to id
content = content.replace(
  ".select('member_id, full_name, is_active, created_at')",
  ".select('id, full_name, is_active, created_at')"
);

// Line 135: Change payment_id to id
content = content.replace(
  ".select('payment_id, amount, status, created_at')",
  ".select('id, amount, status, created_at')"
);

// Line 196: Change subscription_id to id
content = content.replace(
  ".select('subscription_id, amount, status')",
  ".select('id, amount, status')"
);

// Write the fixed content back
fs.writeFileSync(controllerPath, content, 'utf8');

console.log('✅ Fixed column references in dashboardController.js');
console.log('Changed:');
console.log('  - member_id → id');
console.log('  - payment_id → id');
console.log('  - subscription_id → id');