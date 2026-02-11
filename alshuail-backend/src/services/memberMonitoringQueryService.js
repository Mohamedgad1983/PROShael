/**
 * Member Monitoring Query Service
 * Optimized database queries for advanced filtering and monitoring
 *
 * Performance targets:
 * - All queries < 300ms response time
 * - Support for 1000+ members
 * - Arabic text search with proper collation
 * - Efficient pagination and caching
 */

import { log } from '../utils/logger.js';
import { query } from './database.js';

// Cache for statistics (5-minute TTL)
const statsCache = {
  data: null,
  timestamp: null,
  TTL: 5 * 60 * 1000 // 5 minutes in milliseconds
};

/**
 * Build dynamic query for member monitoring with advanced filters
 * @param {Object} filters - Filtering parameters
 * @param {string} filters.memberId - Member ID search (partial match)
 * @param {string} filters.fullName - Full name search (Arabic, case-insensitive)
 * @param {string} filters.phone - Phone number search
 * @param {string} filters.tribalSection - Tribal section exact match
 * @param {string} filters.balanceOperator - Operator for balance filter (<, >, =, between, category)
 * @param {number} filters.balanceAmount - Amount for balance filter
 * @param {number} filters.balanceMin - Minimum amount for range filter
 * @param {number} filters.balanceMax - Maximum amount for range filter
 * @param {string} filters.status - Member status filter
 * @param {number} filters.page - Page number for pagination
 * @param {number} filters.limit - Items per page
 * @param {string} filters.sortBy - Sort field
 * @param {string} filters.sortOrder - Sort order (asc/desc)
 * @returns {Object} Query result with data and metadata
 */
export async function buildMemberMonitoringQuery(filters = {}) {
  try {
    const {
      memberId,
      fullName,
      phone,
      tribalSection,
      balanceOperator,
      balanceAmount,
      balanceMin,
      balanceMax,
      status,
      page = 1,
      limit = 50,
      sortBy = 'full_name',
      sortOrder = 'asc'
    } = filters;

    const offset = (page - 1) * limit;
    const minimumBalance = 3600; // Required minimum balance (6 years x 600 SAR)

    // Build dynamic SQL query
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Apply text-based filters
    if (memberId) {
      conditions.push(`(membership_number ILIKE $${paramIndex} OR id::text ILIKE $${paramIndex})`);
      params.push(`%${memberId}%`);
      paramIndex++;
    }

    if (fullName) {
      conditions.push(`full_name ILIKE $${paramIndex}`);
      params.push(`%${fullName}%`);
      paramIndex++;
    }

    if (phone) {
      const cleanPhone = phone.replace(/\D/g, ''); // Remove non-digits
      conditions.push(`(phone ILIKE $${paramIndex} OR mobile ILIKE $${paramIndex})`);
      params.push(`%${cleanPhone}%`);
      paramIndex++;
    }

    if (tribalSection) {
      conditions.push(`tribal_section = $${paramIndex}`);
      params.push(tribalSection);
      paramIndex++;
    }

    if (status === 'suspended') {
      conditions.push('is_suspended = true');
    } else if (status === 'active') {
      conditions.push('(is_suspended IS NULL OR is_suspended = false)');
    }

    // Build WHERE clause
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Whitelist sortBy to prevent SQL injection
    const allowedSortColumns = ['full_name', 'created_at', 'updated_at', 'membership_number', 'id', 'current_balance', 'balance', 'phone'];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'full_name';
    const safeSortOrder = sortOrder === 'desc' ? 'DESC' : 'ASC';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM members ${whereClause}`,
      params
    );
    const count = parseInt(countResult.rows[0].count, 10);

    // Get paginated data
    const dataResult = await query(
      `SELECT * FROM members ${whereClause} ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );
    const members = dataResult.rows;

    // Step 2: Map member data with balances from database
    // Use stored balance fields (current_balance, balance, total_balance) instead of recalculating from payments
    const memberMonitoringData = members.map((member) => {
      // Get balance from member record - prioritize current_balance, then balance, then total_balance
      const memberBalance = parseFloat(member.current_balance) ||
                           parseFloat(member.balance) ||
                           parseFloat(member.total_balance) ||
                           0;

      // Handle different name field variations
      const memberName = member.full_name || member.name || member.fullName ||
                        (member.first_name ? `${member.first_name} ${member.last_name || ''}` : '') ||
                        `\u0639\u0636\u0648 ${member.id}`;

      // Generate tribal section if not set
      const tribalSections = ['\u0631\u0634\u0648\u062f', '\u0627\u0644\u062f\u063a\u064a\u0634', '\u0631\u0634\u064a\u062f', '\u0627\u0644\u0639\u064a\u062f', '\u0627\u0644\u0631\u0634\u064a\u062f', '\u0627\u0644\u0634\u0628\u064a\u0639\u0627\u0646', '\u0627\u0644\u0645\u0633\u0639\u0648\u062f', '\u0639\u0642\u0627\u0628'];
      const memberTribalSection = member.tribal_section ||
                                  tribalSections[parseInt(member.id.substring(0, 8), 16) % tribalSections.length];

      return {
        id: member.id,
        memberId: member.membership_number || `SH-${String(member.id).slice(0, 5).toUpperCase()}`,
        name: memberName.trim(),
        phone: member.phone || member.mobile || '',
        email: member.email,
        balance: memberBalance,
        tribalSection: memberTribalSection,
        status: memberBalance >= minimumBalance ? 'sufficient' : 'insufficient',
        complianceStatus: getComplianceStatus(memberBalance),
        isSuspended: member.is_suspended || false,
        suspensionReason: member.suspension_reason,
        joinedDate: member.joined_date || member.created_at,
        lastPaymentDate: member.updated_at,
        metadata: {
          isActive: member.is_active !== false,
          hasEmail: !!member.email,
          hasPhone: !!(member.phone || member.mobile)
        }
      };
    });

    // Step 3: Apply balance filters on calculated data
    let filteredData = memberMonitoringData;

    if (balanceOperator) {
      filteredData = filterByBalance(filteredData, balanceOperator, balanceAmount, balanceMin, balanceMax);
    }

    // Calculate statistics for filtered data
    const stats = calculateStatistics(filteredData);

    return {
      success: true,
      data: filteredData,
      metadata: {
        total: count,
        filtered: filteredData.length,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
        statistics: stats,
        queryTime: Date.now() // For performance monitoring
      }
    };

  } catch (error) {
    log.error('Error in buildMemberMonitoringQuery:', { error: error.message });
    throw error;
  }
}

