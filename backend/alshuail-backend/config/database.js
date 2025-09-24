const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey) {
    try {
        supabase = createClient(supabaseUrl, supabaseKey);
        console.log('✅ Supabase connection configured successfully');

        // Test the connection
        testSupabaseConnection();
    } catch (error) {
        console.error('❌ Supabase connection failed:', error.message);
    }
} else {
    console.error('❌ Supabase credentials not found in environment variables');
}

// Test Supabase connection
async function testSupabaseConnection() {
    try {
        // Test with a simple query to check if we can connect
        const { data, error } = await supabase
            .from('members')
            .select('count', { count: 'exact', head: true });

        if (error) {
            console.log('⚠️  Supabase connected but table access limited:', error.message);
        } else {
            console.log('✅ Supabase connection test successful');
        }
    } catch (error) {
        console.log('⚠️  Supabase connection test failed:', error.message);
    }
}

// Helper function to test database schema for Day 6 activities
const testDatabaseSchema = async () => {
    try {
        if (!supabase) {
            console.log('❌ Supabase not initialized');
            return false;
        }

        // Check for Day 6 required tables
        const requiredTables = ['main_categories', 'activities', 'financial_contributions', 'temp_members'];
        const existingTables = [];

        for (const tableName of requiredTables) {
            try {
                const { data, error } = await supabase
                    .from(tableName)
                    .select('*', { count: 'exact', head: true });

                if (!error) {
                    existingTables.push(tableName);
                }
            } catch (err) {
                // Table doesn't exist or no access
            }
        }

        console.log('📋 Available Day 6 tables:', existingTables.join(', ') || 'None');

        if (existingTables.length > 0) {
            console.log('✅ Day 6 database schema partially detected!');
            return true;
        } else {
            console.log('⚠️  Day 6 database schema not found. Tables may need to be created.');
            return false;
        }
    } catch (error) {
        console.error('❌ Database schema test failed:', error.message);
        return false;
    }
};

// Run schema test with delay to allow connection
setTimeout(() => {
    testDatabaseSchema();
}, 1000);

// Create a pool-like wrapper for legacy code compatibility
const pool = {
    async query(query, params = []) {
        console.log('Legacy pool.query called - this needs to be converted to Supabase');
        throw new Error('pool.query is not supported - use supabase client instead');
    }
};

module.exports = {
    supabase,
    pool, // For debugging - shows which methods need conversion
    testDatabaseSchema
};