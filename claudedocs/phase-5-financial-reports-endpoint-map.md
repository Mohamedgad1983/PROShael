# Phase 5 Step 2: Financial Reports Controller - Endpoint Map

**Controller**: `src/controllers/financialReportsController.js` (893 lines)
**Routes**: `src/routes/financialReports.js` (96 lines)
**Created**: 2025-10-11
**Status**: Analysis Complete - Ready for Test Implementation

## Executive Summary

The Financial Reports Controller provides comprehensive financial analytics and reporting capabilities with Hijri calendar integration, forensic analysis, and multiple export formats. All endpoints require authentication and role-based access control.

**Test Estimation**: 15-18 integration tests covering all endpoints, RBAC scenarios, query parameters, and error handling.

---

## Authentication & Authorization Architecture

### Middleware Stack

1. **`authenticateUser`** (lines 16-36 in routes)
   - JWT token verification
   - Extracts user ID and role from token
   - Sets `req.user = { id, role }`
   - Returns 401 if token invalid/missing

2. **`requireFinancialReportAccess`** (lines 42-53 in routes)
   - Allowed roles: `admin`, `financial_manager`, `treasurer`, `auditor`
   - Checks against `req.user.role`
   - Returns 403 if unauthorized

3. **`requireForensicAccess`** (lines 59-70 in routes)
   - **Stricter access**: `admin`, `auditor` only
   - Used for forensic and budget variance reports
   - Returns 403 if unauthorized

### RBAC Matrix

| Endpoint | Middleware | Allowed Roles | Access Level |
|----------|-----------|---------------|--------------|
| Financial Summary | `requireFinancialReportAccess` | admin, financial_manager, treasurer, auditor | Standard |
| Forensic Report | `requireForensicAccess` | admin, auditor | Enhanced |
| Cash Flow Analysis | `requireFinancialReportAccess` | admin, financial_manager, treasurer, auditor | Standard |
| Budget Variance | `requireForensicAccess` | admin, auditor | Enhanced |

---

## Endpoint 1: Financial Summary

### Route Definition
```javascript
GET /api/reports/financial-summary
Middleware: authenticateUser, requireFinancialReportAccess
Controller: getFinancialSummary (lines 41-228)
```

### Access Control
- **Authentication**: Required (JWT)
- **Authorization**: admin, financial_manager, treasurer, auditor
- **Access Logging**: Yes (via `logFinancialAccess()`)

### Query Parameters

| Parameter | Type | Required | Default | Description | Example |
|-----------|------|----------|---------|-------------|---------|
| `period` | string | No | 'monthly' | Time period for aggregation | 'yearly', 'monthly', 'quarterly' |
| `year` | integer | No | Current year | Gregorian year | 2025 |
| `month` | integer | No | Current month | Gregorian month (1-12) | 10 |
| `hijri_year` | integer | No | - | Hijri year | 1447 |
| `hijri_month` | integer | No | - | Hijri month (1-12) | 4 |
| `include_details` | boolean | No | false | Include detailed breakdowns | true |
| `format` | string | No | 'json' | Export format | 'json', 'pdf', 'excel' |

### Request Examples

**Basic Financial Summary (Current Month)**:
```http
GET /api/reports/financial-summary
Authorization: Bearer <jwt_token>
```

**Yearly Summary with Details**:
```http
GET /api/reports/financial-summary?period=yearly&year=2025&include_details=true
Authorization: Bearer <jwt_token>
```

**Hijri Calendar Summary**:
```http
GET /api/reports/financial-summary?period=monthly&hijri_year=1447&hijri_month=4
Authorization: Bearer <jwt_token>
```

**PDF Export**:
```http
GET /api/reports/financial-summary?period=yearly&year=2025&format=pdf
Authorization: Bearer <jwt_token>
```

### Response Structure

**Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "period": {
      "type": "monthly",
      "gregorian": {
        "year": 2025,
        "month": 10,
        "label": "October 2025"
      },
      "hijri": {
        "year": 1447,
        "month": 4,
        "label": "ربيع الآخر 1447"
      }
    },
    "revenue": {
      "total": 150000,
      "breakdown": {
        "membership_fees": 80000,
        "subscriptions": 45000,
        "donations": 25000
      }
    },
    "expenses": {
      "total": 95000,
      "breakdown": {
        "operational": 45000,
        "events": 30000,
        "utilities": 20000
      }
    },
    "netIncome": 55000,
    "profitMargin": 36.67,
    "previousPeriod": {
      "revenue": 140000,
      "expenses": 90000,
      "netIncome": 50000
    },
    "changePercentage": {
      "revenue": 7.14,
      "expenses": 5.56,
      "netIncome": 10.00
    }
  },
  "metadata": {
    "generated_at": "2025-10-11T14:30:00Z",
    "generated_by": "user_id_123",
    "report_type": "financial_summary"
  }
}
```

**With Details (`include_details=true`)**:
```json
{
  "success": true,
  "data": {
    // ... (same as above) ...
    "details": {
      "revenue_transactions": [
        {
          "date": "2025-10-05",
          "type": "membership_fee",
          "amount": 5000,
          "member_id": "mem_123",
          "description": "Annual membership renewal"
        }
        // ... more transactions
      ],
      "expense_transactions": [
        {
          "date": "2025-10-08",
          "type": "operational",
          "amount": 3000,
          "category": "office_supplies",
          "description": "Office equipment purchase"
        }
        // ... more transactions
      ]
    }
  }
}
```

### Error Responses

**401 Unauthorized** (No/Invalid JWT):
```json
{
  "success": false,
  "error": "Authentication required",
  "code": "AUTH_REQUIRED"
}
```

**403 Forbidden** (Insufficient Role):
```json
{
  "success": false,
  "error": "Insufficient permissions to access financial reports",
  "code": "FORBIDDEN"
}
```

**400 Bad Request** (Invalid Parameters):
```json
{
  "success": false,
  "error": "Invalid period parameter. Must be 'monthly', 'quarterly', or 'yearly'",
  "code": "INVALID_PARAMS"
}
```

**500 Internal Server Error** (Database/Processing Error):
```json
{
  "success": false,
  "error": "Failed to generate financial summary",
  "code": "REPORT_GENERATION_FAILED"
}
```

### Test Scenarios (5 tests)

1. **✓ Successful Financial Summary Retrieval (admin)**
   - Valid JWT with admin role
   - Default parameters (current month)
   - Expect 200 with complete financial data structure

2. **✓ Yearly Summary with Details (financial_manager)**
   - Valid JWT with financial_manager role
   - Query: `period=yearly&year=2025&include_details=true`
   - Expect 200 with detailed transaction breakdowns

3. **✓ Hijri Calendar Integration (treasurer)**
   - Valid JWT with treasurer role
   - Query: `hijri_year=1447&hijri_month=4`
   - Expect 200 with Hijri date labels

4. **✗ Unauthorized Access (member role)**
   - Valid JWT with member role (not in allowed list)
   - Expect 403 Forbidden

5. **✗ Invalid Parameters**
   - Valid JWT with admin role
   - Query: `period=invalid_period`
   - Expect 400 Bad Request

---

## Endpoint 2: Forensic Report

### Route Definition
```javascript
GET /api/reports/forensic
Middleware: authenticateUser, requireForensicAccess
Controller: generateForensicReport (lines 234-398)
```

### Access Control
- **Authentication**: Required (JWT)
- **Authorization**: admin, auditor (stricter than other reports)
- **Access Logging**: Yes (via `logFinancialAccess()`)

### Query Parameters

| Parameter | Type | Required | Default | Description | Example |
|-----------|------|----------|---------|-------------|---------|
| `report_type` | string | Yes | - | Type of forensic analysis | 'revenue', 'expense', 'full' |
| `start_date` | date | No | 90 days ago | Analysis start date | '2025-07-01' |
| `end_date` | date | No | Today | Analysis end date | '2025-10-11' |
| `anomaly_threshold` | float | No | 2.0 | Std deviation threshold | 3.0 |
| `include_patterns` | boolean | No | true | Include pattern analysis | false |
| `format` | string | No | 'json' | Export format | 'json', 'pdf', 'excel' |

### Request Examples

**Full Forensic Analysis**:
```http
GET /api/reports/forensic?report_type=full&start_date=2025-01-01&end_date=2025-10-11
Authorization: Bearer <jwt_token>
```

**Revenue Anomaly Detection**:
```http
GET /api/reports/forensic?report_type=revenue&anomaly_threshold=3.0
Authorization: Bearer <jwt_token>
```

**Expense Pattern Analysis (PDF)**:
```http
GET /api/reports/forensic?report_type=expense&include_patterns=true&format=pdf
Authorization: Bearer <jwt_token>
```

### Response Structure

**Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "report_type": "full",
    "analysis_period": {
      "start_date": "2025-01-01",
      "end_date": "2025-10-11",
      "duration_days": 284
    },
    "revenue_analysis": {
      "total_revenue": 1450000,
      "transaction_count": 856,
      "average_transaction": 1694.39,
      "anomalies": [
        {
          "date": "2025-03-15",
          "amount": 25000,
          "expected_range": [1000, 5000],
          "deviation": 4.2,
          "severity": "high",
          "description": "Unusually large membership payment"
        }
      ],
      "patterns": {
        "peak_days": ["1st", "15th"],
        "seasonal_trends": "Q1 highest, Q3 lowest",
        "payment_methods": {
          "bank_transfer": 65,
          "cash": 25,
          "credit_card": 10
        }
      }
    },
    "expense_analysis": {
      "total_expenses": 980000,
      "transaction_count": 542,
      "average_transaction": 1807.75,
      "anomalies": [
        {
          "date": "2025-06-20",
          "amount": 45000,
          "expected_range": [2000, 10000],
          "deviation": 5.1,
          "severity": "critical",
          "description": "Exceptional event expenditure"
        }
      ],
      "patterns": {
        "recurring_expenses": [
          { "category": "utilities", "frequency": "monthly", "avg_amount": 8000 }
        ],
        "category_distribution": {
          "operational": 42,
          "events": 31,
          "maintenance": 17,
          "other": 10
        }
      }
    },
    "risk_assessment": {
      "overall_risk_score": 6.5,
      "risk_level": "moderate",
      "concerns": [
        "Revenue concentration: 60% from top 10 members",
        "Expense volatility: High variance in event spending"
      ],
      "recommendations": [
        "Diversify revenue streams",
        "Implement stricter budgeting for events"
      ]
    }
  },
  "metadata": {
    "generated_at": "2025-10-11T14:45:00Z",
    "generated_by": "auditor_id_456",
    "anomaly_threshold": 2.0
  }
}
```

