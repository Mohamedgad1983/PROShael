/**
 * Test Database Utilities
 * Provides helpers for integration tests with real Supabase database
 */

import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

// Use real database credentials from .env
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://oneiggrfzagqjbkdinin.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'alshuail-super-secure-jwt-secret-key-2024-production-ready-32chars';

// Create test database client with service role (full access)
export const testDb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Test data storage - tracks created test data for cleanup
 */
export const testDataTracker = {
  members: [],
  users: [],
  payments: [],
  subscriptions: [],

  reset() {
    this.members = [];
    this.users = [];
    this.payments = [];
    this.subscriptions = [];
  }
};

/**
 * Generate JWT token for testing
 */
export const generateToken = (payload, expiresIn = '1h') => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

/**
 * Create tokens for different roles
 */
export const tokenFactory = {
  superAdmin: (userId = 'test-super-admin-id') => generateToken({
    id: userId,
    role: 'super_admin',
    email: 'superadmin@test.alshuail.com'
  }),

  financialManager: (userId = 'test-fm-id') => generateToken({
    id: userId,
    role: 'financial_manager',
    email: 'fm@test.alshuail.com'
  }),

  admin: (userId = 'test-admin-id') => generateToken({
    id: userId,
    role: 'admin',
    email: 'admin@test.alshuail.com'
  }),

  familyHead: (userId = 'test-fh-id') => generateToken({
    id: userId,
    role: 'family_head',
    phone: '+966501234567'
  }),

  member: (userId = 'test-member-id', phone = '+966501234567') => generateToken({
    id: userId,
    role: 'member',
    phone
  }),

  expired: (userId = 'test-expired-id') => jwt.sign({
    id: userId,
    role: 'member'
  }, JWT_SECRET, { expiresIn: '-1h' }) // Already expired
};

/**
 * Test data factories - create consistent test data
 */
export const dataFactory = {
  member: (overrides = {}) => ({
    full_name: `Test Member ${Date.now()}`,
    phone: `+9665${Math.floor(10000000 + Math.random() * 90000000)}`,
    email: `test${Date.now()}@test.alshuail.com`,
    national_id: `${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    gender: 'male',
    nationality: 'Saudi',
    city: 'Riyadh',
    membership_status: 'active',
    membership_type: 'regular',
    ...overrides
  }),

  payment: (memberId, overrides = {}) => ({
    member_id: memberId,
    amount: 50,
    payment_type: 'subscription',
    payment_method: 'cash',
    status: 'completed',
    hijri_year: 1446,
    hijri_month: 1,
    payment_date: new Date().toISOString(),
    ...overrides
  }),

  subscription: (memberId, overrides = {}) => ({
    member_id: memberId,
    plan_type: 'monthly',
    amount: 50,
    status: 'active',
    start_date: new Date().toISOString(),
    ...overrides
  })
};

/**
 * Database operations for tests
 */
export const dbOps = {
  /**
   * Create a test member in the database
   */
  async createMember(data = {}) {
    const memberData = dataFactory.member(data);
    const { data: member, error } = await testDb
      .from('members')
      .insert([memberData])
      .select()
      .single();

    if (error) {
      console.error('Failed to create test member:', error);
      throw error;
    }

    testDataTracker.members.push(member.id);
    return member;
  },

  /**
   * Create a test payment in the database
   */
  async createPayment(memberId, data = {}) {
    const paymentData = dataFactory.payment(memberId, data);
    const { data: payment, error } = await testDb
      .from('payments')
      .insert([paymentData])
      .select()
      .single();

    if (error) {
      console.error('Failed to create test payment:', error);
      throw error;
    }

    testDataTracker.payments.push(payment.id);
    return payment;
  },

  /**
   * Get an existing member from database (for read-only tests)
   */
  async getExistingMember() {
    const { data: member, error } = await testDb
      .from('members')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('Failed to get existing member:', error);
      return null;
    }

    return member;
  },

  /**
   * Get an existing super admin user
   */
  async getExistingSuperAdmin() {
    const { data: user, error } = await testDb
      .from('users')
      .select('*')
      .eq('role', 'super_admin')
      .limit(1)
      .single();

    if (error) {
      console.error('Failed to get super admin:', error);
      return null;
    }

    return user;
  },

/**   * Get an existing subscription from database (for read-only tests)   */  async getExistingSubscription() {    const { data: subscription, error } = await testDb      .from('subscriptions')      .select('*')      .limit(1)      .single();    if (error) {      console.error('Failed to get existing subscription:', error);      return null;    }    return subscription;  },  /**   * Get an existing payment from database (for read-only tests)   */  async getExistingPayment() {    const { data: payment, error } = await testDb      .from('payments')      .select('*')      .limit(1)      .single();    if (error) {      console.error('Failed to get existing payment:', error);      return null;    }    return payment;  },
  /**
   * Get member count
   */
  async getMemberCount() {
    const { count, error } = await testDb
      .from('members')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Failed to get member count:', error);
      return 0;
    }

    return count || 0;
  },

  /**
   * Clean up all test data created during tests
   */
  async cleanup() {
    const errors = [];

    // Delete test payments
    if (testDataTracker.payments.length > 0) {
      const { error } = await testDb
        .from('payments')
        .delete()
        .in('id', testDataTracker.payments);
      if (error) errors.push({ table: 'payments', error });
    }

    // Delete test subscriptions
    if (testDataTracker.subscriptions.length > 0) {
      const { error } = await testDb
        .from('subscriptions')
        .delete()
        .in('id', testDataTracker.subscriptions);
      if (error) errors.push({ table: 'subscriptions', error });
    }

    // Delete test members
    if (testDataTracker.members.length > 0) {
      const { error } = await testDb
        .from('members')
        .delete()
        .in('id', testDataTracker.members);
      if (error) errors.push({ table: 'members', error });
    }

    // Delete test users
    if (testDataTracker.users.length > 0) {
      const { error } = await testDb
        .from('users')
        .delete()
        .in('id', testDataTracker.users);
      if (error) errors.push({ table: 'users', error });
    }

    // Reset tracker
    testDataTracker.reset();

    if (errors.length > 0) {
      console.error('Cleanup errors:', errors);
    }

    return errors.length === 0;
  }
};

/**
 * Test database connection
 */
export const testConnection = async () => {
  try {
    const { data, error } = await testDb
      .from('members')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Database connection test failed:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Database connection error:', err);
    return false;
  }
};

/**
 * Setup and teardown helpers for test suites
 */
export const testSetup = {
  /**
   * Run before all tests in a suite
   */
  async beforeAll() {
    const connected = await testConnection();
    if (!connected) {
      console.warn('⚠️ Database not connected - some tests may fail');
    }
    return connected;
  },

  /**
   * Run after all tests in a suite
   */
  async afterAll() {
    await dbOps.cleanup();
  },

  /**
   * Run before each test
   */
  async beforeEach() {
    // Reset any per-test state if needed
  },

  /**
   * Run after each test
   */
  async afterEach() {
    // Cleanup per-test data if needed
  }
};

export default {
  testDb,
  testDataTracker,
  generateToken,
  tokenFactory,
  dataFactory,
  dbOps,
  testConnection,
  testSetup
};
