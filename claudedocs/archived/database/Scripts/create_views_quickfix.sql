-- QUICK FIX: Replace the transaction aggregation with simpler version
-- This avoids referencing columns that might not exist

DROP MATERIALIZED VIEW IF EXISTS member_statement_view CASCADE;

CREATE MATERIALIZED VIEW member_statement_view AS
SELECT
  m.id,
  COALESCE(m.full_name, CONCAT('عضو ', SUBSTRING(m.id::text, 1, 8))) as full_name,
  m.phone,
  COALESCE(m.membership_number, CONCAT('SH-', SUBSTRING(m.id::text, 1, 5))) as membership_number,
  m.email,
  m.created_at as member_since,

  -- Simple balance calculation
  COALESCE(
    (SELECT SUM(CAST(amount AS DECIMAL))
     FROM payments
     WHERE payer_id = m.id
     AND status = 'completed'), 0
  ) as current_balance,

  -- Alert levels
  CASE
    WHEN COALESCE(
      (SELECT SUM(CAST(amount AS DECIMAL))
       FROM payments
       WHERE payer_id = m.id
       AND status = 'completed'), 0
    ) = 0 THEN 'ZERO_BALANCE'
    WHEN COALESCE(
      (SELECT SUM(CAST(amount AS DECIMAL))
       FROM payments
       WHERE payer_id = m.id
       AND status = 'completed'), 0
    ) < 1000 THEN 'CRITICAL'
    WHEN COALESCE(
      (SELECT SUM(CAST(amount AS DECIMAL))
       FROM payments
       WHERE payer_id = m.id
       AND status = 'completed'), 0
    ) < 3000 THEN 'WARNING'
    ELSE 'SUFFICIENT'
  END as alert_level,

  -- Shortfall calculation
  GREATEST(0, 3000 - COALESCE(
    (SELECT SUM(CAST(amount AS DECIMAL))
     FROM payments
     WHERE payer_id = m.id
     AND status = 'completed'), 0
  )) as shortfall,

  -- Transaction count (simpler, no JSON)
  (SELECT COUNT(*) FROM payments WHERE payer_id = m.id AND status = 'completed') as total_transactions,

  -- Last payment date
  (SELECT MAX(created_at) FROM payments WHERE payer_id = m.id AND status = 'completed') as last_payment_date

FROM members m;

-- Create index
CREATE INDEX idx_statement_phone ON member_statement_view(phone);

-- Grant permissions
GRANT SELECT ON member_statement_view TO authenticated, anon;

-- Test it
SELECT COUNT(*) as total_records FROM member_statement_view;
SELECT * FROM member_statement_view LIMIT 5;