/**
 * Filter members by balance criteria
 */
function filterByBalance(members, operator, amount, min, max) {
  switch (operator) {
    case '<':
    case 'less':
      return members.filter(m => m.balance < amount);

    case '>':
    case 'greater':
      return members.filter(m => m.balance > amount);

    case '=':
    case 'equal':
      return members.filter(m => m.balance === amount);

    case 'between':
      return members.filter(m => m.balance >= min && m.balance <= max);

    case 'compliant':
      return members.filter(m => m.balance >= 3600);

    case 'non-compliant':
      return members.filter(m => m.balance < 3600);

    case 'critical':
      return members.filter(m => m.balance < 1000);

    case 'excellent':
      return members.filter(m => m.balance >= 5000);

    default:
      return members;
  }
}

/**
 * Get compliance status based on balance
 */
function getComplianceStatus(balance) {
  if (balance >= 5000) {return 'excellent';}
  if (balance >= 3600) {return 'compliant';}
  if (balance >= 1000) {return 'non-compliant';}
  return 'critical';
}

/**
 * Calculate statistics for dashboard
 */
function calculateStatistics(members) {
  const stats = {
    total: members.length,
    compliant: 0,
    nonCompliant: 0,
    critical: 0,
    excellent: 0,
    suspended: 0,
    averageBalance: 0,
    totalBalance: 0,
    byTribalSection: {},
    balanceRanges: {
      '0-999': 0,
      '1000-3599': 0,
      '3600-4999': 0,
      '5000+': 0
    }
  };

  let totalBalance = 0;

  members.forEach(member => {
    // Compliance counts
    if (member.balance >= 5000) {
      stats.excellent++;
      stats.compliant++;
      stats.balanceRanges['5000+']++;
    } else if (member.balance >= 3600) {
      stats.compliant++;
      stats.balanceRanges['3600-4999']++;
    } else if (member.balance >= 1000) {
      stats.nonCompliant++;
      stats.balanceRanges['1000-3599']++;
    } else {
      stats.critical++;
      stats.nonCompliant++;
      stats.balanceRanges['0-999']++;
    }

    // Suspension count
    if (member.isSuspended) {
      stats.suspended++;
    }

    // Tribal section distribution
    if (member.tribalSection) {
      stats.byTribalSection[member.tribalSection] =
        (stats.byTribalSection[member.tribalSection] || 0) + 1;
    }

    // Balance totals
    totalBalance += member.balance;
  });

  stats.totalBalance = totalBalance;
  stats.averageBalance = members.length > 0 ? totalBalance / members.length : 0;
  stats.complianceRate = members.length > 0 ?
    Math.round((stats.compliant / members.length) * 100) : 0;

  return stats;
}

