import { query } from './database.js';
import { log } from '../utils/logger.js';

/**
 * Database Optimization Service
 * Handles database schema optimizations, indexes, and performance improvements
 */
export class DatabaseOptimizationService {

  /**
   * Create all necessary indexes for payments table
   */
  static async createPaymentIndexes() {
    try {
      const indexes = [
        {
          name: 'idx_payments_payer_id',
          sql: 'CREATE INDEX IF NOT EXISTS idx_payments_payer_id ON payments(payer_id);',
          description: 'Index on payer_id for faster member payment lookups'
        },
        {
          name: 'idx_payments_status',
          sql: 'CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);',
          description: 'Index on status for faster status-based queries'
        },
        {
          name: 'idx_payments_category',
          sql: 'CREATE INDEX IF NOT EXISTS idx_payments_category ON payments(category);',
          description: 'Index on category for faster category-based queries'
        },
        {
          name: 'idx_payments_created_at',
          sql: 'CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);',
          description: 'Index on created_at for date range queries'
        },
        {
          name: 'idx_payments_reference_number',
          sql: 'CREATE INDEX IF NOT EXISTS idx_payments_reference_number ON payments(reference_number);',
          description: 'Index on reference_number for quick receipt lookups'
        },
        {
          name: 'idx_payments_status_created_at',
          sql: 'CREATE INDEX IF NOT EXISTS idx_payments_status_created_at ON payments(status, created_at);',
          description: 'Composite index for status and date filtering'
        },
        {
          name: 'idx_payments_payer_status',
          sql: 'CREATE INDEX IF NOT EXISTS idx_payments_payer_status ON payments(payer_id, status);',
          description: 'Composite index for member-specific status queries'
        },
        {
          name: 'idx_payments_category_status',
          sql: 'CREATE INDEX IF NOT EXISTS idx_payments_category_status ON payments(category, status);',
          description: 'Composite index for category and status analytics'
        }
      ];

      const results = [];
      for (const index of indexes) {
        try {
          await query(index.sql);

          results.push({
            name: index.name,
            success: true,
            description: index.description,
            error: null
          });
        } catch (err) {
          results.push({
            name: index.name,
            success: false,
            description: index.description,
            error: err.message
          });
        }
      }

      return {
        success: true,
        data: results,
        message: '\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0641\u0647\u0627\u0631\u0633 \u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || '\u0641\u0634\u0644 \u0641\u064a \u0625\u0646\u0634\u0627\u0621 \u0641\u0647\u0627\u0631\u0633 \u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a'
      };
    }
  }

