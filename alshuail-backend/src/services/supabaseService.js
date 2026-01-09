// Supabase Service Module - PostgreSQL Compatibility
import { supabase } from '../config/database.js';
import { log } from '../utils/logger.js';

// Export the supabase-compatible client
export { supabase };
export default supabase;

// Helper functions for common database operations
export const dbHelpers = {
  // Get all members with their latest payment info
  async getMembersWithBalances() {
    try {
      const { data: members, error } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get payments separately since joins need special handling
      const { data: payments } = await supabase
        .from('payments')
        .select('member_id, amount, transaction_type, created_at');

      // Calculate balance for each member
      return members.map(member => {
        const memberPayments = (payments || []).filter(p => p.member_id === member.id);
        const totalPayments = memberPayments.reduce((sum, payment) => {
          return payment.transaction_type === 'credit'
            ? sum + parseFloat(payment.amount || 0)
            : sum - parseFloat(payment.amount || 0);
        }, 0);

        return {
          ...member,
          balance: parseFloat(member.total_balance || 0),
          totalPayments
        };
      });
    } catch (error) {
      log.error('Error getting members with balances:', error);
      throw error;
    }
  },

  // Get member by ID with all related data
  async getMemberById(memberId) {
    try {
      const { data: member, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .single();

      if (error) throw error;
      return member;
    } catch (error) {
      log.error('Error getting member by ID:', error);
      throw error;
    }
  },

  // Get members by family branch
  async getMembersByBranch(branchId) {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('family_branch_id', branchId)
        .order('full_name_ar');

      if (error) throw error;
      return data;
    } catch (error) {
      log.error('Error getting members by branch:', error);
      throw error;
    }
  },

  // Update member data
  async updateMember(memberId, updates) {
    try {
      const { data, error } = await supabase
        .from('members')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log.error('Error updating member:', error);
      throw error;
    }
  }
};
