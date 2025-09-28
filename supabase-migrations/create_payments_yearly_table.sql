-- Create payments_yearly table to track annual member payments
-- This table stores year-specific payment records for each member

-- Drop table if exists (be careful in production!)
DROP TABLE IF EXISTS payments_yearly CASCADE;

-- Create the payments_yearly table
CREATE TABLE payments_yearly (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2030),
    amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
    payment_date DATE,
    payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'bank_transfer', 'online', 'cheque', 'other')),
    receipt_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure one payment record per member per year
    UNIQUE(member_id, year)
);

-- Create indexes for better query performance
CREATE INDEX idx_payments_yearly_member_id ON payments_yearly(member_id);
CREATE INDEX idx_payments_yearly_year ON payments_yearly(year);
CREATE INDEX idx_payments_yearly_payment_date ON payments_yearly(payment_date);
CREATE INDEX idx_payments_yearly_amount ON payments_yearly(amount);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payments_yearly_updated_at
    BEFORE UPDATE ON payments_yearly
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create a view for member statements with calculated totals
CREATE OR REPLACE VIEW member_statements AS
SELECT
    m.id as member_id,
    m.member_no,
    m.full_name,
    m.phone,
    m.tribal_section,
    m.email,
    COALESCE(SUM(py.amount), 0) as total_paid,
    COUNT(py.id) as payment_count,
    MAX(py.payment_date) as last_payment_date,
    CASE
        WHEN COALESCE(SUM(py.amount), 0) >= 3000 THEN 'compliant'
        ELSE 'non-compliant'
    END as compliance_status,
    3000 - COALESCE(SUM(py.amount), 0) as amount_due
FROM
    members m
LEFT JOIN
    payments_yearly py ON m.id = py.member_id
GROUP BY
    m.id, m.member_no, m.full_name, m.phone, m.tribal_section, m.email;

-- Create a view for yearly payment summary
CREATE OR REPLACE VIEW yearly_payment_summary AS
SELECT
    year,
    COUNT(DISTINCT member_id) as members_paid,
    SUM(amount) as total_collected,
    AVG(amount) as average_payment,
    MIN(amount) as min_payment,
    MAX(amount) as max_payment
FROM
    payments_yearly
WHERE
    amount > 0
GROUP BY
    year
ORDER BY
    year DESC;

-- Create a view for member payment history
CREATE OR REPLACE VIEW member_payment_history AS
SELECT
    m.id as member_id,
    m.member_no,
    m.full_name,
    py.year,
    py.amount,
    py.payment_date,
    py.payment_method,
    py.receipt_number,
    CASE
        WHEN py.amount >= 600 THEN 'full'
        WHEN py.amount > 0 THEN 'partial'
        ELSE 'pending'
    END as payment_status
FROM
    members m
CROSS JOIN
    (SELECT DISTINCT year FROM generate_series(2021, 2025) AS year) years
LEFT JOIN
    payments_yearly py ON m.id = py.member_id AND py.year = years.year
ORDER BY
    m.member_no, years.year;

-- Row Level Security (RLS) Policies
ALTER TABLE payments_yearly ENABLE ROW LEVEL SECURITY;

-- Policy for admins - full access
CREATE POLICY admin_all_payments_yearly ON payments_yearly
    FOR ALL
    USING (auth.jwt() ->> 'role' IN ('super_admin', 'financial_manager'));

-- Policy for members - read only their own payments
CREATE POLICY member_read_own_payments ON payments_yearly
    FOR SELECT
    USING (
        member_id IN (
            SELECT id FROM members
            WHERE user_id = auth.uid()
        )
    );

-- Grant permissions
GRANT ALL ON payments_yearly TO authenticated;
GRANT SELECT ON member_statements TO authenticated;
GRANT SELECT ON yearly_payment_summary TO authenticated;
GRANT SELECT ON member_payment_history TO authenticated;

