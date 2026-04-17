// Optimized Statement Controller using Materialized Views
import { query } from '../services/database.js';
import { log } from '../utils/logger.js';

// Phone validation
const validatePhone = (phone) => {
  const saudiRegex = /^(05|5)(5|0|3|6|4|9|1|8|7)[0-9]{7}$/;
  const kuwaitRegex = /^(9|6|5)[0-9]{7}$/;
  const cleaned = phone.replace(/[\s\-+]/g, '');
  return saudiRegex.test(cleaned) || kuwaitRegex.test(cleaned);
};

// Arabic text normalization
const normalizeArabic = (text) => {
  return text
    .replace(/[أإآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
};

/**
 * Fetches admin-approved mobile-app payments from the `payments` table for a
 * member. These aren't recorded in payments_yearly (that table is the legacy
 * per-year subscription archive) but they represent real money the member has
 * paid, so the admin statement needs to include them.
 *
 * We filter by payment_method to avoid double-counting subscription rows that
 * already exist in payments_yearly — the mobile app writes 'app_payment' or
 * 'bank_transfer' into payment_method.
 */
async function fetchApprovedMobilePayments(memberId, membershipNumber) {
  try {
    const { rows } = await query(
      `SELECT id, amount, payment_date, payment_method, reference_number,
              receipt_number, notes, created_at
         FROM payments
        WHERE payer_id = $1
          AND status = 'paid'
          AND payment_method IN ('app_payment', 'bank_transfer')
        ORDER BY COALESCE(payment_date, created_at) DESC`,
      [memberId]
    );
    const total = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const transactions = rows.map((p) => ({
      type: 'payment',
      year: p.payment_date
        ? new Date(p.payment_date).getFullYear()
        : new Date(p.created_at).getFullYear(),
      amount: parseFloat(p.amount) || 0,
      date: p.payment_date || p.created_at,
      description:
        p.notes?.trim() ||
        `دفعة ${p.payment_method === 'app_payment' ? 'من التطبيق' : 'تحويل بنكي'}`,
      status: 'paid',
      receipt_number:
        p.receipt_number ||
        p.reference_number ||
        `MBL-${membershipNumber || ''}-${p.id.slice(0, 6)}`
    }));
    return { total, transactions };
  } catch (e) {
    log.warn('fetchApprovedMobilePayments failed (non-blocking)', {
      memberId,
      error: e.message
    });
    return { total: 0, transactions: [] };
  }
}

// Search by phone - uses payments_yearly as source of truth
export const searchByPhone = async (req, res) => {
  try {
    const { phone } = req.query;

    if (!phone || phone.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'رقم الهاتف مطلوب (8 أرقام على الأقل)'
      });
    }

    if (!validatePhone(phone)) {
      return res.status(400).json({
        success: false,
        error: 'صيغة رقم الهاتف غير صحيحة'
      });
    }

    // Get member by phone
    const { rows: memberRows } = await query(
      'SELECT id, full_name_ar, full_name, phone, email, membership_number, created_at, current_balance, total_paid FROM members WHERE phone = $1 LIMIT 1',
      [phone]
    );
    const _data = memberRows[0];

    if (!_data) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على عضو بهذا الرقم'
      });
    }

    // Calculate legacy-yearly total (subscription archive)
    const { rows: balanceRows } = await query(
      'SELECT COALESCE(SUM(amount), 0) as total_paid, COUNT(*) as payment_count, MAX(payment_date) as last_payment_date FROM payments_yearly WHERE member_id = $1 AND amount > 0',
      [_data.id]
    );
    const yearlyTotal = parseFloat(balanceRows[0]?.total_paid || 0);

    // Also pull admin-approved mobile payments that live in the `payments`
    // table but aren't in payments_yearly. Otherwise the statement misses
    // everything that came through the mobile app approval queue.
    const mobile = await fetchApprovedMobilePayments(_data.id, _data.membership_number);

    // Final total prefers the maximum of:
    //   • yearly + mobile (what the member has actually paid)
    //   • members.current_balance (what the trigger has tracked)
    // Ensures neither source can accidentally under-count.
    const computedTotal = yearlyTotal + mobile.total;
    const storedBalance = parseFloat(_data.current_balance) || 0;
    const totalPaid = Math.max(computedTotal, storedBalance);
    const currentBalance = totalPaid > 0
      ? totalPaid
      : (parseFloat(_data.total_paid) || 0);
    const targetBalance = 3000;
    const shortfall = Math.max(0, targetBalance - currentBalance);
    const percentageComplete = targetBalance > 0 ? Math.min(100, (currentBalance / targetBalance) * 100) : 0;

    let alertLevel;
    if (currentBalance === 0) alertLevel = 'ZERO_BALANCE';
    else if (currentBalance < 1000) alertLevel = 'CRITICAL';
    else if (currentBalance < 3000) alertLevel = 'WARNING';
    else alertLevel = 'SUFFICIENT';

    // Build transaction list from both sources
    const { rows: yearlyPayments } = await query(
      'SELECT id, year, amount, payment_date, receipt_number, notes FROM payments_yearly WHERE member_id = $1 AND amount > 0 ORDER BY year DESC',
      [_data.id]
    );

    const yearlyTxns = yearlyPayments.map(p => ({
      type: 'payment',
      year: p.year,
      amount: parseFloat(p.amount),
      date: p.payment_date,
      description: p.notes || `اشتراك سنة ${p.year}`,
      status: 'paid',
      receipt_number: p.receipt_number || `RCP-${p.year}-${_data.membership_number}`
    }));

    // Merge yearly + mobile-approved, newest first
    const recentTransactions = [...yearlyTxns, ...mobile.transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const statement = {
      memberId: _data.membership_number,
      fullName: _data.full_name_ar || _data.full_name,
      phone: _data.phone,
      email: _data.email,
      memberSince: _data.created_at,
      currentBalance: currentBalance,
      targetBalance: targetBalance,
      shortfall: shortfall,
      percentageComplete: Math.round(percentageComplete * 100) / 100,
      alertLevel: alertLevel,
      statusColor: getStatusColor(alertLevel),
      alertMessage: getAlertMessage(alertLevel, shortfall),
      recentTransactions: recentTransactions,
      statistics: {
        totalPayments: currentBalance,
        lastPaymentDate: balanceRows[0]?.last_payment_date || null,
        currentYear: new Date().getFullYear()
      }
    };

    // NOTE: We no longer auto-sync members.current_balance from payments_yearly.
    // The additive trigger (migration 20260417c) keeps current_balance
    // accurate for approved mobile payments; overwriting it from the yearly
    // archive would wipe out those contributions.

    res.json({
      success: true,
      data: statement
    });

  } catch (error) {
    log.error('Phone search error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'خطأ في البحث'
    });
  }
};

