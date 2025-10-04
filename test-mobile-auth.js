import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, 'alshuail-backend', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Using key:', supabaseKey ? 'Found' : 'Not found');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuthentication() {
    const testPhone = '0555555555';
    const testPassword = '123456';

    console.log('\n=== Testing Mobile Authentication ===');
    console.log('Phone:', testPhone);
    console.log('Password:', testPassword);

    try {
        // 1. Check if member exists
        console.log('\n1. Checking if member exists in database...');
        const { data: member, error } = await supabase
            .from('members')
            .select('id, full_name, phone, membership_number, membership_status, password_hash, temp_password, balance, minimum_balance')
            .eq('phone', testPhone)
            .single();

        if (error) {
            console.error('Error fetching member:', error);
            return;
        }

        if (!member) {
            console.log('Member not found with phone:', testPhone);
            return;
        }

        console.log('\nMember found:');
        console.log('- ID:', member.id);
        console.log('- Name:', member.full_name);
        console.log('- Phone:', member.phone);
        console.log('- Status:', member.membership_status);
        console.log('- Has password_hash:', !!member.password_hash);
        console.log('- Has temp_password:', !!member.temp_password);
        console.log('- Balance:', member.balance);

        // 2. Test password validation
        console.log('\n2. Testing password validation...');

        // Test against password_hash
        if (member.password_hash) {
            console.log('\nTesting against password_hash...');
            const hashMatch = await bcrypt.compare(testPassword, member.password_hash);
            console.log('- Password matches hash:', hashMatch);

            // Show hash details for debugging
            console.log('- Hash starts with:', member.password_hash.substring(0, 10) + '...');
            console.log('- Hash length:', member.password_hash.length);

            // Generate a new hash for comparison
            const newHash = await bcrypt.hash(testPassword, 10);
            console.log('- New hash would be:', newHash.substring(0, 10) + '...');

            // Test if the stored hash is valid bcrypt
            try {
                const isValidBcrypt = member.password_hash.startsWith('$2a$') ||
                                    member.password_hash.startsWith('$2b$') ||
                                    member.password_hash.startsWith('$2y$');
                console.log('- Is valid bcrypt format:', isValidBcrypt);
            } catch (e) {
                console.log('- Hash validation error:', e.message);
            }
        }

        // Test against temp_password
        if (member.temp_password) {
            console.log('\nTesting against temp_password...');
            console.log('- Temp password value:', member.temp_password);

            // Direct comparison
            const directMatch = testPassword === member.temp_password;
            console.log('- Direct match:', directMatch);

            // Try bcrypt comparison if temp_password might be a hash
            if (member.temp_password.startsWith('$2')) {
                try {
                    const tempHashMatch = await bcrypt.compare(testPassword, member.temp_password);
                    console.log('- Temp password hash match:', tempHashMatch);
                } catch (e) {
                    console.log('- Temp password is not a valid hash');
                }
            }
        }

        // 3. Test API endpoint
        console.log('\n3. Testing API endpoint...');
        const apiUrl = process.env.NODE_ENV === 'production'
            ? 'https://proshael.onrender.com/api/auth/member-login'
            : 'http://localhost:5001/api/auth/member-login';

        console.log('API URL:', apiUrl);

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone: testPhone,
                    password: testPassword
                })
            });

            const data = await response.json();
            console.log('API Response Status:', response.status);
            console.log('API Response:', JSON.stringify(data, null, 2));
        } catch (apiError) {
            console.error('API call failed:', apiError.message);
        }

    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run the test
testAuthentication().then(() => {
    console.log('\n=== Test completed ===');
    process.exit(0);
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});