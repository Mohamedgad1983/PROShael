-- ============================================================
-- نقل الديات الداخلية إلى المصروفات
-- Database: alshuail_db
-- Date: 2026-03-06
-- ============================================================
-- الوضع الحالي:
--   total_revenue = 498,790 (من members.current_balance)
--   total_expenses = 0 (من expenses)
--   total_internal_diya = 140,800 (من diya_cases)
--   current_balance = 498,790 - 0 - 140,800 = 357,990
--
-- بعد التعديل:
--   total_revenue = 498,790 (بدون تغيير)
--   total_expenses = 140,800 (3 ديات منقولة)
--   total_internal_diya = 140,800 (من expenses WHERE category='diya')
--   current_balance = 498,790 - 140,800 = 357,990 ✅ (نفس الرقم)
-- ============================================================

BEGIN;

-- ============================================================
-- خطوة 1: إنشاء 3 مصروفات منفصلة من الديات
-- ============================================================

-- 1.1: دية شرهان 2 (83,400 ريال)
INSERT INTO expenses (
  expense_category, title_ar, title_en, description_ar,
  amount, currency, expense_date, paid_to, payment_method,
  notes, approval_required, status, created_by,
  approved_by, approved_at, approval_notes
) VALUES (
  'diya',
  'دية شرهان 2 - المرحلة الثانية',
  'Diya Sharhan 2',
  'دية داخلية منقولة من قسم الديات - المرحلة الثانية من قضية شرهان',
  83400.00,
  'SAR',
  '2025-10-02',
  'شرهان',
  'cash',
  'منقولة من diya_cases ID: b380545b-bcf7-40d0-b10e-2cb9ae04ede2',
  false,
  'approved',
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
  NOW(),
  'تم النقل تلقائياً من قسم الديات الداخلية'
);

-- 1.2: دية شرهان 1 (29,200 ريال)
INSERT INTO expenses (
  expense_category, title_ar, title_en, description_ar,
  amount, currency, expense_date, paid_to, payment_method,
  notes, approval_required, status, created_by,
  approved_by, approved_at, approval_notes
) VALUES (
  'diya',
  'دية شرهان 1 - المرحلة الأولى',
  'Diya Sharhan 1',
  'دية داخلية منقولة من قسم الديات - المرحلة الأولى من قضية شرهان',
  29200.00,
  'SAR',
  '2025-10-02',
  'شرهان',
  'cash',
  'منقولة من diya_cases ID: 36666c2f-78d1-4103-b97a-a752278f6660',
  false,
  'approved',
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
  NOW(),
  'تم النقل تلقائياً من قسم الديات الداخلية'
);

-- 1.3: دية نادر (28,200 ريال)
INSERT INTO expenses (
  expense_category, title_ar, title_en, description_ar,
  amount, currency, expense_date, paid_to, payment_method,
  notes, approval_required, status, created_by,
  approved_by, approved_at, approval_notes
) VALUES (
  'diya',
  'دية نادر',
  'Diya Nader',
  'دية داخلية منقولة من قسم الديات - قضية نادر',
  28200.00,
  'SAR',
  '2025-10-02',
  'نادر',
  'cash',
  'منقولة من diya_cases ID: e6a111c6-53b0-481a-af45-02fdd565a916',
  false,
  'approved',
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
  NOW(),
  'تم النقل تلقائياً من قسم الديات الداخلية'
);

-- ============================================================
-- خطوة 2: تعليم الديات القديمة في diya_cases كمنقولة
-- ============================================================
UPDATE diya_cases
SET status = 'transferred_to_expense',
    notes = COALESCE(notes, '') || E'\n[تم نقلها إلى المصروفات بتاريخ ' || NOW()::date || ']'
WHERE id IN (
  'b380545b-bcf7-40d0-b10e-2cb9ae04ede2',
  '36666c2f-78d1-4103-b97a-a752278f6660',
  'e6a111c6-53b0-481a-af45-02fdd565a916'
);

-- ============================================================
-- خطوة 3: تحديث الـ view
-- القديم: رصيد = إيرادات - مصروفات - دية_داخلية
-- الجديد: رصيد = إيرادات - مصروفات (الدية بقت ضمن المصروفات)
-- ============================================================
CREATE OR REPLACE VIEW vw_fund_balance AS
SELECT
  -- الإيرادات (بدون تغيير)
  COALESCE((
    SELECT sum(members.current_balance)
    FROM members
    WHERE members.current_balance > 0::numeric
  ), 0::numeric)::numeric(12,2) AS total_revenue,

  -- المصروفات (تشمل الديات الداخلية الآن)
  COALESCE((
    SELECT sum(expenses.amount)
    FROM expenses
    WHERE expenses.status = ANY (ARRAY['approved'::text, 'paid'::text])
  ), 0::numeric)::numeric(12,2) AS total_expenses,

  -- الدية الداخلية (للعرض فقط - من المصروفات بفئة diya)
  COALESCE((
    SELECT sum(expenses.amount)
    FROM expenses
    WHERE expenses.status = ANY (ARRAY['approved'::text, 'paid'::text])
    AND expenses.expense_category = 'diya'
  ), 0::numeric)::numeric(12,2) AS total_internal_diya,

  -- الرصيد = الإيرادات - المصروفات فقط (بدون خصم دية منفصل)
  (COALESCE((
    SELECT sum(members.current_balance)
    FROM members
    WHERE members.current_balance > 0::numeric
  ), 0::numeric)
  -
  COALESCE((
    SELECT sum(expenses.amount)
    FROM expenses
    WHERE expenses.status = ANY (ARRAY['approved'::text, 'paid'::text])
  ), 0::numeric))::numeric(12,2) AS current_balance,

  now() AS last_calculated;

-- ============================================================
-- خطوة 4: التحقق
-- ============================================================
SELECT '=== المصروفات الجديدة ===' AS info;
SELECT id, title_ar, amount, expense_category, status
FROM expenses WHERE expense_category = 'diya' ORDER BY amount DESC;

SELECT '=== رصيد الصندوق بعد التعديل ===' AS info;
SELECT * FROM vw_fund_balance;

SELECT '=== الديات المنقولة ===' AS info;
SELECT id, status, collected_amount FROM diya_cases
WHERE id IN (
  'b380545b-bcf7-40d0-b10e-2cb9ae04ede2',
  '36666c2f-78d1-4103-b97a-a752278f6660',
  'e6a111c6-53b0-481a-af45-02fdd565a916'
);

COMMIT;
