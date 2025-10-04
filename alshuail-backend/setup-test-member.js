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

async function setupTestMember() {
    console.log('\n=== Setting Up Test Member ===');

    // First, check if we have a member with phone 0555555555 or +966555555555
    const phoneVariants = ['0555555555', '+966555555555'];
    let existingMember = null;

    for (const phone of phoneVariants) {
        const { data, error } = await supabase
            .from('members')
            .select('*')
            .eq('phone', phone)
            .single();

        if (data && !error) {
            existingMember = data;
            break;
        }
    }

    if (existingMember) {
        console.log('Found existing test member:', existingMember.full_name);
        console.log('Phone:', existingMember.phone);
    } else {
        // Get the first member from the database to use as a test member
        const { data: firstMember, error } = await supabase
            .from('members')
            .select('*')
            .limit(1)
            .single();

        if (error || !firstMember) {
            console.error('Could not find any members in the database');
            return;
        }

        existingMember = firstMember;
        console.log('Using existing member as test:', existingMember.full_name);
        console.log('Phone:', existingMember.phone);
    }

    // Generate password hash for '123456'
    const password = '123456';
    const passwordHash = await bcrypt.hash(password, 10);

    console.log('\nUpdating member with test credentials...');
    console.log('- Setting temp_password to:', password);
    console.log('- Setting password_hash to bcrypt hash of:', password);

    // Update the member with both temp_password and password_hash
    const { data: updatedMember, error: updateError } = await supabase
        .from('members')
        .update({
            temp_password: password,  // Plain text for direct comparison
            password_hash: passwordHash,  // Bcrypt hash
            updated_at: new Date().toISOString()
        })
        .eq('id', existingMember.id)
        .select()
        .single();

    if (updateError) {
        console.error('Error updating member:', updateError);
        return;
    }

    console.log('\n✅ Test member setup complete!');
    console.log('Member ID:', updatedMember.id);
    console.log('Name:', updatedMember.full_name);
    console.log('Phone:', updatedMember.phone);
    console.log('Password: 123456');
    console.log('\nYou can now login with:');

    if (updatedMember.phone.startsWith('+966')) {
        const localPhone = '0' + updatedMember.phone.substring(4);
        console.log('- Phone (local format):', localPhone);
        console.log('- Phone (international format):', updatedMember.phone);
    } else {
        console.log('- Phone:', updatedMember.phone);
    }
    console.log('- Password: 123456');

    // Test the password verification
    console.log('\n=== Testing Password Verification ===');
    const verifyHash = await bcrypt.compare('123456', updatedMember.password_hash);
    console.log('Hash verification:', verifyHash ? '✅ SUCCESS' : '❌ FAILED');

    const verifyTemp = updatedMember.temp_password === '123456';
    console.log('Temp password verification:', verifyTemp ? '✅ SUCCESS' : '❌ FAILED');
}

// Run the setup
setupTestMember().then(() => {
    console.log('\n=== Setup completed ===');
    process.exit(0);
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});