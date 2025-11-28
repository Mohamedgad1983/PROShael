import { supabase } from '../config/database.js';
import { log } from '../utils/logger.js';

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
        .select('*', { count: 'exact' })
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

    log.info('All members fetched for monitoring', {
      totalMembers: allMembers.length
    });

    res.json({
      success: true,
      data: allMembers,
      total: allMembers.length,
      message: `تم جلب جميع ${allMembers.length} عضو`
    });

  } catch (error) {
    log.error('Failed to fetch all members for monitoring', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب بيانات الأعضاء للمراقبة'
    });
  }
};