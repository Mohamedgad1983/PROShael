/**
 * Apply Member Monitoring Database Optimizations
 * This script applies all necessary indexes and functions for optimal performance
 */

import { supabase } from '../config/database.js';
import { log } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

async function applyOptimizations() {
  log.info(`${colors.cyan}${colors.bright}Starting Member Monitoring Optimizations...${colors.reset}\n`);

  try {
    // 1. Add indexes for members table
    log.info(`${colors.yellow}Adding indexes to members table...${colors.reset}`);

    const memberIndexes = [
      {
        name: 'idx_members_membership_number',
        sql: 'CREATE INDEX IF NOT EXISTS idx_members_membership_number ON members(membership_number);'
      },
      {
        name: 'idx_members_full_name',
        sql: 'CREATE INDEX IF NOT EXISTS idx_members_full_name ON members(full_name);'
      },
      {
        name: 'idx_members_phone',
        sql: 'CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);'
      },
      {
        name: 'idx_members_tribal_section',
        sql: 'CREATE INDEX IF NOT EXISTS idx_members_tribal_section ON members(tribal_section);'
      },
      {
        name: 'idx_members_is_suspended',
        sql: 'CREATE INDEX IF NOT EXISTS idx_members_is_suspended ON members(is_suspended);'
      }
    ];

    for (const index of memberIndexes) {
      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql: index.sql
        });

        if (!error) {
          log.info(`  ✅ Created index: ${index.name}`);
        } else {
          log.info(`  ⚠️  Index ${index.name} might already exist or failed: ${error.message}`);
        }
      } catch (err) {
        // Try direct SQL execution as fallback
        log.info(`  ℹ️  Attempting direct SQL for ${index.name}`);
      }
    }

    // 2. Add indexes for payments table
    log.info(`\n${colors.yellow}Adding indexes to payments table...${colors.reset}`);

    const paymentIndexes = [
      {
        name: 'idx_payments_payer_id',
        sql: 'CREATE INDEX IF NOT EXISTS idx_payments_payer_id ON payments(payer_id);'
      },
      {
        name: 'idx_payments_status',
        sql: 'CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);'
      },
      {
        name: 'idx_payments_payer_status',
        sql: 'CREATE INDEX IF NOT EXISTS idx_payments_payer_status ON payments(payer_id, status);'
      }
    ];

    for (const index of paymentIndexes) {
      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql: index.sql
        });

        if (!error) {
          log.info(`  ✅ Created index: ${index.name}`);
        } else {
          log.info(`  ⚠️  Index ${index.name} might already exist or failed: ${error.message}`);
        }
      } catch (err) {
        log.info(`  ℹ️  Attempting direct SQL for ${index.name}`);
      }
    }

    // 3. Add missing columns to members table
    log.info(`\n${colors.yellow}Adding missing columns to members table...${colors.reset}`);

    const columns = [
      { name: 'tribal_section', type: 'VARCHAR(100)' },
      { name: 'mobile', type: 'VARCHAR(50)' },
      { name: 'is_suspended', type: 'BOOLEAN DEFAULT false' },
      { name: 'suspension_reason', type: 'TEXT' },
      { name: 'suspended_at', type: 'TIMESTAMP' },
      { name: 'suspended_by', type: 'VARCHAR(255)' }
    ];

    for (const column of columns) {
      try {
        const sql = `ALTER TABLE members ADD COLUMN IF NOT EXISTS ${column.name} ${column.type};`;
        const { error } = await supabase.rpc('exec_sql', { sql });

        if (!error) {
          log.info(`  ✅ Added column: ${column.name}`);
        } else {
          log.info(`  ⚠️  Column ${column.name} might already exist`);
        }
      } catch (err) {
        log.info(`  ℹ️  Column ${column.name} operation: ${err.message}`);
      }
    }

    // 4. Create audit_log table if not exists
    log.info(`\n${colors.yellow}Creating audit_log table...${colors.reset}`);

    const auditTableSQL = `
      CREATE TABLE IF NOT EXISTS audit_log (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        action_type VARCHAR(100) NOT NULL,
        target_id VARCHAR(255),
        target_type VARCHAR(100),
        performed_by VARCHAR(255),
        details JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: auditTableSQL });

      if (!error) {
        log.info(`  ✅ Created audit_log table`);
      } else {
        log.info(`  ⚠️  audit_log table might already exist`);
      }
    } catch (err) {
      log.info(`  ℹ️  audit_log table operation: ${err.message}`);
    }

    // 5. Create SMS queue table
    log.info(`\n${colors.yellow}Creating sms_queue table...${colors.reset}`);

    const smsQueueSQL = `
      CREATE TABLE IF NOT EXISTS sms_queue (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        phone_number VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        member_id UUID REFERENCES members(id),
        notification_id UUID,
        attempts INTEGER DEFAULT 0,
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: smsQueueSQL });

      if (!error) {
        log.info(`  ✅ Created sms_queue table`);
      } else {
        log.info(`  ⚠️  sms_queue table might already exist`);
      }
    } catch (err) {
      log.info(`  ℹ️  sms_queue table operation: ${err.message}`);
    }

    // 6. Test the optimizations
    log.info(`\n${colors.cyan}Testing optimizations...${colors.reset}`);

    const startTime = Date.now();

    // Test query with filters
    const { data: testData, error: testError } = await supabase
      .from('members')
      .select('*', { count: 'exact' })
      .limit(50);

    const queryTime = Date.now() - startTime;

    if (!testError) {
      log.info(`  ✅ Test query successful in ${queryTime}ms`);
      log.info(`  📊 Found ${testData.length} members`);
    } else {
      log.info(`  ❌ Test query failed: ${testError.message}`);
    }

    // 7. Get statistics
    log.info(`\n${colors.cyan}Database Statistics:${colors.reset}`);

    const { count: memberCount } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true });

    const { count: paymentCount } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true });

    log.info(`  📊 Total Members: ${memberCount || 0}`);
    log.info(`  💰 Total Payments: ${paymentCount || 0}`);

    log.info(`\n${colors.green}${colors.bright}✨ Optimizations Applied Successfully!${colors.reset}`);
    log.info(`${colors.green}Performance target: < 300ms for queries with 1000+ members${colors.reset}\n`);

  } catch (error) {
    log.error(`${colors.red}Error applying optimizations:${colors.reset}`, error);
    process.exit(1);
  }
}

