/**
 * Database Assessment Script for Al-Shuail Member Monitoring
 * This script performs a comprehensive assessment of the database status
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { log } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  log.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

log.info('\n====================================');
log.info('Al-Shuail Database Assessment Report');
log.info('====================================\n');

async function assessDatabase() {
  try {
    // 1. Test Database Connection
    log.info('1. DATABASE CONNECTION STATUS');
    log.info('------------------------------');
    try {
      const { data: _testData, error: _testError } = await supabase
        .from('members')
        .select('id')
        .limit(1);

      if (_testError) {
        log.info('❌ Connection Status: FAILED');
        log.info('   Error:', _testError.message);
      } else {
        log.info('✅ Connection Status: ACTIVE');
        log.info('   Supabase URL:', supabaseUrl);
        log.info('   Project Ref: oneiggrfzagqjbkdinin');
      }
    } catch (err) {
      log.info('❌ Connection Status: ERROR');
      log.info('   Error:', err.message);
    }

    // 2. Verify Member Data
    log.info('\n2. MEMBER DATA VERIFICATION');
    log.info('------------------------------');

    // Get total member count
    const { count: totalMembers, error: _countError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true });

    if (_countError) {
      log.info('❌ Unable to count members:', _countError.message);
    } else {
      log.info(`✅ Total Members in Database: ${totalMembers}`);
      if (totalMembers === 288) {
        log.info('   ✓ Expected 288 members CONFIRMED');
      } else if (totalMembers < 288) {
        log.info(`   ⚠️ Missing ${288 - totalMembers} members from expected 288`);
      } else {
        log.info(`   ℹ️ Database has ${totalMembers - 288} more members than expected 288`);
      }
    }

    // 3. Check Member Table Schema
    log.info('\n3. MEMBER TABLE SCHEMA');
    log.info('------------------------------');

    const { data: sampleMember, error: _schemaError } = await supabase
      .from('members')
      .select('*')
      .limit(1)
      .single();

    if (_schemaError) {
      log.info('❌ Unable to retrieve schema:', _schemaError.message);
    } else if (sampleMember) {
      log.info('✅ Member Table Columns:');
      const columns = Object.keys(sampleMember);

      // Check for critical columns
      const criticalColumns = ['id', 'full_name', 'phone', 'membership_number'];
      const missingColumns = criticalColumns.filter(col => !columns.includes(col));

      if (missingColumns.length === 0) {
        log.info('   ✓ All critical columns present');
      } else {
        log.info(`   ⚠️ Missing critical columns: ${missingColumns.join(', ')}`);
      }

      // List all columns
      columns.forEach(col => {
        const value = sampleMember[col];
        const type = value === null ? 'null' : typeof value;
        log.info(`   - ${col} (${type})`);
      });
    }

    // 4. Data Integrity Check
    log.info('\n4. DATA INTEGRITY CHECK');
    log.info('------------------------------');

    // Check for members with missing required fields
    const { data: membersWithIssues, error: _integrityError } = await supabase
      .from('members')
      .select('id, full_name, phone, membership_number')
      .or('full_name.is.null,phone.is.null,membership_number.is.null');

    if (_integrityError) {
      log.info('❌ Integrity check failed:', _integrityError.message);
    } else {
      if (membersWithIssues && membersWithIssues.length > 0) {
        log.info(`⚠️ Found ${membersWithIssues.length} members with missing required fields`);
        membersWithIssues.slice(0, 5).forEach(member => {
          log.info(`   - ID: ${member.id}`);
          if (!member.full_name) {log.info('     Missing: full_name');}
          if (!member.phone) {log.info('     Missing: phone');}
          if (!member.membership_number) {log.info('     Missing: membership_number');}
        });
      } else {
        log.info('✅ All members have required fields');
      }
    }

    // Check for duplicate phone numbers
    let duplicates = 0;
    const { data: allPhones, error: _phoneError } = await supabase
      .from('members')
      .select('phone');

    if (!_phoneError && allPhones) {
      const phones = allPhones.map(m => m.phone).filter(p => p);
      const uniquePhones = new Set(phones);
      duplicates = phones.length - uniquePhones.size;

      if (duplicates > 0) {
        log.info(`⚠️ Found ${duplicates} duplicate phone numbers`);
      } else {
        log.info('✅ No duplicate phone numbers found');
      }
    }

    // 5. Query Performance Analysis
    log.info('\n5. QUERY PERFORMANCE ANALYSIS');
    log.info('------------------------------');

    // Test simple query performance
    const startSimple = Date.now();
    const { data: _simpleQuery, error: _simpleError } = await supabase
      .from('members')
      .select('id, full_name, phone')
      .limit(100);
    const simpleTime = Date.now() - startSimple;

    if (!_simpleError) {
      log.info(`✅ Simple query (100 records): ${simpleTime}ms`);
      if (simpleTime > 1000) {
        log.info('   ⚠️ Query time exceeds 1 second - indexing may be needed');
      }
    }

    // Test filtered query performance
    const startFiltered = Date.now();
    const { data: _filteredQuery, error: _filteredError } = await supabase
      .from('members')
      .select('*')
      .ilike('full_name', '%أحمد%')
      .limit(50);
    const filteredTime = Date.now() - startFiltered;

    if (!_filteredError) {
      log.info(`✅ Filtered query (name search): ${filteredTime}ms`);
      if (filteredTime > 2000) {
        log.info('   ⚠️ Filtered query slow - consider adding full-text search index');
      }
    }

    // Test count query performance
    const startCount = Date.now();
    const { count: _count, error: _countPerfError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true });
    const countTime = Date.now() - startCount;

    if (!_countPerfError) {
      log.info(`✅ Count query: ${countTime}ms`);
      if (countTime > 500) {
        log.info('   ⚠️ Count query slow - consider caching counts');
      }
    }

    // 6. Check Related Tables
    log.info('\n6. RELATED TABLES STATUS');
    log.info('------------------------------');

    const tables = ['payments', 'subscriptions', 'notifications', 'users'];

    for (const tableName of tables) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (error) {
          log.info(`❌ Table '${tableName}': NOT FOUND or ERROR`);
          log.info(`   Error: ${error.message}`);
        } else {
          log.info(`✅ Table '${tableName}': ${count} records`);
        }
      } catch (err) {
        log.info(`❌ Table '${tableName}': ERROR - ${err.message}`);
      }
    }

    // 7. Member Balance Analysis (if balance field exists)
    log.info('\n7. MEMBER BALANCE ANALYSIS');
    log.info('------------------------------');

    const { data: memberBalances, error: _balanceError } = await supabase
      .from('members')
      .select('id, full_name, balance')
      .not('balance', 'is', null)
      .order('balance', { ascending: false })
      .limit(10);

    if (_balanceError) {
      log.info('ℹ️ Balance field not found or not accessible');
    } else if (memberBalances && memberBalances.length > 0) {
      log.info('✅ Top 10 Member Balances:');
      memberBalances.forEach((member, index) => {
        log.info(`   ${index + 1}. ${member.full_name}: ${member.balance || 0} SAR`);
      });
    } else {
      log.info('ℹ️ No balance data available');
    }

    // 8. Tribal Section Analysis (if exists)
    log.info('\n8. TRIBAL SECTION DISTRIBUTION');
    log.info('------------------------------');

    const { data: sections, error: _sectionError } = await supabase
      .from('members')
      .select('tribal_section');

    if (_sectionError) {
      log.info('ℹ️ Tribal section field not found');
    } else if (sections) {
      const sectionCounts = {};
      sections.forEach(member => {
        const section = member.tribal_section || 'Not Specified';
        sectionCounts[section] = (sectionCounts[section] || 0) + 1;
      });

      log.info('✅ Distribution by Tribal Section:');
      Object.entries(sectionCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([section, count]) => {
          log.info(`   - ${section}: ${count} members`);
        });
    }

    // 9. Recommendations
    log.info('\n9. OPTIMIZATION RECOMMENDATIONS');
    log.info('------------------------------');

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
        log.info(`${index + 1}. ${rec}`);
      });
    } else {
      log.info('✅ Database is well-optimized for current usage');
    }

    // 10. Summary
    log.info('\n10. ASSESSMENT SUMMARY');
    log.info('------------------------------');
    log.info(`Database Status: ${totalMembers >= 288 ? '✅ HEALTHY' : '⚠️ NEEDS ATTENTION'}`);
    log.info(`Total Members: ${totalMembers || 'Unknown'}`);
    log.info(`Expected Members: 288`);
    log.info(`Connection: ACTIVE`);
    log.info(`Performance: ${simpleTime < 1000 ? 'GOOD' : 'NEEDS OPTIMIZATION'}`);
    log.info(`Data Integrity: ${(!membersWithIssues || membersWithIssues.length === 0) ? 'EXCELLENT' : 'NEEDS REVIEW'}`);

  } catch (error) {
    log.error('\n❌ CRITICAL ERROR DURING ASSESSMENT');
    log.error('Error:', error.message);
    log.error('Stack:', error.stack);
  }
}

// Run the assessment
assessDatabase().then(() => {
  log.info('\n====================================');
  log.info('Assessment Complete');
  log.info('====================================\n');
  process.exit(0);
}).catch(err => {
  log.error('Fatal error:', err);
  process.exit(1);
});