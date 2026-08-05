import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockQuery = jest.fn();
const mockGetCurrentBalance = jest.fn();
const mockValidateFinancialOperation = jest.fn();

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: mockQuery
}));

jest.unstable_mockModule('../../../src/utils/accessControl.js', () => ({
  hasFinancialAccess: () => true,
  logFinancialAccess: jest.fn(() => Promise.resolve()),
  validateFinancialOperation: mockValidateFinancialOperation,
  createFinancialAuditTrail: jest.fn(() => Promise.resolve()),
  checkSuspiciousActivity: jest.fn(() => Promise.resolve({ should_block: false }))
}));

jest.unstable_mockModule('../../../src/utils/hijriDateUtils.js', () => ({
  HijriDateManager: {
    convertToHijri: () => ({
      hijri_date_string: '1448-02-22',
      hijri_year: 1448,
      hijri_month: 2,
      hijri_day: 22,
      hijri_month_name: 'صفر'
    }),
    formatHijriDisplay: (value) => value,
    getCurrentHijriDate: () => ({ hijri_year: 1448, hijri_month: 2 }),
    getMonthProperties: () => ({ name_ar: 'صفر' })
  }
}));

jest.unstable_mockModule('../../../src/controllers/fundBalanceController.js', () => ({
  getCurrentBalance: mockGetCurrentBalance
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() }
}));

const { approveExpense, createExpense, updateExpense } = await import('../../../src/controllers/expensesController.js');

const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const makeReq = (overrides = {}) => ({
  user: { id: '11111111-1111-4111-8111-111111111111', role: 'super_admin' },
  body: {},
  params: {},
  ip: '127.0.0.1',
  ...overrides
});

describe('expenses lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentBalance.mockResolvedValue({ current_balance: '500000.00' });
    mockValidateFinancialOperation.mockResolvedValue({ valid: true });
  });

  test('creates an expense using every lifecycle column in the migrated schema', async () => {
    const created = {
      id: '22222222-2222-4222-8222-222222222222',
      amount: '125.00',
      expense_category: 'operations',
      status: 'pending'
    };
    mockQuery.mockResolvedValueOnce({ rows: [created] });
    const res = makeRes();

    await createExpense(makeReq({
      body: {
        expense_category: 'operations',
        title_ar: 'صيانة المكتب',
        title_en: 'Office maintenance',
        description_en: 'Routine work',
        amount: '125',
        expense_date: '2026-08-05',
        paid_to: 'شركة الصيانة'
      }
    }), res);

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('description_en');
    expect(sql).toContain('approval_notes');
    expect(params).toHaveLength(24);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: created }));
  });

  test('updates only allow-listed fields and records the editing actor', async () => {
    const pending = {
      id: 'expense-1',
      status: 'pending',
      expense_category: 'operations',
      title_ar: 'قديم',
      amount: '100',
      expense_date: '2026-08-05',
      paid_to: 'مورد'
    };
    const updated = { ...pending, title_ar: 'جديد' };
    mockQuery
      .mockResolvedValueOnce({ rows: [pending] })
      .mockResolvedValueOnce({ rows: [updated] });
    const res = makeRes();

    await updateExpense(makeReq({
      params: { expenseId: 'expense-1' },
      body: { title_ar: 'جديد', unknown_column: 'must-not-reach-sql' }
    }), res);

    const [updateSql, updateParams] = mockQuery.mock.calls[1];
    expect(updateSql).toContain('title_ar = $1');
    expect(updateSql).toContain('updated_by');
    expect(updateSql).not.toContain('unknown_column');
    expect(updateParams).not.toContain('must-not-reach-sql');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message_ar: 'تم تعديل المصروف بنجاح'
    }));
  });

  test('rejects through the canonical action and stores the reason', async () => {
    const pending = { id: 'expense-2', status: 'pending', amount: '75' };
    const rejected = { ...pending, status: 'rejected', rejection_reason: 'المستند غير واضح' };
    mockQuery
      .mockResolvedValueOnce({ rows: [pending] })
      .mockResolvedValueOnce({ rows: [rejected] });
    const res = makeRes();

    await approveExpense(makeReq({
      params: { expenseId: 'expense-2' },
      body: { action: 'reject', notes: 'المستند غير واضح' }
    }), res);

    const [updateSql, updateParams] = mockQuery.mock.calls[1];
    expect(updateSql).toContain('rejection_reason');
    expect(updateParams).toContain('المستند غير واضح');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message_ar: 'تم رفض المصروف'
    }));
  });
});
