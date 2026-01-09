-- =====================================================
-- AL-SHUAIL - ANALYZE SCHEMA AND CREATE PERFECT VIEWS
-- Tailored for your exact database structure
-- =====================================================

-- First, let's check what we're working with
DO $$
DECLARE
  members_cols TEXT;
  payments_cols TEXT;
BEGIN
  -- Get members columns
  SELECT string_agg(column_name || ' (' || data_type || ')', ', ')
  INTO members_cols
  FROM information_schema.columns
  WHERE table_name = 'members';

  -- Get payments columns
  SELECT string_agg(column_name || ' (' || data_type || ')', ', ')
  INTO payments_cols
  FROM information_schema.columns
  WHERE table_name = 'payments';

  RAISE NOTICE 'Members columns: %', members_cols;
  RAISE NOTICE 'Payments columns: %', payments_cols;
END $$;

-- Drop existing views
DROP MATERIALIZED VIEW IF EXISTS member_statement_view CASCADE;
DROP MATERIALIZED VIEW IF EXISTS member_balance_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS critical_members_view CASCADE;

-- =====================================================
-- MAIN STATEMENT VIEW - Based on Your Exact Schema
-- =====================================================
CREATE MATERIALIZED VIEW member_statement_view AS
WITH payment_summary AS (
  SELECT
    payer_id,
    SUM(CAST(amount AS DECIMAL)) as total_paid,
    COUNT(*) as payment_count,
    MAX(created_at) as last_payment_date,
    -- Simple transaction list without problematic columns
    ARRAY_AGG(
      JSON_BUILD_OBJECT(
        'date', created_at,
        'amount', amount,
        'category', COALESCE(category, 'payment'),
        'status', status
      ) ORDER BY created_at DESC
    ) FILTER (WHERE created_at > NOW() - INTERVAL '6 months') as recent_transactions
  FROM payments
  WHERE status = 'completed'
  GROUP BY payer_id
)
SELECT
  m.id,
  COALESCE(m.full_name, CONCAT('عضو ', SUBSTRING(m.id::text, 1, 8))) as full_name,
  m.phone,
  COALESCE(m.membership_number, CONCAT('SH-', SUBSTRING(m.id::text, 1, 5))) as membership_number,
  m.email,
  m.created_at as member_since,

  -- Financial data
  COALESCE(ps.total_paid, 0) as current_balance,
  COALESCE(ps.payment_count, 0) as total_payments,
  ps.last_payment_date,
  ps.recent_transactions,

  -- Alert calculations
  CASE
    WHEN COALESCE(ps.total_paid, 0) = 0 THEN 'ZERO_BALANCE'
    WHEN COALESCE(ps.total_paid, 0) < 1000 THEN 'CRITICAL'
    WHEN COALESCE(ps.total_paid, 0) < 3000 THEN 'WARNING'
    ELSE 'SUFFICIENT'
  END as alert_level,

  CASE
    WHEN COALESCE(ps.total_paid, 0) = 0 THEN '#991B1B'
    WHEN COALESCE(ps.total_paid, 0) < 1000 THEN '#DC2626'
    WHEN COALESCE(ps.total_paid, 0) < 3000 THEN '#F59E0B'
    ELSE '#10B981'
  END as status_color,

  GREATEST(0, 3000 - COALESCE(ps.total_paid, 0)) as shortfall,
  LEAST(100, (COALESCE(ps.total_paid, 0) / 3000.0) * 100) as percentage_complete,

  NOW() as last_updated
FROM members m
LEFT JOIN payment_summary ps ON m.id = ps.payer_id;

-- Indexes for performance
CREATE UNIQUE INDEX idx_statement_id ON member_statement_view(id);
CREATE INDEX idx_statement_phone ON member_statement_view(phone);
CREATE INDEX idx_statement_membership ON member_statement_view(membership_number);
CREATE INDEX idx_statement_alert ON member_statement_view(alert_level);
CREATE INDEX idx_statement_balance ON member_statement_view(current_balance DESC);

-- =====================================================
-- QUICK BALANCE SUMMARY VIEW
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

CREATE UNIQUE INDEX idx_balance_id ON member_balance_summary(id);
CREATE INDEX idx_balance_phone ON member_balance_summary(phone);
CREATE INDEX idx_balance_status ON member_balance_summary(status);