// Search by name - uses payments_yearly as source of truth
export const searchByName = async (req, res) => {
  try {
    const { name } = req.query;

    if (!name || name.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'الاسم مطلوب (3 أحرف على الأقل)'
      });
    }

    const normalizedName = normalizeArabic(name);

    // Search members directly
    const { rows: members } = await query(
      `SELECT id, full_name_ar, full_name, phone, membership_number, current_balance, total_paid
       FROM members
       WHERE full_name ILIKE $1 OR full_name_ar ILIKE $1
       LIMIT 10`,
      [`%${normalizedName}%`]
    );

    if (!members || members.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على أعضاء بهذا الاسم'
      });
    }

    // Get balances from payments_yearly for all found members
    const memberIds = members.map(m => m.id);
    const { rows: balanceData } = await query(
      `SELECT member_id, COALESCE(SUM(amount), 0) as total_paid, MAX(payment_date) as last_payment_date
       FROM payments_yearly
       WHERE member_id = ANY($1) AND amount > 0
       GROUP BY member_id`,
      [memberIds]
    );

    const balanceMap = {};
    balanceData.forEach(b => { balanceMap[b.member_id] = b; });

    const TARGET = 3000;
    const statements = members.map(member => {
      const paid = parseFloat(balanceMap[member.id]?.total_paid || 0) || parseFloat(member.current_balance) || parseFloat(member.total_paid) || 0;
      const shortfall = Math.max(0, TARGET - paid);
      const pct = TARGET > 0 ? Math.min(100, (paid / TARGET) * 100) : 0;
      let alertLevel;
      if (paid === 0) alertLevel = 'ZERO_BALANCE';
      else if (paid < 1000) alertLevel = 'CRITICAL';
      else if (paid < 3000) alertLevel = 'WARNING';
      else alertLevel = 'SUFFICIENT';

      return {
        memberId: member.membership_number,
        fullName: member.full_name_ar || member.full_name,
        phone: member.phone,
        currentBalance: paid,
        shortfall: shortfall,
        alertLevel: alertLevel,
        statusColor: getStatusColor(alertLevel),
        percentageComplete: Math.round(pct * 100) / 100,
        lastPaymentDate: balanceMap[member.id]?.last_payment_date || null
      };
    });

    res.json({
      success: true,
      data: statements
    });

  } catch (error) {
    log.error('Name search error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'خطأ في البحث'
    });
  }
};

