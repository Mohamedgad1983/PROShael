/**
 * Expense Categories Routes
 * Handles CRUD operations for expense categories
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import {
  getExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  getExpenseCategoryById
} from '../controllers/expenseCategoriesController.js';
import { log } from '../utils/logger.js';
import { config } from '../config/env.js';

const router = express.Router();

/**
 * Authentication middleware to verify JWT token and attach user to request
 */
const authenticateUser = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'رمز التوثيق مطلوب',
        error_en: 'Authentication token required'
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
        error_en: 'Invalid or expired authentication token'
      });
    }
  } catch (error) {
    log.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'خطأ في المصادقة',
      error_en: 'Authentication error'
    });
  }
};

/**
 * Role-based authorization middleware for financial operations
 */
const requireFinancialAccess = (req, res, next) => {
  const userRole = req.user?.role;
  const userPermissions = req.user?.permissions;

  const allowedRoles = ['super_admin', 'financial_manager', 'operational_manager', 'admin'];
  const hasRoleAccess = userRole && allowedRoles.includes(userRole);
  const hasPermissionAccess = userPermissions && (
    userPermissions.all_access === true ||
    userPermissions.manage_finances === true
  );

  if (!hasRoleAccess && !hasPermissionAccess) {
    log.warn(`Financial access denied for expense categories: role=${userRole}`);
    return res.status(403).json({
      success: false,
      error: 'ليس لديك صلاحية للوصول إلى فئات المصروفات',
      error_en: 'You do not have permission to access expense categories'
    });
  }

  next();
};

// Apply authentication middleware to all routes
router.use(authenticateUser);

// GET /api/expense-categories - Get all expense categories
// Query params: include_inactive (boolean)
router.get('/', getExpenseCategories);

// POST /api/expense-categories - Create new expense category
// Body: { category_code?, category_name_ar, category_name_en?, color_code?, icon_name?, sort_order? }
router.post('/', requireFinancialAccess, createExpenseCategory);

// GET /api/expense-categories/:id - Get expense category by ID
router.get('/:id', getExpenseCategoryById);

// PUT /api/expense-categories/:id - Update expense category
// Body: { category_name_ar?, category_name_en?, color_code?, icon_name?, sort_order?, is_active? }
router.put('/:id', requireFinancialAccess, updateExpenseCategory);

// DELETE /api/expense-categories/:id - Delete expense category
// Soft deletes if category is in use, hard deletes otherwise
router.delete('/:id', requireFinancialAccess, deleteExpenseCategory);

export default router;
