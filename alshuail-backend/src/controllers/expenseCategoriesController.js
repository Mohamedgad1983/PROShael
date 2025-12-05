/**
 * Expense Categories Controller
 * Handles CRUD operations for expense categories with role-based access
 */

import { supabase } from '../config/database.js';
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

    let query = supabase
      .from('expense_categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('category_name_ar', { ascending: true });

    // Filter out inactive categories by default
    if (include_inactive !== 'true') {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      log.error('Error fetching expense categories:', error);
      return res.status(500).json({
        success: false,
        error: 'فشل في جلب فئات المصروفات',
        error_en: 'Failed to fetch expense categories'
      });
    }

    // Transform data to match frontend expectations
    const categories = data.map(cat => ({
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
    const { data: existing } = await supabase
      .from('expense_categories')
      .select('id')
      .eq('category_code', generatedCode)
      .single();

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'كود الفئة موجود مسبقاً',
        error_en: 'Category code already exists'
      });
    }

    // Insert new category
    const { data, error } = await supabase
      .from('expense_categories')
      .insert([{
        category_code: generatedCode,
        category_name_ar,
        category_name_en: category_name_en || category_name_ar,
        color_code,
        icon_name,
        is_active: true,
        is_system: false,
        sort_order,
        created_by: userId,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      log.error('Error creating expense category:', error);
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
    const { data: existingCategory, error: fetchError } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingCategory) {
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

    // Build update object
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (category_name_ar !== undefined) updateData.category_name_ar = category_name_ar;
    if (category_name_en !== undefined) updateData.category_name_en = category_name_en;
    if (color_code !== undefined) updateData.color_code = color_code;
    if (icon_name !== undefined) updateData.icon_name = icon_name;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('expense_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      log.error('Error updating expense category:', error);
      return res.status(500).json({
        success: false,
        error: 'فشل في تحديث فئة المصروفات',
        error_en: 'Failed to update expense category'
      });
    }

    // Log successful update
    await logFinancialAccess(userId, 'SUCCESS', 'expense_category_update', userRole, {
      category_id: id,
      changes: updateData
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
    const { data: existingCategory, error: fetchError } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingCategory) {
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
    const { data: usedExpenses, error: usageError } = await supabase
      .from('expenses')
      .select('id')
      .eq('expense_category', existingCategory.category_code)
      .limit(1);

    if (!usageError && usedExpenses && usedExpenses.length > 0) {
      // Soft delete instead of hard delete if category is in use
      const { error: softDeleteError } = await supabase
        .from('expense_categories')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (softDeleteError) {
        log.error('Error soft-deleting expense category:', softDeleteError);
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
    const { error } = await supabase
      .from('expense_categories')
      .delete()
      .eq('id', id);

    if (error) {
      log.error('Error deleting expense category:', error);
      return res.status(500).json({
        success: false,
        error: 'فشل في حذف فئة المصروفات',
        error_en: 'Failed to delete expense category'
      });
    }

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

    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
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
