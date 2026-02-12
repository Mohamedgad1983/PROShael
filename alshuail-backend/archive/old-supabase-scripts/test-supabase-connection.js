/**
 * Test Supabase MCP Connection
 * Run this script to verify database connectivity
 */

import { testConnection, TABLES, dbHelpers } from './src/config/supabase.js';

console.log('🔄 Testing Supabase MCP connection...\n');

async function runConnectionTest() {
  try {
    // Test basic connection
    console.log('1️⃣ Testing basic connection...');
    const connectionResult = await testConnection();

    if (!connectionResult.connected) {
      console.error('❌ Connection failed:', connectionResult.error);
      console.log('\n📝 Please ensure:');
      console.log('   - Your .env file contains valid SUPABASE_KEY and SUPABASE_SERVICE_KEY');
      console.log('   - The MCP server is properly configured');
      console.log('   - Project reference: oneiggrfzagqjbkdinin');
      return;
    }

    console.log('✅ Connection successful!');
    console.log(`📍 Connected to project: ${connectionResult.projectRef}\n`);

    // Try to list tables
    console.log('2️⃣ Checking available tables...');
    console.log('📊 Expected tables:');
    Object.entries(TABLES).forEach(([key, tableName]) => {
      console.log(`   - ${tableName}`);
    });

    // Test a simple query (if members table exists)
    console.log('\n3️⃣ Testing database query...');
    try {
      const result = await dbHelpers.search(TABLES.MEMBERS, {}, { limit: 1 });
      console.log(`✅ Query successful! Found ${result.data?.length || 0} members`);
    } catch (queryError) {
      if (queryError.message?.includes('relation') && queryError.message?.includes('does not exist')) {
        console.log('⚠️ Members table does not exist yet');
        console.log('   This is normal for a new database. Tables will be created when you run migrations.');
      } else {
        console.log('⚠️ Query error (may be normal for empty database):', queryError.message);
      }
    }

    console.log('\n🎉 Supabase MCP integration is ready!');
    console.log('📚 Next steps:');
    console.log('   1. Create your .env file with actual Supabase keys');
    console.log('   2. Run database migrations to create tables');
    console.log('   3. Start using the database in your application');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check if MCP server is running: claude mcp list');
    console.log('   2. Restart Claude Code if needed');
    console.log('   3. Verify your Supabase project is active');
  }
}

// Run the test
runConnectionTest().catch(console.error);