### Error Responses

**401 Unauthorized**:
```json
{
  "success": false,
  "error": "Authentication required",
  "code": "AUTH_REQUIRED"
}
```

**403 Forbidden** (Insufficient Role - e.g., financial_manager):
```json
{
  "success": false,
  "error": "Forensic reports require admin or auditor role",
  "code": "FORBIDDEN"
}
```

**400 Bad Request** (Missing/Invalid report_type):
```json
{
  "success": false,
  "error": "report_type is required. Valid options: 'revenue', 'expense', 'full'",
  "code": "INVALID_PARAMS"
}
```

**500 Internal Server Error**:
```json
{
  "success": false,
  "error": "Failed to generate forensic report",
  "code": "FORENSIC_ANALYSIS_FAILED"
}
```

### Test Scenarios (4 tests)

1. **✓ Full Forensic Analysis (admin)**
   - Valid JWT with admin role
   - Query: `report_type=full&start_date=2025-01-01`
   - Expect 200 with comprehensive analysis including anomalies and patterns

2. **✓ Revenue Anomaly Detection (auditor)**
   - Valid JWT with auditor role
   - Query: `report_type=revenue&anomaly_threshold=3.0`
   - Expect 200 with revenue-specific anomaly data

3. **✗ Unauthorized Access (financial_manager)**
   - Valid JWT with financial_manager role (not in allowed list)
   - Expect 403 Forbidden (forensic access restricted)

4. **✗ Missing Required Parameter**
   - Valid JWT with admin role
   - No `report_type` parameter
   - Expect 400 Bad Request

---

## Endpoint 3: Cash Flow Analysis

### Route Definition
```javascript
GET /api/reports/cash-flow
Middleware: authenticateUser, requireFinancialReportAccess
Controller: getCashFlowAnalysis (lines 404-496)
```

### Access Control
- **Authentication**: Required (JWT)
- **Authorization**: admin, financial_manager, treasurer, auditor
- **Access Logging**: Yes (via `logFinancialAccess()`)

### Query Parameters

| Parameter | Type | Required | Default | Description | Example |
|-----------|------|----------|---------|-------------|---------|
| `period` | string | No | 'monthly' | Analysis period granularity | 'monthly', 'quarterly', 'yearly' |
| `year` | integer | No | Current year | Gregorian year | 2025 |
| `start_month` | integer | No | 1 (Jan) | Starting month (1-12) | 7 |
| `end_month` | integer | No | 12 (Dec) | Ending month (1-12) | 10 |
| `format` | string | No | 'json' | Export format | 'json', 'pdf', 'excel' |

