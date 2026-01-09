-- =====================================================
-- TEST YOUR NEW MATERIALIZED VIEWS
-- Run these queries to verify everything works
-- =====================================================

-- 1. Check how many records are in each view
SELECT
  'member_statement_view' as view_name,
  COUNT(*) as record_count
FROM member_statement_view
UNION ALL
SELECT
  'member_balance_summary' as view_name,
  COUNT(*) as record_count
FROM member_balance_summary
UNION ALL
SELECT
  'critical_members_view' as view_name,
  COUNT(*) as record_count
FROM critical_members_view;

-- 2. Get dashboard statistics
SELECT * FROM get_dashboard_stats();

-- 3. View some sample members with their balances
SELECT
  full_name,
  phone,
  membership_number,
  current_balance,
  alert_level,
  shortfall,
  percentage_complete
FROM member_statement_view
LIMIT 10;

-- 4. Check critical members (those below 3000 SAR)
SELECT
  full_name,
  phone,
  balance,
  shortfall,
  priority_level
FROM critical_members_view
LIMIT 10;

-- 5. Test the phone search function
-- Replace with an actual phone number from your database
SELECT * FROM get_member_by_phone('0501234567');

-- 6. Check members by alert level
SELECT
  alert_level,
  COUNT(*) as member_count,
  AVG(current_balance) as avg_balance,
  SUM(shortfall) as total_shortfall
FROM member_statement_view
GROUP BY alert_level
ORDER BY
  CASE alert_level
    WHEN 'ZERO_BALANCE' THEN 1
    WHEN 'CRITICAL' THEN 2
    WHEN 'WARNING' THEN 3
    WHEN 'SUFFICIENT' THEN 4
  END;

-- 7. Test refresh function
SELECT refresh_all_views();

-- 8. Check members with recent payments
SELECT
  full_name,
  current_balance,
  total_payments,
  last_payment_date
FROM member_statement_view
WHERE last_payment_date IS NOT NULL
ORDER BY last_payment_date DESC
LIMIT 10;