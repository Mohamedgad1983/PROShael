import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:4178';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ locale: 'ar-SA' });

const adminUser = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'مسؤول الاختبار',
  role: 'super_admin',
  permissions: { all_access: true, manage_finances: true, view_finances: true }
};

const pendingExpense = {
  id: 'expense-1',
  title_ar: 'مصروف معلّق',
  title_en: 'Pending expense',
  description_ar: 'وصف المصروف',
  description_en: '',
  amount: '120.00',
  expense_category: 'operations',
  category: 'operations',
  expense_date: '2026-08-05',
  paid_to: 'المورد الأول',
  notes: '',
  status: 'pending',
  created_at: '2026-08-05T08:00:00.000Z'
};

let createRequestSeen = false;
let updatePayload = null;

page.on('pageerror', (error) => console.error('PAGE_ERROR', error.message));
page.on('console', (message) => {
  if (message.type() === 'error') console.error('BROWSER_ERROR', message.text());
});

await page.addInitScript((user) => {
  localStorage.setItem('token', 'e2e-admin-token');
  localStorage.setItem('auth_token', 'e2e-admin-token');
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('user_data', JSON.stringify(user));
  localStorage.setItem('isLoggedIn', 'true');
}, adminUser);

await page.route('https://api.alshailfund.com/**', async (route) => {
  const request = route.request();
  const url = new URL(request.url());

  if (url.pathname === '/api/auth/verify') {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, user: adminUser }) });
  }

  if (url.pathname === '/api/fund/balance') {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { current_balance: '368440.00' } }) });
  }

  if (url.pathname === '/api/expenses' && request.method() === 'GET') {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { expenses: [pendingExpense], summary: {} } })
    });
  }

  if (url.pathname === '/api/expenses' && request.method() === 'POST') {
    createRequestSeen = true;
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { ...pendingExpense, id: 'expense-created', title_ar: 'مصروف جديد' } })
    });
  }

  if (url.pathname === '/api/expenses/expense-1' && request.method() === 'PUT') {
    updatePayload = request.postDataJSON();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, message_ar: 'تم تعديل المصروف بنجاح', data: { ...pendingExpense, ...updatePayload } })
    });
  }

  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
});

try {
  await page.goto(`${baseUrl}/admin/expenses`, { waitUntil: 'networkidle' });
  if (await page.getByRole('button', { name: /إضافة مصروف جديد/ }).count() === 0) {
    await page.getByText('💰 المصروفات', { exact: true }).first().click();
    await page.waitForTimeout(800);
  }
  await page.getByRole('button', { name: /إضافة مصروف جديد/ }).click();

  let form = page.locator('.create-expense-form form');
  await form.locator('input[type="text"]').nth(0).fill('مصروف جديد');
  await form.locator('input[type="number"]').fill('100');
  await form.locator('select').selectOption('operations');
  await form.locator('input[type="text"]').nth(2).fill('المورد الجديد');
  await form.getByRole('button', { name: 'حفظ المصروف' }).click();

  await page.getByText('تم حفظ المصروف بنجاح', { exact: true }).waitFor();
  assert.equal(createRequestSeen, true, 'POST /api/expenses was not sent');

  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /تعديل/ }).click();
  form = page.locator('.create-expense-form form');
  await form.getByText('تعديل المصروف', { exact: true }).waitFor();
  assert.equal(await form.locator('input[type="text"]').nth(0).inputValue(), 'مصروف معلّق');
  assert.equal(await form.locator('select').inputValue(), 'operations');
  assert.equal(await form.locator('input[type="text"]').nth(2).inputValue(), 'المورد الأول');

  await form.locator('input[type="text"]').nth(0).fill('مصروف معدل');
  await form.getByRole('button', { name: 'حفظ التعديلات' }).click();
  await page.getByText('تم تعديل المصروف بنجاح', { exact: true }).waitFor();

  assert.equal(updatePayload.title_ar, 'مصروف معدل');
  assert.equal(updatePayload.expense_category, 'operations');
  assert.equal(updatePayload.paid_to, 'المورد الأول');
  console.log('Expense create/edit UI flow passed');
} finally {
  await browser.close();
}
