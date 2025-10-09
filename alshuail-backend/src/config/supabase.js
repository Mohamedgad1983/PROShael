/**
 * Supabase Configuration
 * Direct database connection setup
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { log } from '../utils/logger.js';

dotenv.config();

// Supabase configuration from environment variables with fallbacks
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://oneiggrfzagqjbkdinin.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uZWlnZ3JmemFncWpia2RpbmluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3Mzc5MDMsImV4cCI6MjA3MDMxMzkwM30.AqaBlip7Dwd0DIMQ0DbhtlHk9jUd9MEZJND9J5GbEmk';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uZWlnZ3JmemFncWpia2RpbmluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDczNzkwMywiZXhwIjoyMDcwMzEzOTAzfQ.rBZIRsifsQiR3j5OgViWLjaBi_W8Jp0gD7HPf9fS5vI';

// Log warnings if using defaults
if (!process.env.SUPABASE_URL) {
  log.warn('SUPABASE_URL not set, using default value');
}
if (!process.env.SUPABASE_ANON_KEY) {
  log.warn('SUPABASE_ANON_KEY not set, using default value');
}

// Create Supabase client for public operations
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY || '',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  }
);

// Create Supabase admin client for backend operations
export const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

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
    const { data, error } = await supabaseAdmin
      .from(table)
      .select(options.select || '*')
      .order(options.orderBy || 'created_at', { ascending: false });

    if (error) {throw error;}
    return data;
  },

  // Get single record by ID
  async getById(table, id) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {throw error;}
    return data;
  },

  // Create new record
  async create(table, data) {
    const { data: created, error } = await supabaseAdmin
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) {throw error;}
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

    if (error) {throw error;}
    return data;
  },

  // Delete record
  async delete(table, id) {
    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq('id', id);

    if (error) {throw error;}
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

    if (error) {throw error;}
    return { data, count };
  }
};

// Connection test function
export async function testConnection() {
  try {
    const { data, error } = await supabaseAdmin
      .from('members')
      .select('count')
      .limit(1);

    if (error) {
      log.error('Supabase connection error', { error: error.message });
      return { connected: false, error: error.message };
    }

    log.info('Successfully connected to Supabase database');
    log.info('Project: oneiggrfzagqjbkdinin');
    return { connected: true, projectRef: 'oneiggrfzagqjbkdinin' };
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