  /**
   * Create database views for common queries
   */
  static async createAnalyticsViews() {
    try {
      const views = [
        {
          name: 'payment_analytics_view',
          sql: `
            CREATE OR REPLACE VIEW payment_analytics_view AS
            SELECT
              p.*,
              m.full_name,
              m.membership_number,
              m.phone,
              m.email,
              EXTRACT(YEAR FROM p.created_at) as payment_year,
              EXTRACT(MONTH FROM p.created_at) as payment_month,
              EXTRACT(DAY FROM p.created_at) as payment_day,
              DATE_TRUNC('month', p.created_at) as payment_month_start,
              DATE_TRUNC('week', p.created_at) as payment_week_start,
              CASE
                WHEN p.status = 'paid' THEN p.amount
                ELSE 0
              END as paid_amount,
              CASE
                WHEN p.status = 'pending' THEN p.amount
                ELSE 0
              END as pending_amount
            FROM payments p
            LEFT JOIN members m ON p.payer_id = m.id;
          `,
          description: 'Comprehensive view for payment analytics with member details'
        },
        {
          name: 'monthly_revenue_view',
          sql: `
            CREATE OR REPLACE VIEW monthly_revenue_view AS
            SELECT
              DATE_TRUNC('month', created_at) as month,
              EXTRACT(YEAR FROM created_at) as year,
              EXTRACT(MONTH FROM created_at) as month_number,
              category,
              COUNT(*) as payment_count,
              SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_revenue,
              SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_revenue,
              AVG(CASE WHEN status = 'paid' THEN amount ELSE NULL END) as avg_payment
            FROM payments
            GROUP BY DATE_TRUNC('month', created_at), EXTRACT(YEAR FROM created_at),
                     EXTRACT(MONTH FROM created_at), category
            ORDER BY month DESC;
          `,
          description: 'Monthly revenue breakdown by category'
        },
        {
          name: 'member_payment_summary_view',
          sql: `
            CREATE OR REPLACE VIEW member_payment_summary_view AS
            SELECT
              m.id as member_id,
              m.full_name,
              m.membership_number,
              m.phone,
              COUNT(p.id) as total_payments,
              SUM(CASE WHEN p.status = 'paid' THEN p.amount ELSE 0 END) as total_paid,
              SUM(CASE WHEN p.status = 'pending' THEN p.amount ELSE 0 END) as total_pending,
              MAX(CASE WHEN p.status = 'paid' THEN p.created_at ELSE NULL END) as last_payment_date,
              AVG(CASE WHEN p.status = 'paid' THEN p.amount ELSE NULL END) as avg_payment,
              COUNT(CASE WHEN p.category = 'subscription' AND p.status = 'paid' THEN 1 ELSE NULL END) as subscription_count
            FROM members m
            LEFT JOIN payments p ON m.id = p.payer_id
            WHERE m.is_active = true
            GROUP BY m.id, m.full_name, m.membership_number, m.phone
            ORDER BY total_paid DESC;
          `,
          description: 'Member payment summary for quick analysis'
        },
        {
          name: 'overdue_payments_view',
          sql: `
            CREATE OR REPLACE VIEW overdue_payments_view AS
            SELECT
              p.*,
              m.full_name,
              m.phone,
              m.email,
              DATE_PART('day', NOW() - p.created_at) as days_overdue,
              CASE
                WHEN DATE_PART('day', NOW() - p.created_at) BETWEEN 30 AND 59 THEN '30-60 days'
                WHEN DATE_PART('day', NOW() - p.created_at) BETWEEN 60 AND 89 THEN '60-90 days'
                WHEN DATE_PART('day', NOW() - p.created_at) >= 90 THEN '90+ days'
                ELSE 'Current'
              END as overdue_category
            FROM payments p
            LEFT JOIN members m ON p.payer_id = m.id
            WHERE p.status = 'pending'
              AND p.created_at < NOW() - INTERVAL '30 days'
            ORDER BY p.created_at ASC;
          `,
          description: 'View for overdue payments with categorization'
        }
      ];

      const results = [];
      for (const view of views) {
        try {
          await query(view.sql);

          results.push({
            name: view.name,
            success: true,
            description: view.description,
            error: null
          });
        } catch (err) {
          results.push({
            name: view.name,
            success: false,
            description: view.description,
            error: err.message
          });
        }
      }

      return {
        success: true,
        data: results,
        message: '\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0639\u0631\u0648\u0636 \u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0644\u0644\u062a\u062d\u0644\u064a\u0644\u0627\u062a'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || '\u0641\u0634\u0644 \u0641\u064a \u0625\u0646\u0634\u0627\u0621 \u0639\u0631\u0648\u0636 \u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a'
      };
    }
  }

