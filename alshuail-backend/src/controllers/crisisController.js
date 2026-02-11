import { query } from '../services/database.js';
import { log } from '../utils/logger.js';
import { config } from '../config/env.js';

// Get crisis dashboard data - members below minimum balance
export const getCrisisDashboard = async (req, res) => {
  try {
    const minimumBalance = 3600; // Required minimum balance (6 years x 600 SAR)

    // Get all members with their current balance
    let members;
    try {
      const { rows } = await query('SELECT * FROM members ORDER BY full_name');
      members = rows;
    } catch (membersErr) {
      log.error('Error fetching members', { error: membersErr.message });
      // Return mock data if database is not ready
      return res.json(getMockCrisisData());
    }

    // Calculate balances for each member
    const memberBalances = await Promise.all(members.map(async (member) => {
      // Get total payments for this member
      const { rows: payments } = await query(
        "SELECT amount FROM payments WHERE payer_id = $1 AND status = 'completed'",
        [member.id]
      );

      const totalPaid = payments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;

      return {
        id: member.id,
        memberId: member.membership_number || `SH-${String(member.id).slice(0, 5)}`,
        fullName: member.full_name,
        phone: member.phone,
        email: member.email,
        balance: totalPaid,
        targetBalance: minimumBalance,
        shortfall: Math.max(0, minimumBalance - totalPaid),
        status: totalPaid >= minimumBalance ? 'sufficient' : 'insufficient',
        percentageComplete: Math.min(100, (totalPaid / minimumBalance) * 100),
        lastPaymentDate: member.updated_at
      };
    }));

    // Calculate statistics
    const totalMembers = memberBalances.length;
    const compliantMembers = memberBalances.filter(m => m.status === 'sufficient').length;
    const nonCompliantMembers = totalMembers - compliantMembers;
    const complianceRate = totalMembers > 0 ? (compliantMembers / totalMembers) * 100 : 0;
    const totalShortfall = memberBalances.reduce((sum, m) => sum + m.shortfall, 0);

    res.json({
      success: true,
      data: {
        statistics: {
          totalMembers,
          compliantMembers,
          nonCompliantMembers,
          complianceRate: complianceRate.toFixed(1),
          nonComplianceRate: (100 - complianceRate).toFixed(1),
          totalShortfall,
          minimumBalance,
          lastUpdated: new Date().toISOString()
        },
        members: memberBalances,
        criticalMembers: memberBalances
          .filter(m => m.status === 'insufficient')
          .sort((a, b) => b.shortfall - a.shortfall)
          .slice(0, 50) // Top 50 critical cases
      }
    });
  } catch (error) {
    log.error('Error in getCrisisDashboard', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب بيانات لوحة الأزمة',
      message: error.message
    });
  }
};

// Update member balance when payment is made
export const updateMemberBalance = async (req, res) => {
  try {
    const { memberId, amount, type } = req.body;

    // Record the payment
    const { rows: paymentRows } = await query(
      `INSERT INTO payments (payer_id, amount, category, status, payment_method, title, created_at)
       VALUES ($1, $2, $3, 'completed', 'online', 'مساهمة في الصندوق', $4)
       RETURNING *`,
      [memberId, amount, type || 'contribution', new Date().toISOString()]
    );

    const payment = paymentRows[0];

    // Get updated balance for this member
    const { rows: allPayments } = await query(
      "SELECT amount FROM payments WHERE payer_id = $1 AND status = 'completed'",
      [memberId]
    );

    const newBalance = allPayments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;

    res.json({
      success: true,
      data: {
        paymentId: payment.id,
        memberId,
        newBalance,
        status: newBalance >= 3600 ? 'sufficient' : 'insufficient',
        message: 'تم تحديث الرصيد بنجاح'
      }
    });
  } catch (error) {
    log.error('Error updating member balance', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'خطأ في تحديث الرصيد',
      message: error.message
    });
  }
};

// Get mock data for development/testing
function getMockCrisisData() {
  const mockMembers = [];
  const minimumBalance = 3000;

  // Generate 288 mock members
  for (let i = 1; i <= 288; i++) {
    const balance = Math.random() * 5000; // Random balance 0-5000
    mockMembers.push({
      id: i,
      memberId: `SH-${String(10000 + i)}`,
      fullName: `عضو رقم ${i}`,
      phone: `050${String(1000000 + i).padStart(7, '0')}`,
      balance: Math.round(balance),
      targetBalance: minimumBalance,
      shortfall: Math.max(0, minimumBalance - balance),
      status: balance >= minimumBalance ? 'sufficient' : 'insufficient',
      percentageComplete: Math.min(100, (balance / minimumBalance) * 100),
      lastPaymentDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    });
  }

  const compliantMembers = mockMembers.filter(m => m.status === 'sufficient').length;
  const totalShortfall = mockMembers.reduce((sum, m) => sum + m.shortfall, 0);

  return {
    success: true,
    data: {
      statistics: {
        totalMembers: 288,
        compliantMembers,
        nonCompliantMembers: 288 - compliantMembers,
        complianceRate: ((compliantMembers / 288) * 100).toFixed(1),
        nonComplianceRate: (((288 - compliantMembers) / 288) * 100).toFixed(1),
        totalShortfall: Math.round(totalShortfall),
        minimumBalance,
        lastUpdated: new Date().toISOString()
      },
      members: mockMembers,
      criticalMembers: mockMembers
        .filter(m => m.status === 'insufficient')
        .sort((a, b) => b.shortfall - a.shortfall)
        .slice(0, 50)
    }
  };
}

