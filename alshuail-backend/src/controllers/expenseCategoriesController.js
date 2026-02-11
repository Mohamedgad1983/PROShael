/**
 * Expense Categories Controller
 * Handles CRUD operations for expense categories with role-based access
 */

import { query } from '../services/database.js';
import { hasFinancialAccess, logFinancialAccess } from '../utils/accessControl.js';
import { log } from '../utils/logger.js';

/**
 * Get all expense categories
 * @route GET /api/expense-categories
 */
export const getExpenseCategories = async (req, res) => {
  try {
    const { include_inactive = 'false' } = req.query;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // Log access attempt
    await logFinancialAccess(userId, 'GRANTED', 'expense_categories_view', userRole, {}, req.ip);

    let sql = 'SELECT * FROM expense_categories';
    const params = [];

    // Filter out inactive categories by default
    if (include_inactive !== 'true') {
      sql += ' WHERE is_active = $1';
      params.push(true);
    }

    sql += ' ORDER BY sort_order ASC, category_name_ar ASC';

    const { rows } = await query(sql, params);

    // Transform data to match frontend expectations
    const categories = rows.map(cat => ({
      id: cat.id,
      value: cat.category_code,
      label_ar: cat.category_name_ar,
      label_en: cat.category_name_en,
      color_code: cat.color_code,
      icon_name: cat.icon_name,
      is_system: cat.is_system,
      is_active: cat.is_active,
      sort_order: cat.sort_order,
      created_at: cat.created_at,
      created_by: cat.created_by
    }));

    return res.json({
      success: true,
      data: categories,
      total: categories.length
    });
  } catch (error) {
    log.error('Error in getExpenseCategories:', error);
    return res.status(500).json({
      success: false,
      error: 'خطأ في الخادم',
      error_en: 'Server error'
    });
  }
};

/**
 * Create a new expense category
 * @route POST /api/expense-categories
 */
