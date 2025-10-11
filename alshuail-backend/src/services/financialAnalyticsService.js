import { supabase } from '../config/database.js';
import { log } from '../utils/logger.js';

/**
 * Financial Analytics Service
 * Provides comprehensive financial reporting and analytics for the Al-Shuail Dashboard
 */
export class FinancialAnalyticsService {

  /**
   * Get comprehensive payment statistics for a date range
   * @param {Object} dateRange - Date range object with start and end dates
   * @returns {Object} Payment statistics
   */
  static async getPaymentStatistics(dateRange = {}) {
    try {
      const { startDate, endDate } = this.validateDateRange(dateRange);

      // Base query for the date range
      let query = supabase
        .from('payments')
        .select('*');

      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data: payments, error } = await query;
      if (error) {throw error;}

      // Calculate statistics
      const stats = {
        totalPayments: payments.length,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        failedAmount: 0,
        cancelledAmount: 0,
        refundedAmount: 0,
        statusBreakdown: {
          paid: 0,
          pending: 0,
          failed: 0,
          cancelled: 0,
          refunded: 0
        },
        categoryBreakdown: {},
        methodBreakdown: {},
        dailyStats: {},
        averagePayment: 0,
        successRate: 0
      };

      payments.forEach(payment => {
        const amount = parseFloat(payment.amount) || 0;
        stats.totalAmount += amount;

        // Status breakdown
        const status = payment.status || 'unknown';
        stats.statusBreakdown[status] = (stats.statusBreakdown[status] || 0) + 1;

        // Amount by status
        switch (status) {
          case 'paid':
            stats.paidAmount += amount;
            break;
          case 'pending':
            stats.pendingAmount += amount;
            break;
          case 'failed':
            stats.failedAmount += amount;
            break;
          case 'cancelled':
            stats.cancelledAmount += amount;
            break;
          case 'refunded':
            stats.refundedAmount += amount;
            break;
        }

        // Category breakdown
        const category = payment.category || 'other';
        if (!stats.categoryBreakdown[category]) {
          stats.categoryBreakdown[category] = { count: 0, amount: 0 };
        }
        stats.categoryBreakdown[category].count += 1;
        stats.categoryBreakdown[category].amount += amount;

        // Payment method breakdown
        if (payment.payment_method) {
          const method = payment.payment_method;
          if (!stats.methodBreakdown[method]) {
            stats.methodBreakdown[method] = { count: 0, amount: 0 };
          }
          stats.methodBreakdown[method].count += 1;
          stats.methodBreakdown[method].amount += amount;
        }

        // Daily stats
        const date = payment.created_at ? payment.created_at.split('T')[0] : 'unknown';
        if (!stats.dailyStats[date]) {
          stats.dailyStats[date] = { count: 0, amount: 0 };
        }
        stats.dailyStats[date].count += 1;
        stats.dailyStats[date].amount += amount;
      });

      // Calculate derived metrics
      stats.averagePayment = stats.totalPayments > 0 ? stats.totalAmount / stats.totalPayments : 0;
      stats.successRate = stats.totalPayments > 0 ? (stats.statusBreakdown.paid / stats.totalPayments) * 100 : 0;

      return {
        success: true,
        data: stats,
        period: { startDate, endDate }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || 'فشل في جلب إحصائيات المدفوعات'
      };
    }
  }

  /**
   * Calculate total revenue for a specific period
   * @param {string} period - Period type ('today', 'week', 'month', 'quarter', 'year')
   * @returns {Object} Revenue data
   */
  static async calculateTotalRevenue(period = 'month') {
    try {
      const dateRange = this.getPeriodDateRange(period);
      const { startDate, endDate } = dateRange;

      // Get paid payments for the period
      const { data: payments, error } = await supabase
        .from('payments')
        .select('amount, created_at, category')
        .eq('status', 'paid')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (error) {throw error;}

      const revenue = {
        period,
        totalRevenue: 0,
        paymentCount: payments.length,
        categoryRevenue: {},
        dailyRevenue: {},
        averageTransaction: 0,
        comparisonWithPrevious: null
      };

      // Calculate revenue by category and daily breakdown
      payments.forEach(payment => {
        const amount = parseFloat(payment.amount) || 0;
        revenue.totalRevenue += amount;

        // Category breakdown
        const category = payment.category || 'other';
        revenue.categoryRevenue[category] = (revenue.categoryRevenue[category] || 0) + amount;

        // Daily breakdown
        const date = payment.created_at.split('T')[0];
        revenue.dailyRevenue[date] = (revenue.dailyRevenue[date] || 0) + amount;
      });

      // Calculate average
      revenue.averageTransaction = revenue.paymentCount > 0 ? revenue.totalRevenue / revenue.paymentCount : 0;

      // Get previous period for comparison
      const previousPeriodRange = this.getPreviousPeriodDateRange(period);
      const { data: previousPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'paid')
        .gte('created_at', previousPeriodRange.startDate)
        .lte('created_at', previousPeriodRange.endDate);

      if (previousPayments) {
        const previousRevenue = previousPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const changeAmount = revenue.totalRevenue - previousRevenue;
        const changePercentage = previousRevenue > 0 ? (changeAmount / previousRevenue) * 100 : 0;

        revenue.comparisonWithPrevious = {
          previousRevenue,
          changeAmount,
          changePercentage,
          trend: changeAmount > 0 ? 'up' : changeAmount < 0 ? 'down' : 'stable'
        };
      }

      return {
        success: true,
        data: revenue
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || 'فشل في حساب إجمالي الإيرادات'
      };
    }
  }

  /**
   * Get payments breakdown by category
   * @returns {Object} Category breakdown
   */
  static async getPaymentsByCategory() {
    try {
      const { data: payments, error } = await supabase
        .from('payments')
        .select('category, amount, status, created_at');

      if (error) {throw error;}

      const categories = {};

      payments.forEach(payment => {
        const category = payment.category || 'other';
        if (!categories[category]) {
          categories[category] = {
            name: category,
            totalCount: 0,
            totalAmount: 0,
            paidCount: 0,
            paidAmount: 0,
            pendingCount: 0,
            pendingAmount: 0,
            percentage: 0
          };
        }

        const amount = parseFloat(payment.amount) || 0;
        categories[category].totalCount += 1;
        categories[category].totalAmount += amount;

        if (payment.status === 'paid') {
          categories[category].paidCount += 1;
          categories[category].paidAmount += amount;
        } else if (payment.status === 'pending') {
          categories[category].pendingCount += 1;
          categories[category].pendingAmount += amount;
        }
      });

      // Calculate percentages
      const totalAmount = Object.values(categories).reduce((sum, cat) => sum + cat.totalAmount, 0);
      Object.values(categories).forEach(category => {
        category.percentage = totalAmount > 0 ? (category.totalAmount / totalAmount) * 100 : 0;
      });

      // Sort by total amount
      const sortedCategories = Object.values(categories).sort((a, b) => b.totalAmount - a.totalAmount);

      return {
        success: true,
        data: {
          categories: sortedCategories,
          summary: {
            totalCategories: sortedCategories.length,
            totalAmount,
            totalCount: payments.length
          }
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || 'فشل في جلب تصنيف المدفوعات'
      };
    }
  }

  /**
   * Get member contribution statistics
   * @returns {Object} Member contributions
   */
  static async getMemberContributions() {
    try {
      const { data: payments, error } = await supabase
        .from('payments')
        .select(`
          amount,
          status,
          category,
          created_at,
          payer:members(id, full_name, membership_number)
        `)
        .eq('status', 'paid');

      if (error) {throw error;}

      const memberStats = {};

      payments.forEach(payment => {
        if (!payment.payer) {return;}

        const memberId = payment.payer.id;
        if (!memberStats[memberId]) {
          memberStats[memberId] = {
            member: payment.payer,
            totalAmount: 0,
            paymentCount: 0,
            categories: {},
            lastPayment: null,
            averagePayment: 0
          };
        }

        const amount = parseFloat(payment.amount) || 0;
        memberStats[memberId].totalAmount += amount;
        memberStats[memberId].paymentCount += 1;

        // Category breakdown
        const category = payment.category || 'other';
        memberStats[memberId].categories[category] = (memberStats[memberId].categories[category] || 0) + amount;

        // Track last payment
        if (!memberStats[memberId].lastPayment || payment.created_at > memberStats[memberId].lastPayment) {
          memberStats[memberId].lastPayment = payment.created_at;
        }
      });

      // Calculate averages and sort
      const sortedMembers = Object.values(memberStats)
        .map(member => ({
          ...member,
          averagePayment: member.paymentCount > 0 ? member.totalAmount / member.paymentCount : 0
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount);

      // Get top contributors
      const topContributors = sortedMembers.slice(0, 10);
      const totalContributions = sortedMembers.reduce((sum, member) => sum + member.totalAmount, 0);

      return {
        success: true,
        data: {
          topContributors,
          totalMembers: sortedMembers.length,
          totalContributions,
          averageContribution: sortedMembers.length > 0 ? totalContributions / sortedMembers.length : 0,
          allMembers: sortedMembers
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || 'فشل في جلب إحصائيات مساهمات الأعضاء'
      };
    }
  }

  /**
   * Get overdue payments
   * @returns {Object} Overdue payments data
   */
  static async getOverduePayments() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: overduePayments, error } = await supabase
        .from('payments')
        .select(`
          *,
          payer:members(id, full_name, phone, email, membership_number)
        `)
        .eq('status', 'pending')
        .lt('created_at', thirtyDaysAgo.toISOString());

      if (error) {throw error;}

      const overdueSummary = {
        count: overduePayments.length,
        totalAmount: 0,
        categoryBreakdown: {},
        memberBreakdown: {},
        ageBreakdown: {
          '30-60days': { count: 0, amount: 0 },
          '60-90days': { count: 0, amount: 0 },
          '90+days': { count: 0, amount: 0 }
        }
      };

      const now = new Date();

      overduePayments.forEach(payment => {
        const amount = parseFloat(payment.amount) || 0;
        overdueSummary.totalAmount += amount;

        // Category breakdown
        const category = payment.category || 'other';
        if (!overdueSummary.categoryBreakdown[category]) {
          overdueSummary.categoryBreakdown[category] = { count: 0, amount: 0 };
        }
        overdueSummary.categoryBreakdown[category].count += 1;
        overdueSummary.categoryBreakdown[category].amount += amount;

        // Member breakdown
        if (payment.payer) {
          const memberId = payment.payer.id;
          if (!overdueSummary.memberBreakdown[memberId]) {
            overdueSummary.memberBreakdown[memberId] = {
              member: payment.payer,
              count: 0,
              amount: 0
            };
          }
          overdueSummary.memberBreakdown[memberId].count += 1;
          overdueSummary.memberBreakdown[memberId].amount += amount;
        }

        // Age breakdown
        const createdDate = new Date(payment.created_at);
        const daysDiff = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));

        if (daysDiff >= 30 && daysDiff < 60) {
          overdueSummary.ageBreakdown['30-60days'].count += 1;
          overdueSummary.ageBreakdown['30-60days'].amount += amount;
        } else if (daysDiff >= 60 && daysDiff < 90) {
          overdueSummary.ageBreakdown['60-90days'].count += 1;
          overdueSummary.ageBreakdown['60-90days'].amount += amount;
        } else if (daysDiff >= 90) {
          overdueSummary.ageBreakdown['90+days'].count += 1;
          overdueSummary.ageBreakdown['90+days'].amount += amount;
        }
      });

      return {
        success: true,
        data: {
          overduePayments,
          summary: overdueSummary
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || 'فشل في جلب المدفوعات المتأخرة'
      };
    }
  }

  /**
   * Generate comprehensive financial report
   * @param {Object} options - Report options
   * @returns {Object} Financial report
   */
  static async generateFinancialReport(options = {}) {
    try {
      const {
        period = 'month',
        includeCharts: _includeCharts = true,
        includeMemberStats = true,
        includeOverdue = true
      } = options;

      const report = {
        generatedAt: new Date().toISOString(),
        period,
        summary: {},
        revenue: {},
        categories: {},
        memberStats: {},
        overduePayments: {},
        trends: {}
      };

      // Get period statistics
      const statsResult = await this.getPaymentStatistics(this.getPeriodDateRange(period));
      if (statsResult.success) {
        report.summary = statsResult.data;
      }

      // Get revenue data
      const revenueResult = await this.calculateTotalRevenue(period);
      if (revenueResult.success) {
        report.revenue = revenueResult.data;
      }

      // Get category breakdown
      const categoriesResult = await this.getPaymentsByCategory();
      if (categoriesResult.success) {
        report.categories = categoriesResult.data;
      }

      // Get member contributions if requested
      if (includeMemberStats) {
        const memberResult = await this.getMemberContributions();
        if (memberResult.success) {
          report.memberStats = memberResult.data;
        }
      }

      // Get overdue payments if requested
      if (includeOverdue) {
        const overdueResult = await this.getOverduePayments();
        if (overdueResult.success) {
          report.overduePayments = overdueResult.data;
        }
      }

      // Calculate trends
      report.trends = await this.calculateTrends(period);

      return {
        success: true,
        data: report
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || 'فشل في إنشاء التقرير المالي'
      };
    }
  }

  /**
   * Calculate financial trends
   * @param {string} period - Period for trend analysis
   * @returns {Object} Trend data
   */
  static async calculateTrends(period) {
    try {
      const trends = {
        revenueGrowth: 0,
        paymentVolumeGrowth: 0,
        averagePaymentTrend: 0,
        categoryTrends: {},
        monthlyGrowth: []
      };

      // Get current and previous period data
      const currentPeriod = this.getPeriodDateRange(period);
      const previousPeriod = this.getPreviousPeriodDateRange(period);

      const [currentData, previousData] = await Promise.all([
        this.getPaymentStatistics(currentPeriod),
        this.getPaymentStatistics(previousPeriod)
      ]);

      if (currentData.success && previousData.success) {
        const current = currentData.data;
        const previous = previousData.data;

        // Revenue growth
        trends.revenueGrowth = previous.paidAmount > 0 ?
          ((current.paidAmount - previous.paidAmount) / previous.paidAmount) * 100 : 0;

        // Payment volume growth
        trends.paymentVolumeGrowth = previous.totalPayments > 0 ?
          ((current.totalPayments - previous.totalPayments) / previous.totalPayments) * 100 : 0;

        // Average payment trend
        trends.averagePaymentTrend = previous.averagePayment > 0 ?
          ((current.averagePayment - previous.averagePayment) / previous.averagePayment) * 100 : 0;

        // Category trends
        Object.keys(current.categoryBreakdown).forEach(category => {
          const currentAmount = current.categoryBreakdown[category]?.amount || 0;
          const previousAmount = previous.categoryBreakdown[category]?.amount || 0;

          trends.categoryTrends[category] = previousAmount > 0 ?
            ((currentAmount - previousAmount) / previousAmount) * 100 : 0;
        });
      }

      return trends;
    } catch (error) {
      log.error('Error calculating trends:', { error: error.message });
      return {};
    }
  }

  /**
   * Validate and normalize date range
   * @param {Object} dateRange - Date range object
   * @returns {Object} Validated date range
   */
  static validateDateRange(dateRange) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      startDate: dateRange.startDate || startOfMonth.toISOString(),
      endDate: dateRange.endDate || now.toISOString()
    };
  }

  /**
   * Get date range for a specific period
   * @param {string} period - Period type
   * @returns {Object} Date range
   */
  static getPeriodDateRange(period) {
    const now = new Date();
    let startDate;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter': {
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        break;
      }
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return {
      startDate: startDate.toISOString(),
      endDate: now.toISOString()
    };
  }

  /**
   * Get previous period date range for comparison
   * @param {string} period - Period type
   * @returns {Object} Previous period date range
   */
  static getPreviousPeriodDateRange(period) {
    const currentRange = this.getPeriodDateRange(period);
    const currentStart = new Date(currentRange.startDate);
    const currentEnd = new Date(currentRange.endDate);
    const periodLength = currentEnd.getTime() - currentStart.getTime();

    return {
      startDate: new Date(currentStart.getTime() - periodLength).toISOString(),
      endDate: currentStart.toISOString()
    };
  }
}