  /**
   * Create audit logging triggers
   */
  static async createAuditLogging() {
    try {
      const auditSQL = `
        -- Create audit log table
        CREATE TABLE IF NOT EXISTS payment_audit_log (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          payment_id UUID,
          action VARCHAR(50) NOT NULL, -- INSERT, UPDATE, DELETE
          old_values JSONB,
          new_values JSONB,
          changed_by VARCHAR(255),
          changed_at TIMESTAMP DEFAULT NOW()
        );

        -- Create audit trigger function
        CREATE OR REPLACE FUNCTION audit_payment_changes()
        RETURNS TRIGGER AS $$
        BEGIN
          IF TG_OP = 'DELETE' THEN
            INSERT INTO payment_audit_log (
              payment_id, action, old_values, changed_at
            ) VALUES (
              OLD.id, TG_OP, row_to_json(OLD), NOW()
            );
            RETURN OLD;
          ELSIF TG_OP = 'UPDATE' THEN
            INSERT INTO payment_audit_log (
              payment_id, action, old_values, new_values, changed_at
            ) VALUES (
              NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW), NOW()
            );
            RETURN NEW;
          ELSIF TG_OP = 'INSERT' THEN
            INSERT INTO payment_audit_log (
              payment_id, action, new_values, changed_at
            ) VALUES (
              NEW.id, TG_OP, row_to_json(NEW), NOW()
            );
            RETURN NEW;
          END IF;
          RETURN NULL;
        END;
        $$ LANGUAGE plpgsql;

        -- Create audit trigger
        DROP TRIGGER IF EXISTS payment_audit_trigger ON payments;
        CREATE TRIGGER payment_audit_trigger
          AFTER INSERT OR UPDATE OR DELETE ON payments
          FOR EACH ROW EXECUTE FUNCTION audit_payment_changes();

        -- Create index on audit log
        CREATE INDEX IF NOT EXISTS idx_audit_payment_id ON payment_audit_log(payment_id);
        CREATE INDEX IF NOT EXISTS idx_audit_changed_at ON payment_audit_log(changed_at);
      `;

      try {
        await query(auditSQL);
        return {
          success: true,
          data: null,
          message: '\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0646\u0638\u0627\u0645 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u0639\u0645\u0644\u064a\u0627\u062a',
          error: null
        };
      } catch (sqlError) {
        return {
          success: false,
          data: null,
          message: sqlError.message,
          error: sqlError.message
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error.message || '\u0641\u0634\u0644 \u0641\u064a \u0625\u0646\u0634\u0627\u0621 \u0646\u0638\u0627\u0645 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u0639\u0645\u0644\u064a\u0627\u062a'
      };
    }
  }

  /**
   * Optimize payments table structure
   */
  static async optimizePaymentsTable() {
    try {
      const optimizations = [
        {
          name: 'Add missing columns',
          sql: `
            ALTER TABLE payments
            ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS due_date DATE,
            ADD COLUMN IF NOT EXISTS receipt_generated BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS receipt_sent BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMP;
          `
        },
        {
          name: 'Update constraints',
          sql: `
            -- Add check constraints
            ALTER TABLE payments DROP CONSTRAINT IF EXISTS check_amount_positive;
            ALTER TABLE payments ADD CONSTRAINT check_amount_positive
              CHECK (amount > 0 AND amount <= 100000);

            ALTER TABLE payments DROP CONSTRAINT IF EXISTS check_valid_status;
            ALTER TABLE payments ADD CONSTRAINT check_valid_status
              CHECK (status IN ('pending', 'paid', 'cancelled', 'failed', 'refunded'));

            ALTER TABLE payments DROP CONSTRAINT IF EXISTS check_valid_category;
            ALTER TABLE payments ADD CONSTRAINT check_valid_category
              CHECK (category IN ('subscription', 'donation', 'event', 'membership', 'other'));
          `
        },
        {
          name: 'Add unique constraints',
          sql: `
            -- Ensure reference number is unique
            ALTER TABLE payments DROP CONSTRAINT IF EXISTS unique_reference_number;
            ALTER TABLE payments ADD CONSTRAINT unique_reference_number
              UNIQUE (reference_number);
          `
        }
      ];

      const results = [];
      for (const optimization of optimizations) {
        try {
          await query(optimization.sql);

          results.push({
            name: optimization.name,
            success: true,
            error: null
          });
        } catch (err) {
          results.push({
            name: optimization.name,
            success: false,
            error: err.message
          });
        }
      }

      return {
        success: true,
        data: results,
        message: '\u062a\u0645 \u062a\u062d\u0633\u064a\u0646 \u0647\u064a\u0643\u0644 \u062c\u062f\u0648\u0644 \u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || '\u0641\u0634\u0644 \u0641\u064a \u062a\u062d\u0633\u064a\u0646 \u0647\u064a\u0643\u0644 \u062c\u062f\u0648\u0644 \u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a'
      };
    }
  }

  /**
   * Run full database optimization
   */
  static async runFullOptimization() {
    try {
      log.info('Starting database optimization...');

      const results = {
        tableOptimization: null,
        indexes: null,
        views: null,
        auditLogging: null
      };

      // 1. Optimize table structure
      log.info('1. Optimizing payments table structure...');
      results.tableOptimization = await this.optimizePaymentsTable();

      // 2. Create indexes
      log.info('2. Creating database indexes...');
      results.indexes = await this.createPaymentIndexes();

      // 3. Create views
      log.info('3. Creating analytics views...');
      results.views = await this.createAnalyticsViews();

      // 4. Set up audit logging
      log.info('4. Setting up audit logging...');
      results.auditLogging = await this.createAuditLogging();

      log.info('Database optimization completed!');

      return {
        success: true,
        data: results,
        message: '\u062a\u0645 \u062a\u062d\u0633\u064a\u0646 \u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0628\u0646\u062c\u0627\u062d'
      };

    } catch (error) {
      log.error('Database optimization failed:', { error: error.message });
      return {
        success: false,
        error: error.message || '\u0641\u0634\u0644 \u0641\u064a \u062a\u062d\u0633\u064a\u0646 \u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a'
      };
    }
  }

  /**
   * Get database performance statistics
   */
  static async getPerformanceStats() {
    try {
      const stats = {
        tableStats: null,
        indexStats: null,
        queryStats: null
      };

      // Get table statistics
      try {
        const tableResult = await query(`
          SELECT
            schemaname,
            tablename,
            n_tup_ins as inserts,
            n_tup_upd as updates,
            n_tup_del as deletes,
            n_live_tup as live_tuples,
            n_dead_tup as dead_tuples
          FROM pg_stat_user_tables
          WHERE tablename IN ('payments', 'members', 'subscriptions');
        `);
        stats.tableStats = tableResult.rows;
      } catch (err) {
        log.error('Failed to get table stats:', { error: err.message });
      }

      // Get index usage statistics
      try {
        const indexResult = await query(`
          SELECT
            schemaname,
            tablename,
            indexname,
            idx_scan as index_scans,
            idx_tup_read as tuples_read,
            idx_tup_fetch as tuples_fetched
          FROM pg_stat_user_indexes
          WHERE tablename IN ('payments', 'members', 'subscriptions')
          ORDER BY idx_scan DESC;
        `);
        stats.indexStats = indexResult.rows;
      } catch (err) {
        log.error('Failed to get index stats:', { error: err.message });
      }

      return {
        success: true,
        data: stats,
        message: '\u062a\u0645 \u062c\u0644\u0628 \u0625\u062d\u0635\u0627\u0626\u064a\u0627\u062a \u0627\u0644\u0623\u062f\u0627\u0621'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || '\u0641\u0634\u0644 \u0641\u064a \u062c\u0644\u0628 \u0625\u062d\u0635\u0627\u0626\u064a\u0627\u062a \u0627\u0644\u0623\u062f\u0627\u0621'
      };
    }
  }

  /**
   * Clean up old audit logs
   * @param {number} daysToKeep - Number of days to keep logs
   */
  static async cleanupAuditLogs(daysToKeep = 90) {
    try {
      await query(
        `DELETE FROM payment_audit_log WHERE changed_at < NOW() - $1::interval`,
        [`${daysToKeep} days`]
      );

      return {
        success: true,
        data: null,
        message: `\u062a\u0645 \u062a\u0646\u0638\u064a\u0641 \u0633\u062c\u0644\u0627\u062a \u0627\u0644\u0639\u0645\u0644\u064a\u0627\u062a \u0627\u0644\u0623\u0642\u062f\u0645 \u0645\u0646 ${daysToKeep} \u064a\u0648\u0645`,
        error: null
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || '\u0641\u0634\u0644 \u0641\u064a \u062a\u0646\u0638\u064a\u0641 \u0633\u062c\u0644\u0627\u062a \u0627\u0644\u0639\u0645\u0644\u064a\u0627\u062a'
      };
    }
  }

  /**
   * Analyze table and suggest optimizations
   */
  static async analyzeAndSuggest() {
    try {
      const suggestions = [];

      // Check for missing indexes
      let slowQueries = null;
      try {
        const slowResult = await query(`
          SELECT query, calls, total_time, mean_time
          FROM pg_stat_statements
          WHERE query LIKE '%payments%'
          ORDER BY total_time DESC
          LIMIT 10;
        `);
        slowQueries = slowResult.rows;
      } catch (err) {
        // pg_stat_statements may not be available
        log.warn('pg_stat_statements not available:', { error: err.message });
      }

      if (slowQueries && slowQueries.length > 0) {
        suggestions.push({
          type: 'performance',
          severity: 'medium',
          message: '\u062a\u0648\u062c\u062f \u0627\u0633\u062a\u0639\u0644\u0627\u0645\u0627\u062a \u0628\u0637\u064a\u0626\u0629 \u062a\u062a\u0639\u0644\u0642 \u0628\u062c\u062f\u0648\u0644 \u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a',
          action: '\u0641\u062d\u0635 \u0648\u0625\u0636\u0627\u0641\u0629 \u0641\u0647\u0627\u0631\u0633 \u0645\u0646\u0627\u0633\u0628\u0629'
        });
      }

      // Check table bloat
      let bloatData = null;
      try {
        const bloatResult = await query(`
          SELECT
            n_dead_tup,
            n_live_tup,
            CASE
              WHEN n_live_tup > 0 THEN (n_dead_tup::float / n_live_tup * 100)
              ELSE 0
            END as bloat_percentage
          FROM pg_stat_user_tables
          WHERE tablename = 'payments';
        `);
        bloatData = bloatResult.rows;
      } catch (err) {
        log.warn('Failed to check table bloat:', { error: err.message });
      }

      if (bloatData && bloatData[0]?.bloat_percentage > 10) {
        suggestions.push({
          type: 'maintenance',
          severity: 'low',
          message: '\u062c\u062f\u0648\u0644 \u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a \u064a\u062d\u062a\u0627\u062c \u0625\u0644\u0649 \u0635\u064a\u0627\u0646\u0629',
          action: '\u062a\u0634\u063a\u064a\u0644 VACUUM ANALYZE \u0639\u0644\u0649 \u0627\u0644\u062c\u062f\u0648\u0644'
        });
      }

      return {
        success: true,
        data: {
          suggestions,
          slowQueries,
          tableHealth: bloatData
        },
        message: '\u062a\u0645 \u062a\u062d\u0644\u064a\u0644 \u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || '\u0641\u0634\u0644 \u0641\u064a \u062a\u062d\u0644\u064a\u0644 \u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a'
      };
    }
  }
}
