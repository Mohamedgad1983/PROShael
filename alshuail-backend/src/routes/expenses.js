import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import {
  getExpenses,
  createExpense,
  getExpenseStatistics,
  getExpenseById,
  updateExpense,
  approveExpense,
  deleteExpense
} from '../controllers/expensesController.js';
import { log } from '../utils/logger.js';
import { config } from '../config/env.js';

// Configure multer for receipt uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Allow images and PDFs
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مدعوم. يرجى رفع صورة أو ملف PDF'), false);
    }
  }
});

const router = express.Router();

/**
 * Authentication middleware to verify JWT token and attach user to request
 * Checks for Bearer token in Authorization header
 */
const authenticateUser = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'رمز التوثيق مطلوب',
        message_ar: 'رمز التوثيق مطلوب'
      });
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(403).json({
        success: false,
        error: 'رمز التوثيق غير صالح أو منتهي الصلاحية',
        message_ar: 'رمز التوثيق غير صالح أو منتهي الصلاحية'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'خطأ في المصادقة',
      message_ar: 'خطأ في المصادقة'
    });
  }
};

/**
 * Role-based authorization middleware
 * Checks if user has required role for financial operations
 */
const requireFinancialAccess = (req, res, next) => {
  const userRole = req.user?.role;
  const userPermissions = req.user?.permissions;

  // Check if user has financial access through role or permissions
  const allowedRoles = ['super_admin', 'financial_manager', 'operational_manager', 'admin'];
  const hasRoleAccess = userRole && allowedRoles.includes(userRole);
  const hasPermissionAccess = userPermissions && (
    userPermissions.all_access === true ||
    userPermissions.manage_finances === true ||
    userPermissions.view_reports === true
  );

  if (!hasRoleAccess && !hasPermissionAccess) {
    log.warn(`Financial access denied for user role: ${userRole}, permissions: ${JSON.stringify(userPermissions)}`);
    return res.status(403).json({
      success: false,
      error: 'ليس لديك صلاحية للوصول إلى العمليات المالية',
      message_ar: 'ليس لديك صلاحية للوصول إلى العمليات المالية'
    });
  }

  next();
};

// Apply authentication middleware to all expense routes
router.use(authenticateUser);

// GET /api/expenses - Get all expenses with filtering
// Supports query parameters: category, status, date_from, date_to, hijri_month, hijri_year, limit, offset, search, sort_by
router.get('/', requireFinancialAccess, getExpenses);

// POST /api/expenses - Create new expense
// Requires role: admin, financial_manager, treasurer
// Uses multer middleware to handle multipart/form-data with optional receipt_image
router.post('/', requireFinancialAccess, upload.single('receipt_image'), createExpense);

// GET /api/expenses/statistics - Get expense statistics
// Returns aggregated expense data, trends, and category breakdowns
router.get('/statistics', requireFinancialAccess, getExpenseStatistics);

// GET /api/expenses/:expenseId - Get expense by ID
// Returns detailed expense information including approval history
router.get('/:expenseId', requireFinancialAccess, getExpenseById);

// PUT /api/expenses/:expenseId - Update expense
// Allows updating expense details (only for pending expenses)
router.put('/:expenseId', requireFinancialAccess, updateExpense);

// PUT /api/expenses/:expenseId/approval - Approve/reject expense
// Handles expense approval workflow with audit trail
router.put('/:expenseId/approval', requireFinancialAccess, approveExpense);

// DELETE /api/expenses/:expenseId - Delete expense
// Soft delete with audit trail (only for pending expenses)
router.delete('/:expenseId', requireFinancialAccess, deleteExpense);

export default router;