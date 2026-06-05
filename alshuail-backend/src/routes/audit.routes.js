/**
 * Audit Log Routes
 * 
 * @module audit.routes
 */

import express from 'express';
import { authenticateToken, authorize } from '../middleware/auth.js';
import auditController from '../controllers/audit.controller.js';

const router = express.Router();
const auditReaders = ['super_admin', 'admin'];

// Get audit logs with filtering
router.get('/logs', authenticateToken, authorize(auditReaders), auditController.getAuditLogs);

// Get audit statistics
router.get('/stats', authenticateToken, authorize(auditReaders), auditController.getAuditStats);

// Get available action types
router.get('/actions', authenticateToken, authorize(auditReaders), auditController.getActionTypes);

// Export audit logs
router.get('/export', authenticateToken, authorize(auditReaders), auditController.exportAuditLogs);

// Get audit log by ID
router.get('/logs/:id', authenticateToken, authorize(auditReaders), auditController.getAuditLogById);

export default router;
