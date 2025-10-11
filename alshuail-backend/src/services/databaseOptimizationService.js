import { supabase } from '../config/database.js';
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
          const { data: _data, error } = await supabase.rpc('execute_sql', {
            query: index.sql
          });
          
          results.push({
            name: index.name,
            success: !error,
            description: index.description,
            error: error?.message || null
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
        message: 'تم إنشاء فهارس قاعدة البيانات'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || 'فشل في إنشاء فهارس قاعدة البيانات'
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
          const { data: _data, error } = await supabase.rpc('execute_sql', {
            query: view.sql
          });
          
          results.push({
            name: view.name,
            success: !error,
            description: view.description,
            error: error?.message || null
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
        message: 'تم إنشاء عروض قاعدة البيانات للتحليلات'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || 'فشل في إنشاء عروض قاعدة البيانات'
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

      const { data: _data, error: _error } = await supabase.rpc('execute_sql', {
        query: auditSQL
      });

      return {
        success: !_error,
        data: _data,
        message: _error ? _error.message : 'تم إنشاء نظام تسجيل العمليات',
        error: _error?.message || null
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || 'فشل في إنشاء نظام تسجيل العمليات'
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
          const { data: _data, error } = await supabase.rpc('execute_sql', {
            query: optimization.sql
          });
          
          results.push({
            name: optimization.name,
            success: !error,
            error: error?.message || null
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
        message: 'تم تحسين هيكل جدول المدفوعات'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || 'فشل في تحسين هيكل جدول المدفوعات'
      };
    }
  }

  /**
   * Run full database optimization
   */
  static async runFullOptimization() {
    try {
      log.info('🔧 Starting database optimization...');
      
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

      log.info('✅ Database optimization completed!');

      return {
        success: true,
        data: results,
        message: 'تم تحسين قاعدة البيانات بنجاح'
      };

    } catch (error) {
      log.error('❌ Database optimization failed:', { error: error.message });
      return {
        success: false,
        error: error.message || 'فشل في تحسين قاعدة البيانات'
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
      const { data: tableData } = await supabase.rpc('execute_sql', {
        query: `
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
        `
      });
      stats.tableStats = tableData;

      // Get index usage statistics
      const { data: indexData } = await supabase.rpc('execute_sql', {
        query: `
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
        `
      });
      stats.indexStats = indexData;

      return {
        success: true,
        data: stats,
        message: 'تم جلب إحصائيات الأداء'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || 'فشل في جلب إحصائيات الأداء'
      };
    }
  }

  /**
   * Clean up old audit logs
   * @param {number} daysToKeep - Number of days to keep logs
   */
  static async cleanupAuditLogs(daysToKeep = 90) {
    try {
      const { data: _data, error: _error } = await supabase.rpc('execute_sql', {
        query: `
          DELETE FROM payment_audit_log
          WHERE changed_at < NOW() - INTERVAL '${daysToKeep} days';
        `
      });

      return {
        success: !_error,
        data: _data,
        message: `تم تنظيف سجلات العمليات الأقدم من ${daysToKeep} يوم`,
        error: _error?.message || null
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || 'فشل في تنظيف سجلات العمليات'
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
      const { data: slowQueries } = await supabase.rpc('execute_sql', {
        query: `
          SELECT query, calls, total_time, mean_time
          FROM pg_stat_statements 
          WHERE query LIKE '%payments%'
          ORDER BY total_time DESC 
          LIMIT 10;
        `
      });

      if (slowQueries && slowQueries.length > 0) {
        suggestions.push({
          type: 'performance',
          severity: 'medium',
          message: 'توجد استعلامات بطيئة تتعلق بجدول المدفوعات',
          action: 'فحص وإضافة فهارس مناسبة'
        });
      }

      // Check table bloat
      const { data: bloatData } = await supabase.rpc('execute_sql', {
        query: `
          SELECT 
            n_dead_tup,
            n_live_tup,
            CASE 
              WHEN n_live_tup > 0 THEN (n_dead_tup::float / n_live_tup * 100)
              ELSE 0 
            END as bloat_percentage
          FROM pg_stat_user_tables 
          WHERE tablename = 'payments';
        `
      });

      if (bloatData && bloatData[0]?.bloat_percentage > 10) {
        suggestions.push({
          type: 'maintenance',
          severity: 'low',
          message: 'جدول المدفوعات يحتاج إلى صيانة',
          action: 'تشغيل VACUUM ANALYZE على الجدول'
        });
      }

      return {
        success: true,
        data: {
          suggestions,
          slowQueries,
          tableHealth: bloatData
        },
        message: 'تم تحليل قاعدة البيانات'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || 'فشل في تحليل قاعدة البيانات'
      };
    }
  }
}

