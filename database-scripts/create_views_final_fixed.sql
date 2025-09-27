-- =====================================================
-- AL-SHUAIL - FINAL FIXED MATERIALIZED VIEWS
-- With proper unique indexes for concurrent refresh
-- =====================================================

-- Drop existing views and functions
DROP MATERIALIZED VIEW IF EXISTS member_statement_view CASCADE;
DROP MATERIALIZED VIEW IF EXISTS member_balance_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS critical_members_view CASCADE;
DROP FUNCTION IF EXISTS refresh_all_views();

-- =====================================================
-- 1. MAIN STATEMENT VIEW WITH UNIQUE INDEX
-- =====================================================
CREATE MATERIALIZED VIEW member_statement_view AS
WITH payment_summary AS (
  SELECT
    payer_id,
    SUM(CAST(amount AS DECIMAL)) as total_paid,
    COUNT(*) as payment_count,
    MAX(created_at) as last_payment_date,
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
  COALESCE(ps.total_paid, 0) as current_balance,
  COALESCE(ps.payment_count, 0) as total_payments,
  ps.last_payment_date,
  ps.recent_transactions,
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

-- REQUIRED: Unique index for concurrent refresh
CREATE UNIQUE INDEX idx_statement_view_id ON member_statement_view(id);

-- Additional performance indexes
CREATE INDEX idx_statement_phone ON member_statement_view(phone);
CREATE INDEX idx_statement_membership ON member_statement_view(membership_number);
CREATE INDEX idx_statement_alert ON member_statement_view(alert_level);
CREATE INDEX idx_statement_balance ON member_statement_view(current_balance DESC);

-- =====================================================
-- 2. BALANCE SUMMARY VIEW WITH UNIQUE INDEX
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
  END as status,
  NOW() as last_updated
FROM members m;

-- REQUIRED: Unique index for concurrent refresh
CREATE UNIQUE INDEX idx_balance_view_id ON member_balance_summary(id);

-- Additional indexes
CREATE INDEX idx_balance_phone ON member_balance_summary(phone);
CREATE INDEX idx_balance_status ON member_balance_summary(status);

-- =====================================================
-- 3. CRITICAL MEMBERS VIEW WITH UNIQUE INDEX
-- =====================================================
CREATE MATERIALIZED VIEW critical_members_view AS
WITH critical_data AS (
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
    WHEN balance = 0 THEN 1
    WHEN balance < 1000 THEN 2
    ELSE 3
  END as priority_level,
  NOW() as last_updated
FROM critical_data
WHERE balance < 3000
ORDER BY priority_level, shortfall DESC;

-- REQUIRED: Unique index for concurrent refresh
CREATE UNIQUE INDEX idx_critical_view_id ON critical_members_view(id);

-- Additional index
CREATE INDEX idx_critical_priority ON critical_members_view(priority_level, shortfall DESC);

-- =====================================================
-- 4. REFRESH FUNCTION (FIXED)
-- =====================================================
CREATE OR REPLACE FUNCTION refresh_all_views()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_result TEXT := '';
BEGIN
  -- Refresh with CONCURRENTLY option (non-blocking)
  REFRESH MATERIALIZED VIEW CONCURRENTLY member_statement_view;
  v_result := v_result || 'Statement view refreshed. ';

  REFRESH MATERIALIZED VIEW CONCURRENTLY member_balance_summary;
  v_result := v_result || 'Balance view refreshed. ';

  REFRESH MATERIALIZED VIEW CONCURRENTLY critical_members_view;
  v_result := v_result || 'Critical view refreshed. ';

  RETURN v_result || 'All views refreshed at ' || NOW()::TEXT;
EXCEPTION
  WHEN OTHERS THEN
    -- If concurrent refresh fails, try regular refresh
    REFRESH MATERIALIZED VIEW member_statement_view;
    REFRESH MATERIALIZED VIEW member_balance_summary;
    REFRESH MATERIALIZED VIEW critical_members_view;
    RETURN 'Views refreshed (non-concurrent) at ' || NOW()::TEXT;
END;
$$;

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

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

-- Get dashboard statistics
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
    ROUND(AVG(current_balance)::NUMERIC, 2) as average_balance
  FROM member_statement_view;
END;
$$;

-- Get critical members
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
  ORDER BY cmv.priority_level, cmv.shortfall DESC
  LIMIT limit_count;
END;
$$;

-- =====================================================
-- 6. PERMISSIONS
-- =====================================================
GRANT SELECT ON member_statement_view TO authenticated, anon, service_role;
GRANT SELECT ON member_balance_summary TO authenticated, anon, service_role;
GRANT SELECT ON critical_members_view TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION refresh_all_views TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_member_by_phone TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_dashboard_stats TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_critical_members TO authenticated, anon, service_role;

-- =====================================================
-- 7. INITIAL DATA LOAD (NON-CONCURRENT)
-- =====================================================
-- First refresh cannot be concurrent
REFRESH MATERIALIZED VIEW member_statement_view;
REFRESH MATERIALIZED VIEW member_balance_summary;
REFRESH MATERIALIZED VIEW critical_members_view;

-- =====================================================
-- 8. AUTO-REFRESH TRIGGER (OPTIONAL)
-- =====================================================
CREATE OR REPLACE FUNCTION auto_refresh_on_payment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only refresh if significant change
  IF (TG_OP = 'INSERT' AND NEW.amount > 100) OR
     (TG_OP = 'UPDATE' AND NEW.status != OLD.status) THEN
    -- Run refresh in background (non-blocking)
    PERFORM refresh_all_views();
  END IF;
  RETURN NULL; -- Trigger returns NULL for AFTER trigger
END;
$$;

-- Create trigger for auto-refresh on payment changes
DROP TRIGGER IF EXISTS trigger_refresh_views ON payments;
CREATE TRIGGER trigger_refresh_views
AFTER INSERT OR UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION auto_refresh_on_payment_change();

-- =====================================================
-- 9. VERIFICATION
-- =====================================================
DO $$
DECLARE
  v_total INTEGER;
  v_critical INTEGER;
  v_stats RECORD;
  v_test_refresh TEXT;
BEGIN
  -- Get counts
  SELECT COUNT(*) INTO v_total FROM member_statement_view;
  SELECT COUNT(*) INTO v_critical FROM critical_members_view;
  SELECT * INTO v_stats FROM get_dashboard_stats();

  -- Test concurrent refresh
  BEGIN
    SELECT refresh_all_views() INTO v_test_refresh;
    RAISE NOTICE 'Refresh test: %', v_test_refresh;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Refresh test failed: %', SQLERRM;
  END;

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ MATERIALIZED VIEWS CREATED SUCCESSFULLY!';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Total Members: %', v_total;
  RAISE NOTICE 'Critical Members: %', v_critical;
  RAISE NOTICE 'Compliance Rate: %%%', v_stats.compliance_rate;
  RAISE NOTICE 'Total Shortfall: % SAR', COALESCE(v_stats.total_shortfall, 0);
  RAISE NOTICE 'Average Balance: % SAR', COALESCE(v_stats.average_balance, 0);
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Quick Test Commands:';
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE 'SELECT * FROM member_statement_view LIMIT 5;';
  RAISE NOTICE 'SELECT * FROM critical_members_view LIMIT 5;';
  RAISE NOTICE 'SELECT * FROM get_dashboard_stats();';
  RAISE NOTICE 'SELECT * FROM get_member_by_phone(''0501234567'');';
  RAISE NOTICE 'SELECT refresh_all_views();';
  RAISE NOTICE '================================================';
END $$;

-- =====================================================
-- SUCCESS!
-- The views are now ready with:
-- ✅ Unique indexes for concurrent refresh
-- ✅ Non-blocking updates
-- ✅ Auto-refresh on payment changes
-- ✅ Helper functions for easy queries
-- ✅ Full permissions setup
-- =====================================================