### Request Examples

**Monthly Cash Flow (Current Year)**:
```http
GET /api/reports/cash-flow?period=monthly&year=2025
Authorization: Bearer <jwt_token>
```

**Quarterly Analysis (Specific Range)**:
```http
GET /api/reports/cash-flow?period=quarterly&year=2025&start_month=1&end_month=9
Authorization: Bearer <jwt_token>
```

**Excel Export**:
```http
GET /api/reports/cash-flow?period=monthly&year=2025&format=excel
Authorization: Bearer <jwt_token>
```

### Response Structure

**Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "period": "monthly",
    "year": 2025,
    "date_range": {
      "start": "2025-01-01",
      "end": "2025-12-31"
    },
    "cash_flows": [
      {
        "month": 1,
        "month_name": "January",
        "hijri_equivalent": "رجب - شعبان 1446",
        "opening_balance": 500000,
        "cash_inflows": {
          "operations": 80000,
          "financing": 0,
          "investing": 0,
          "total": 80000
        },
        "cash_outflows": {
          "operations": 60000,
          "financing": 0,
          "investing": 0,
          "total": 60000
        },
        "net_cash_flow": 20000,
        "closing_balance": 520000
      },
      {
        "month": 2,
        "month_name": "February",
        "hijri_equivalent": "شعبان - رمضان 1446",
        "opening_balance": 520000,
        "cash_inflows": {
          "operations": 75000,
          "financing": 0,
          "investing": 0,
          "total": 75000
        },
        "cash_outflows": {
          "operations": 65000,
          "financing": 0,
          "investing": 5000,
          "total": 70000
        },
        "net_cash_flow": 5000,
        "closing_balance": 525000
      }
      // ... months 3-12
    ],
    "summary": {
      "total_inflows": 950000,
      "total_outflows": 780000,
      "net_change": 170000,
      "opening_balance": 500000,
      "closing_balance": 670000
    },
    "analysis": {
      "average_monthly_inflow": 79167,
      "average_monthly_outflow": 65000,
      "cash_flow_volatility": "low",
      "liquidity_trend": "increasing",
      "burn_rate": null
    }
  },
  "metadata": {
    "generated_at": "2025-10-11T15:00:00Z",
    "generated_by": "treasurer_id_789",
    "report_type": "cash_flow_analysis"
  }
}
```

### Error Responses

**401 Unauthorized**:
```json
{
  "success": false,
  "error": "Authentication required",
  "code": "AUTH_REQUIRED"
}
```

**403 Forbidden**:
```json
{
  "success": false,
  "error": "Insufficient permissions to access financial reports",
  "code": "FORBIDDEN"
}
```

**400 Bad Request** (Invalid Month Range):
```json
{
  "success": false,
  "error": "start_month must be less than or equal to end_month",
  "code": "INVALID_PARAMS"
}
```

**500 Internal Server Error**:
```json
{
  "success": false,
  "error": "Failed to generate cash flow analysis",
  "code": "CASHFLOW_GENERATION_FAILED"
}
```

### Test Scenarios (3 tests)

1. **✓ Monthly Cash Flow Analysis (financial_manager)**
   - Valid JWT with financial_manager role
   - Query: `period=monthly&year=2025`
   - Expect 200 with month-by-month cash flow data

2. **✓ Quarterly Analysis with Custom Range (treasurer)**
   - Valid JWT with treasurer role
   - Query: `period=quarterly&year=2025&start_month=1&end_month=9`
   - Expect 200 with Q1-Q3 aggregated data

3. **✗ Unauthorized Access (member)**
   - Valid JWT with member role
   - Expect 403 Forbidden

---

## Endpoint 4: Budget Variance Report

### Route Definition
```javascript
GET /api/reports/budget-variance
Middleware: authenticateUser, requireForensicAccess
Controller: getBudgetVarianceReport (lines 502-590)
```

### Access Control
- **Authentication**: Required (JWT)
- **Authorization**: admin, auditor (stricter access)
- **Access Logging**: Yes (via `logFinancialAccess()`)

### Query Parameters

| Parameter | Type | Required | Default | Description | Example |
|-----------|------|----------|---------|-------------|---------|
| `period` | string | No | 'monthly' | Comparison period | 'monthly', 'quarterly', 'yearly' |
| `year` | integer | No | Current year | Gregorian year | 2025 |
| `month` | integer | No | Current month | Gregorian month (1-12) | 10 |
| `category` | string | No | 'all' | Expense category filter | 'operational', 'events', 'all' |
| `threshold` | float | No | 10.0 | Variance % threshold for alerts | 15.0 |
| `format` | string | No | 'json' | Export format | 'json', 'pdf', 'excel' |

### Request Examples

**Monthly Budget vs Actual (Current Month)**:
```http
GET /api/reports/budget-variance?period=monthly&year=2025&month=10
Authorization: Bearer <jwt_token>
```

**Yearly Variance with High Threshold**:
```http
GET /api/reports/budget-variance?period=yearly&year=2025&threshold=20.0
Authorization: Bearer <jwt_token>
```

**Category-Specific Analysis (Events)**:
```http
GET /api/reports/budget-variance?period=quarterly&category=events
Authorization: Bearer <jwt_token>
```

### Response Structure

**Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "period": {
      "type": "monthly",
      "year": 2025,
      "month": 10,
      "label": "October 2025"
    },
    "revenue": {
      "budgeted": 150000,
      "actual": 155000,
      "variance": 5000,
      "variance_percentage": 3.33,
      "status": "favorable"
    },
    "expenses": {
      "total": {
        "budgeted": 100000,
        "actual": 115000,
        "variance": -15000,
        "variance_percentage": -15.0,
        "status": "unfavorable"
      },
      "by_category": [
        {
          "category": "operational",
          "budgeted": 45000,
          "actual": 47000,
          "variance": -2000,
          "variance_percentage": -4.44,
          "status": "acceptable"
        },
        {
          "category": "events",
          "budgeted": 30000,
          "actual": 42000,
          "variance": -12000,
          "variance_percentage": -40.0,
          "status": "critical",
          "alert": true,
          "note": "Variance exceeds 10% threshold"
        },
        {
          "category": "utilities",
          "budgeted": 20000,
          "actual": 21000,
          "variance": -1000,
          "variance_percentage": -5.0,
          "status": "acceptable"
        }
      ]
    },
    "net_variance": {
      "budgeted_net": 50000,
      "actual_net": 40000,
      "variance": -10000,
      "variance_percentage": -20.0,
      "status": "unfavorable"
    },
    "alerts": [
      {
        "severity": "high",
        "category": "events",
        "message": "Events expenses 40% over budget",
        "recommendation": "Review event spending and adjust future budgets"
      }
    ]
  },
  "metadata": {
    "generated_at": "2025-10-11T15:15:00Z",
    "generated_by": "admin_id_101",
    "variance_threshold": 10.0
  }
}
```

