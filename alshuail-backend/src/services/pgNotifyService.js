/**
 * PostgreSQL Notification Listener Service
 * Listens to database NOTIFY events and forwards to Socket.io
 */

import pg from 'pg';
import { log } from '../utils/logger.js';
import { emitToAll } from './socketService.js';

const { Client } = pg;

let notifyClient = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 5000;

/**
 * Initialize the PostgreSQL notification listener
 */
export const initializePgNotify = async () => {
  try {
    // Create a dedicated client for LISTEN/NOTIFY
    notifyClient = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'alshuail_db',
      user: process.env.DB_USER || 'alshuail',
      password: process.env.DB_PASSWORD
    });

    await notifyClient.connect();
    log.info('[PgNotify] Connected to PostgreSQL for notifications');

    // Listen for db_changes channel
    await notifyClient.query('LISTEN db_changes');
    log.info('[PgNotify] Listening on db_changes channel');

    // Handle incoming notifications
    notifyClient.on('notification', (msg) => {
      try {
        const payload = JSON.parse(msg.payload);
        log.info('[PgNotify] Received notification', { 
          table: payload.table, 
          operation: payload.operation 
        });

        // Forward to Socket.io
        const eventName = payload.table + '_changed';
        emitToAll(eventName, payload);

        // Also emit generic event
        emitToAll('db_change', payload);

        reconnectAttempts = 0;
      } catch (err) {
        log.error('[PgNotify] Error processing notification', { error: err.message });
      }
    });

    // Handle connection errors
    notifyClient.on('error', (err) => {
      log.error('[PgNotify] Client error', { error: err.message });
      handleReconnect();
    });

    // Handle connection end
    notifyClient.on('end', () => {
      log.warn('[PgNotify] Connection ended');
      handleReconnect();
    });

    return true;
  } catch (err) {
    log.error('[PgNotify] Failed to initialize', { error: err.message });
    handleReconnect();
    return false;
  }
};

/**
 * Handle reconnection logic
 */
const handleReconnect = async () => {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    log.error('[PgNotify] Max reconnection attempts reached');
    return;
  }

  reconnectAttempts++;
  log.info('[PgNotify] Attempting reconnection', { attempt: reconnectAttempts });

  // Clean up old client
  if (notifyClient) {
    try {
      await notifyClient.end();
    } catch (e) {
      // Ignore cleanup errors
    }
    notifyClient = null;
  }

  // Wait before reconnecting
  setTimeout(async () => {
    await initializePgNotify();
  }, RECONNECT_DELAY);
};

/**
 * Get notification listener status
 */
export const getNotifyStatus = () => {
  return {
    connected: notifyClient !== null,
    reconnectAttempts,
    maxAttempts: MAX_RECONNECT_ATTEMPTS
  };
};

/**
 * Cleanup function
 */
export const closePgNotify = async () => {
  if (notifyClient) {
    try {
      await notifyClient.query('UNLISTEN db_changes');
      await notifyClient.end();
      log.info('[PgNotify] Disconnected');
    } catch (err) {
      log.error('[PgNotify] Error during cleanup', { error: err.message });
    }
    notifyClient = null;
  }
};

export default {
  initializePgNotify,
  getNotifyStatus,
  closePgNotify
};
