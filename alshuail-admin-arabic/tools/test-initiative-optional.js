const { chromium } = require('playwright');
const assert = require('node:assert/strict');

let browser;

(async () => {
  browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
  const context = await browser.newContext({ locale: 'ar-SA', viewport: { width: 1440, height: 1100 } });
  const errors = [];
  const createdPayloads = [];
  let initiatives = [];

  await context.addInitScript(() => {
    const user = { id: 'a4ed4bc2-b61e-49ce-90c4-386b131d054e', role: 'super_admin', email: 'e2e@example.test' };
    localStorage.setItem('token', 'e2e-token');
    localStorage.setItem('auth_token', 'e2e-token');
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('user_data', JSON.stringify(user));
    localStorage.setItem('isLoggedIn', 'true');
  });

  await context.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === '/api/auth/verify') {
      return route.fulfill({ json: { success: true, user: { role: 'super_admin' } } });
    }
    if (url.pathname === '/api/news/active-members-count') {
      return route.fulfill({ json: { count: 347 } });
    }
    if (url.pathname === '/api/initiatives-enhanced/admin/all') {
      return route.fulfill({ json: { initiatives } });
    }
    if (url.pathname === '/api/initiatives-enhanced' && request.method() === 'POST') {
      const payload = request.postDataJSON();
      createdPayloads.push(payload);
      const initiative = {
        ...payload,
        id: '72f18626-5afd-4d89-a54f-4e1688c776f4',
        current_amount: 0,
        created_at: new Date().toISOString()
      };
      initiatives = [initiative];
      return route.fulfill({ status: 201, json: { success: true, message: 'تم إنشاء المبادرة بنجاح', initiative } });
    }

    return route.fulfill({ json: { success: true, data: [], members: [], count: 0 } });
  });

  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('dialog', (dialog) => dialog.accept());

  await page.goto('http://localhost:3102/admin/initiatives', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.getByRole('heading', { name: 'إدارة المبادرات' }).waitFor();
  await page.getByRole('button', { name: 'إنشاء مبادرة جديدة' }).click();

  const targetInput = page.getByLabel('المبلغ المستهدف الاختياري');
  assert.equal(await targetInput.getAttribute('required'), null);
  await page.getByLabel('عنوان المبادرة بالعربية').fill('مبادرة اختبار بلا مبلغ');
  await page.getByRole('button', { name: 'إنشاء المبادرة', exact: true }).click();

  await page.getByText('بدون هدف مالي محدد', { exact: true }).waitFor();
  assert.equal(createdPayloads.length, 1);
  assert.equal(createdPayloads[0].target_amount, null);
  assert.equal(Object.hasOwn(createdPayloads[0], 'id'), false);
  assert.equal(Object.hasOwn(createdPayloads[0], 'created_by'), false);
  assert.deepEqual(errors, []);

  await page.screenshot({ path: '/tmp/proshael-initiative-optional.png', fullPage: true });
  console.log('PASS initiative optional-amount browser flow');
  console.log('/tmp/proshael-initiative-optional.png');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await browser?.close();
});
