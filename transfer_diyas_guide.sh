#!/bin/bash
# ============================================================
# خطوات نقل الديات الداخلية إلى المصروفات
# Run on VPS: ssh root@213.199.62.185
# ============================================================

echo "=== خطوة 1: عرض الـ view الحالية ==="
sudo -u postgres psql -d alshuail -c "SELECT pg_get_viewdef('vw_fund_balance', true);"

echo ""
echo "=== خطوة 2: عرض الرصيد قبل التعديل ==="
sudo -u postgres psql -d alshuail -c "SELECT * FROM vw_fund_balance;"

echo ""
echo "=== خطوة 3: تشغيل السكريبت ==="
echo "راجع الـ view definition أولاً قبل ما تكمل!"
echo "لو كل حاجة تمام، شغّل:"
echo "sudo -u postgres psql -d alshuail -f /tmp/transfer_diyas_to_expenses.sql"

echo ""
echo "=== خطوة 4: التحقق بعد التعديل ==="
echo "sudo -u postgres psql -d alshuail -c \"SELECT * FROM vw_fund_balance;\""
