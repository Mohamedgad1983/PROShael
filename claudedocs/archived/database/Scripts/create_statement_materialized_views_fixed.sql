-- =====================================================
-- AL-SHUAIL STATEMENT SYSTEM - MATERIALIZED VIEWS (FIXED)
-- Run this script in Supabase SQL Editor
-- =====================================================

-- Drop existing views if they exist (for clean installation)
DROP MATERIALIZED VIEW IF EXISTS member_statement_view CASCADE;
DROP MATERIALIZED VIEW IF EXISTS member_balance_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS critical_members_view CASCADE;

-- =====================================================
-- 1. MAIN STATEMENT VIEW - Complete Member Financial Data
-- =====================================================
CREATE MATERIALIZED VIEW member_statement_view AS
WITH member_balances AS (
  SELECT
    m.id,
    COALESCE(
      m.full_name,
      CONCAT(COALESCE(m.first_name, ''), ' ', COALESCE(m.last_name, '')),
      CONCAT('عضو ', SUBSTRING(m.id::text, 1, 8))
    ) as full_name,
    m.phone,
    COALESCE(m.membership_number, CONCAT('SH-', SUBSTRING(m.id::text, 1, 5))) as membership_number,
    m.email,
    m.created_at as member_since,
    COALESCE(
      (SELECT SUM(CAST(amount AS DECIMAL))
       FROM payments
       WHERE payer_id = m.id
       AND status = 'completed'), 0
    ) as current_balance
  FROM members m
),
subscription_data AS (
  SELECT
    s.member_id,
    s.subscription_type,
    s.quantity,
    s.amount,
    s.next_due_date,
    s.status as subscription_status
  FROM subscriptions s
  WHERE s.status = 'active'
),
recent_transactions AS (
  SELECT
    payer_id,
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'date', created_at,
        'amount', amount,
        'type', COALESCE(category, 'payment'),
        'description', COALESCE(title, 'دفعة'),
        'reference', reference_number,
        'status', status
      ) ORDER BY created_at DESC
    ) FILTER (WHERE created_at > NOW() - INTERVAL '12 months') as transactions,
    COUNT(*) as total_transactions,
    MAX(created_at) as last_payment_date
  FROM payments
  WHERE status = 'completed'
  GROUP BY payer_id
),
yearly_stats AS (
  SELECT
    payer_id,
    SUM(CAST(amount AS DECIMAL)) as yearly_total,
    AVG(CAST(amount AS DECIMAL)) as average_payment,
    COUNT(*) as yearly_payment_count
  FROM payments
  WHERE status = 'completed'
  AND created_at > NOW() - INTERVAL '12 months'
  GROUP BY payer_id
)
SELECT
  mb.id,
  mb.full_name,
  mb.phone,
  mb.membership_number,
  mb.email,
  mb.member_since,
  mb.current_balance,

  -- Subscription Information
  sd.subscription_type,
  sd.quantity,
  sd.amount as subscription_amount,
  sd.next_due_date,
  sd.subscription_status,

  -- Alert Level Calculation
  CASE
    WHEN mb.current_balance = 0 THEN 'ZERO_BALANCE'
    WHEN mb.current_balance < 1000 THEN 'CRITICAL'
    WHEN mb.current_balance < 3000 THEN 'WARNING'
    ELSE 'SUFFICIENT'
  END as alert_level,

  -- Visual Status Color
  CASE
    WHEN mb.current_balance = 0 THEN '#991B1B'
    WHEN mb.current_balance < 1000 THEN '#DC2626'
    WHEN mb.current_balance < 3000 THEN '#F59E0B'
    ELSE '#10B981'
  END as status_color,

  -- Financial Calculations
  GREATEST(0, 3000 - mb.current_balance) as shortfall,
  LEAST(100, (mb.current_balance / 3000.0) * 100) as percentage_complete,

  -- Transaction Data
  rt.transactions as recent_transactions,
  rt.total_transactions,
  rt.last_payment_date,

  -- Yearly Statistics
  COALESCE(ys.yearly_total, 0) as yearly_total,
  COALESCE(ys.average_payment, 0) as average_payment,
  COALESCE(ys.yearly_payment_count, 0) as yearly_payment_count,

  -- Metadata
  NOW() as last_updated
FROM member_balances mb
LEFT JOIN subscription_data sd ON mb.id = sd.member_id
LEFT JOIN recent_transactions rt ON mb.id = rt.payer_id
LEFT JOIN yearly_stats ys ON mb.id = ys.payer_id;

