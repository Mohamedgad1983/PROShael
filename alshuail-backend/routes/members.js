const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getAllMembers,
  createMember,
  updateMember,
  updateMemberRole,
  softDeleteMember,
  getRoles
} = require('../controllers/membersController');

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

module.exports = router;