-- =====================================================
-- CRITICAL MEMBERS VIEW (For Crisis Dashboard)
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
  )) as shortfall,
  CASE
    WHEN COALESCE(
      (SELECT SUM(CAST(amount AS DECIMAL))
       FROM payments
       WHERE payer_id = m.id
       AND status = 'completed'), 0
    ) = 0 THEN 1
    WHEN COALESCE(
      (SELECT SUM(CAST(amount AS DECIMAL))
       FROM payments
       WHERE payer_id = m.id
       AND status = 'completed'), 0
    ) < 1000 THEN 2
    ELSE 3
  END as priority_level
FROM members m
WHERE COALESCE(
  (SELECT SUM(CAST(amount AS DECIMAL))
   FROM payments
   WHERE payer_id = m.id
   AND status = 'completed'), 0
) < 3000
ORDER BY priority_level, shortfall DESC;

CREATE INDEX idx_critical_priority ON critical_members_view(priority_level, shortfall DESC);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Refresh all views
CREATE OR REPLACE FUNCTION refresh_all_views()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY member_statement_view;
  REFRESH MATERIALIZED VIEW CONCURRENTLY member_balance_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY critical_members_view;
  RETURN 'All views refreshed successfully at ' || NOW()::TEXT;
END;
$$;

-- Get member by phone
CREATE OR REPLACE FUNCTION get_member_by_phone(phone_num TEXT)
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
  last_payment_date TIMESTAMP WITH TIME ZONE
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
    msv.last_payment_date
  FROM member_statement_view msv
  WHERE msv.phone = phone_num;
END;
$$;

-- Dashboard statistics
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
  total_members BIGINT,
  compliant_members BIGINT,
  non_compliant_members BIGINT,
  critical_members BIGINT,
  warning_members BIGINT,
  zero_balance_members BIGINT,
  compliance_rate NUMERIC,
  total_shortfall NUMERIC,
  average_balance NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_members,
    COUNT(*) FILTER (WHERE current_balance >= 3000)::BIGINT as compliant_members,
    COUNT(*) FILTER (WHERE current_balance < 3000)::BIGINT as non_compliant_members,
    COUNT(*) FILTER (WHERE alert_level IN ('CRITICAL', 'ZERO_BALANCE'))::BIGINT as critical_members,
    COUNT(*) FILTER (WHERE alert_level = 'WARNING')::BIGINT as warning_members,
    COUNT(*) FILTER (WHERE alert_level = 'ZERO_BALANCE')::BIGINT as zero_balance_members,
    ROUND((COUNT(*) FILTER (WHERE current_balance >= 3000)::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0)) * 100, 1) as compliance_rate,
    SUM(shortfall)::NUMERIC as total_shortfall,
    AVG(current_balance)::NUMERIC as average_balance
  FROM member_statement_view;
END;
$$;

-- =====================================================
-- PERMISSIONS
-- =====================================================
GRANT SELECT ON member_statement_view TO authenticated, anon, service_role;
GRANT SELECT ON member_balance_summary TO authenticated, anon, service_role;
GRANT SELECT ON critical_members_view TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION refresh_all_views TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_member_by_phone TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_dashboard_stats TO authenticated, anon, service_role;

-- =====================================================
-- INITIAL DATA LOAD
-- =====================================================
SELECT refresh_all_views();

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
DECLARE
  v_total INTEGER;
  v_critical INTEGER;
  v_stats RECORD;
BEGIN
  SELECT COUNT(*) INTO v_total FROM member_statement_view;
  SELECT COUNT(*) INTO v_critical FROM critical_members_view;
  SELECT * INTO v_stats FROM get_dashboard_stats();

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ MATERIALIZED VIEWS CREATED SUCCESSFULLY!';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Total Members: %', v_total;
  RAISE NOTICE 'Critical Members: %', v_critical;
  RAISE NOTICE 'Compliance Rate: %%%', v_stats.compliance_rate;
  RAISE NOTICE 'Total Shortfall: % SAR', COALESCE(v_stats.total_shortfall, 0);
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Test Commands:';
  RAISE NOTICE '1. SELECT * FROM member_statement_view LIMIT 5;';
  RAISE NOTICE '2. SELECT * FROM critical_members_view LIMIT 5;';
  RAISE NOTICE '3. SELECT * FROM get_dashboard_stats();';
  RAISE NOTICE '4. SELECT * FROM get_member_by_phone(''0501234567'');';
  RAISE NOTICE '================================================';
END $$;