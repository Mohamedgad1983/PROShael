/**
 * Audit Log Routes
 * 
 * @module audit.routes
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import auditController from '../controllers/audit.controller.js';

const router = express.Router();

// Get audit logs with filtering
router.get('/logs', authenticateToken, auditController.getAuditLogs);

// Get audit statistics
router.get('/stats', authenticateToken, auditController.getAuditStats);

// Get available action types
router.get('/actions', authenticateToken, auditController.getActionTypes);

// Export audit logs
router.get('/export', authenticateToken, auditController.exportAuditLogs);

// Get audit log by ID
router.get('/logs/:id', authenticateToken, auditController.getAuditLogById);

export default router;
