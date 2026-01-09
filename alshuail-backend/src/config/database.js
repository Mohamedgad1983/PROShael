/**
 * Database Configuration - PostgreSQL Direct Connection
 * Uses Supabase-compatible API for seamless controller compatibility
 */

import pgQueryBuilder, { testConnection as pgTestConnection, getPool, closePool } from './pgQueryBuilder.js';
import { log } from '../utils/logger.js';

// Re-export the Supabase-compatible interface
export const supabase = pgQueryBuilder;
export const testConnection = pgTestConnection;
export { getPool, closePool };

// Export pool for direct queries
export const pool = getPool();

// Log which database mode is being used on module load
log.info('[Database] Using PostgreSQL direct connection', {
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'alshuail_db'
});
