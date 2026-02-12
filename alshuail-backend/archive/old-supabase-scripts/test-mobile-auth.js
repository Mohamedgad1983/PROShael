import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Using key:', supabaseKey ? 'Found' : 'Not found');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuthentication() {
    // Use specific test member
    const testPhone = '0555555555';  // Specific test phone
    const testPassword = '123456';

    console.log('\n=== Testing Mobile Authentication ===');
    console.log('Phone (local format):', testPhone);
    console.log('Password:', testPassword);

    try {
        // 1. Check if member exists
        console.log('\n1. Checking if member exists in database...');
        // Try both phone formats
        const phoneVariants = [testPhone];
        if (testPhone.startsWith('0')) {
            phoneVariants.push(`+966${  testPhone.substring(1)}`);
        }

        let member = null;
        let error = null;

        for (const phoneVariant of phoneVariants) {
            console.log(`  Trying phone format: ${phoneVariant}`);
            const { data, error: queryError } = await supabase
                .from('members')
                .select('id, full_name, phone, membership_number, membership_status, password_hash, temp_password, balance')
                .eq('phone', phoneVariant)
                .single();

            if (data && !queryError) {
                member = data;
                error = null;
                break;
            }
            error = queryError;
        }

        if (error) {
            console.error('Error fetching member:', error);

            // Try to list first few members to see what we have
            console.log('\n Trying to list members with phone numbers...');
            const { data: members, error: listError } = await supabase
                .from('members')
                .select('phone, full_name, temp_password, password_hash')
                .limit(5);

            if (!listError && members) {
                console.log('Sample members in database:');
                members.forEach(m => {
                    console.log(`- Phone: ${m.phone}, Name: ${m.full_name}, Has temp_password: ${!!m.temp_password}, Has password_hash: ${!!m.password_hash}`);
                });
            }
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
        console.log('- temp_password value:', member.temp_password);
        console.log('- Balance:', member.balance);

        // 2. Test password validation
        console.log('\n2. Testing password validation...');

        let passwordValid = false;

        // Test against password_hash
        if (member.password_hash) {
            console.log('\nTesting against password_hash...');
            try {
                const hashMatch = await bcrypt.compare(testPassword, member.password_hash);
                console.log('- Password matches hash:', hashMatch);
                if (hashMatch) {passwordValid = true;}

                // Show hash details for debugging
                console.log('- Hash starts with:', `${member.password_hash.substring(0, 20)  }...`);
                console.log('- Hash length:', member.password_hash.length);
            } catch (e) {
                console.log('- Error comparing with password_hash:', e.message);
            }
        }

        // Test against temp_password
        if (member.temp_password && !passwordValid) {
            console.log('\nTesting against temp_password...');
            console.log('- Temp password value:', member.temp_password);

            // Direct comparison
            const directMatch = testPassword === member.temp_password;
            console.log('- Direct match:', directMatch);
            if (directMatch) {passwordValid = true;}

            // Try bcrypt comparison if temp_password might be a hash
            if (!directMatch && member.temp_password.startsWith('$2')) {
                try {
                    const tempHashMatch = await bcrypt.compare(testPassword, member.temp_password);
                    console.log('- Temp password hash match:', tempHashMatch);
                    if (tempHashMatch) {passwordValid = true;}
                } catch (e) {
                    console.log('- Temp password is not a valid hash');
                }
            }
        }

        console.log('\n=== Password validation result:', passwordValid ? 'SUCCESS' : 'FAILED', '===');

        // 3. Simulate the authentication logic from auth.js
        console.log('\n3. Simulating authenticateMember function logic...');

        let simulatedPasswordMatch = false;

        // Step 1: Check password_hash
        if (member.password_hash) {
            simulatedPasswordMatch = await bcrypt.compare(testPassword, member.password_hash);
            console.log('- Step 1 (password_hash): ', simulatedPasswordMatch);
        }

        // Step 2: Check temp_password
        if (!simulatedPasswordMatch && member.temp_password) {
            // Direct comparison
            if (testPassword === member.temp_password) {
                simulatedPasswordMatch = true;
                console.log('- Step 2 (temp_password direct): ', simulatedPasswordMatch);
            } else {
                // Try as hash
                try {
                    simulatedPasswordMatch = await bcrypt.compare(testPassword, member.temp_password);
                    console.log('- Step 2 (temp_password hash): ', simulatedPasswordMatch);
                } catch (e) {
                    console.log('- Step 2 (temp_password): not a valid hash');
                }
            }
        }

        // Step 3: Check for default password '123456' for first-time login
        if (!simulatedPasswordMatch && testPassword === '123456' && !member.password_hash) {
            simulatedPasswordMatch = true;
            console.log('- Step 3 (default password for first-time login): ', simulatedPasswordMatch);
        }

        console.log('\n=== Simulated authentication result:', simulatedPasswordMatch ? 'SUCCESS' : 'FAILED', '===');

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