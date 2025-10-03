import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getAllMembers,
  createMember,
  updateMember,
  updateMemberRole,
  softDeleteMember,
  getRoles
} from '../controllers/membersController.js';

const router = express.Router();

// ============================================================
// Protected Routes (Authentication required for all member operations)
// ============================================================

// All member routes require authentication
router.use(authenticate);

// Get all family members
router.get('/', getAllMembers);

// Get available roles
router.get('/roles', getRoles);

// Create new member (admin/super_admin only)
router.post('/', createMember);

// Update member information (admin/super_admin only)
router.put('/:id', updateMember);

// Update member role specifically (admin/super_admin only)
router.put('/:id/role', updateMemberRole);

// Deactivate member (admin/super_admin only)
router.delete('/:id', softDeleteMember);

export default router;