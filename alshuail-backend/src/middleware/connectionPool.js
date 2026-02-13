// Connection Pooling Middleware for PostgreSQL
// alshuail-backend/src/middleware/connectionPool.js

import { Pool } from 'pg';
import { log } from '../utils/logger.js';

const poolConfig = {
  max: 20, // Maximum pool size
  min: 5, // Minimum pool size
  idleTimeoutMillis: 30000, // Close idle clients after 30s
  connectionTimeoutMillis: 2000, // Return error after 2s if no connection available
  maxUses: 7500, // Close connections after 7500 uses
};

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ...poolConfig,
});

// Monitor pool events
pool.on('connect', (client) => {
  log.debug('Pool: New client connected');
});

pool.on('acquire', (client) => {
  log.debug('Pool: Client acquired from pool');
});

pool.on('remove', (client) => {
  log.debug('Pool: Client removed from pool');
});

pool.on('error', (err, client) => {
  log.error('Pool: Unexpected error', { error: err.message, stack: err.stack });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await pool.end();
  log.info('Pool: Pool has ended');
  process.exit(0);
});

export default pool;