-- Insert sample data for testing (optional - remove in production)
-- This inserts test payment data based on the Excel structure
/*
INSERT INTO payments_yearly (member_id, year, amount, payment_date, payment_method, receipt_number)
SELECT
    m.id,
    y.year,
    CASE
        WHEN RANDOM() < 0.7 THEN 600  -- 70% paid full amount
        WHEN RANDOM() < 0.9 THEN 300  -- 20% paid partial
        ELSE 0                         -- 10% didn't pay
    END as amount,
    CASE
        WHEN RANDOM() < 0.7 THEN
            DATE(y.year || '-' || (FLOOR(RANDOM() * 12) + 1)::text || '-' || (FLOOR(RANDOM() * 28) + 1)::text)
        ELSE NULL
    END as payment_date,
    CASE
        WHEN RANDOM() < 0.5 THEN 'bank_transfer'
        WHEN RANDOM() < 0.8 THEN 'cash'
        ELSE 'online'
    END as payment_method,
    CASE
        WHEN RANDOM() < 0.7 THEN 'RCP-' || y.year || '-' || FLOOR(RANDOM() * 9999)::text
        ELSE NULL
    END as receipt_number
FROM
    members m
CROSS JOIN
    (SELECT generate_series(2021, 2025) AS year) y
WHERE
    m.member_no NOT LIKE 'TEST-%'  -- Exclude test members
ON CONFLICT (member_id, year) DO NOTHING;
*/

-- Function to import payments from Excel data
CREATE OR REPLACE FUNCTION import_payments_from_excel(
    p_member_no VARCHAR,
    p_payment_2021 DECIMAL,
    p_payment_2022 DECIMAL,
    p_payment_2023 DECIMAL,
    p_payment_2024 DECIMAL,
    p_payment_2025 DECIMAL
) RETURNS VOID AS $$
DECLARE
    v_member_id UUID;
BEGIN
    -- Get member ID
    SELECT id INTO v_member_id
    FROM members
    WHERE member_no = p_member_no;

    IF v_member_id IS NULL THEN
        RAISE EXCEPTION 'Member not found: %', p_member_no;
    END IF;

    -- Insert payments for each year
    IF p_payment_2021 > 0 THEN
        INSERT INTO payments_yearly (member_id, year, amount, payment_date, payment_method)
        VALUES (v_member_id, 2021, p_payment_2021, '2021-12-31', 'bank_transfer')
        ON CONFLICT (member_id, year)
        DO UPDATE SET amount = EXCLUDED.amount, updated_at = CURRENT_TIMESTAMP;
    END IF;

    IF p_payment_2022 > 0 THEN
        INSERT INTO payments_yearly (member_id, year, amount, payment_date, payment_method)
        VALUES (v_member_id, 2022, p_payment_2022, '2022-12-31', 'bank_transfer')
        ON CONFLICT (member_id, year)
        DO UPDATE SET amount = EXCLUDED.amount, updated_at = CURRENT_TIMESTAMP;
    END IF;

    IF p_payment_2023 > 0 THEN
        INSERT INTO payments_yearly (member_id, year, amount, payment_date, payment_method)
        VALUES (v_member_id, 2023, p_payment_2023, '2023-12-31', 'bank_transfer')
        ON CONFLICT (member_id, year)
        DO UPDATE SET amount = EXCLUDED.amount, updated_at = CURRENT_TIMESTAMP;
    END IF;

    IF p_payment_2024 > 0 THEN
        INSERT INTO payments_yearly (member_id, year, amount, payment_date, payment_method)
        VALUES (v_member_id, 2024, p_payment_2024, '2024-12-31', 'bank_transfer')
        ON CONFLICT (member_id, year)
        DO UPDATE SET amount = EXCLUDED.amount, updated_at = CURRENT_TIMESTAMP;
    END IF;

    IF p_payment_2025 > 0 THEN
        INSERT INTO payments_yearly (member_id, year, amount, payment_date, payment_method)
        VALUES (v_member_id, 2025, p_payment_2025, '2025-12-31', 'bank_transfer')
        ON CONFLICT (member_id, year)
        DO UPDATE SET amount = EXCLUDED.amount, updated_at = CURRENT_TIMESTAMP;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE payments_yearly IS 'Stores yearly payment records for each member';
COMMENT ON COLUMN payments_yearly.member_id IS 'Reference to the member who made the payment';
COMMENT ON COLUMN payments_yearly.year IS 'The year this payment is for';
COMMENT ON COLUMN payments_yearly.amount IS 'Payment amount in SAR';
COMMENT ON COLUMN payments_yearly.payment_date IS 'Date when the payment was made';
COMMENT ON COLUMN payments_yearly.payment_method IS 'Method used for payment';
COMMENT ON COLUMN payments_yearly.receipt_number IS 'Receipt or transaction reference number';
COMMENT ON VIEW member_statements IS 'Aggregated view of member payment statements with compliance status';
COMMENT ON VIEW yearly_payment_summary IS 'Summary statistics of payments by year';
COMMENT ON VIEW member_payment_history IS 'Detailed payment history for all members across all years';