// Supabase Service Module
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { log } from '../utils/logger.js';

dotenv.config();

if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL is required but not set in environment variables');
}
if (!process.env.SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_ANON_KEY is required but not set in environment variables');
}
if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_KEY is required but not set in environment variables');
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Create client with service key for backend operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Export default client for compatibility
export default supabase;

// Helper functions for common database operations
export const dbHelpers = {
  // Get all members with their latest payment info
  async getMembersWithBalances() {
    try {
      const { data: members, error } = await supabase
        .from('members')
        .select(`
          *,
          payments:transactions(
            amount,
            transaction_type,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate balance for each member
      return members.map(member => {
        const totalPayments = member.payments?.reduce((sum, payment) => {
          return payment.transaction_type === 'credit'
            ? sum + payment.amount
            : sum - payment.amount;
        }, 0) || 0;

        return {
          ...member,
          balance: totalPayments,
          status: totalPayments >= 3000 ? 'sufficient' : 'insufficient'
        };
      });
    } catch (error) {
      log.error('Error fetching members with balances:', { error: error.message });
      throw error;
    }
  },

  // Get single member by ID
  async getMemberById(memberId) {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log.error('Error fetching member:', { error: error.message });
      throw error;
    }
  },

  // Update member status
  async updateMemberStatus(memberId, status, updatedBy) {
    try {
      const { data, error } = await supabase
        .from('members')
        .update({
          status,
          updated_at: new Date().toISOString(),
          updated_by: updatedBy
        })
        .eq('id', memberId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log.error('Error updating member status:', { error: error.message });
      throw error;
    }
  },

  // Log audit action
  async logAuditAction(action, targetId, targetType, details, performedBy) {
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .insert({
          action,
          target_id: targetId,
          target_type: targetType,
          details,
          performed_by: performedBy,
          performed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log.error('Error logging audit action:', { error: error.message });
      throw error;
    }
  },

  // Create notification
  async createNotification(memberId, type, title, message, createdBy) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          member_id: memberId,
          type,
          title,
          message,
          status: 'pending',
          created_at: new Date().toISOString(),
          created_by: createdBy
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log.error('Error creating notification:', { error: error.message });
      throw error;
    }
  },

  // Queue SMS message
  async queueSMS(phoneNumber, message, notificationId = null) {
    try {
      const { data, error } = await supabase
        .from('sms_queue')
        .insert({
          phone_number: phoneNumber,
          message,
          notification_id: notificationId,
          status: 'queued',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log.error('Error queuing SMS:', { error: error.message });
      throw error;
    }
  }
};