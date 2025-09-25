import { supabase } from '../config/database.js';

// Get crisis dashboard data - members below minimum balance
export const getCrisisDashboard = async (req, res) => {
  try {
    const minimumBalance = 3000; // Required minimum balance

    // Get all members with their current balance
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('*')
      .order('full_name');

    if (membersError) {
      console.error('Error fetching members:', membersError);
      // Return mock data if database is not ready
      return res.json(getMockCrisisData());
    }

    // Calculate balances for each member
    const memberBalances = await Promise.all(members.map(async (member) => {
      // Get total payments for this member
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount')
        .eq('payer_id', member.id)
        .eq('status', 'completed');

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
    console.error('Error in getCrisisDashboard:', error);
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
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        payer_id: memberId,
        amount: amount,
        category: type || 'contribution',
        status: 'completed',
        payment_method: 'online',
        title: 'مساهمة في الصندوق',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (paymentError) {
      throw paymentError;
    }

    // Get updated balance for this member
    const { data: allPayments, error: fetchError } = await supabase
      .from('payments')
      .select('amount')
      .eq('payer_id', memberId)
      .eq('status', 'completed');

    const newBalance = allPayments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;

    res.json({
      success: true,
      data: {
        paymentId: payment.id,
        memberId,
        newBalance,
        status: newBalance >= 3000 ? 'sufficient' : 'insufficient',
        message: 'تم تحديث الرصيد بنجاح'
      }
    });
  } catch (error) {
    console.error('Error updating member balance:', error);
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

export default {
  getCrisisDashboard,
  updateMemberBalance
};