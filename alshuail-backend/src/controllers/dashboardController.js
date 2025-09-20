import { supabase } from '../config/database.js';

export const getDashboardStats = async (req, res) => {
  try {
    const [
      membersStats,
      paymentsStats,
      subscriptionStats,
      recentActivities
    ] = await Promise.all([
      getMembersStatistics(),
      getPaymentsStatistics(),
      getSubscriptionStatistics(),
      getRecentActivities()
    ]);

    res.json({
      success: true,
      data: {
        members: membersStats,
        payments: paymentsStats,
        subscriptions: subscriptionStats,
        activities: recentActivities
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب إحصائيات لوحة التحكم'
    });
  }
};

async function getMembersStatistics() {
  try {
    const { data: allMembers } = await supabase
      .from('members')
      .select('*');

    const totalMembers = allMembers?.length || 0;
    const activeMembers = allMembers?.filter(m => m.is_active)?.length || 0;
    const inactiveMembers = totalMembers - activeMembers;

    const thisMonth = new Date();
    thisMonth.setMonth(thisMonth.getMonth() - 1);
    const newMembers = allMembers?.filter(m =>
      new Date(m.created_at) >= thisMonth
    )?.length || 0;

    return {
      total: totalMembers,
      active: activeMembers,
      inactive: inactiveMembers,
      newThisMonth: newMembers
    };
  } catch (error) {
    console.error('Error getting members statistics:', error);
    return {
      total: 0,
      active: 0,
      inactive: 0,
      newThisMonth: 0
    };
  }
}

async function getPaymentsStatistics() {
  try {
    const { data: payments } = await supabase
      .from('payments')
      .select('*');

    const pendingPayments = payments?.filter(p => p.status === 'pending') || [];
    const paidPayments = payments?.filter(p => p.status === 'paid') || [];

    const thisMonth = new Date();
    thisMonth.setMonth(thisMonth.getMonth() - 1);
    const monthlyPayments = paidPayments.filter(p =>
      new Date(p.created_at) >= thisMonth
    );

    const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalRevenue = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const pendingAmount = pendingPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      pending: pendingPayments.length,
      pendingAmount,
      monthlyRevenue,
      totalRevenue,
      totalPaid: paidPayments.length
    };
  } catch (error) {
    console.error('Error getting payments statistics:', error);
    return {
      pending: 0,
      pendingAmount: 0,
      monthlyRevenue: 0,
      totalRevenue: 0,
      totalPaid: 0
    };
  }
}

async function getSubscriptionStatistics() {
  try {
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('*');

    const activeSubscriptions = subscriptions?.filter(s => s.status === 'active') || [];
    const expiredSubscriptions = subscriptions?.filter(s => s.status === 'expired') || [];

    const totalSubscriptionRevenue = activeSubscriptions.reduce((sum, s) =>
      sum + Number(s.amount), 0
    );

    return {
      active: activeSubscriptions.length,
      expired: expiredSubscriptions.length,
      total: subscriptions?.length || 0,
      revenue: totalSubscriptionRevenue
    };
  } catch (error) {
    console.error('Error getting subscription statistics:', error);
    return {
      active: 0,
      expired: 0,
      total: 0,
      revenue: 0
    };
  }
}

async function getRecentActivities() {
  try {
    const { data: recentPayments } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: recentMembers } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    const activities = [];

    recentPayments?.forEach(payment => {
      activities.push({
        type: 'payment',
        description: `دفعة جديدة: ${payment.amount} ريال`,
        status: payment.status,
        date: payment.created_at,
        icon: 'payment'
      });
    });

    recentMembers?.forEach(member => {
      activities.push({
        type: 'member',
        description: `عضو جديد: ${member.full_name}`,
        status: 'new',
        date: member.created_at,
        icon: 'user'
      });
    });

    activities.sort((a, b) => new Date(b.date) - new Date(a.date));

    return activities.slice(0, 10);
  } catch (error) {
    console.error('Error getting recent activities:', error);
    return [];
  }
}