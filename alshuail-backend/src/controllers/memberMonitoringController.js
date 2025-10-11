import { supabase } from '../config/database.js';
import _ExcelJS from 'exceljs'; // Prefixed with _ as currently unused (reserved for future Excel generation)
import { log } from '../utils/logger.js';

// All 8 tribal sections in the Al-Shuail family
const TRIBAL_SECTIONS = [
  'رشود',      // Rashoud
  'الدغيش',    // Al-Dughaish
  'رشيد',      // Rasheed
  'العيد',     // Al-Eid
  'الرشيد',    // Al-Rasheed
  'الشبيعان',  // Al-Shabiaan
  'المسعود',   // Al-Masoud
  'عقاب'       // Uqab
];

// Balance categories for quick filtering
const BALANCE_CATEGORIES = {
  excellent: { min: 5000, max: null },      // 5000+ SAR
  compliant: { min: 3000, max: 4999 },     // 3000-4999 SAR (meets minimum)
  nonCompliant: { min: 1000, max: 2999 },  // 1000-2999 SAR (below minimum)
  critical: { min: 0, max: 999 }           // 0-999 SAR (critically low)
};

/**
 * Get member monitoring dashboard data with comprehensive filtering
 * Supports all required query parameters for the frontend dashboard
 */
export const getMemberMonitoring = async (req, res) => {
  try {
    const minimumBalance = 3000; // Required minimum balance

    // Extract query parameters with defaults
    const {
      page = 1,
      limit = 10,
      memberId,           // Search by membership number (e.g., SH-10001)
      fullName,           // Search by Arabic name
      phoneNumber,        // Search by phone number
      tribalSection,      // Filter by tribal section (الفخذ)
      balanceOperator,    // Comparison operator: lt, gt, eq, lte, gte
      balanceAmount,      // Amount to compare against
      balanceMin,         // Minimum balance for range filter
      balanceMax,         // Maximum balance for range filter
      balanceCategory,    // Quick filter: compliant, nonCompliant, critical, excellent
      status,             // Member status: active, suspended
      sortBy = 'balance', // Sort field
      sortOrder = 'desc'  // Sort direction
    } = req.query;

    // Build base query for members
    let membersQuery = supabase
      .from('members')
      .select('*', { count: 'exact' });

    // Apply status filter if provided
    if (status) {
      if (status === 'suspended') {
        membersQuery = membersQuery.eq('is_suspended', true);
      } else if (status === 'active') {
        membersQuery = membersQuery.or('is_suspended.eq.false,is_suspended.is.null');
      }
    }

    // Apply member ID filter (membership number)
    if (memberId) {
      membersQuery = membersQuery.or(`membership_number.ilike.%${memberId}%,id.ilike.%${memberId}%`);
    }

    // Apply full name filter (supports Arabic)
    if (fullName) {
      membersQuery = membersQuery.or(
        `full_name.ilike.%${fullName}%,name.ilike.%${fullName}%,first_name.ilike.%${fullName}%,last_name.ilike.%${fullName}%`
      );
    }

    // Apply phone number filter
    if (phoneNumber) {
      const cleanPhone = phoneNumber.replace(/\D/g, ''); // Remove non-digits
      membersQuery = membersQuery.or(`phone.ilike.%${cleanPhone}%,mobile.ilike.%${cleanPhone}%`);
    }

    // Apply tribal section filter
    if (tribalSection && TRIBAL_SECTIONS.includes(tribalSection)) {
      membersQuery = membersQuery.eq('tribal_section', tribalSection);
    }

    // Get all members first (we need to calculate balances)
    const { data: allMembers, error: membersError, count: _totalCount } = await membersQuery;

    if (membersError) {
      log.error('Error fetching members', { error: membersError.message });
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch members',
        message: membersError.message
      });
    }

    // Calculate balances and prepare member data
    const membersWithBalances = (allMembers || []).map((member) => {
      // Get total paid from member record (imported data stored directly in member)
      const totalPaid = parseFloat(member.total_paid || 0);

      // Handle different name field variations
      const memberName = member.full_name || member.name || member.fullName ||
                       (member.first_name ? `${member.first_name} ${member.last_name || ''}` : '') ||
                       `عضو ${member.id}`;

      // Assign or get tribal section
      let tribalSectionValue = member.tribal_section;
      if (!tribalSectionValue) {
        // Generate deterministic tribal section based on member ID
        const hashCode = member.id.split('').reduce((acc, char) => {
          return char.charCodeAt(0) + ((acc << 5) - acc);
        }, 0);
        tribalSectionValue = TRIBAL_SECTIONS[Math.abs(hashCode) % TRIBAL_SECTIONS.length];
      }

      // Calculate shortfall
      const shortfall = Math.max(0, minimumBalance - totalPaid);

      // Determine compliance status
      let complianceStatus = 'nonCompliant';
      if (totalPaid >= 5000) {complianceStatus = 'excellent';}
      else if (totalPaid >= minimumBalance) {complianceStatus = 'compliant';}
      else if (totalPaid < 1000) {complianceStatus = 'critical';}

      return {
        id: member.id,
        memberId: member.membership_number || `SH-${String(10000 + Math.abs(member.id.charCodeAt(0) * 100 + member.id.charCodeAt(1)))}`,
        fullName: memberName.trim(),
        phone: member.phone || member.mobile || '',
        email: member.email || '',
        balance: totalPaid,
        minimumBalance: minimumBalance,
        shortfall: shortfall,
        percentageComplete: Math.min(100, (totalPaid / minimumBalance) * 100),
        tribalSection: tribalSectionValue,
        status: member.is_suspended ? 'suspended' : 'active',
        complianceStatus: complianceStatus,
        membershipStatus: member.membership_status || 'active',
        joinedDate: member.joined_date || member.created_at,
        lastPaymentDate: member.updated_at,
        isSuspended: member.is_suspended || false,
        suspensionReason: member.suspension_reason,
        suspendedAt: member.suspended_at
      };
    });

    // Apply balance filters on calculated data
    let filteredMembers = membersWithBalances;

    // Apply balance category filter
    if (balanceCategory && BALANCE_CATEGORIES[balanceCategory]) {
      const category = BALANCE_CATEGORIES[balanceCategory];
      filteredMembers = filteredMembers.filter(m => {
        if (category.min !== null && m.balance < category.min) {return false;}
        if (category.max !== null && m.balance > category.max) {return false;}
        return true;
      });
    }

    // Apply balance operator filter
    if (balanceOperator && balanceAmount !== undefined) {
      const amount = parseFloat(balanceAmount);
      filteredMembers = filteredMembers.filter(m => {
        switch (balanceOperator) {
          case 'lt': return m.balance < amount;
          case 'lte': return m.balance <= amount;
          case 'gt': return m.balance > amount;
          case 'gte': return m.balance >= amount;
          case 'eq': return m.balance === amount;
          default: return true;
        }
      });
    }

    // Apply balance range filter
    if (balanceMin !== undefined || balanceMax !== undefined) {
      filteredMembers = filteredMembers.filter(m => {
        if (balanceMin !== undefined && m.balance < parseFloat(balanceMin)) {return false;}
        if (balanceMax !== undefined && m.balance > parseFloat(balanceMax)) {return false;}
        return true;
      });
    }

    // Apply sorting
    filteredMembers.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'balance':
          aVal = a.balance;
          bVal = b.balance;
          break;
        case 'fullName':
          aVal = a.fullName;
          bVal = b.fullName;
          break;
        case 'memberId':
          aVal = a.memberId;
          bVal = b.memberId;
          break;
        case 'shortfall':
          aVal = a.shortfall;
          bVal = b.shortfall;
          break;
        case 'tribalSection':
          aVal = a.tribalSection;
          bVal = b.tribalSection;
          break;
        default:
          aVal = a.balance;
          bVal = b.balance;
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    // Calculate statistics
    const totalMembers = filteredMembers.length;
    const compliantMembers = filteredMembers.filter(m => m.balance >= minimumBalance).length;
    const nonCompliantMembers = totalMembers - compliantMembers;
    const criticalMembers = filteredMembers.filter(m => m.balance < 1000).length;
    const excellentMembers = filteredMembers.filter(m => m.balance >= 5000).length;
    const totalBalance = filteredMembers.reduce((sum, m) => sum + m.balance, 0);
    const totalShortfall = filteredMembers.reduce((sum, m) => sum + m.shortfall, 0);
    const averageBalance = totalMembers > 0 ? totalBalance / totalMembers : 0;
    const complianceRate = totalMembers > 0 ? (compliantMembers / totalMembers) * 100 : 0;

    // Apply pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginatedMembers = filteredMembers.slice(offset, offset + parseInt(limit));
    const totalPages = Math.ceil(totalMembers / parseInt(limit));

    // Prepare response
    const response = {
      success: true,
      data: {
        members: paginatedMembers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalMembers,
          totalPages: totalPages,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        },
        statistics: {
          total: totalMembers,
          compliant: compliantMembers,
          nonCompliant: nonCompliantMembers,
          critical: criticalMembers,
          excellent: excellentMembers,
          averageBalance: Math.round(averageBalance),
          totalBalance: Math.round(totalBalance),
          totalShortfall: Math.round(totalShortfall),
          complianceRate: complianceRate.toFixed(1),
          minimumBalance: minimumBalance
        },
        filters: {
          tribalSections: TRIBAL_SECTIONS,
          balanceCategories: Object.keys(BALANCE_CATEGORIES),
          appliedFilters: {
            memberId,
            fullName,
            phoneNumber,
            tribalSection,
            balanceOperator,
            balanceAmount,
            balanceMin,
            balanceMax,
            balanceCategory,
            status
          }
        }
      }
    };

    // Set proper headers for Arabic text
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json(response);

  } catch (error) {
    log.error('Error in getMemberMonitoring', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * Suspend a member (إيقاف عضو)
 * Only super_admin and finance_manager can suspend members
 */
export const suspendMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user?.id || 'system';

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'يجب تقديم سبب الإيقاف'
      });
    }

    // Update member status
    const { data: updatedMember, error: _updateError } = await supabase
      .from('members')
      .update({
        is_suspended: true,
        suspension_reason: reason,
        suspended_at: new Date().toISOString(),
        suspended_by: adminId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (_updateError) {
      log.error('Error suspending member', { error: _updateError.message });
      return res.status(500).json({
        success: false,
        error: 'فشل إيقاف العضو',
        message: _updateError.message
      });
    }

    // Log the action in audit_logs table
    await supabase
      .from('audit_logs')
      .insert({
        user_id: adminId,
        action: 'MEMBER_SUSPENDED',
        module: 'members',
        details: {
          member_id: id,
          member_name: updatedMember.full_name || updatedMember.name,
          membership_number: updatedMember.membership_number,
          reason: reason,
          timestamp: new Date().toISOString()
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

    res.json({
      success: true,
      message: 'تم إيقاف العضو بنجاح',
      data: {
        member: updatedMember,
        suspensionDetails: {
          reason: reason,
          suspendedBy: adminId,
          suspendedAt: updatedMember.suspended_at
        }
      }
    });

  } catch (error) {
    log.error('Error in suspendMember', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'خطأ في النظام',
      message: error.message
    });
  }
};

/**
 * Send notification to member (إرسال إشعار)
 * Supports multiple notification channels: SMS, Email, In-app
 */
export const notifyMember = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      type = 'payment_reminder',  // payment_reminder, general, urgent
      channel = 'sms',            // sms, email, in_app, all
      message,
      subject
    } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'يجب تقديم نص الرسالة'
      });
    }

    // Get member details
    const { data: member, error: _memberError } = await supabase
      .from('members')
      .select('*')
      .eq('id', id)
      .single();

    if (_memberError || !member) {
      return res.status(404).json({
        success: false,
        error: 'العضو غير موجود'
      });
    }

    const notifications = [];

    // Create in-app notification (always created)
    const { data: notification, error: _notifError } = await supabase
      .from('notifications')
      .insert({
        member_id: id,
        type: type,
        title: subject || (type === 'payment_reminder' ? 'تذكير بالدفع' : 'إشعار من الإدارة'),
        message: message,
        priority: type === 'urgent' ? 'high' : 'normal',
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (notification) {
      notifications.push({ channel: 'in_app', status: 'created', id: notification.id });
    }

    // Send SMS if requested
    if ((channel === 'sms' || channel === 'all') && (member.phone || member.mobile)) {
      const phoneNumber = member.phone || member.mobile;

      const { data: smsRecord, error: _smsError } = await supabase
        .from('sms_queue')
        .insert({
          phone_number: phoneNumber,
          message: message,
          status: 'pending',
          member_id: id,
          notification_id: notification?.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (smsRecord) {
        notifications.push({ channel: 'sms', status: 'queued', id: smsRecord.id });
      }
    }

    // Send Email if requested
    if ((channel === 'email' || channel === 'all') && member.email) {
      const { data: emailRecord, error: _emailError } = await supabase
        .from('email_queue')
        .insert({
          to_email: member.email,
          subject: subject || 'إشعار من صندوق الشعيل',
          body: message,
          status: 'pending',
          member_id: id,
          notification_id: notification?.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (emailRecord) {
        notifications.push({ channel: 'email', status: 'queued', id: emailRecord.id });
      }
    }

    // Log the action
    await supabase
      .from('audit_logs')
      .insert({
        user_id: req.user?.id || 'system',
        action: 'NOTIFICATION_SENT',
        module: 'notifications',
        details: {
          member_id: id,
          member_name: member.full_name || member.name,
          membership_number: member.membership_number,
          notification_type: type,
          channels: notifications.map(n => n.channel),
          message_preview: message.substring(0, 100)
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

    res.json({
      success: true,
      message: 'تم إرسال الإشعار بنجاح',
      data: {
        member: {
          id: member.id,
          name: member.full_name || member.name,
          membershipNumber: member.membership_number
        },
        notifications: notifications,
        summary: {
          totalSent: notifications.length,
          channels: notifications.map(n => n.channel)
        }
      }
    });

  } catch (error) {
    log.error('Error in notifyMember', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'خطأ في إرسال الإشعار',
      message: error.message
    });
  }
};

/**
 * Export member data to Excel format
 * Returns JSON data that can be converted to Excel by the frontend
 */
export const exportMembers = async (req, res) => {
  try {
    // First get the filtered data using the same logic as getMemberMonitoring
    const _monitoringReq = { ...req, query: { ...req.query, limit: 10000 } }; // Get all records (future use)

    // Reuse the getMemberMonitoring logic to get filtered data
    const minimumBalance = 3000;

    // Extract same query parameters
    const {
      memberId,
      fullName,
      phoneNumber,
      tribalSection,
      balanceOperator,
      balanceAmount,
      balanceMin,
      balanceMax,
      balanceCategory,
      status
    } = req.query;

    // Build base query for members
    let membersQuery = supabase
      .from('members')
      .select('*');

    // Apply same filters as getMemberMonitoring
    if (status) {
      if (status === 'suspended') {
        membersQuery = membersQuery.eq('is_suspended', true);
      } else if (status === 'active') {
        membersQuery = membersQuery.or('is_suspended.eq.false,is_suspended.is.null');
      }
    }

    if (memberId) {
      membersQuery = membersQuery.or(`membership_number.ilike.%${memberId}%,id.ilike.%${memberId}%`);
    }

    if (fullName) {
      membersQuery = membersQuery.or(
        `full_name.ilike.%${fullName}%,name.ilike.%${fullName}%,first_name.ilike.%${fullName}%,last_name.ilike.%${fullName}%`
      );
    }

    if (phoneNumber) {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      membersQuery = membersQuery.or(`phone.ilike.%${cleanPhone}%,mobile.ilike.%${cleanPhone}%`);
    }

    if (tribalSection && TRIBAL_SECTIONS.includes(tribalSection)) {
      membersQuery = membersQuery.eq('tribal_section', tribalSection);
    }

    const { data: allMembers, error: _membersError } = await membersQuery;

    if (_membersError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch members for export',
        message: _membersError.message
      });
    }

    // Calculate balances and prepare export data
    const exportData = (allMembers || []).map((member) => {
      // Get total paid from member record (imported data stored directly in member)
      const totalPaid = parseFloat(member.total_paid || 0);

      const memberName = member.full_name || member.name || member.fullName ||
                       (member.first_name ? `${member.first_name} ${member.last_name || ''}` : '') ||
                       `عضو ${member.id}`;

      let tribalSectionValue = member.tribal_section;
      if (!tribalSectionValue) {
        const hashCode = member.id.split('').reduce((acc, char) => {
          return char.charCodeAt(0) + ((acc << 5) - acc);
        }, 0);
        tribalSectionValue = TRIBAL_SECTIONS[Math.abs(hashCode) % TRIBAL_SECTIONS.length];
      }

      const shortfall = Math.max(0, minimumBalance - totalPaid);
      let complianceStatus = 'غير ملتزم';
      if (totalPaid >= 5000) {complianceStatus = 'ممتاز';}
      else if (totalPaid >= minimumBalance) {complianceStatus = 'ملتزم';}
      else if (totalPaid < 1000) {complianceStatus = 'حرج';}

      return {
        'رقم العضوية': member.membership_number || `SH-${String(10000 + Math.abs(member.id.charCodeAt(0) * 100 + member.id.charCodeAt(1)))}`,
        'الاسم الكامل': memberName.trim(),
        'رقم الجوال': member.phone || member.mobile || '',
        'البريد الإلكتروني': member.email || '',
        'الفخذ': tribalSectionValue,
        'الرصيد الحالي': totalPaid,
        'الحد الأدنى': minimumBalance,
        'المبلغ المتبقي': shortfall,
        'نسبة الإنجاز': `${Math.round((totalPaid / minimumBalance) * 100)  }%`,
        'حالة الالتزام': complianceStatus,
        'حالة العضوية': member.is_suspended ? 'موقوف' : 'نشط',
        'تاريخ الانضمام': member.joined_date || member.created_at,
        'آخر دفعة': member.updated_at
      };
    });

    // Apply balance filters on export data
    let filteredExportData = exportData;

    if (balanceCategory && BALANCE_CATEGORIES[balanceCategory]) {
      const category = BALANCE_CATEGORIES[balanceCategory];
      filteredExportData = filteredExportData.filter(m => {
        const balance = m['الرصيد الحالي'];
        if (category.min !== null && balance < category.min) {return false;}
        if (category.max !== null && balance > category.max) {return false;}
        return true;
      });
    }

    if (balanceOperator && balanceAmount !== undefined) {
      const amount = parseFloat(balanceAmount);
      filteredExportData = filteredExportData.filter(m => {
        const balance = m['الرصيد الحالي'];
        switch (balanceOperator) {
          case 'lt': return balance < amount;
          case 'lte': return balance <= amount;
          case 'gt': return balance > amount;
          case 'gte': return balance >= amount;
          case 'eq': return balance === amount;
          default: return true;
        }
      });
    }

    if (balanceMin !== undefined || balanceMax !== undefined) {
      filteredExportData = filteredExportData.filter(m => {
        const balance = m['الرصيد الحالي'];
        if (balanceMin !== undefined && balance < parseFloat(balanceMin)) {return false;}
        if (balanceMax !== undefined && balance > parseFloat(balanceMax)) {return false;}
        return true;
      });
    }

    // Add summary row
    const totalBalance = filteredExportData.reduce((sum, m) => sum + m['الرصيد الحالي'], 0);
    const totalShortfall = filteredExportData.reduce((sum, m) => sum + m['المبلغ المتبقي'], 0);
    const compliantCount = filteredExportData.filter(m => m['الرصيد الحالي'] >= minimumBalance).length;

    filteredExportData.push({
      'رقم العضوية': '--- الإجمالي ---',
      'الاسم الكامل': `${filteredExportData.length} عضو`,
      'رقم الجوال': '',
      'البريد الإلكتروني': '',
      'الفخذ': '',
      'الرصيد الحالي': totalBalance,
      'الحد الأدنى': '',
      'المبلغ المتبقي': totalShortfall,
      'نسبة الإنجاز': `${Math.round((compliantCount / filteredExportData.length) * 100)  }% ملتزمون`,
      'حالة الالتزام': '',
      'حالة العضوية': '',
      'تاريخ الانضمام': '',
      'آخر دفعة': new Date().toISOString()
    });

    // Return JSON data for frontend to convert to Excel
    res.json({
      success: true,
      data: {
        rows: filteredExportData,
        metadata: {
          exportDate: new Date().toISOString(),
          totalRecords: filteredExportData.length - 1, // Exclude summary row
          filters: {
            memberId,
            fullName,
            phoneNumber,
            tribalSection,
            balanceCategory,
            status
          }
        },
        filename: `member_monitoring_${new Date().toISOString().split('T')[0]}.xlsx`
      }
    });

  } catch (error) {
    log.error('Error in exportMembers', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'خطأ في تصدير البيانات',
      message: error.message
    });
  }
};

/**
 * Get audit log for compliance tracking
 */
export const getAuditLog = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      module,
      userId,
      startDate,
      endDate
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('audit_logs')
      .select('*, users!audit_logs_user_id_fkey(email, role)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    // Apply filters
    if (action) {
      query = query.eq('action', action);
    }

    if (module) {
      query = query.eq('module', module);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: logs, error, count } = await query;

    if (error) {
      log.error('Error fetching audit logs', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch audit logs',
        message: error.message
      });
    }

    res.json({
      success: true,
      data: {
        logs: logs || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / parseInt(limit))
        },
        filters: {
          availableActions: ['MEMBER_SUSPENDED', 'NOTIFICATION_SENT', 'PAYMENT_RECEIVED', 'MEMBER_UPDATED'],
          availableModules: ['members', 'notifications', 'payments', 'system']
        }
      }
    });

  } catch (error) {
    log.error('Error in getAuditLog', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب سجل التدقيق',
      message: error.message
    });
  }
};

export default {
  getMemberMonitoring,
  suspendMember,
  notifyMember,
  exportMembers,
  getAuditLog
};