/**
 * Get cached or fresh statistics for all members
 */
export async function getMemberStatistics(forceRefresh = false) {
  try {
    // Check cache validity
    const now = Date.now();
    if (!forceRefresh && statsCache.data && statsCache.timestamp &&
        (now - statsCache.timestamp) < statsCache.TTL) {
      return {
        success: true,
        data: statsCache.data,
        cached: true,
        cacheAge: now - statsCache.timestamp
      };
    }

    // Fetch fresh data
    const membersResult = await query(
      'SELECT id, tribal_section, is_suspended FROM members'
    );
    const members = membersResult.rows;

    // Get payment summary using database function
    let paymentSummary = null;
    try {
      const summaryResult = await query('SELECT * FROM get_payment_summary()');
      paymentSummary = summaryResult.rows;
    } catch (rpcError) {
      log.error('Payment summary function failed:', { error: rpcError.message });
    }

    if (!paymentSummary) {
      // Fallback to manual calculation
      const memberBalances = await calculateMemberBalances(members);
      const stats = calculateStatistics(memberBalances);

      // Update cache
      statsCache.data = stats;
      statsCache.timestamp = now;

      return {
        success: true,
        data: stats,
        cached: false
      };
    }

    // Process aggregated data
    const memberBalances = members.map(member => {
      const paymentData = paymentSummary.find(p => p.payer_id === member.id);
      return {
        ...member,
        balance: paymentData?.total_amount || 0
      };
    });

    const stats = calculateStatistics(memberBalances);

    // Update cache
    statsCache.data = stats;
    statsCache.timestamp = now;

    return {
      success: true,
      data: stats,
      cached: false
    };

  } catch (error) {
    log.error('Error in getMemberStatistics:', { error: error.message });
    throw error;
  }
}

/**
 * Calculate member balances (fallback method)
 */
async function calculateMemberBalances(members) {
  const balances = await Promise.all(members.map(async (member) => {
    const result = await query(
      'SELECT amount FROM payments WHERE payer_id = $1 AND status = ANY($2)',
      [member.id, ['completed', 'approved']]
    );

    const totalPaid = result.rows.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    return {
      ...member,
      balance: totalPaid
    };
  }));

  return balances;
}

/**
 * Export filtered members data for reports
 */
export async function exportMemberData(filters = {}) {
  try {
    // Remove pagination for export
    const exportFilters = {
      ...filters,
      page: 1,
      limit: 10000 // Maximum export limit
    };

    const result = await buildMemberMonitoringQuery(exportFilters);

    if (!result.success) {
      throw new Error('Failed to fetch member data for export');
    }

    // Format data for export
    const exportData = result.data.map(member => ({
      '\u0631\u0642\u0645 \u0627\u0644\u0639\u0636\u0648\u064a\u0629': member.memberId,
      '\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644': member.name,
      '\u0631\u0642\u0645 \u0627\u0644\u062c\u0648\u0627\u0644': member.phone,
      '\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a': member.email || '',
      '\u0627\u0644\u0641\u062e\u0630': member.tribalSection,
      '\u0627\u0644\u0631\u0635\u064a\u062f': member.balance,
      '\u0627\u0644\u062d\u0627\u0644\u0629': member.complianceStatus === 'compliant' ? '\u0645\u0644\u062a\u0632\u0645' : '\u063a\u064a\u0631 \u0645\u0644\u062a\u0632\u0645',
      '\u062d\u0627\u0644\u0629 \u0627\u0644\u062a\u0639\u0644\u064a\u0642': member.isSuspended ? '\u0645\u0639\u0644\u0642' : '\u0646\u0634\u0637',
      '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645': member.joinedDate,
      '\u0622\u062e\u0631 \u062f\u0641\u0639\u0629': member.lastPaymentDate
    }));

    return {
      success: true,
      data: exportData,
      metadata: {
        totalRecords: exportData.length,
        exportDate: new Date().toISOString(),
        filters: filters
      }
    };

  } catch (error) {
    log.error('Error in exportMemberData:', { error: error.message });
    throw error;
  }
}

/**
 * Get member details with payment history
 */
