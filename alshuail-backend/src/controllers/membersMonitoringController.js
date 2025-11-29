import { supabase } from '../config/database.js';
import { log } from '../utils/logger.js';

// Transform member data to match frontend expected field names
const transformMemberForFrontend = (member) => {
  return {
    // Original fields (keep for backward compatibility)
    ...member,
    // Mapped fields for frontend
    member_number: member.membership_number || member.id,
    full_name_arabic: member.full_name || 'غير محدد',
    phone_number: member.phone || '',
    branch_arabic: member.tribal_section || 'غير محدد',
    financial_status: member.balance_status || 'unknown',
    // Balance fields
    current_balance: parseFloat(member.current_balance) || 0,
    required_balance: parseFloat(member.total_balance) || 0,
    total_paid: parseFloat(member.total_paid) || 0,
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
      const { data, error, count } = await supabase
        .from('members')
        .select('id, membership_number, full_name, full_name_en, phone, email, tribal_section, membership_status, status, balance_status, current_balance, total_balance, total_paid, is_active, created_at, updated_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * batchSize, (page + 1) * batchSize - 1);

      if (error) {
        log.error('Error fetching members batch', { error: error.message, page });
        throw error;
      }

      if (data && data.length > 0) {
        allMembers = allMembers.concat(data);
        page++;

        // Check if we got all members
        if (data.length < batchSize || allMembers.length >= count) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }

      log.info(`Fetched batch ${page}, total so far: ${allMembers.length}`);
    }

    // Transform all members to match frontend expected format
    const transformedMembers = allMembers.map(transformMemberForFrontend);

    log.info('All members fetched and transformed for monitoring', {
      totalMembers: transformedMembers.length
    });

    res.json({
      success: true,
      data: transformedMembers,
      total: transformedMembers.length,
      message: `تم جلب جميع ${transformedMembers.length} عضو`
    });

  } catch (error) {
    log.error('Failed to fetch all members for monitoring', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب بيانات الأعضاء للمراقبة'
    });
  }
};