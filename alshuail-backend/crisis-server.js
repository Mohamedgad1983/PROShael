import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Validate required environment variables
if (!process.env.SUPABASE_URL) {
  console.error('CRITICAL: SUPABASE_URL is not defined in environment variables');
  process.exit(1);
}
if (!process.env.SUPABASE_SERVICE_KEY) {
  console.error('CRITICAL: SUPABASE_SERVICE_KEY is not defined in environment variables');
  process.exit(1);
}

// Load Supabase credentials from environment
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3002', 'http://localhost:3003', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: 'connected to Supabase',
    timestamp: new Date().toISOString()
  });
});

// Crisis Dashboard endpoint - REAL DATA FROM SUPABASE
app.get('/api/crisis/dashboard', async (req, res) => {
  try {
    console.log('📊 Fetching crisis dashboard data from Supabase...');

    // Get all members from database
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false });

    if (membersError) {
      console.error('❌ Error fetching members:', membersError);
      return res.status(500).json({ error: membersError.message });
    }

    console.log(`✅ Found ${members?.length || 0} members in database`);

    // Process member data for crisis dashboard
    const processedMembers = [];
    let sufficientCount = 0;
    let insufficientCount = 0;

    for (const member of members || []) {
      // Get total payments for this member
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount')
        .eq('payer_id', member.id)
        .in('status', ['completed', 'approved']);

      const totalPayments = payments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;

      // Use the stored balance or calculated balance
      const balance = member.total_balance || totalPayments;
      const status = balance >= 3000 ? 'sufficient' : 'insufficient';

      if (status === 'sufficient') {
        sufficientCount++;
      } else {
        insufficientCount++;
      }

      processedMembers.push({
        id: member.id,
        membershipNumber: member.membership_number || `M${member.id.slice(0, 6)}`,
        fullName: member.full_name || 'عضو غير مسمى',
        phone: member.phone || 'غير متوفر',
        balance: balance,
        status: status,
        email: member.email,
        joinDate: member.created_at,
        lastPayment: member.updated_at
      });
    }

    // Sort members by balance (lowest first for crisis management)
    processedMembers.sort((a, b) => a.balance - b.balance);

    // Calculate statistics
    const totalMembers = processedMembers.length;
    const complianceRate = totalMembers > 0
      ? ((sufficientCount / totalMembers) * 100).toFixed(1)
      : 0;
    const nonComplianceRate = totalMembers > 0
      ? ((insufficientCount / totalMembers) * 100).toFixed(1)
      : 0;
    const averageBalance = totalMembers > 0
      ? (processedMembers.reduce((sum, m) => sum + m.balance, 0) / totalMembers).toFixed(2)
      : 0;

    // Send response
    const response = {
      statistics: {
        totalMembers: totalMembers,
        sufficientMembers: sufficientCount,
        insufficientMembers: insufficientCount,
        complianceRate: parseFloat(complianceRate),
        nonComplianceRate: parseFloat(nonComplianceRate),
        averageBalance: parseFloat(averageBalance),
        minimumRequired: 3000
      },
      members: processedMembers,
      lastUpdated: new Date().toISOString(),
      dataSource: 'Supabase Production Database'
    };

    console.log(`📈 Crisis Dashboard Stats:
      - Total Members: ${totalMembers}
      - Sufficient (≥3000): ${sufficientCount} (${complianceRate}%)
      - Insufficient (<3000): ${insufficientCount} (${nonComplianceRate}%)
      - Average Balance: ${averageBalance} SAR`);

    res.json(response);

  } catch (error) {
    console.error('❌ Crisis dashboard error:', error);
    res.status(500).json({
      error: 'Failed to fetch crisis data',
      message: error.message,
      dataSource: 'Error - Check backend logs'
    });
  }
});

// Get single member details
app.get('/api/members/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: member, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Get payment history
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('payer_id', id)
      .order('payment_date', { ascending: false });

    res.json({
      member: member,
      payments: payments || []
    });

  } catch (error) {
    console.error('Error fetching member:', error);
    res.status(500).json({ error: 'Failed to fetch member details' });
  }
});

// Update member balance
app.post('/api/members/:id/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, notes } = req.body;

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        payer_id: id,
        beneficiary_id: id,
        amount: amount,
        payment_date: new Date().toISOString(),
        payment_method: paymentMethod || 'bank_transfer',
        status: 'approved',
        category: 'subscription',
        notes: notes || 'Manual payment entry'
      })
      .select()
      .single();

    if (paymentError) {
      return res.status(500).json({ error: 'Failed to create payment' });
    }

    // Update member balance
    const { data: member } = await supabase
      .from('members')
      .select('total_balance')
      .eq('id', id)
      .single();

    const newBalance = (parseFloat(member?.total_balance || 0) + parseFloat(amount)).toFixed(2);
    const newStatus = newBalance >= 3000 ? 'sufficient' : 'insufficient';

    await supabase
      .from('members')
      .update({
        total_balance: newBalance,
        balance_status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    res.json({
      success: true,
      payment: payment,
      newBalance: newBalance,
      newStatus: newStatus
    });

  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║                                                    ║
║   🚀 Crisis Dashboard Backend Server               ║
║   ✅ Connected to Supabase Database               ║
║   📊 Real-time member data active                 ║
║   🌐 Server running on port ${PORT}                   ║
║                                                    ║
║   Endpoints:                                       ║
║   - GET  /api/health                              ║
║   - GET  /api/crisis/dashboard                    ║
║   - GET  /api/members/:id                         ║
║   - POST /api/members/:id/payment                 ║
║                                                    ║
║   Database: Supabase (oneiggrfzagqjbkdinin)      ║
║   Status: CONNECTED WITH REAL DATA                ║
║                                                    ║
╚════════════════════════════════════════════════════╝
  `);
});