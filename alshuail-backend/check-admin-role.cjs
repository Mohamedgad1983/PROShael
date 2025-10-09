// Script to check admin user role in production database
require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function checkAdminRole() {
    console.log('🔍 Checking admin user role...\n');

    try {
        // Check admin@alshuail.com user
        const { data, error } = await supabase
            .from('users')
            .select('id, email, phone, role')
            .eq('email', 'admin@alshuail.com')
            .single();

        if (error) {
            console.log('❌ Error:', error.message);
            return;
        }

        if (!data) {
            console.log('❌ User admin@alshuail.com not found!');
            return;
        }

        console.log('✅ User found:');
        console.log('   ID:', data.id);
        console.log('   Email:', data.email);
        console.log('   Phone:', data.phone);
        console.log('   Role:', data.role);
        console.log('');

        if (data.role !== 'super_admin' && data.role !== 'admin') {
            console.log('⚠️  WARNING: User role is not admin or super_admin!');
            console.log('   Current role:', data.role);
            console.log('   Needs to be: "admin" or "super_admin"');
        } else {
            console.log('✅ User has correct admin role:', data.role);
        }

    } catch (err) {
        console.log('❌ Unexpected error:', err.message);
    }
}

checkAdminRole();
