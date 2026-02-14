import { query } from '../services/database.js';
import { log } from '../utils/logger.js';

/**
 * Get monthly payment summary for subscription chart
 * Returns aggregated payment data by month for the last 12 months
 */
export const getMonthlyPaymentSummary = async (req, res) => {
  try {
    // Get payments from the last 12 months grouped by month
    const twelveMonthsAgo = new Date(new Date().setMonth(new Date().getMonth() - 12)).toISOString();

    const { rows: payments } = await query(
      `SELECT amount, payment_date, status FROM payments
       WHERE payment_date >= $1 AND status = 'completed'
       ORDER BY payment_date ASC`,
      [twelveMonthsAgo]
    );

    // Group payments by month
    const monthlyData = {};
    const arabicMonths = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    // Initialize last 12 months with zero
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = {
        month: arabicMonths[date.getMonth()],
        year: date.getFullYear(),
        total: 0,
        count: 0
      };
    }

    // Aggregate actual payments
    if (payments && payments.length > 0) {
      payments.forEach(payment => {
        if (!payment.payment_date) { return; }

        const date = new Date(payment.payment_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (monthlyData[monthKey]) {
          monthlyData[monthKey].total += parseFloat(payment.amount || 0);
          monthlyData[monthKey].count += 1;
        }
      });
    }

    // Convert to array and format for chart
    const result = Object.entries(monthlyData)
      .map(([key, value]) => ({
        monthKey: key,
        label: value.month,
        year: value.year,
        total: Math.round(value.total),
        count: value.count
      }))
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    res.json({
      success: true,
      data: result,
      summary: {
        totalMonths: result.length,
        totalAmount: result.reduce((sum, m) => sum + m.total, 0),
        totalPayments: result.reduce((sum, m) => sum + m.count, 0),
        averagePerMonth: Math.round(result.reduce((sum, m) => sum + m.total, 0) / result.length)
      }
    });

  } catch (error) {
    log.error('Error in getMonthlyPaymentSummary', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب ملخص الدفعات الشهرية'
    });
  }
};

/**
 * Get payment summary by year for members
 * Returns breakdown of payments per year (2021-2025)
 */
export const getYearlyMemberPayments = async (req, res) => {
  try {
    const { rows: members } = await query(
      'SELECT id, membership_number, full_name, payment_2021, payment_2022, payment_2023, payment_2024, payment_2025, total_paid FROM members'
    );

    // Aggregate by year
    const yearlyTotals = {
      2021: members.reduce((sum, m) => sum + (parseFloat(m.payment_2021) || 0), 0),
      2022: members.reduce((sum, m) => sum + (parseFloat(m.payment_2022) || 0), 0),
      2023: members.reduce((sum, m) => sum + (parseFloat(m.payment_2023) || 0), 0),
      2024: members.reduce((sum, m) => sum + (parseFloat(m.payment_2024) || 0), 0),
      2025: members.reduce((sum, m) => sum + (parseFloat(m.payment_2025) || 0), 0)
    };

    const result = Object.entries(yearlyTotals).map(([year, total]) => ({
      year: parseInt(year),
      total: Math.round(total),
      memberCount: members.filter(m => parseFloat(m[`payment_${year}`]) > 0).length
    }));

    res.json({
      success: true,
      data: result,
      summary: {
        totalAllYears: Math.round(Object.values(yearlyTotals).reduce((sum, val) => sum + val, 0)),
        totalMembers: members.length,
        averagePerMember: Math.round(members.reduce((sum, m) => sum + (parseFloat(m.total_paid) || 0), 0) / members.length)
      }
    });

  } catch (error) {
    log.error('Error in getYearlyMemberPayments', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب ملخص الدفعات السنوية'
    });
  }
};

/**
 * Get tribal section payment distribution
 * Returns payment totals grouped by tribal section
 */
export const getTribalSectionPayments = async (req, res) => {
  try {
    const { rows: members } = await query(
      'SELECT tribal_section, total_paid, membership_status FROM members'
    );

    // Group by tribal section
    const sectionData = {};
    members.forEach(member => {
      const section = member.tribal_section || 'غير محدد';
      if (!sectionData[section]) {
        sectionData[section] = {
          totalPaid: 0,
          memberCount: 0,
          activeMembers: 0
        };
      }
      sectionData[section].totalPaid += parseFloat(member.total_paid || 0);
      sectionData[section].memberCount += 1;
      if (member.membership_status === 'active') {
        sectionData[section].activeMembers += 1;
      }
    });

    const result = Object.entries(sectionData)
      .map(([section, data]) => ({
        section,
        totalPaid: Math.round(data.totalPaid),
        memberCount: data.memberCount,
        activeMembers: data.activeMembers,
        averagePerMember: Math.round(data.totalPaid / data.memberCount)
      }))
      .sort((a, b) => b.totalPaid - a.totalPaid);

    res.json({
      success: true,
      data: result,
      summary: {
        totalSections: result.length,
        totalAmount: result.reduce((sum, s) => sum + s.totalPaid, 0),
        highestPayingSection: result[0]?.section || 'N/A',
        highestAmount: result[0]?.totalPaid || 0
      }
    });

  } catch (error) {
    log.error('Error in getTribalSectionPayments', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب ملخص دفعات الأفخاذ'
    });
  }
};
