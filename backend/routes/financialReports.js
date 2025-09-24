import express from 'express';
import jwt from 'jsonwebtoken';
import {
  getFinancialSummary,
  generateForensicReport,
  getCashFlowAnalysis,
  getBudgetVarianceReport
} from '../controllers/financialReportsController.js';

const router = express.Router();

/**
 * Authentication middleware to verify JWT token and attach user to request
 * Checks for Bearer token in Authorization header
 */
const authenticateUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'رمز التوثيق مطلوب'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'رمز التوثيق غير صالح'
    });
  }
};

/**
 * Role-based authorization middleware for financial reports
 * Requires higher-level access for sensitive financial data
 */
const requireFinancialReportAccess = (req, res, next) => {
  const userRole = req.user?.role;

  if (!userRole || !['admin', 'financial_manager', 'treasurer', 'auditor'].includes(userRole)) {
    return res.status(403).json({
      success: false,
      error: 'ليس لديك صلاحية للوصول إلى التقارير المالية'
    });
  }

  next();
};

/**
 * Enhanced authorization for forensic reports
 * Only admin and auditor roles can access forensic reports
 */
const requireForensicAccess = (req, res, next) => {
  const userRole = req.user?.role;

  if (!userRole || !['admin', 'auditor'].includes(userRole)) {
    return res.status(403).json({
      success: false,
      error: 'ليس لديك صلاحية للوصول إلى التقارير التدقيقية'
    });
  }

  next();
};

// Apply authentication middleware to all financial report routes
router.use(authenticateUser);

// GET /api/reports/financial-summary - Get comprehensive financial summary
// Returns overview of income, expenses, net position, and key metrics
// Supports query parameters: period, hijri_month, hijri_year, date_from, date_to
router.get('/financial-summary', requireFinancialReportAccess, getFinancialSummary);

// GET /api/reports/forensic - Generate forensic report
// Returns detailed audit trail, suspicious activities, and compliance analysis
// Restricted to admin and auditor roles only
// Supports query parameters: period, focus_area, risk_level, date_from, date_to
router.get('/forensic', requireForensicAccess, generateForensicReport);

// GET /api/reports/cash-flow - Get cash flow analysis
// Returns detailed cash flow statement with inflows, outflows, and projections
// Supports query parameters: period, granularity, hijri_calendar, forecast_months
router.get('/cash-flow', requireFinancialReportAccess, getCashFlowAnalysis);

// GET /api/reports/budget-variance - Get budget variance report
// Returns comparison between budgeted vs actual expenses and income
// Supports query parameters: period, category, variance_threshold, hijri_month, hijri_year
router.get('/budget-variance', requireFinancialReportAccess, getBudgetVarianceReport);

export default router;