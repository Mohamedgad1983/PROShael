-- Phase 4.3: Create Materialized Views for Performance Optimization
-- Created: 2025-10-19
-- Purpose: Pre-compute frequently accessed aggregations

-- 1. Members Statistics View
DROP MATERIALIZED VIEW IF EXISTS members_statistics CASCADE;
CREATE MATERIALIZED VIEW members_statistics AS
SELECT
  COUNT(*) as total_members,
  COUNT(CASE WHEN membership_status = 'active' THEN 1 END) as active_members,
  COUNT(CASE WHEN membership_status = 'inactive' THEN 1 END) as inactive_members,
  COUNT(CASE WHEN profile_completed = true THEN 1 END) as completed_profiles,
  COUNT(CASE WHEN profile_completed = false OR profile_completed IS NULL THEN 1 END) as incomplete_profiles,
  COUNT(CASE WHEN balance_status = 'compliant' THEN 1 END) as compliant_members,
  COUNT(CASE WHEN balance_status = 'non-compliant' THEN 1 END) as non_compliant_members,
  AVG(COALESCE(total_balance, 0)) as avg_balance,
  SUM(COALESCE(total_paid, 0)) as total_collected,
  COUNT(DISTINCT tribal_section) as total_tribal_sections,
  COUNT(DISTINCT city) as total_cities,
  DATE(NOW()) as last_updated
FROM members;

CREATE UNIQUE INDEX idx_members_statistics_unique ON members_statistics (last_updated);

-- 2. Payments Summary View
DROP MATERIALIZED VIEW IF EXISTS payments_summary CASCADE;
CREATE MATERIALIZED VIEW payments_summary AS
SELECT
  DATE_TRUNC('month', payment_date) as month,
  COUNT(*) as total_payments,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount,
  COUNT(DISTINCT payer_id) as unique_payers,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_payments,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
  SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as completed_amount,
  DATE(NOW()) as last_updated
FROM payments
WHERE payment_date IS NOT NULL
GROUP BY DATE_TRUNC('month', payment_date);

CREATE INDEX idx_payments_summary_month ON payments_summary (month DESC);
CREATE INDEX idx_payments_summary_updated ON payments_summary (last_updated);

-- 3. Subscription Metrics View
DROP MATERIALIZED VIEW IF EXISTS subscription_metrics CASCADE;
CREATE MATERIALIZED VIEW subscription_metrics AS
SELECT
  COUNT(*) as total_subscriptions,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions,
  COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_subscriptions,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_subscriptions,
  SUM(COALESCE(amount, 0)) as total_subscription_value,
  AVG(COALESCE(amount, 0)) as avg_subscription_amount,
  COUNT(DISTINCT member_id) as unique_subscribers,
  DATE(NOW()) as last_updated
FROM subscriptions;

CREATE UNIQUE INDEX idx_subscription_metrics_unique ON subscription_metrics (last_updated);

-- 4. Initiative Analytics View
DROP MATERIALIZED VIEW IF EXISTS initiative_analytics CASCADE;
CREATE MATERIALIZED VIEW initiative_analytics AS
SELECT
  i.id as initiative_id,
  i.title,
  i.status,
  i.start_date,
  i.end_date,
  i.target_amount,
  i.raised_amount,
  COUNT(DISTINCT id.donor_id) as total_donors,
  SUM(id.amount) as total_donations,
  AVG(id.amount) as avg_donation,
  CASE
    WHEN i.target_amount > 0 THEN (i.raised_amount / i.target_amount * 100)
    ELSE 0
  END as completion_percentage,
  COUNT(DISTINCT iv.volunteer_id) as total_volunteers,
  DATE(NOW()) as last_updated
FROM initiatives i
LEFT JOIN initiative_donations id ON i.id = id.initiative_id
LEFT JOIN initiative_volunteers iv ON i.id = iv.initiative_id
GROUP BY i.id, i.title, i.status, i.start_date, i.end_date, i.target_amount, i.raised_amount;

CREATE INDEX idx_initiative_analytics_id ON initiative_analytics (initiative_id);
CREATE INDEX idx_initiative_analytics_status ON initiative_analytics (status);
CREATE INDEX idx_initiative_analytics_updated ON initiative_analytics (last_updated);

-- 5. Diya Statistics View
DROP MATERIALIZED VIEW IF EXISTS diya_statistics CASCADE;
CREATE MATERIALIZED VIEW diya_statistics AS
SELECT
  COUNT(*) as total_cases,
  COUNT(CASE WHEN status = 'open' THEN 1 END) as open_cases,
  COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_cases,
  COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_cases,
  COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_cases,
  COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_priority_cases,
  COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_priority_cases,
  SUM(COALESCE(amount_paid, 0)) as total_paid_amount,
  AVG(COALESCE(amount_paid, 0)) as avg_paid_amount,
  COUNT(DISTINCT beneficiary_id) as unique_beneficiaries,
  DATE(NOW()) as last_updated
FROM diya_cases;

CREATE UNIQUE INDEX idx_diya_statistics_unique ON diya_statistics (last_updated);

-- Create function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY members_statistics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY payments_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY subscription_metrics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY initiative_analytics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY diya_statistics;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to refresh views every hour (requires pg_cron extension)
-- Note: This requires pg_cron to be enabled in Supabase
-- SELECT cron.schedule('refresh-materialized-views', '0 * * * *', 'SELECT refresh_all_materialized_views();');