export const createExpenseCategory = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // Check financial access
    if (!hasFinancialAccess(userRole)) {
      await logFinancialAccess(userId, 'DENIED', 'expense_category_create', userRole, {}, req.ip);
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية لإنشاء فئات المصروفات',
        error_en: 'You do not have permission to create expense categories'
      });
    }

    const {
      category_code,
      category_name_ar,
      category_name_en,
      color_code = '#6B7280',
      icon_name = 'tag',
      sort_order = 100
    } = req.body;

    // Validate required fields
    if (!category_name_ar) {
      return res.status(400).json({
        success: false,
        error: 'اسم الفئة بالعربية مطلوب',
        error_en: 'Arabic category name is required'
      });
    }

    // Generate category_code from Arabic name if not provided
    const generatedCode = category_code ||
      category_name_ar
        .toLowerCase()
        .replace(/[\u0600-\u06FF\s]+/g, '_')
        .replace(/^_|_$/g, '') ||
      `cat_${Date.now()}`;

    // Check for duplicate category_code
    const { rows: existingRows } = await query(
      'SELECT id FROM expense_categories WHERE category_code = $1',
      [generatedCode]
    );

    if (existingRows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'كود الفئة موجود مسبقاً',
        error_en: 'Category code already exists'
      });
    }

    // Insert new category
    const { rows } = await query(
      `INSERT INTO expense_categories (
        category_code, category_name_ar, category_name_en, color_code,
        icon_name, is_active, is_system, sort_order, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        generatedCode,
        category_name_ar,
        category_name_en || category_name_ar,
        color_code,
        icon_name,
        true,
        false,
        sort_order,
        userId,
        new Date().toISOString()
      ]
    );

    const data = rows[0];

    if (!data) {
      log.error('Error creating expense category: no row returned');
      return res.status(500).json({
        success: false,
        error: 'فشل في إنشاء فئة المصروفات',
        error_en: 'Failed to create expense category'
      });
    }

    // Log successful creation
    await logFinancialAccess(userId, 'SUCCESS', 'expense_category_create', userRole, {
      category_id: data.id,
      category_code: data.category_code
    }, req.ip);

    log.info(`Expense category created: ${data.category_code} by user ${userId}`);

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء الفئة بنجاح',
      message_en: 'Category created successfully',
      data: {
        id: data.id,
        value: data.category_code,
        label_ar: data.category_name_ar,
        label_en: data.category_name_en,
        color_code: data.color_code,
        icon_name: data.icon_name,
        is_system: data.is_system,
        is_active: data.is_active,
        sort_order: data.sort_order,
        created_at: data.created_at,
        created_by: data.created_by
      }
    });
  } catch (error) {
    log.error('Error in createExpenseCategory:', error);
    return res.status(500).json({
      success: false,
      error: 'خطأ في الخادم',
      error_en: 'Server error'
    });
  }
};

/**
 * Update an expense category
 * @route PUT /api/expense-categories/:id
 */
export const updateExpenseCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // Check financial access
    if (!hasFinancialAccess(userRole)) {
      await logFinancialAccess(userId, 'DENIED', 'expense_category_update', userRole, {}, req.ip);
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية لتعديل فئات المصروفات',
        error_en: 'You do not have permission to update expense categories'
      });
    }

    // Check if category exists
    const { rows: existingRows } = await query(
      'SELECT * FROM expense_categories WHERE id = $1', [id]
    );
    const existingCategory = existingRows[0];

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        error: 'الفئة غير موجودة',
        error_en: 'Category not found'
      });
    }

    // Prevent modifying system categories (except by super_admin)
    if (existingCategory.is_system && userRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'لا يمكن تعديل فئات النظام',
        error_en: 'Cannot modify system categories'
      });
    }

    const {
      category_name_ar,
      category_name_en,
      color_code,
      icon_name,
      sort_order,
      is_active
    } = req.body;

    // Build dynamic update
    const setClauses = ['updated_at = $1'];
    const params = [new Date().toISOString()];
    let paramIndex = 2;

    if (category_name_ar !== undefined) { setClauses.push(`category_name_ar = $${paramIndex++}`); params.push(category_name_ar); }
    if (category_name_en !== undefined) { setClauses.push(`category_name_en = $${paramIndex++}`); params.push(category_name_en); }
    if (color_code !== undefined) { setClauses.push(`color_code = $${paramIndex++}`); params.push(color_code); }
    if (icon_name !== undefined) { setClauses.push(`icon_name = $${paramIndex++}`); params.push(icon_name); }
    if (sort_order !== undefined) { setClauses.push(`sort_order = $${paramIndex++}`); params.push(sort_order); }
    if (is_active !== undefined) { setClauses.push(`is_active = $${paramIndex++}`); params.push(is_active); }

    params.push(id);

    const { rows } = await query(
      `UPDATE expense_categories SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    const data = rows[0];

    if (!data) {
      log.error('Error updating expense category: no row returned');
      return res.status(500).json({
        success: false,
        error: 'فشل في تحديث فئة المصروفات',
        error_en: 'Failed to update expense category'
      });
    }

    // Log successful update
    await logFinancialAccess(userId, 'SUCCESS', 'expense_category_update', userRole, {
      category_id: id,
      changes: req.body
    }, req.ip);

    log.info(`Expense category updated: ${id} by user ${userId}`);

    return res.json({
      success: true,
      message: 'تم تحديث الفئة بنجاح',
      message_en: 'Category updated successfully',
      data: {
        id: data.id,
        value: data.category_code,
        label_ar: data.category_name_ar,
        label_en: data.category_name_en,
        color_code: data.color_code,
        icon_name: data.icon_name,
        is_system: data.is_system,
        is_active: data.is_active,
        sort_order: data.sort_order,
        created_at: data.created_at,
        updated_at: data.updated_at
      }
    });
  } catch (error) {
    log.error('Error in updateExpenseCategory:', error);
    return res.status(500).json({
      success: false,
      error: 'خطأ في الخادم',
      error_en: 'Server error'
    });
  }
};