### Error Responses

**401 Unauthorized**:
```json
{
  "success": false,
  "error": "Authentication required",
  "code": "AUTH_REQUIRED"
}
```

**403 Forbidden** (Insufficient Role - e.g., treasurer):
```json
{
  "success": false,
  "error": "Budget variance reports require admin or auditor role",
  "code": "FORBIDDEN"
}
```

**400 Bad Request** (Invalid Category):
```json
{
  "success": false,
  "error": "Invalid category. Valid options: 'operational', 'events', 'utilities', 'all'",
  "code": "INVALID_PARAMS"
}
```

**500 Internal Server Error**:
```json
{
  "success": false,
  "error": "Failed to generate budget variance report",
  "code": "VARIANCE_GENERATION_FAILED"
}
```

### Test Scenarios (3 tests)

1. **✓ Monthly Budget Variance (admin)**
   - Valid JWT with admin role
   - Query: `period=monthly&year=2025&month=10&threshold=10.0`
   - Expect 200 with budgeted vs actual comparisons and alerts

2. **✓ Yearly Variance Analysis (auditor)**
   - Valid JWT with auditor role
   - Query: `period=yearly&year=2025`
   - Expect 200 with yearly aggregated variance data

3. **✗ Unauthorized Access (treasurer)**
   - Valid JWT with treasurer role (not in allowed list for budget variance)
   - Expect 403 Forbidden

---

## Complete Test Suite Breakdown

### Test Count: 15 Integration Tests

#### Authentication & Authorization (3 tests)
1. **No JWT Token** - All endpoints return 401
2. **Invalid/Expired JWT** - All endpoints return 401
3. **Insufficient Role** - Member role returns 403 on all endpoints

