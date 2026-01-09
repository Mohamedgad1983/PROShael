/**
 * Supabase Configuration - PostgreSQL Compatibility Layer
 * Re-exports PostgreSQL query builder with Supabase-compatible API
 */

import pgQueryBuilder, { testConnection as pgTestConnection, getPool } from './pgQueryBuilder.js';
import { log } from '../utils/logger.js';

// Re-export the Supabase-compatible interface
export const supabase = pgQueryBuilder;
export const supabaseAdmin = pgQueryBuilder; // Same as supabase for PostgreSQL

// Database tables
export const TABLES = {
  MEMBERS: 'members',
  USERS: 'users',
  ROLES: 'roles',
  PERMISSIONS: 'permissions',
  USER_ROLES: 'user_roles',
  ROLE_PERMISSIONS: 'role_permissions',
  FINANCIAL_RECORDS: 'financial_records',
  SUBSCRIPTIONS: 'subscriptions',
  PAYMENTS: 'payments',
  OCCASIONS: 'occasions',
  INITIATIVES: 'initiatives',
  DIYAS: 'diyas',
  FAMILY_TREE: 'family_tree',
  RELATIONSHIPS: 'relationships',
  DOCUMENTS: 'documents',
  AUDIT_LOGS: 'audit_logs',
  REGISTRATION_TOKENS: 'registration_tokens'
};

// Helper functions for database operations
export const dbHelpers = {
  // Get all records from a table
  async getAll(table, options = {}) {
    let query = supabaseAdmin.from(table).select(options.select || '*');
    
    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending || false });
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Get single record by ID
  async getById(table, id) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Create new record
  async create(table, data) {
    const { data: created, error } = await supabaseAdmin
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return created;
  },

  // Update record
  async update(table, id, updates) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete record
  async delete(table, id) {
    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  },

  // Search with filters
  async search(table, filters = {}, options = {}) {
    let query = supabaseAdmin.from(table).select(options.select || '*');

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object' && value.like) {
          query = query.ilike(key, `%${value.like}%`);
        } else {
          query = query.eq(key, value);
        }
      }
    });

    // Apply ordering
    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending || false });
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { data, count };
  }
};

// Connection test function
export async function testConnection() {
  try {
    const result = await pgTestConnection();
    if (result) {
      log.info('Successfully connected to PostgreSQL database');
      return { connected: true, database: process.env.DB_NAME || 'alshuail_db' };
    }
    return { connected: false, error: 'Connection test failed' };
  } catch (err) {
    log.error('Connection test failed', { error: err.message });
    return { connected: false, error: err.message };
  }
}

export default {
  supabase,
  supabaseAdmin,
  TABLES,
  dbHelpers,
  testConnection
};
