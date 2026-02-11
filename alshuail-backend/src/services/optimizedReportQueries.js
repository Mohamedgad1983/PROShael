/**
 * Optimized Report Query Service
 * Implements performance optimizations for large dataset queries
 * Target: < 3 seconds for 1000+ records
 */

import { log } from '../utils/logger.js';
import { query } from './database.js';

/**
 * Optimized paginated query with indexing hints
 */
export const getOptimizedFinancialData = async (options = {}) => {
  const {
    table = 'payments',
    dateFrom,
    dateTo,
    limit = 100,
    offset = 0,
    orderBy = 'created_at',
    orderDirection = 'desc',
    filters = {},
    selectColumns = '*'
  } = options;

  try {
    // Build optimized query with selective column fetching
    const whereClauses = [];
    const params = [];
    let paramIndex = 1;

    // Apply date range filters (use indexes)
    if (dateFrom) {
      whereClauses.push(`created_at >= $${paramIndex++}`);
      params.push(dateFrom);
    }
    if (dateTo) {
      whereClauses.push(`created_at <= $${paramIndex++}`);
      params.push(dateTo);
    }

    // Apply additional filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        whereClauses.push(`${key} = $${paramIndex++}`);
        params.push(value);
      }
    });

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const orderClause = `ORDER BY ${orderBy} ${orderDirection === 'asc' ? 'ASC' : 'DESC'}`;

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM ${table} ${whereClause}`;
    const { rows: countRows } = await query(countQuery, params);
    const count = parseInt(countRows[0].total);

    // Get paginated data
    const dataQuery = `SELECT ${selectColumns} FROM ${table} ${whereClause} ${orderClause} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    const { rows: data } = await query(dataQuery, [...params, limit, offset]);

    return {
      data,
      count,
      hasMore: count > offset + limit,
      currentPage: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(count / limit)
    };
  } catch (error) {
    log.error('Optimized query error:', { error: error.message });
    throw error;
  }
};

/**
 * Batch query for multiple related tables
 */
export const getBatchedReportData = async (dateFilter) => {
  try {
    // Use Promise.all for parallel execution
    const [paymentsResult, subscriptionsResult, expensesResult] = await Promise.all([
      query(
        'SELECT id, amount, payment_date, payment_type, status FROM payments WHERE payment_date >= $1 AND payment_date <= $2 LIMIT 500',
        [dateFilter.startDate, dateFilter.endDate]
      ),
      query(
        'SELECT id, member_id, subscription_type, amount, status FROM subscriptions WHERE status = $1 LIMIT 500',
        ['active']
      ),
      query(
        'SELECT id, amount, expense_category, expense_date, status FROM expenses WHERE expense_date >= $1 AND expense_date <= $2 LIMIT 500',
        [dateFilter.startDate, dateFilter.endDate]
      )
    ]);

    return {
      payments: paymentsResult.rows || [],
      subscriptions: subscriptionsResult.rows || [],
      expenses: expensesResult.rows || []
    };
  } catch (error) {
    log.error('Batch query error:', { error: error.message });
    throw error;
  }
};

/**
 * Aggregated summary queries using database functions
 */
export const getAggregatedSummary = async (dateFilter) => {
  try {
    // Use database function for complex aggregations
    const { rows } = await query(
      'SELECT * FROM get_financial_summary($1, $2)',
      [dateFilter.startDate, dateFilter.endDate]
    );

    if (rows && rows.length > 0) {
      return rows[0];
    }

    // Fallback to manual aggregation if function not available
    return getFallbackAggregation(dateFilter);
  } catch (error) {
    log.error('Aggregation error:', { error: error.message });
    return getFallbackAggregation(dateFilter);
  }
};

/**
 * Fallback aggregation using optimized queries
 */
const getFallbackAggregation = async (dateFilter) => {
  const [revenue, expenses] = await Promise.all([
    getOptimizedRevenue(dateFilter),
    getOptimizedExpenses(dateFilter)
  ]);

  return {
    total_revenue: revenue,
    total_expenses: expenses,
    net_profit: revenue - expenses
  };
};

/**
 * Optimized revenue calculation
 */
const getOptimizedRevenue = async (dateFilter) => {
  const { rows } = await query(
    'SELECT amount FROM payments WHERE payment_date >= $1 AND payment_date <= $2 AND status = $3',
    [dateFilter.startDate, dateFilter.endDate, 'completed']
  );

  return rows?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;
};

/**
 * Optimized expense calculation
 */
const getOptimizedExpenses = async (dateFilter) => {
  const { rows } = await query(
    'SELECT amount FROM expenses WHERE expense_date >= $1 AND expense_date <= $2 AND status != $3',
    [dateFilter.startDate, dateFilter.endDate, 'deleted']
  );

  return rows?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0;
};

/**
 * Chunked data processing for very large datasets
 */
export const processLargeDataset = async (table, processor, options = {}) => {
  const chunkSize = options.chunkSize || 100;
  let offset = 0;
  let hasMore = true;
  const results = [];

  while (hasMore) {
    const { data, count } = await getOptimizedFinancialData({
      table,
      limit: chunkSize,
      offset,
      ...options
    });

    if (data && data.length > 0) {
      // Process chunk
      const processedChunk = await processor(data);
      results.push(...processedChunk);
      offset += chunkSize;
      hasMore = offset < count;
    } else {
      hasMore = false;
    }
  }

  return results;
};

/**
 * Create database indexes for performance
 * Run these queries in Supabase SQL editor for optimization
 */
export const getIndexCreationQueries = () => {
  return [
    // Index for payment date queries
    `CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date DESC);`,

    // Index for payment status
    `CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);`,

    // Composite index for date and status
    `CREATE INDEX IF NOT EXISTS idx_payments_date_status ON payments(payment_date DESC, status);`,

    // Index for expenses
    `CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date DESC);`,

    // Index for member lookups
    `CREATE INDEX IF NOT EXISTS idx_payments_member ON payments(member_id);`,

    // Index for hijri dates
    `CREATE INDEX IF NOT EXISTS idx_payments_hijri ON payments(hijri_year, hijri_month);`
  ];
};

/**
 * Cached query results with TTL
 */
const queryCache = new Map();
const CACHE_TTL = 60000; // 60 seconds

export const getCachedQuery = async (cacheKey, queryFn) => {
  const cached = queryCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const data = await queryFn();
  queryCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });

  // Clean old cache entries
  if (queryCache.size > 100) {
    const oldestKey = queryCache.keys().next().value;
    queryCache.delete(oldestKey);
  }

  return data;
};

/**
 * Stream large report data for exports
 */
export const streamReportData = async function* (options) {
  const pageSize = 100;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, count } = await getOptimizedFinancialData({
      ...options,
      limit: pageSize,
      offset
    });

    if (data && data.length > 0) {
      yield data;
      offset += pageSize;
      hasMore = offset < count;
    } else {
      hasMore = false;
    }
  }
};

export default {
  getOptimizedFinancialData,
  getBatchedReportData,
  getAggregatedSummary,
  processLargeDataset,
  getCachedQuery,
  streamReportData,
  getIndexCreationQueries
};