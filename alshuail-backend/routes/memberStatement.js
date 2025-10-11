const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');

// Search for members
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    // Search by member_no, full_name, or phone
    const { data: members, error } = await supabase
      .from('members')
      .select('id, member_no, full_name, phone, tribal_section, balance, email')
      .or(`member_no.ilike.%${query}%,full_name.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(10);

    if (error) {
      console.error('Supabase search error:', error);
      throw error;
    }

    res.json({
      success: true,
      results: members || []
    });

  } catch (error) {
    console.error('Member search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching for members',
      error: error.message
    });
  }
});

// Get member statement by ID
router.get('/member/:memberId', authenticateToken, async (req, res) => {
  try {
    const { memberId } = req.params;

    // Get member details
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single();

    if (memberError) {
      if (memberError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Member not found'
        });
      }
      throw memberError;
    }

    // Get payment history
    const { data: payments, error: paymentsError } = await supabase
      .from('payments_yearly')
      .select('*')
      .eq('member_id', memberId)
      .order('year', { ascending: true });

    if (paymentsError && paymentsError.code !== 'PGRST116') {
      throw paymentsError;
    }

    // Calculate statement summary
    const years = [2021, 2022, 2023, 2024, 2025];
    const YEARLY_AMOUNT = 600;
    const MINIMUM_BALANCE = 3000;

    const yearlyPayments = years.map(year => {
      const payment = payments?.find(p => p.year === year);
      return {
        year,
        required: YEARLY_AMOUNT,
        paid: payment?.amount || 0,
        status: payment?.amount >= YEARLY_AMOUNT ? 'paid' : payment?.amount > 0 ? 'partial' : 'pending',
        paymentDate: payment?.payment_date,
        receiptNumber: payment?.receipt_number,
        paymentMethod: payment?.payment_method
      };
    });

    const totalPaid = yearlyPayments.reduce((sum, p) => sum + p.paid, 0);
    const totalRequired = years.length * YEARLY_AMOUNT;
    const outstandingBalance = Math.max(0, totalRequired - totalPaid);
    const complianceStatus = totalPaid >= MINIMUM_BALANCE ? 'compliant' : 'non-compliant';

    res.json({
      success: true,
      data: {
        member,
        yearlyPayments,
        totalPaid,
        totalRequired,
        outstandingBalance,
        complianceStatus,
        lastPaymentDate: payments?.[0]?.payment_date
      }
    });

  } catch (error) {
    console.error('Get member statement error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving member statement',
      error: error.message
    });
  }
});

// Get member yearly payments
router.get('/member/:memberId/yearly', authenticateToken, async (req, res) => {
  try {
    const { memberId } = req.params;

    const { data: payments, error } = await supabase
      .from('payments_yearly')
      .select('*')
      .eq('member_id', memberId)
      .order('year', { ascending: true });

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.json({
      success: true,
      data: payments || []
    });

  } catch (error) {
    console.error('Get yearly payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving yearly payments',
      error: error.message
    });
  }
});

// Export member statement data
router.post('/export', authenticateToken, async (req, res) => {
  try {
    const { memberIds, format = 'json' } = req.body;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Member IDs array is required'
      });
    }

    // Get members with their payments
    const statementsData = [];

    for (const memberId of memberIds) {
      // Get member details
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .single();

      if (memberError) {continue;}

      // Get payment history
      const { data: payments } = await supabase
        .from('payments_yearly')
        .select('*')
        .eq('member_id', memberId)
        .order('year', { ascending: true });

      // Calculate totals
      const totalPaid = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const totalRequired = 5 * 600; // 5 years * 600 SAR
      const outstandingBalance = Math.max(0, totalRequired - totalPaid);

      statementsData.push({
        member,
        payments: payments || [],
        totalPaid,
        totalRequired,
        outstandingBalance,
        complianceStatus: totalPaid >= 3000 ? 'compliant' : 'non-compliant'
      });
    }

    res.json({
      success: true,
      format,
      count: statementsData.length,
      data: statementsData
    });

  } catch (error) {
    console.error('Export statements error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting statements',
      error: error.message
    });
  }
});

// Record a payment for a member
router.post('/member/:memberId/payment', authenticateToken, async (req, res) => {
  try {
    const { memberId } = req.params;
    const { year, amount, paymentMethod, receiptNumber, notes } = req.body;

    if (!year || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Year and amount are required'
      });
    }

    // Check if payment already exists for this year
    const { data: existingPayment } = await supabase
      .from('payments_yearly')
      .select('id')
      .eq('member_id', memberId)
      .eq('year', year)
      .single();

    let result;

    if (existingPayment) {
      // Update existing payment
      result = await supabase
        .from('payments_yearly')
        .update({
          amount,
          payment_method: paymentMethod,
          receipt_number: receiptNumber,
          notes,
          payment_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPayment.id);
    } else {
      // Insert new payment
      result = await supabase
        .from('payments_yearly')
        .insert({
          member_id: memberId,
          year,
          amount,
          payment_method: paymentMethod,
          receipt_number: receiptNumber,
          notes,
          payment_date: new Date().toISOString()
        });
    }

    if (result.error) {throw result.error;}

    // Update member's total balance
    const { data: allPayments } = await supabase
      .from('payments_yearly')
      .select('amount')
      .eq('member_id', memberId);

    const newBalance = allPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    await supabase
      .from('members')
      .update({ balance: newBalance })
      .eq('id', memberId);

    res.json({
      success: true,
      message: 'Payment recorded successfully'
    });

  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording payment',
      error: error.message
    });
  }
});

module.exports = router;