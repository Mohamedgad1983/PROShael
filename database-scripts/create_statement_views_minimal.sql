-- =====================================================
-- AL-SHUAIL STATEMENT SYSTEM - MINIMAL SAFE VERSION
-- This version only uses tables/columns that definitely exist
-- =====================================================

-- Clean up any existing views
DROP MATERIALIZED VIEW IF EXISTS member_statement_view CASCADE;
DROP MATERIALIZED VIEW IF EXISTS member_balance_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS critical_members_view CASCADE;

-- =====================================================
-- 1. BASIC MEMBER BALANCE VIEW (No Subscriptions)
-- =====================================================
CREATE MATERIALIZED VIEW member_statement_view AS
WITH member_balances AS (
  SELECT
    m.id,
    COALESCE(m.full_name, CONCAT('عضو ', SUBSTRING(m.id::text, 1, 8))) as full_name,
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
recent_transactions AS (
  SELECT
    payer_id,
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'date', created_at,
        'amount', amount,
        'type', COALESCE(category, 'payment'),
        'description', COALESCE(title, 'دفعة'),
        'status', status
      ) ORDER BY created_at DESC
    ) FILTER (WHERE created_at > NOW() - INTERVAL '12 months') as transactions,
    COUNT(*) as total_transactions,
    MAX(created_at) as last_payment_date
  FROM payments
  WHERE status = 'completed'
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

  -- Metadata
  NOW() as last_updated
FROM member_balances mb
LEFT JOIN recent_transactions rt ON mb.id = rt.payer_id;

-- Create essential indexes
CREATE INDEX idx_statement_phone ON member_statement_view(phone);
CREATE INDEX idx_statement_member_num ON member_statement_view(membership_number);
CREATE INDEX idx_statement_alert ON member_statement_view(alert_level);
CREATE INDEX idx_statement_balance ON member_statement_view(current_balance);

-- =====================================================
-- 2. SIMPLE BALANCE SUMMARY VIEW
-- =====================================================
CREATE MATERIALIZED VIEW member_balance_summary AS
SELECT
  m.id,
  COALESCE(m.full_name, CONCAT('عضو ', SUBSTRING(m.id::text, 1, 8))) as full_name,
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
  END as status
FROM members m;

-- Create indexes
CREATE INDEX idx_balance_phone ON member_balance_summary(phone);
CREATE INDEX idx_balance_status ON member_balance_summary(status);

-- =====================================================
-- 3. CRITICAL MEMBERS VIEW (Members below 3000)
-- =====================================================
CREATE MATERIALIZED VIEW critical_members_view AS
SELECT
  m.id,
  COALESCE(m.full_name, CONCAT('عضو ', SUBSTRING(m.id::text, 1, 8))) as full_name,
  m.phone,
  COALESCE(m.membership_number, CONCAT('SH-', SUBSTRING(m.id::text, 1, 5))) as membership_number,
  COALESCE(
    (SELECT SUM(CAST(amount AS DECIMAL))
     FROM payments
     WHERE payer_id = m.id
     AND status = 'completed'), 0
  ) as balance,
  GREATEST(0, 3000 - COALESCE(
    (SELECT SUM(CAST(amount AS DECIMAL))
     FROM payments
     WHERE payer_id = m.id
     AND status = 'completed'), 0
  )) as shortfall
FROM members m
WHERE COALESCE(
  (SELECT SUM(CAST(amount AS DECIMAL))
   FROM payments
   WHERE payer_id = m.id
   AND status = 'completed'), 0
) < 3000
ORDER BY balance ASC;

-- Create index
CREATE INDEX idx_critical_shortfall ON critical_members_view(shortfall DESC);

-- =====================================================
-- 4. SIMPLE REFRESH FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION refresh_statement_views()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY member_statement_view;
  REFRESH MATERIALIZED VIEW CONCURRENTLY member_balance_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY critical_members_view;
  RETURN;
END;
$$;

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Get statement by phone
CREATE OR REPLACE FUNCTION get_statement_by_phone(phone_number TEXT)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  phone TEXT,
  membership_number TEXT,
  current_balance NUMERIC,
  alert_level TEXT,
  status_color TEXT,
  shortfall NUMERIC,
  percentage_complete NUMERIC
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
    msv.percentage_complete
  FROM member_statement_view msv
  WHERE msv.phone = phone_number;
END;
$$;

-- Get crisis dashboard data
CREATE OR REPLACE FUNCTION get_crisis_dashboard_data()
RETURNS TABLE (
  total_members BIGINT,
  compliant_members BIGINT,
  non_compliant_members BIGINT,
  compliance_rate NUMERIC,
  total_shortfall NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_members,
    COUNT(*) FILTER (WHERE current_balance >= 3000)::BIGINT as compliant_members,
    COUNT(*) FILTER (WHERE current_balance < 3000)::BIGINT as non_compliant_members,
    ROUND((COUNT(*) FILTER (WHERE current_balance >= 3000)::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0)) * 100, 1) as compliance_rate,
    SUM(shortfall)::NUMERIC as total_shortfall
  FROM member_statement_view;
END;
$$;

-- =====================================================
-- 6. PERMISSIONS
-- =====================================================
GRANT SELECT ON member_statement_view TO authenticated, anon;
GRANT SELECT ON member_balance_summary TO authenticated, anon;
GRANT SELECT ON critical_members_view TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_statement_by_phone TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_crisis_dashboard_data TO authenticated, anon;
GRANT EXECUTE ON FUNCTION refresh_statement_views TO authenticated, anon;

-- =====================================================
-- 7. INITIAL REFRESH
-- =====================================================
SELECT refresh_statement_views();

-- =====================================================
-- 8. VERIFICATION
-- =====================================================
DO $$
DECLARE
  total_count INTEGER;
  critical_count INTEGER;
  avg_balance NUMERIC;
BEGIN
  -- Get counts
  SELECT COUNT(*) INTO total_count FROM member_statement_view;
  SELECT COUNT(*) INTO critical_count FROM critical_members_view;
  SELECT AVG(current_balance) INTO avg_balance FROM member_statement_view;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ VIEWS CREATED SUCCESSFULLY!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total Members: %', total_count;
  RAISE NOTICE 'Critical Members (< 3000 SAR): %', critical_count;
  RAISE NOTICE 'Average Balance: % SAR', ROUND(COALESCE(avg_balance, 0), 2);
  RAISE NOTICE '';
  RAISE NOTICE 'Quick Test Commands:';
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE '-- View all members with balances:';
  RAISE NOTICE 'SELECT * FROM member_statement_view LIMIT 10;';
  RAISE NOTICE '';
  RAISE NOTICE '-- Get critical members:';
  RAISE NOTICE 'SELECT * FROM critical_members_view LIMIT 10;';
  RAISE NOTICE '';
  RAISE NOTICE '-- Get dashboard statistics:';
  RAISE NOTICE 'SELECT * FROM get_crisis_dashboard_data();';
  RAISE NOTICE '';
  RAISE NOTICE '-- Search by phone:';
  RAISE NOTICE 'SELECT * FROM get_statement_by_phone(''0501234567'');';
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- NOTES:
-- This minimal version:
-- 1. Does NOT reference subscriptions table/columns
-- 2. Only uses confirmed columns: id, full_name, phone, email, membership_number, created_at
-- 3. Works with just members and payments tables
-- 4. Provides all essential functionality for statements and crisis dashboard
-- =====================================================