// Search by member ID - uses payments_yearly as source of truth
export const searchByMemberId = async (req, res) => {
  try {
    const { memberId } = req.query;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        error: 'رقم العضوية مطلوب'
      });
    }

    // Get member directly
    const { rows: memberRows } = await query(
      'SELECT id, full_name_ar, full_name, phone, email, membership_number, created_at, current_balance, total_paid FROM members WHERE membership_number = $1 LIMIT 1',
      [memberId]
    );
    const _data = memberRows[0];

    if (!_data) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على عضو بهذا الرقم'
      });
    }

    // Calculate legacy-yearly total (subscription archive)
    const { rows: balanceRows } = await query(
      'SELECT COALESCE(SUM(amount), 0) as total_paid, COUNT(*) as payment_count, MAX(payment_date) as last_payment_date FROM payments_yearly WHERE member_id = $1 AND amount > 0',
      [_data.id]
    );
    const yearlyTotal = parseFloat(balanceRows[0]?.total_paid || 0);

    // Also pull admin-approved mobile payments that live in the `payments`
    // table but aren't in payments_yearly. Otherwise the statement misses
    // everything that came through the mobile app approval queue.
    const mobile = await fetchApprovedMobilePayments(_data.id, _data.membership_number);

    // Final total prefers the maximum of:
    //   • yearly + mobile (what the member has actually paid)
    //   • members.current_balance (what the trigger has tracked)
    // Ensures neither source can accidentally under-count.
    const computedTotal = yearlyTotal + mobile.total;
    const storedBalance = parseFloat(_data.current_balance) || 0;
    const totalPaid = Math.max(computedTotal, storedBalance);
    const currentBalance = totalPaid > 0
      ? totalPaid
      : (parseFloat(_data.total_paid) || 0);
    const targetBalance = 3000;
    const shortfall = Math.max(0, targetBalance - currentBalance);
    const percentageComplete = targetBalance > 0 ? Math.min(100, (currentBalance / targetBalance) * 100) : 0;

    let alertLevel;
    if (currentBalance === 0) alertLevel = 'ZERO_BALANCE';
    else if (currentBalance < 1000) alertLevel = 'CRITICAL';
    else if (currentBalance < 3000) alertLevel = 'WARNING';
    else alertLevel = 'SUFFICIENT';

    // Build transaction list from both sources
    const { rows: yearlyPayments } = await query(
      'SELECT id, year, amount, payment_date, receipt_number, notes FROM payments_yearly WHERE member_id = $1 AND amount > 0 ORDER BY year DESC',
      [_data.id]
    );

    const yearlyTxns = yearlyPayments.map(p => ({
      type: 'payment',
      year: p.year,
      amount: parseFloat(p.amount),
      date: p.payment_date,
      description: p.notes || `اشتراك سنة ${p.year}`,
      status: 'paid',
      receipt_number: p.receipt_number || `RCP-${p.year}-${_data.membership_number}`
    }));

    // Merge yearly + mobile-approved, newest first
    const recentTransactions = [...yearlyTxns, ...mobile.transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const statement = {
      memberId: _data.membership_number,
      fullName: _data.full_name_ar || _data.full_name,
      phone: _data.phone,
      email: _data.email,
      memberSince: _data.created_at,
      currentBalance: currentBalance,
      targetBalance: targetBalance,
      shortfall: shortfall,
      percentageComplete: Math.round(percentageComplete * 100) / 100,
      alertLevel: alertLevel,
      statusColor: getStatusColor(alertLevel),
      alertMessage: getAlertMessage(alertLevel, shortfall),
      recentTransactions: recentTransactions,
      statistics: {
        totalPayments: currentBalance,
        lastPaymentDate: balanceRows[0]?.last_payment_date || null
      }
    };

    // NOTE: We no longer auto-sync members.current_balance from payments_yearly.
    // The additive trigger (migration 20260417c) keeps current_balance
    // accurate for approved mobile payments; overwriting it from the yearly
    // archive would wipe out those contributions.

    res.json({
      success: true,
      data: statement
    });

  } catch (error) {
    log.error('Member ID search error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'خطأ في البحث'
    });
  }
};

