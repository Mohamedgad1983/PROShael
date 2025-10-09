/**
import { log } from '../utils/logger.js';
 * Optimized Report Query Service
 * Implements performance optimizations for large dataset queries
 * Target: < 3 seconds for 1000+ records
 */

import { supabase } from '../config/database.js';

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
    let query = supabase
      .from(table)
      .select(selectColumns, { count: 'exact' });

    // Apply date range filters (use indexes)
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    // Apply additional filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });

    // Apply pagination and ordering
    query = query
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) throw error;

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
  const queries = [];

  // Use Promise.all for parallel execution
  // Limit fields to reduce payload size
  queries.push(
    supabase
      .from('payments')
      .select('id, amount, payment_date, payment_type, status')
      .gte('payment_date', dateFilter.startDate)
      .lte('payment_date', dateFilter.endDate)
      .limit(500)
  );

  queries.push(
    supabase
      .from('subscriptions')
      .select('id, member_id, subscription_type, amount, status')
      .eq('status', 'active')
      .limit(500)
  );

  queries.push(
    supabase
      .from('expenses')
      .select('id, amount, expense_category, expense_date, status')
      .gte('expense_date', dateFilter.startDate)
      .lte('expense_date', dateFilter.endDate)
      .limit(500)
  );

  try {
    const results = await Promise.all(queries);
    return {
      payments: results[0].data || [],
      subscriptions: results[1].data || [],
      expenses: results[2].data || []
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
    // Use RPC for complex aggregations (requires database functions)
    const { data: summary, error } = await supabase
      .rpc('get_financial_summary', {
        start_date: dateFilter.startDate,
        end_date: dateFilter.endDate
      });

    if (error) {
      // Fallback to manual aggregation if RPC not available
      return await getFallbackAggregation(dateFilter);
    }

    return summary;
  } catch (error) {
    log.error('Aggregation error:', { error: error.message });
    return await getFallbackAggregation(dateFilter);
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
  const { data } = await supabase
    .from('payments')
    .select('amount')
    .gte('payment_date', dateFilter.startDate)
    .lte('payment_date', dateFilter.endDate)
    .eq('status', 'completed');

  return data?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;
};

/**
 * Optimized expense calculation
 */
const getOptimizedExpenses = async (dateFilter) => {
  const { data } = await supabase
    .from('expenses')
    .select('amount')
    .gte('expense_date', dateFilter.startDate)
    .lte('expense_date', dateFilter.endDate)
    .neq('status', 'deleted');

  return data?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0;
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