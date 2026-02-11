// Member Service Module - Direct PostgreSQL queries
import { query } from './database.js';
import { log } from '../utils/logger.js';

// Helper functions for common member database operations
export const dbHelpers = {
  // Get all members with their latest payment info
  async getMembersWithBalances() {
    try {
      const { rows: members } = await query(
        'SELECT * FROM members ORDER BY created_at DESC'
      );

      // Get payments separately since joins need special handling
      const { rows: payments } = await query(
        'SELECT member_id, amount, transaction_type, created_at FROM payments'
      );

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
      const { rows } = await query(
        'SELECT * FROM members WHERE id = $1',
        [memberId]
      );
      return rows[0];
    } catch (error) {
      log.error('Error getting member by ID:', error);
      throw error;
    }
  },

  // Get members by family branch
  async getMembersByBranch(branchId) {
    try {
      const { rows } = await query(
        'SELECT * FROM members WHERE family_branch_id = $1 ORDER BY full_name_ar',
        [branchId]
      );
      return rows;
    } catch (error) {
      log.error('Error getting members by branch:', error);
      throw error;
    }
  },

  // Update member data
  async updateMember(memberId, updates) {
    try {
      const fields = { ...updates, updated_at: new Date().toISOString() };
      const keys = Object.keys(fields);
      const values = Object.values(fields);

      const setClauses = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
      values.push(memberId);

      const { rows } = await query(
        `UPDATE members SET ${setClauses} WHERE id = $${values.length} RETURNING *`,
        values
      );
      return rows[0];
    } catch (error) {
      log.error('Error updating member:', error);
      throw error;
    }
  }
};