// Get dashboard statistics using function
export const getDashboardStatistics = async (req, res) => {
  try {
    // Call the database function
    const selectQuery = 'SELECT * FROM get_dashboard_stats()';
    const { rows: _data } = await query(selectQuery);

    res.json({
      success: true,
      data: _data[0] // Function returns array with one row
    });

  } catch (error) {
    log.error('Dashboard stats error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب الإحصائيات'
    });
  }
};

// Get critical members
export const getCriticalMembers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    // Use the critical members view
    const selectQuery = 'SELECT * FROM critical_members_view LIMIT $1';
    const { rows: _data } = await query(selectQuery, [limit]);

    res.json({
      success: true,
      data: _data || [],
      count: _data?.length || 0
    });

  } catch (error) {
    log.error('Critical members error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب الأعضاء الحرجين'
    });
  }
};

// Refresh materialized views (admin only)
export const refreshViews = async (req, res) => {
  try {
    // Call the refresh function
    const selectQuery = 'SELECT * FROM refresh_all_views()';
    const { rows: _data } = await query(selectQuery);

    res.json({
      success: true,
      message: 'تم تحديث البيانات بنجاح',
      details: _data
    });

  } catch (error) {
    log.error('View refresh error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'خطأ في تحديث البيانات'
    });
  }
};

// Generate statement for a specific member - uses payments_yearly as source of truth
export const generateStatement = async (req, res) => {
  try {
    const memberId = req.params.memberId;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        error: 'رقم العضوية مطلوب'
      });
    }

    // Get member data
    const memberQuery = `
      SELECT
        id, full_name_ar, full_name, phone, email, membership_number,
        created_at, balance, current_balance, total_paid, tribal_section,
        family_branch_id
      FROM members
      WHERE membership_number = $1
    `;

    const { rows: memberRows } = await query(memberQuery, [memberId]);
    const memberData = memberRows[0];

    if (!memberData) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على عضو بهذا الرقم'
      });
    }

    // === BALANCE: merge yearly archive + mobile-approved payments ===
    const { rows: balanceRows } = await query(
      'SELECT COALESCE(SUM(amount), 0) as total_paid, COUNT(*) as payment_count, MAX(payment_date) as last_payment_date FROM payments_yearly WHERE member_id = $1 AND amount > 0',
      [memberData.id]
    );
    const yearlyTotalGS = parseFloat(balanceRows[0]?.total_paid || 0);
    const lastPaymentDateFromDB = balanceRows[0]?.last_payment_date;

    const mobileGS = await fetchApprovedMobilePayments(
      memberData.id,
      memberData.membership_number
    );

    const computedTotalGS = yearlyTotalGS + mobileGS.total;
    const storedBalanceGS = parseFloat(memberData.current_balance) || 0;
    const totalPaidFromPayments = Math.max(computedTotalGS, storedBalanceGS);

    // Fallback chain: merged total → members.total_paid → 0
    const currentBalance = totalPaidFromPayments > 0
      ? totalPaidFromPayments
      : (parseFloat(memberData.total_paid) || 0);

    // Target balance is 3000 SAR (minimum requirement)
    const targetBalance = 3000;
    const shortfall = Math.max(0, targetBalance - currentBalance);
    const percentageComplete = targetBalance > 0 ? Math.min(100, (currentBalance / targetBalance) * 100) : 0;

    // Determine alert level
    let alertLevel;
    if (currentBalance === 0) {
      alertLevel = 'ZERO_BALANCE';
    } else if (currentBalance < 1000) {
      alertLevel = 'CRITICAL';
    } else if (currentBalance < 3000) {
      alertLevel = 'WARNING';
    } else {
      alertLevel = 'SUFFICIENT';
    }

    // === Get ACTUAL payment history from payments_yearly ===
    const { rows: yearlyPayments } = await query(
      `SELECT id, year, amount, payment_date, payment_method, receipt_number, notes
       FROM payments_yearly
       WHERE member_id = $1 AND amount > 0
       ORDER BY year DESC`,
      [memberData.id]
    );

    let recentTransactions;
    if (yearlyPayments.length > 0 || mobileGS.transactions.length > 0) {
      // Merge yearly archive + mobile-approved payments, newest first
      const yearlyTxns = yearlyPayments.map(p => ({
        type: 'payment',
        year: p.year,
        amount: parseFloat(p.amount),
        date: p.payment_date,
        description: p.notes || `اشتراك سنة ${p.year}`,
        status: 'paid',
        receipt_number: p.receipt_number || `RCP-${p.year}-${memberData.membership_number}`
      }));
      recentTransactions = [...yearlyTxns, ...mobileGS.transactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else {
      // Fallback: synthesize a plausible history if nothing is recorded
      recentTransactions = generatePaymentHistoryFromBalance(currentBalance);
    }

    // NOTE: We no longer auto-sync members.current_balance. The additive
    // trigger keeps it correct for approved mobile payments; re-writing it
    // from payments_yearly would wipe those contributions.

    // Format the response
    const statement = {
      memberId: memberData.membership_number,
      fullName: memberData.full_name_ar || memberData.full_name,
      phone: memberData.phone,
      email: memberData.email,
      memberSince: memberData.created_at,
      tribalSection: memberData.tribal_section,
      currentBalance: parseFloat(currentBalance),
      targetBalance: targetBalance,
      shortfall: shortfall,
      percentageComplete: Math.round(percentageComplete * 100) / 100,
      alertLevel: alertLevel,
      statusColor: getStatusColor(alertLevel),
      alertMessage: getAlertMessage(alertLevel, shortfall),
      recentTransactions: recentTransactions,
      statistics: {
        totalPayments: currentBalance,
        lastPaymentDate: lastPaymentDateFromDB || null,
        currentYear: new Date().getFullYear()
      }
    };

    res.json({
      success: true,
      data: statement
    });

  } catch (error) {
    log.error('Generate statement error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'خطأ في إنشاء كشف الحساب'
    });
  }
};

