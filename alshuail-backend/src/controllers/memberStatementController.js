import supabaseService from '../services/supabaseService.js';
import { log } from '../utils/logger.js';

/**
 * Simple Member Statement Search Controller
 * Search by name or phone number and return payment history
 */

// Search for member and get their statement
export const searchMemberStatement = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال 3 أحرف على الأقل للبحث'
      });
    }

    // Detect if query is phone number or name
    const isPhone = /^[0-9]+$/.test(query);

    let members;

    if (isPhone) {
      // Search by phone number
      const { data, error } = await supabaseService.client
        .from('members')
        .select('*')
        .ilike('phone', `%${query}%`)
        .limit(10);

      if (error) throw error;
      members = data;

    } else {
      // Search by name (Arabic)
      const { data, error } = await supabaseService.client
        .from('members')
        .select('*')
        .ilike('full_name', `%${query}%`)
        .limit(10);

      if (error) throw error;
      members = data;
    }

    // For each member, get their payment history
    const membersWithPayments = await Promise.all(
      members.map(async (member) => {
        // Get all payments for this member
        const { data: payments, error: paymentError } = await supabaseService.client
          .from('payments')
          .select('amount, payment_date')
          .eq('payer_id', member.id)
          .eq('status', 'completed')
          .order('payment_date', { ascending: true });

        if (paymentError) {
          log.error('Error fetching payments', { error: paymentError.message });
        }

        // Organize payments by year
        const paymentsByYear = {
          2021: 0,
          2022: 0,
          2023: 0,
          2024: 0,
          2025: 0
        };

        if (payments) {
          payments.forEach(payment => {
            const year = new Date(payment.payment_date).getFullYear();
            if (paymentsByYear.hasOwnProperty(year)) {
              paymentsByYear[year] += parseFloat(payment.amount);
            }
          });
        }

        // Calculate total
        const total = Object.values(paymentsByYear).reduce((sum, amount) => sum + amount, 0);

        return {
          id: member.id,
          member_id: member.member_id,
          name: member.full_name,
          phone: member.phone,
          payments: paymentsByYear,
          total,
          status: total >= 3000 ? 'sufficient' : 'insufficient'
        };
      })
    );

    res.json({
      success: true,
      results: membersWithPayments,
      count: membersWithPayments.length
    });

  } catch (error) {
    log.error('Error in searchMemberStatement', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء البحث',
      error: error.message
    });
  }
};

// Get statement for a specific member by ID
export const getMemberStatement = async (req, res) => {
  try {
    const { memberId } = req.params;

    // Get member details
    const { data: member, error: memberError } = await supabaseService.client
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      return res.status(404).json({
        success: false,
        message: 'العضو غير موجود'
      });
    }

    // Get payment history
    const { data: payments, error: paymentError } = await supabaseService.client
      .from('payments')
      .select('*')
      .eq('payer_id', memberId)
      .eq('status', 'completed')
      .order('payment_date', { ascending: false });

    if (paymentError) throw paymentError;

    // Organize by year
    const paymentsByYear = {
      2021: 0,
      2022: 0,
      2023: 0,
      2024: 0,
      2025: 0
    };

    const paymentDetails = [];

    payments.forEach(payment => {
      const year = new Date(payment.payment_date).getFullYear();
      if (paymentsByYear.hasOwnProperty(year)) {
        paymentsByYear[year] += parseFloat(payment.amount);
      }

      paymentDetails.push({
        id: payment.id,
        amount: payment.amount,
        date: payment.payment_date,
        type: payment.payment_type,
        description: payment.description
      });
    });

    const total = Object.values(paymentsByYear).reduce((sum, amount) => sum + amount, 0);

    res.json({
      success: true,
      member: {
        id: member.id,
        member_id: member.member_id,
        name: member.full_name,
        phone: member.phone,
        tribal_section: member.tribal_section,
        subscription_type: member.subscription_type
      },
      statement: {
        yearly: paymentsByYear,
        total,
        status: total >= 3000 ? 'sufficient' : 'insufficient',
        details: paymentDetails
      }
    });

  } catch (error) {
    log.error('Error in getMemberStatement', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب كشف الحساب',
      error: error.message
    });
  }
};

// Get all members with their balances (for Crisis Dashboard)
export const getAllMembersWithBalances = async (req, res) => {
  try {
    // Get all members
    const { data: members, error: memberError } = await supabaseService.client
      .from('members')
      .select('*')
      .order('full_name');

    if (memberError) throw memberError;

    // Get all payments
    const { data: payments, error: paymentError } = await supabaseService.client
      .from('payments')
      .select('payer_id, amount')
      .eq('status', 'completed');

    if (paymentError) throw paymentError;

    // Calculate balances
    const balanceMap = {};
    payments.forEach(payment => {
      if (!balanceMap[payment.payer_id]) {
        balanceMap[payment.payer_id] = 0;
      }
      balanceMap[payment.payer_id] += parseFloat(payment.amount);
    });

    // Combine members with their balances
    const membersWithBalances = members.map(member => ({
      id: member.id,
      member_id: member.member_id,
      name: member.full_name,
      phone: member.phone,
      balance: balanceMap[member.id] || 0,
      status: (balanceMap[member.id] || 0) >= 3000 ? 'sufficient' : 'insufficient'
    }));

    // Calculate statistics
    const totalMembers = membersWithBalances.length;
    const sufficientMembers = membersWithBalances.filter(m => m.status === 'sufficient').length;
    const insufficientMembers = totalMembers - sufficientMembers;

    res.json({
      success: true,
      statistics: {
        total: totalMembers,
        sufficient: sufficientMembers,
        insufficient: insufficientMembers,
        complianceRate: ((sufficientMembers / totalMembers) * 100).toFixed(1)
      },
      members: membersWithBalances
    });

  } catch (error) {
    log.error('Error in getAllMembersWithBalances', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب البيانات',
      error: error.message
    });
  }
};

export default {
  searchMemberStatement,
  getMemberStatement,
  getAllMembersWithBalances
};