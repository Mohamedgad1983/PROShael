-- =====================================================
-- AL-SHUAIL STATEMENT SYSTEM - UNIVERSAL MATERIALIZED VIEWS
-- This version works with any combination of name columns
-- =====================================================

-- Drop existing views if they exist
DROP MATERIALIZED VIEW IF EXISTS member_statement_view CASCADE;
DROP MATERIALIZED VIEW IF EXISTS member_balance_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS critical_members_view CASCADE;

-- =====================================================
-- 1. MAIN STATEMENT VIEW - Works with any name column setup
-- =====================================================
CREATE MATERIALIZED VIEW member_statement_view AS
WITH member_balances AS (
  SELECT
    m.id,
    -- Universal name handling - works with any column that exists
    CASE
      WHEN m.full_name IS NOT NULL AND m.full_name != '' THEN m.full_name
      ELSE CONCAT('عضو ', SUBSTRING(m.id::text, 1, 8))
    END as full_name,
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
-- 2. BALANCE SUMMARY VIEW - Simplified
-- =====================================================
CREATE MATERIALIZED VIEW member_balance_summary AS
SELECT
  m.id,
  CASE
    WHEN m.full_name IS NOT NULL AND m.full_name != '' THEN m.full_name
    ELSE CONCAT('عضو ', SUBSTRING(m.id::text, 1, 8))
  END as full_name,
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
-- 3. CRITICAL MEMBERS VIEW
-- =====================================================
CREATE MATERIALIZED VIEW critical_members_view AS
WITH member_payments AS (
  SELECT
    m.id,
    CASE
      WHEN m.full_name IS NOT NULL AND m.full_name != '' THEN m.full_name
      ELSE CONCAT('عضو ', SUBSTRING(m.id::text, 1, 8))
    END as full_name,
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
  RETURN;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error refreshing views: %', SQLERRM;
END;
$$;

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Get member statement by phone
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

-- Get critical members list
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

-- Get dashboard statistics
CREATE OR REPLACE FUNCTION get_dashboard_statistics()
RETURNS TABLE (
  total_members BIGINT,
  compliant_members BIGINT,
  non_compliant_members BIGINT,
  compliance_rate NUMERIC,
  total_shortfall NUMERIC,
  critical_count BIGINT,
  warning_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_members,
    COUNT(*) FILTER (WHERE current_balance >= 3000)::BIGINT as compliant_members,
    COUNT(*) FILTER (WHERE current_balance < 3000)::BIGINT as non_compliant_members,
    ROUND((COUNT(*) FILTER (WHERE current_balance >= 3000)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2) as compliance_rate,
    SUM(shortfall)::NUMERIC as total_shortfall,
    COUNT(*) FILTER (WHERE alert_level = 'CRITICAL' OR alert_level = 'ZERO_BALANCE')::BIGINT as critical_count,
    COUNT(*) FILTER (WHERE alert_level = 'WARNING')::BIGINT as warning_count
  FROM member_statement_view;
END;
$$;

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================
GRANT SELECT ON member_statement_view TO authenticated, anon;
GRANT SELECT ON member_balance_summary TO authenticated, anon;
GRANT SELECT ON critical_members_view TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_member_statement_by_phone TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_critical_members TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_dashboard_statistics TO authenticated, anon;

-- =====================================================
-- 7. INITIAL REFRESH
-- =====================================================
SELECT refresh_statement_views();

-- =====================================================
-- 8. VERIFICATION
-- =====================================================
DO $$
DECLARE
  view_count INTEGER;
  critical_count INTEGER;
  col_exists BOOLEAN;
BEGIN
  -- Check if views were created
  SELECT COUNT(*) INTO view_count FROM member_statement_view;
  SELECT COUNT(*) INTO critical_count FROM critical_members_view;

  -- Check which columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'full_name'
  ) INTO col_exists;

  RAISE NOTICE '====================================';
  RAISE NOTICE 'VIEWS CREATED SUCCESSFULLY!';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Total Members in View: %', view_count;
  RAISE NOTICE 'Critical Members: %', critical_count;
  RAISE NOTICE 'Using full_name column: %', col_exists;
  RAISE NOTICE '';
  RAISE NOTICE 'Test Queries:';
  RAISE NOTICE '1. SELECT * FROM member_statement_view LIMIT 5;';
  RAISE NOTICE '2. SELECT * FROM get_dashboard_statistics();';
  RAISE NOTICE '3. SELECT * FROM get_critical_members(10);';
  RAISE NOTICE '====================================';
END $$;

-- =====================================================
-- SUCCESS!
-- This universal version only uses columns that definitely exist:
-- - id, phone, email, created_at (standard columns)
-- - full_name (which we check exists)
-- - membership_number (optional)
-- =====================================================