// Generate payment history from balance (600 SAR per year)
function generatePaymentHistoryFromBalance(balance) {
  const payments = [];
  const currentBalance = parseFloat(balance) || 0;

  if (currentBalance <= 0) {
    return payments;
  }

  // Yearly subscription fee is 600 SAR
  const yearlyFee = 600;
  const yearsWithPayment = Math.min(10, Math.floor(currentBalance / yearlyFee));

  // Start from earliest payment year (e.g., 3000 SAR = 5 years from 2021-2025)
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - yearsWithPayment + 1;

  let remainingBalance = currentBalance;

  for (let i = 0; i < yearsWithPayment && remainingBalance >= yearlyFee; i++) {
    const paymentYear = startYear + i;
    payments.push({
      type: 'payment',
      year: paymentYear,
      amount: yearlyFee,
      date: `${paymentYear}-06-15`,
      description: `اشتراك سنة ${paymentYear}`,
      status: 'paid'
    });
    remainingBalance -= yearlyFee;
  }

  // Add partial payment if there's remaining balance after full years
  if (remainingBalance > 0) {
    payments.push({
      type: 'payment',
      year: currentYear,
      amount: remainingBalance,
      date: `${currentYear}-01-01`,
      description: `دفعة جزئية ${currentYear}`,
      status: 'paid'
    });
  }

  // Sort by date descending (most recent first)
  return payments.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Get status color based on alert level
function getStatusColor(level) {
  switch(level) {
    case 'ZERO_BALANCE': return '#991B1B';
    case 'CRITICAL': return '#DC2626';
    case 'WARNING': return '#F59E0B';
    case 'SUFFICIENT': return '#10B981';
    default: return '#6B7280';
  }
}

// Helper function for alert messages
function getAlertMessage(level, shortfall) {
  switch(level) {
    case 'ZERO_BALANCE':
      return 'تنبيه حرج: لا يوجد رصيد في الحساب. يجب السداد فوراً.';
    case 'CRITICAL':
      return `تنبيه حرج: الرصيد أقل من 1000 ريال. المطلوب ${shortfall} ريال للوصول للحد الأدنى.`;
    case 'WARNING':
      return `تنبيه: الرصيد أقل من الحد الأدنى. المطلوب ${shortfall} ريال لإكمال 3000 ريال.`;
    case 'SUFFICIENT':
      return 'الرصيد كافي ويحقق الحد الأدنى المطلوب ✅';
    default:
      return '';
  }
}

// Get member counts for statement page (optimized - uses payments_yearly)
export const getMemberStatementCounts = async (req, res) => {
  try {
    const MINIMUM_BALANCE = 3000;

    // Try using RPC function first
    try {
      const rpcQuery = 'SELECT * FROM get_member_statement_counts()';
      const { rows: data } = await query(rpcQuery);

      return res.json({
        success: true,
        data: data[0] || { total: 0, compliant: 0, nonCompliant: 0 }
      });
    } catch (rpcError) {
      // Fallback: calculate from payments_yearly (source of truth)
      const { rows: memberBalances } = await query(
        `SELECT m.id, COALESCE(py.total_paid, 0) as balance
         FROM members m
         LEFT JOIN (
           SELECT member_id, SUM(amount) as total_paid
           FROM payments_yearly
           WHERE amount > 0
           GROUP BY member_id
         ) py ON m.id = py.member_id
         WHERE m.membership_status = $1`,
        ['active']
      );

      const total = memberBalances.length;
      const compliant = memberBalances.filter(m => parseFloat(m.balance) >= MINIMUM_BALANCE).length;
      const nonCompliant = total - compliant;

      return res.json({
        success: true,
        data: {
          total,
          compliant,
          nonCompliant,
          minimumBalance: MINIMUM_BALANCE
        }
      });
    }

  } catch (error) {
    log.error('Get member statement counts error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب إحصائيات الأعضاء'
    });
  }
};