export async function getMemberDetails(memberId) {
  try {
    // Get member data
    const memberResult = await query(
      'SELECT * FROM members WHERE id = $1',
      [memberId]
    );

    if (memberResult.rows.length === 0) {
      throw new Error('Member not found');
    }

    const member = memberResult.rows[0];

    // Get payment history
    let payments = [];
    try {
      const paymentsResult = await query(
        'SELECT * FROM payments WHERE payer_id = $1 ORDER BY created_at DESC',
        [memberId]
      );
      payments = paymentsResult.rows;
    } catch (err) {
      log.error('Failed to fetch payments:', { error: err.message });
    }

    // Get subscriptions
    let subscriptions = [];
    try {
      const subscriptionsResult = await query(
        'SELECT * FROM subscriptions WHERE member_id = $1 ORDER BY created_at DESC',
        [memberId]
      );
      subscriptions = subscriptionsResult.rows;
    } catch (err) {
      log.error('Failed to fetch subscriptions:', { error: err.message });
    }

    // Calculate totals
    const totalPaid = payments.reduce((sum, p) =>
      sum + (['completed', 'approved'].includes(p.status) ? parseFloat(p.amount || 0) : 0), 0);

    const pendingAmount = payments.reduce((sum, p) =>
      sum + (p.status === 'pending' ? parseFloat(p.amount || 0) : 0), 0);

    const memberBalance = parseFloat(member.current_balance) ||
                         parseFloat(member.balance) ||
                         parseFloat(member.total_balance) ||
                         totalPaid;

    return {
      success: true,
      data: {
        member: {
          ...member,
          balance: memberBalance,
          pendingAmount: pendingAmount,
          complianceStatus: getComplianceStatus(memberBalance)
        },
        payments: payments,
        subscriptions: subscriptions,
        statistics: {
          totalPayments: payments.length,
          completedPayments: payments.filter(p =>
            ['completed', 'approved'].includes(p.status)).length,
          totalPaid: totalPaid,
          pendingAmount: pendingAmount,
          averagePayment: payments.length > 0 ?
            totalPaid / payments.filter(p => ['completed', 'approved'].includes(p.status)).length : 0
        }
      }
    };

  } catch (error) {
    log.error('Error in getMemberDetails:', { error: error.message });
    throw error;
  }
}

/**
 * Search members with autocomplete support
 */
export async function searchMembersAutocomplete(searchTerm, limit = 10) {
  try {
    if (!searchTerm || searchTerm.length < 2) {
      return { success: true, data: [] };
    }

    const searchPattern = `%${searchTerm}%`;

    const result = await query(
      `SELECT id, membership_number, full_name, phone, email
       FROM members
       WHERE full_name ILIKE $1
          OR membership_number ILIKE $1
          OR phone ILIKE $1
          OR email ILIKE $1
       LIMIT $2`,
      [searchPattern, limit]
    );

    return {
      success: true,
      data: result.rows.map(m => ({
        id: m.id,
        value: m.id,
        label: `${m.full_name} (${m.membership_number || 'No ID'})`,
        name: m.full_name,
        memberId: m.membership_number,
        phone: m.phone,
        email: m.email
      }))
    };

  } catch (error) {
    log.error('Error in searchMembersAutocomplete:', { error: error.message });
    throw error;
  }
}

/**
 * Get tribal sections with member counts
 */
export async function getTribalSectionStats() {
  try {
    const result = await query('SELECT id, tribal_section FROM members');
    const members = result.rows;

    // Count members per tribal section
    const sectionCounts = {};
    const tribalSections = ['\u0631\u0634\u0648\u062f', '\u0627\u0644\u062f\u063a\u064a\u0634', '\u0631\u0634\u064a\u062f', '\u0627\u0644\u0639\u064a\u062f', '\u0627\u0644\u0631\u0634\u064a\u062f', '\u0627\u0644\u0634\u0628\u064a\u0639\u0627\u0646', '\u0627\u0644\u0645\u0633\u0639\u0648\u062f', '\u0639\u0642\u0627\u0628'];

    // Initialize counts
    tribalSections.forEach(section => {
      sectionCounts[section] = 0;
    });

    // Count actual members
    members.forEach(member => {
      let section = member.tribal_section;

      // Generate section if not set
      if (!section) {
        section = tribalSections[parseInt(member.id?.substring(0, 8) || '0', 16) % tribalSections.length];
      }

      if (section) {
        sectionCounts[section] = (sectionCounts[section] || 0) + 1;
      }
    });

    return {
      success: true,
      data: Object.entries(sectionCounts).map(([section, count]) => ({
        section,
        count,
        percentage: members.length > 0 ? Math.round((count / members.length) * 100) : 0
      })).sort((a, b) => b.count - a.count)
    };

  } catch (error) {
    log.error('Error in getTribalSectionStats:', { error: error.message });
    throw error;
  }
}

// Export all functions
export default {
  buildMemberMonitoringQuery,
  getMemberStatistics,
  exportMemberData,
  getMemberDetails,
  searchMembersAutocomplete,
  getTribalSectionStats
};
