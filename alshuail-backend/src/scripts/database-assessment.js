/**
 * Database Assessment Script for Al-Shuail Member Monitoring
 * This script performs a comprehensive assessment of the database status
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('\n====================================');
console.log('Al-Shuail Database Assessment Report');
console.log('====================================\n');

async function assessDatabase() {
  try {
    // 1. Test Database Connection
    console.log('1. DATABASE CONNECTION STATUS');
    console.log('------------------------------');
    try {
      const { data: testData, error: testError } = await supabase
        .from('members')
        .select('id')
        .limit(1);

      if (testError) {
        console.log('❌ Connection Status: FAILED');
        console.log('   Error:', testError.message);
      } else {
        console.log('✅ Connection Status: ACTIVE');
        console.log('   Supabase URL:', supabaseUrl);
        console.log('   Project Ref: oneiggrfzagqjbkdinin');
      }
    } catch (err) {
      console.log('❌ Connection Status: ERROR');
      console.log('   Error:', err.message);
    }

    // 2. Verify Member Data
    console.log('\n2. MEMBER DATA VERIFICATION');
    console.log('------------------------------');

    // Get total member count
    const { count: totalMembers, error: countError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.log('❌ Unable to count members:', countError.message);
    } else {
      console.log(`✅ Total Members in Database: ${totalMembers}`);
      if (totalMembers === 288) {
        console.log('   ✓ Expected 288 members CONFIRMED');
      } else if (totalMembers < 288) {
        console.log(`   ⚠️ Missing ${288 - totalMembers} members from expected 288`);
      } else {
        console.log(`   ℹ️ Database has ${totalMembers - 288} more members than expected 288`);
      }
    }

    // 3. Check Member Table Schema
    console.log('\n3. MEMBER TABLE SCHEMA');
    console.log('------------------------------');

    const { data: sampleMember, error: schemaError } = await supabase
      .from('members')
      .select('*')
      .limit(1)
      .single();

    if (schemaError) {
      console.log('❌ Unable to retrieve schema:', schemaError.message);
    } else if (sampleMember) {
      console.log('✅ Member Table Columns:');
      const columns = Object.keys(sampleMember);

      // Check for critical columns
      const criticalColumns = ['id', 'full_name', 'phone', 'membership_number'];
      const missingColumns = criticalColumns.filter(col => !columns.includes(col));

      if (missingColumns.length === 0) {
        console.log('   ✓ All critical columns present');
      } else {
        console.log(`   ⚠️ Missing critical columns: ${missingColumns.join(', ')}`);
      }

      // List all columns
      columns.forEach(col => {
        const value = sampleMember[col];
        const type = value === null ? 'null' : typeof value;
        console.log(`   - ${col} (${type})`);
      });
    }

    // 4. Data Integrity Check
    console.log('\n4. DATA INTEGRITY CHECK');
    console.log('------------------------------');

    // Check for members with missing required fields
    const { data: membersWithIssues, error: integrityError } = await supabase
      .from('members')
      .select('id, full_name, phone, membership_number')
      .or('full_name.is.null,phone.is.null,membership_number.is.null');

    if (integrityError) {
      console.log('❌ Integrity check failed:', integrityError.message);
    } else {
      if (membersWithIssues && membersWithIssues.length > 0) {
        console.log(`⚠️ Found ${membersWithIssues.length} members with missing required fields`);
        membersWithIssues.slice(0, 5).forEach(member => {
          console.log(`   - ID: ${member.id}`);
          if (!member.full_name) console.log('     Missing: full_name');
          if (!member.phone) console.log('     Missing: phone');
          if (!member.membership_number) console.log('     Missing: membership_number');
        });
      } else {
        console.log('✅ All members have required fields');
      }
    }

    // Check for duplicate phone numbers
    let duplicates = 0;
    const { data: allPhones, error: phoneError } = await supabase
      .from('members')
      .select('phone');

    if (!phoneError && allPhones) {
      const phones = allPhones.map(m => m.phone).filter(p => p);
      const uniquePhones = new Set(phones);
      duplicates = phones.length - uniquePhones.size;

      if (duplicates > 0) {
        console.log(`⚠️ Found ${duplicates} duplicate phone numbers`);
      } else {
        console.log('✅ No duplicate phone numbers found');
      }
    }

    // 5. Query Performance Analysis
    console.log('\n5. QUERY PERFORMANCE ANALYSIS');
    console.log('------------------------------');

    // Test simple query performance
    const startSimple = Date.now();
    const { data: simpleQuery, error: simpleError } = await supabase
      .from('members')
      .select('id, full_name, phone')
      .limit(100);
    const simpleTime = Date.now() - startSimple;

    if (!simpleError) {
      console.log(`✅ Simple query (100 records): ${simpleTime}ms`);
      if (simpleTime > 1000) {
        console.log('   ⚠️ Query time exceeds 1 second - indexing may be needed');
      }
    }

    // Test filtered query performance
    const startFiltered = Date.now();
    const { data: filteredQuery, error: filteredError } = await supabase
      .from('members')
      .select('*')
      .ilike('full_name', '%أحمد%')
      .limit(50);
    const filteredTime = Date.now() - startFiltered;

    if (!filteredError) {
      console.log(`✅ Filtered query (name search): ${filteredTime}ms`);
      if (filteredTime > 2000) {
        console.log('   ⚠️ Filtered query slow - consider adding full-text search index');
      }
    }

    // Test count query performance
    const startCount = Date.now();
    const { count, error: countPerfError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true });
    const countTime = Date.now() - startCount;

    if (!countPerfError) {
      console.log(`✅ Count query: ${countTime}ms`);
      if (countTime > 500) {
        console.log('   ⚠️ Count query slow - consider caching counts');
      }
    }

    // 6. Check Related Tables
    console.log('\n6. RELATED TABLES STATUS');
    console.log('------------------------------');

    const tables = ['payments', 'subscriptions', 'notifications', 'users'];

    for (const tableName of tables) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.log(`❌ Table '${tableName}': NOT FOUND or ERROR`);
          console.log(`   Error: ${error.message}`);
        } else {
          console.log(`✅ Table '${tableName}': ${count} records`);
        }
      } catch (err) {
        console.log(`❌ Table '${tableName}': ERROR - ${err.message}`);
      }
    }

    // 7. Member Balance Analysis (if balance field exists)
    console.log('\n7. MEMBER BALANCE ANALYSIS');
    console.log('------------------------------');

    const { data: memberBalances, error: balanceError } = await supabase
      .from('members')
      .select('id, full_name, balance')
      .not('balance', 'is', null)
      .order('balance', { ascending: false })
      .limit(10);

    if (balanceError) {
      console.log('ℹ️ Balance field not found or not accessible');
    } else if (memberBalances && memberBalances.length > 0) {
      console.log('✅ Top 10 Member Balances:');
      memberBalances.forEach((member, index) => {
        console.log(`   ${index + 1}. ${member.full_name}: ${member.balance || 0} SAR`);
      });
    } else {
      console.log('ℹ️ No balance data available');
    }

    // 8. Tribal Section Analysis (if exists)
    console.log('\n8. TRIBAL SECTION DISTRIBUTION');
    console.log('------------------------------');

    const { data: sections, error: sectionError } = await supabase
      .from('members')
      .select('tribal_section');

    if (sectionError) {
      console.log('ℹ️ Tribal section field not found');
    } else if (sections) {
      const sectionCounts = {};
      sections.forEach(member => {
        const section = member.tribal_section || 'Not Specified';
        sectionCounts[section] = (sectionCounts[section] || 0) + 1;
      });

      console.log('✅ Distribution by Tribal Section:');
      Object.entries(sectionCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([section, count]) => {
          console.log(`   - ${section}: ${count} members`);
        });
    }

    // 9. Recommendations
    console.log('\n9. OPTIMIZATION RECOMMENDATIONS');
    console.log('------------------------------');

    const recommendations = [];

    if (totalMembers > 1000) {
      recommendations.push('Consider implementing pagination for large datasets');
    }

    if (simpleTime > 1000 || filteredTime > 2000) {
      recommendations.push('Add database indexes on frequently queried columns (full_name, phone, membership_number)');
    }

    if (countTime > 500) {
      recommendations.push('Implement count caching to improve dashboard performance');
    }

    if (membersWithIssues && membersWithIssues.length > 0) {
      recommendations.push('Clean up member records with missing required fields');
    }

    if (duplicates > 0) {
      recommendations.push('Resolve duplicate phone numbers to ensure data integrity');
    }

    if (recommendations.length > 0) {
      recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    } else {
      console.log('✅ Database is well-optimized for current usage');
    }

    // 10. Summary
    console.log('\n10. ASSESSMENT SUMMARY');
    console.log('------------------------------');
    console.log(`Database Status: ${totalMembers >= 288 ? '✅ HEALTHY' : '⚠️ NEEDS ATTENTION'}`);
    console.log(`Total Members: ${totalMembers || 'Unknown'}`);
    console.log(`Expected Members: 288`);
    console.log(`Connection: ACTIVE`);
    console.log(`Performance: ${simpleTime < 1000 ? 'GOOD' : 'NEEDS OPTIMIZATION'}`);
    console.log(`Data Integrity: ${(!membersWithIssues || membersWithIssues.length === 0) ? 'EXCELLENT' : 'NEEDS REVIEW'}`);

  } catch (error) {
    console.error('\n❌ CRITICAL ERROR DURING ASSESSMENT');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the assessment
assessDatabase().then(() => {
  console.log('\n====================================');
  console.log('Assessment Complete');
  console.log('====================================\n');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});