import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('JWT_SECRET not found in environment variables');
  process.exit(1);
}

// Generate token for admin user
const tokenPayload = {
  id: 'a4ed4bc2-b61e-49ce-90c4-386b131d054e',
  email: 'admin@alshuail.com',
  phone: '0550000001',
  role: 'super_admin',
  permissions: {
    all_access: true,
    manage_users: true,
    manage_members: true,
    manage_finances: true,
    manage_family_tree: true,
    manage_occasions: true,
    manage_initiatives: true,
    manage_diyas: true,
    view_reports: true,
    system_settings: true
  }
};

const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

console.log('Generated token for admin@alshuail.com:');
console.log(token);
console.log('\nTest the token with:');
console.log(`curl -H "Authorization: Bearer ${token}" https://api.alshailfund.com/api/multi-role/all-assignments`);