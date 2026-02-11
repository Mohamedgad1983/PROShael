import { query } from '../services/database.js';
import { log } from '../utils/logger.js';

// Financial calculation constants for 5-year subscription (2021-2025)
const SUBSCRIPTION_CONFIG = {
  ANNUAL_FEE: 600,           // 600 SAR per year
  TOTAL_EXPECTED: 3000,      // 3000 SAR total over 5 years
  START_YEAR: 2021,
  END_YEAR: 2025
};

// Calculate expected payment based on current date
const calculateExpectedPayment = () => {
  const currentYear = new Date().getFullYear();

  // Calculate completed years since 2021
  let yearsPassed = Math.min(5, Math.max(0, currentYear - SUBSCRIPTION_CONFIG.START_YEAR));

  // If we're past the end year, full amount is expected
  if (currentYear > SUBSCRIPTION_CONFIG.END_YEAR) {
    return SUBSCRIPTION_CONFIG.TOTAL_EXPECTED;
  }

  // If we're in a subscription year, count that year too
  if (currentYear >= SUBSCRIPTION_CONFIG.START_YEAR && currentYear <= SUBSCRIPTION_CONFIG.END_YEAR) {
    yearsPassed = currentYear - SUBSCRIPTION_CONFIG.START_YEAR + 1;
  }

  return Math.min(SUBSCRIPTION_CONFIG.TOTAL_EXPECTED, yearsPassed * SUBSCRIPTION_CONFIG.ANNUAL_FEE);
};

// Transform member data to match frontend expected field names with correct financial calculations
const transformMemberForFrontend = (member) => {
  const expectedByNow = calculateExpectedPayment();
  // Check all balance fields: current_balance, balance, total_balance, then total_paid
  const currentPaid = parseFloat(member.current_balance) ||
                     parseFloat(member.balance) ||
                     parseFloat(member.total_balance) ||
                     parseFloat(member.total_paid) || 0;

  // Calculate arrears (what they should have paid minus what they actually paid)
  const arrears = Math.max(0, expectedByNow - currentPaid);

  // Calculate remaining balance to reach full subscription
  const requiredRemaining = Math.max(0, SUBSCRIPTION_CONFIG.TOTAL_EXPECTED - currentPaid);

  // Determine financial status based on payment compliance
  let financialStatus;
  let isDelayed = false;

  if (currentPaid >= expectedByNow) {
    // Fully compliant - paid what's expected by now
    financialStatus = 'compliant';
  } else if (currentPaid >= expectedByNow * 0.8) {
    // Partial - paid at least 80% of expected
    financialStatus = 'partial';
  } else if (currentPaid > 0) {
    // Delayed - paid less than 80% of expected
    financialStatus = 'delayed';
    isDelayed = true;
  } else {
    // No payment at all
    financialStatus = 'critical';
    isDelayed = true;
  }

  return {
    // Original fields (keep for backward compatibility)
    ...member,
    // Mapped fields for frontend
    member_number: member.membership_number || member.id,
    full_name_arabic: member.full_name || '\u063a\u064a\u0631 \u0645\u062d\u062f\u062f',
    phone_number: member.phone || '',
    branch_arabic: member.tribal_section || '\u063a\u064a\u0631 \u0645\u062d\u062f\u062f',
    // Correct financial calculations
    current_balance: currentPaid,
    required_balance: requiredRemaining,
    total_paid: currentPaid,
    arrears: arrears,
    expected_total: SUBSCRIPTION_CONFIG.TOTAL_EXPECTED,
    expected_by_now: expectedByNow,
    // Financial status
    financial_status: financialStatus,
    is_delayed: isDelayed,
    // Status mapping
    membership_status: member.membership_status || member.status || 'unknown'
  };
};

export const getAllMembersForMonitoring = async (req, res) => {
  try {
    log.info('Fetching all members for monitoring dashboard');

    // For monitoring dashboard, we need all members without pagination
    // Fetch in batches if needed
    let allMembers = [];
    let page = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const offset = page * batchSize;

      const { rows: data, rowCount } = await query(
        `SELECT id, membership_number, full_name, full_name_en, phone, email,
                tribal_section, membership_status, status, balance_status,
                current_balance, balance, total_balance, total_paid,
                is_active, created_at, updated_at
         FROM members
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [batchSize, offset]
      );

      if (data && data.length > 0) {
        allMembers = allMembers.concat(data);
        page++;

        // Check if we got all members
        if (data.length < batchSize) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }

      log.info(`Fetched batch ${page}, total so far: ${allMembers.length}`);
    }

    // Transform all members to match frontend expected format
    const transformedMembers = allMembers.map(transformMemberForFrontend);

    // Calculate summary statistics
    const statistics = {
      totalMembers: transformedMembers.length,
      totalArrears: 0,
      delayedCount: 0,
      compliantCount: 0,
      partialCount: 0,
      criticalCount: 0,
      totalPaid: 0,
      totalExpected: 0
    };

    transformedMembers.forEach(member => {
      statistics.totalArrears += member.arrears || 0;
      statistics.totalPaid += member.current_balance || 0;
      statistics.totalExpected += member.expected_by_now || 0;

      switch (member.financial_status) {
        case 'compliant':
          statistics.compliantCount++;
          break;
        case 'partial':
          statistics.partialCount++;
          break;
        case 'delayed':
          statistics.delayedCount++;
          break;
        case 'critical':
          statistics.criticalCount++;
          break;
      }
    });

    log.info('All members fetched and transformed for monitoring', {
      totalMembers: transformedMembers.length,
      totalArrears: statistics.totalArrears,
      delayedCount: statistics.delayedCount
    });

    res.json({
      success: true,
      data: transformedMembers,
      total: transformedMembers.length,
      statistics: statistics,
      subscription_config: SUBSCRIPTION_CONFIG,
      message: `\u062a\u0645 \u062c\u0644\u0628 \u062c\u0645\u064a\u0639 ${transformedMembers.length} \u0639\u0636\u0648`
    });

  } catch (error) {
    log.error('Failed to fetch all members for monitoring', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message || '\u0641\u0634\u0644 \u0641\u064a \u062c\u0644\u0628 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0623\u0639\u0636\u0627\u0621 \u0644\u0644\u0645\u0631\u0627\u0642\u0628\u0629'
    });
  }
};