#### Financial Summary (5 tests)
1. ✓ Basic summary (admin)
2. ✓ Yearly with details (financial_manager)
3. ✓ Hijri calendar (treasurer)
4. ✗ Unauthorized (member)
5. ✗ Invalid parameters

#### Forensic Report (4 tests)
1. ✓ Full analysis (admin)
2. ✓ Revenue anomalies (auditor)
3. ✗ Unauthorized (financial_manager)
4. ✗ Missing report_type

#### Cash Flow Analysis (3 tests)
1. ✓ Monthly analysis (financial_manager)
2. ✓ Quarterly with range (treasurer)
3. ✗ Unauthorized (member)

#### Budget Variance (3 tests - Note: Enhanced RBAC)
1. ✓ Monthly variance (admin)
2. ✓ Yearly variance (auditor)
3. ✗ Unauthorized (treasurer - should fail despite having financial access)

---

## Implementation Notes

### Key Testing Considerations

1. **Hijri Date Handling**
   - Controller uses `HijriDateManager` (imported from `utils/hijriDateUtils.js`)
   - Tests should verify Hijri date conversion accuracy
   - Compare Hijri labels in responses with expected Islamic calendar dates

2. **Access Control Logging**
   - `logFinancialAccess()` function logs all report access
   - Tests should verify audit log entries are created (check database after requests)

3. **Export Format Testing**
   - JSON format: Default, test response structure
   - PDF format: Check Content-Type header (`application/pdf`)
   - Excel format: Check Content-Type header (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)

4. **Forensic Analysis Services**
   - Uses external services: `forensicAnalysis.js`
   - Mock these services for consistent test data

5. **Database Queries**
   - Controller queries multiple tables: `payments`, `expenses`, `subscriptions`, `budgets`
   - Test data setup should include realistic financial transactions

6. **Error Handling**
   - Database connection failures
   - Missing data scenarios (no budget defined)
   - Invalid date ranges

### Helper Functions to Mock

**From `forensicAnalysis.js`**:
- `generateRevenueForensicReport()`
- `generateExpenseForensicReport()`

**From `reportExportService.js`**:
- `exportToPDF()`
- `exportToExcel()`

**From `accessControl.js`**:
- `logFinancialAccess()` (should be spied, not mocked)
- `hasFinancialAccess()` (middleware handles this)

### Test Data Requirements

**Users (Roles)**:
- admin_user (role: 'admin')
- financial_manager_user (role: 'financial_manager')
- treasurer_user (role: 'treasurer')
- auditor_user (role: 'auditor')
- member_user (role: 'member')

**Financial Data**:
- Payments (revenue transactions)
- Expenses (categorized by type)
- Subscriptions (recurring revenue)
- Budgets (for variance comparison)

**Time Periods**:
- Current month data
- Full year 2025 data
- Hijri calendar equivalent dates

---

## Test File Structure

```javascript
// __tests__/integration/controllers/financialReports.test.js

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../../server.js';

describe('Financial Reports Controller Integration Tests', () => {
  // Test users with different roles
  let adminToken, financialManagerToken, treasurerToken, auditorToken, memberToken;

  // Test data IDs
  let testPayments, testExpenses, testBudgets;

  beforeAll(async () => {
    // Create test users and get JWT tokens
    // Create test financial data
  });

  afterAll(async () => {
    // Clean up test data
  });

  describe('GET /api/reports/financial-summary', () => {
    // 5 tests for financial summary
  });

  describe('GET /api/reports/forensic', () => {
    // 4 tests for forensic reports
  });

  describe('GET /api/reports/cash-flow', () => {
    // 3 tests for cash flow
  });

  describe('GET /api/reports/budget-variance', () => {
    // 3 tests for budget variance
  });
});
```

---

## Next Steps

1. **Create Test File**: `__tests__/integration/controllers/financialReports.test.js`
2. **Implement Test Suite**: All 15 integration tests with proper setup/teardown
3. **Run Tests**: Verify 100% pass rate
4. **Update Progress Report**: Document Phase 5 Step 2 completion
5. **Commit Changes**: Professional commit message with test summary

---

**Document Status**: Complete - Ready for Implementation
**Estimated Implementation Time**: 3-4 hours
**Expected Outcome**: 15 integration tests, all passing, Phase 5 Step 2 complete