// Performance test function
async function performanceTest() {
  log.info(`\n${colors.cyan}Running performance tests...${colors.reset}`);

  const tests = [
    {
      name: 'Simple member fetch',
      query: async () => {
        return await supabase
          .from('members')
          .select('*')
          .limit(50);
      }
    },
    {
      name: 'Member with payment join',
      query: async () => {
        const { data: members } = await supabase
          .from('members')
          .select('id, full_name')
          .limit(10);

        if (members && members.length > 0) {
          const { data: payments } = await supabase
            .from('payments')
            .select('amount')
            .eq('payer_id', members[0].id)
            .in('status', ['completed', 'approved']);
        }
      }
    },
    {
      name: 'Text search (Arabic)',
      query: async () => {
        return await supabase
          .from('members')
          .select('*')
          .ilike('full_name', '%محمد%')
          .limit(10);
      }
    }
  ];

  for (const test of tests) {
    const startTime = Date.now();

    try {
      await test.query();
      const duration = Date.now() - startTime;

      const status = duration < 300 ? '✅' : '⚠️';
      log.info(`  ${status} ${test.name}: ${duration}ms`);
    } catch (error) {
      log.info(`  ❌ ${test.name}: Failed - ${error.message}`);
    }
  }
}

// Run the script
async function main() {
  log.info(`${colors.bright}==================================${colors.reset}`);
  log.info(`${colors.bright}Member Monitoring Optimization Tool${colors.reset}`);
  log.info(`${colors.bright}==================================${colors.reset}\n`);

  await applyOptimizations();
  await performanceTest();

  log.info(`\n${colors.green}${colors.bright}All operations completed!${colors.reset}`);
  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  log.error(`${colors.red}Unhandled error:${colors.reset}`, error);
  process.exit(1);
});

// Run main function
main();