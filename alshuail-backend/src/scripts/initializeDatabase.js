import { DatabaseOptimizationService } from '../services/databaseOptimizationService.js';
import { query } from '../services/database.js';
import { log } from '../utils/logger.js';

/**
 * Database Initialization Script
 * Run this script to set up all database optimizations
 */
async function initializeDatabase() {
  log.info('Starting database initialization...');

  try {
    // Test connection first
    try {
      await query('SELECT id FROM payments LIMIT 1');
    } catch (testError) {
      log.error('Database connection failed:', testError.message);
      return false;
    }

    log.info('Database connection successful');

    // Run full optimization
    const result = await DatabaseOptimizationService.runFullOptimization();

    if (result.success) {
      log.info('Database initialization completed successfully!');
      log.info('Results:', JSON.stringify(result.data, null, 2));
    } else {
      log.error('Database initialization failed:', result.error);
    }

    return result.success;

  } catch (error) {
    log.error('Database initialization error:', error.message);
    return false;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      log.error('Fatal error:', error);
      process.exit(1);
    });
}

export { initializeDatabase };