-- Create indexes for optimal performance
CREATE INDEX idx_statement_phone ON member_statement_view(phone);
CREATE INDEX idx_statement_member_num ON member_statement_view(membership_number);
CREATE INDEX idx_statement_alert ON member_statement_view(alert_level);
CREATE INDEX idx_statement_balance ON member_statement_view(current_balance);
CREATE INDEX idx_statement_fullname ON member_statement_view(full_name);

-- =====================================================
-- 2. BALANCE SUMMARY VIEW - Quick Balance Lookups
-- =====================================================
CREATE MATERIALIZED VIEW member_balance_summary AS
SELECT
  m.id,
  COALESCE(
    m.full_name,
    CONCAT(COALESCE(m.first_name, ''), ' ', COALESCE(m.last_name, '')),
    CONCAT('عضو ', SUBSTRING(m.id::text, 1, 8))
  ) as full_name,
  m.phone,
  COALESCE(m.membership_number, CONCAT('SH-', SUBSTRING(m.id::text, 1, 5))) as membership_number,
  COALESCE(
    (SELECT SUM(CAST(amount AS DECIMAL))
     FROM payments
     WHERE payer_id = m.id
     AND status = 'completed'), 0
  ) as balance,
  CASE
    WHEN COALESCE(
      (SELECT SUM(CAST(amount AS DECIMAL))
       FROM payments
       WHERE payer_id = m.id
       AND status = 'completed'), 0
    ) >= 3000 THEN 'sufficient'
    ELSE 'insufficient'
  END as status,
  NOW() as last_updated
FROM members m;

-- Create indexes
CREATE INDEX idx_balance_phone ON member_balance_summary(phone);
CREATE INDEX idx_balance_status ON member_balance_summary(status);
CREATE INDEX idx_balance_amount ON member_balance_summary(balance);

-- =====================================================
-- 3. CRITICAL MEMBERS VIEW - For Crisis Dashboard
-- =====================================================
CREATE MATERIALIZED VIEW critical_members_view AS
WITH member_payments AS (
  SELECT
    m.id,
    COALESCE(
      m.full_name,
      CONCAT(COALESCE(m.first_name, ''), ' ', COALESCE(m.last_name, '')),
      CONCAT('عضو ', SUBSTRING(m.id::text, 1, 8))
    ) as full_name,
    m.phone,
    COALESCE(m.membership_number, CONCAT('SH-', SUBSTRING(m.id::text, 1, 5))) as membership_number,
    COALESCE(
      (SELECT SUM(CAST(amount AS DECIMAL))
       FROM payments
       WHERE payer_id = m.id
       AND status = 'completed'), 0
    ) as balance
  FROM members m
)
SELECT
  id,
  full_name,
  phone,
  membership_number,
  balance,
  GREATEST(0, 3000 - balance) as shortfall,
  LEAST(100, (balance / 3000.0) * 100) as percentage_complete,
  CASE
    WHEN balance = 0 THEN 1  -- Highest priority
    WHEN balance < 1000 THEN 2
    WHEN balance < 3000 THEN 3
    ELSE 4
  END as priority_level,
  NOW() as last_updated
FROM member_payments
WHERE balance < 3000
ORDER BY balance ASC, full_name ASC;

-- Create indexes
CREATE INDEX idx_critical_priority ON critical_members_view(priority_level);
CREATE INDEX idx_critical_shortfall ON critical_members_view(shortfall DESC);