// Get active crisis alerts and history for mobile app
export const getCrisisAlerts = async (req, res) => {
  try {
    // Get active crisis alert
    let activeCrisis = null;
    try {
      const { rows: activeRows } = await query(
        "SELECT * FROM crisis_alerts WHERE status = 'active' ORDER BY created_at DESC LIMIT 1"
      );
      activeCrisis = activeRows[0] || null;
    } catch (_err) {
      // Table may not exist yet
    }

    // Get crisis history (last 20 alerts)
    let historyData = [];
    try {
      const { rows: historyRows } = await query(
        'SELECT * FROM crisis_alerts ORDER BY created_at DESC LIMIT 20'
      );
      historyData = historyRows || [];
    } catch (_err) {
      // Table may not exist yet
    }

    // Return data (active can be null if no active crisis)
    res.json({
      success: true,
      data: {
        active: activeCrisis,
        history: historyData
      },
      message: 'تم جلب بيانات الطوارئ بنجاح'
    });
  } catch (error) {
    log.error('Error fetching crisis alerts', { error: error.message });

    // Return empty state if table doesn't exist yet (graceful fallback)
    res.json({
      success: true,
      data: {
        active: null,
        history: []
      },
      message: 'لا توجد تنبيهات طوارئ حالياً'
    });
  }
};

// Member marks themselves safe during crisis
export const markMemberSafe = async (req, res) => {
  try {
    const { crisis_id } = req.body;
    const member_id = req.user?.id; // From auth middleware

    if (!member_id) {
      return res.status(401).json({
        success: false,
        error: 'غير مصرح',
        message: 'يجب تسجيل الدخول أولاً'
      });
    }

    if (!crisis_id) {
      return res.status(400).json({
        success: false,
        error: 'معرف الطوارئ مطلوب',
        message: 'يجب تحديد تنبيه الطوارئ'
      });
    }

    // Verify crisis exists and is active
    const { rows: crisisRows } = await query(
      'SELECT id, title, status FROM crisis_alerts WHERE id = $1',
      [crisis_id]
    );

    const crisis = crisisRows[0];
    if (!crisis) {
      return res.status(404).json({
        success: false,
        error: 'تنبيه الطوارئ غير موجود',
        message: 'لم يتم العثور على تنبيه الطوارئ'
      });
    }

    // Check if member already marked safe
    const { rows: existingRows } = await query(
      'SELECT id FROM crisis_responses WHERE crisis_id = $1 AND member_id = $2',
      [crisis_id, member_id]
    );

    if (existingRows.length > 0) {
      return res.json({
        success: true,
        data: {
          crisis_id,
          member_id,
          status: 'safe',
          already_reported: true
        },
        message: 'تم تسجيل حالتك مسبقاً'
      });
    }

    // Insert safe response
    const { rows: responseRows } = await query(
      `INSERT INTO crisis_responses (crisis_id, member_id, status, response_time, created_at)
       VALUES ($1, $2, 'safe', $3, $3)
       RETURNING *`,
      [crisis_id, member_id, new Date().toISOString()]
    );

    const response = responseRows[0];

    // Create notification for admin (fire-and-forget)
    try {
      await query(
        `INSERT INTO notifications (member_id, title, message, type, created_at)
         VALUES (1, 'رد على تنبيه طوارئ', $1, 'crisis_response', $2)`,
        [`أبلغ عضو أنه بخير في "${crisis.title}"`, new Date().toISOString()]
      );
    } catch (_notifErr) {
      // Non-critical, log but don't fail
      log.error('Failed to create admin notification', { error: _notifErr.message });
    }

    res.json({
      success: true,
      data: {
        response_id: response.id,
        crisis_id,
        member_id,
        status: 'safe',
        response_time: response.response_time
      },
      message: 'تم الإبلاغ عن حالتك بنجاح. شكراً لك على التواصل.'
    });
  } catch (error) {
    log.error('Error marking member safe', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'خطأ في تسجيل حالتك',
      message: config.isDevelopment ? error.message : 'حدث خطأ أثناء تسجيل حالتك'
    });
  }
};

// Get emergency contacts list
export const getEmergencyContacts = async (req, res) => {
  try {
    // Get members marked as emergency contacts or family leadership
    const { rows: contacts } = await query(
      `SELECT id, full_name, full_name_en, phone, email, role, photo_url
       FROM members
       WHERE role = ANY($1) AND membership_status = 'active'
       ORDER BY role ASC`,
      [['admin', 'board_member', 'emergency_contact']]
    );

    // Format contacts with priorities
    const formattedContacts = contacts.map(contact => ({
      id: contact.id,
      name: contact.full_name,
      name_en: contact.full_name_en,
      phone: contact.phone,
      email: contact.email,
      role: contact.role,
      photo_url: contact.photo_url,
      priority: contact.role === 'admin' ? 1 : contact.role === 'board_member' ? 2 : 3,
      role_label: contact.role === 'admin' ? 'رئيس العائلة' :
                  contact.role === 'board_member' ? 'عضو مجلس الإدارة' :
                  'جهة اتصال طوارئ'
    }));

    res.json({
      success: true,
      data: {
        contacts: formattedContacts,
        total: formattedContacts.length
      },
      message: 'تم جلب جهات الاتصال الطارئة بنجاح'
    });
  } catch (error) {
    log.error('Error fetching emergency contacts', { error: error.message });

    // Fallback to mock data if table/roles not configured yet
    res.json({
      success: true,
      data: {
        contacts: [
          {
            id: 1,
            name: 'رئيس العائلة',
            phone: '+966501234567',
            email: 'admin@alshuail.com',
            role: 'admin',
            priority: 1,
            role_label: 'رئيس العائلة'
          }
        ],
        total: 1
      },
      message: 'تم جلب جهات الاتصال الطارئة'
    });
  }
};

export default {
  getCrisisDashboard,
  updateMemberBalance,
  getCrisisAlerts,
  markMemberSafe,
  getEmergencyContacts
};