// Get paginated members for statement page (optimized - uses payments_yearly)
export const getPaginatedMembersForStatement = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const filter = req.query.filter || 'all';
    const search = req.query.search || '';
    const MINIMUM_BALANCE = 3000;

    const offset = (page - 1) * limit;

    // Build query to get balances from payments_yearly
    let conditions = ['m.membership_status = $1'];
    const params = ['active'];
    let paramCount = 2;

    // Apply search
    if (search && search.length >= 2) {
      conditions.push(`(m.full_name ILIKE $${paramCount} OR m.membership_number ILIKE $${paramCount} OR m.phone ILIKE $${paramCount})`);
      params.push(`%${search}%`);
      paramCount++;
    }

    // Apply filter on computed balance
    let havingClause = '';
    if (filter === 'compliant') {
      havingClause = `HAVING COALESCE(SUM(py.amount), 0) >= ${MINIMUM_BALANCE}`;
    } else if (filter === 'non-compliant') {
      havingClause = `HAVING COALESCE(SUM(py.amount), 0) < ${MINIMUM_BALANCE}`;
    }

    const whereClause = conditions.join(' AND ');

    // Count query
    const countQuery = `
      SELECT COUNT(*) as count FROM (
        SELECT m.id
        FROM members m
        LEFT JOIN payments_yearly py ON m.id = py.member_id AND py.amount > 0
        WHERE ${whereClause}
        GROUP BY m.id
        ${havingClause}
      ) sub
    `;
    const { rows: countRows } = await query(countQuery, params);
    const count = parseInt(countRows[0].count);

    // Data query with pagination
    const dataParams = [...params, limit, offset];
    const dataQuery = `
      SELECT m.id, m.membership_number, m.full_name, m.phone, m.tribal_section, m.membership_status,
             COALESCE(SUM(py.amount), 0) as balance
      FROM members m
      LEFT JOIN payments_yearly py ON m.id = py.member_id AND py.amount > 0
      WHERE ${whereClause}
      GROUP BY m.id, m.membership_number, m.full_name, m.phone, m.tribal_section, m.membership_status
      ${havingClause}
      ORDER BY m.membership_number ASC
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;

    const { rows: members } = await query(dataQuery, dataParams);

    // Transform data
    const results = members.map(m => ({
      id: m.id,
      member_no: m.membership_number,
      full_name: m.full_name,
      phone: m.phone,
      tribal_section: m.tribal_section,
      balance: parseFloat(m.balance) || 0
    }));

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      data: results,
      pagination: {
        page,
        limit,
        total: count,
        totalPages,
        hasMore: page < totalPages
      }
    });

  } catch (error) {
    log.error('Get paginated members error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب قائمة الأعضاء'
    });
  }
};

export default {
  searchByPhone,
  searchByName,
  searchByMemberId,
  generateStatement,
  getDashboardStatistics,
  getCriticalMembers,
  refreshViews,
  getMemberStatementCounts,
  getPaginatedMembersForStatement
};