-- =====================================================
-- 4. CREATE REFRESH FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION refresh_statement_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Refresh all materialized views
  REFRESH MATERIALIZED VIEW CONCURRENTLY member_statement_view;
  REFRESH MATERIALIZED VIEW CONCURRENTLY member_balance_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY critical_members_view;

  -- Log the refresh (only if system_logs table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_logs') THEN
    INSERT INTO system_logs (action, details, created_at)
    VALUES ('refresh_views', 'Statement views refreshed successfully', NOW());
  END IF;

  RETURN;
END;
$$;

-- =====================================================
-- 5. CREATE AUTO-REFRESH TRIGGER (Optional)
-- This will refresh views when payments are added/updated
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_refresh_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only refresh if it's been more than 5 minutes since last refresh
  -- Check if system_logs table exists before querying it
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_logs') THEN
    IF NOT EXISTS (
      SELECT 1 FROM system_logs
      WHERE action = 'refresh_views'
      AND created_at > NOW() - INTERVAL '5 minutes'
    ) THEN
      PERFORM refresh_statement_views();
    END IF;
  ELSE
    -- If no system_logs table, just refresh
    PERFORM refresh_statement_views();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on payments table
DROP TRIGGER IF EXISTS refresh_views_on_payment ON payments;
CREATE TRIGGER refresh_views_on_payment
AFTER INSERT OR UPDATE ON payments
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_on_payment();

-- =====================================================
-- 6. CREATE HELPER FUNCTIONS FOR EASY QUERIES
-- =====================================================

-- Function to get member statement by phone
CREATE OR REPLACE FUNCTION get_member_statement_by_phone(phone_number TEXT)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  phone TEXT,
  membership_number TEXT,
  current_balance NUMERIC,
  alert_level TEXT,
  status_color TEXT,
  shortfall NUMERIC,
  percentage_complete NUMERIC,
  recent_transactions JSON
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    msv.id,
    msv.full_name,
    msv.phone,
    msv.membership_number,
    msv.current_balance,
    msv.alert_level,
    msv.status_color,
    msv.shortfall,
    msv.percentage_complete,
    msv.recent_transactions
  FROM member_statement_view msv
  WHERE msv.phone = phone_number;
END;
$$;

-- Function to get critical members
CREATE OR REPLACE FUNCTION get_critical_members(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  phone TEXT,
  membership_number TEXT,
  balance NUMERIC,
  shortfall NUMERIC,
  priority_level INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cmv.id,
    cmv.full_name,
    cmv.phone,
    cmv.membership_number,
    cmv.balance,
    cmv.shortfall,
    cmv.priority_level
  FROM critical_members_view cmv
  LIMIT limit_count;
END;
$$;

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================
-- Grant select permissions to authenticated users
GRANT SELECT ON member_statement_view TO authenticated;
GRANT SELECT ON member_balance_summary TO authenticated;
GRANT SELECT ON critical_members_view TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_member_statement_by_phone TO authenticated;
GRANT EXECUTE ON FUNCTION get_critical_members TO authenticated;

-- Grant permissions to anon role for public access (if needed)
GRANT SELECT ON member_statement_view TO anon;
GRANT SELECT ON member_balance_summary TO anon;
GRANT SELECT ON critical_members_view TO anon;

-- =====================================================
-- 8. CREATE SYSTEM LOGS TABLE (if not exists)
-- =====================================================
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action VARCHAR(100),
  details TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 9. INITIAL DATA REFRESH
-- =====================================================
-- Refresh all views with initial data
SELECT refresh_statement_views();

-- =====================================================
-- 10. VERIFICATION QUERIES
-- =====================================================
-- Test the views after creation
DO $$
DECLARE
  view_count INTEGER;
  critical_count INTEGER;
  balance_count INTEGER;
BEGIN
  -- Check member_statement_view
  SELECT COUNT(*) INTO view_count FROM member_statement_view;
  RAISE NOTICE 'SUCCESS: member_statement_view created with % records', view_count;

  -- Check balance summary
  SELECT COUNT(*) INTO balance_count FROM member_balance_summary;
  RAISE NOTICE 'SUCCESS: member_balance_summary created with % records', balance_count;

  -- Check critical members
  SELECT COUNT(*) INTO critical_count FROM critical_members_view;
  RAISE NOTICE 'SUCCESS: critical_members_view created with % critical members', critical_count;

  -- Display summary
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'MATERIALIZED VIEWS CREATED SUCCESSFULLY!';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Total Members: %', view_count;
  RAISE NOTICE 'Critical Members (< 3000 SAR): %', critical_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Test with these queries:';
  RAISE NOTICE '1. SELECT * FROM member_statement_view LIMIT 5;';
  RAISE NOTICE '2. SELECT * FROM critical_members_view LIMIT 10;';
  RAISE NOTICE '3. SELECT * FROM get_member_statement_by_phone(''0501234567'');';
  RAISE NOTICE '====================================';
END $$;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
-- The materialized views have been created successfully!
--
-- Available Views:
-- 1. member_statement_view - Complete statement data
-- 2. member_balance_summary - Quick balance lookups
-- 3. critical_members_view - Members below minimum
--
-- Helper Functions:
-- 1. refresh_statement_views() - Manually refresh all views
-- 2. get_member_statement_by_phone(phone) - Get statement by phone
-- 3. get_critical_members(limit) - Get critical members list
--
-- The views will auto-refresh when payments are added/updated.
--
-- FIXED ISSUES:
-- - Removed non-existent 'name' column reference
-- - Added proper COALESCE handling for name fields
-- - Added fallback to member ID when no name available
-- - Fixed DECIMAL/NUMERIC type consistency
-- =====================================================