/**
 * Delete (soft delete) an expense category
 * @route DELETE /api/expense-categories/:id
 */
export const deleteExpenseCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // Check financial access
    if (!hasFinancialAccess(userRole)) {
      await logFinancialAccess(userId, 'DENIED', 'expense_category_delete', userRole, {}, req.ip);
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية لحذف فئات المصروفات',
        error_en: 'You do not have permission to delete expense categories'
      });
    }

    // Check if category exists
    const { rows: existingRows } = await query(
      'SELECT * FROM expense_categories WHERE id = $1', [id]
    );
    const existingCategory = existingRows[0];

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        error: 'الفئة غير موجودة',
        error_en: 'Category not found'
      });
    }

    // Prevent deleting system categories
    if (existingCategory.is_system) {
      return res.status(403).json({
        success: false,
        error: 'لا يمكن حذف فئات النظام',
        error_en: 'Cannot delete system categories'
      });
    }

    // Check if category is used in expenses
    const { rows: usedExpenses } = await query(
      'SELECT id FROM expenses WHERE expense_category = $1 LIMIT 1',
      [existingCategory.category_code]
    );

    if (usedExpenses && usedExpenses.length > 0) {
      // Soft delete instead of hard delete if category is in use
      const { rowCount } = await query(
        'UPDATE expense_categories SET is_active = $1, updated_at = $2 WHERE id = $3',
        [false, new Date().toISOString(), id]
      );

      if (rowCount === 0) {
        log.error('Error soft-deleting expense category');
        return res.status(500).json({
          success: false,
          error: 'فشل في إلغاء تفعيل فئة المصروفات',
          error_en: 'Failed to deactivate expense category'
        });
      }

      await logFinancialAccess(userId, 'SUCCESS', 'expense_category_soft_delete', userRole, {
        category_id: id,
        reason: 'Category in use by expenses'
      }, req.ip);

      return res.json({
        success: true,
        message: 'تم إلغاء تفعيل الفئة (مستخدمة في مصروفات)',
        message_en: 'Category deactivated (used in expenses)',
        soft_deleted: true
      });
    }

    // Hard delete if category is not in use
    await query('DELETE FROM expense_categories WHERE id = $1', [id]);

    // Log successful deletion
    await logFinancialAccess(userId, 'SUCCESS', 'expense_category_delete', userRole, {
      category_id: id,
      category_code: existingCategory.category_code
    }, req.ip);

    log.info(`Expense category deleted: ${id} by user ${userId}`);

    return res.json({
      success: true,
      message: 'تم حذف الفئة بنجاح',
      message_en: 'Category deleted successfully'
    });
  } catch (error) {
    log.error('Error in deleteExpenseCategory:', error);
    return res.status(500).json({
      success: false,
      error: 'خطأ في الخادم',
      error_en: 'Server error'
    });
  }
};

/**
 * Get a single expense category by ID
 * @route GET /api/expense-categories/:id
 */
export const getExpenseCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await query(
      'SELECT * FROM expense_categories WHERE id = $1', [id]
    );
    const data = rows[0];

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'الفئة غير موجودة',
        error_en: 'Category not found'
      });
    }

    return res.json({
      success: true,
      data: {
        id: data.id,
        value: data.category_code,
        label_ar: data.category_name_ar,
        label_en: data.category_name_en,
        color_code: data.color_code,
        icon_name: data.icon_name,
        is_system: data.is_system,
        is_active: data.is_active,
        sort_order: data.sort_order,
        created_at: data.created_at,
        created_by: data.created_by
      }
    });
  } catch (error) {
    log.error('Error in getExpenseCategoryById:', error);
    return res.status(500).json({
      success: false,
      error: 'خطأ في الخادم',
      error_en: 'Server error'
    });
  }
};

export default {
  getExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  getExpenseCategoryById
};
