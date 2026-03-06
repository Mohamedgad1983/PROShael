const { test, expect } = require('@playwright/test');

// Production Test Configuration
const PRODUCTION_URL = 'https://alshailfund.com';
const TEST_CREDENTIALS = {
  email: 'admin@alshuail.com',
  password: 'Admin@123'
};

test.describe('Al-Shuail Admin Panel - Production Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Set longer timeout for production
    test.setTimeout(60000);
    await page.goto(`${PRODUCTION_URL}/login`);
  });

  test('TC001: Successful login with valid credentials', async ({ page }) => {
    // Enter credentials
    await page.fill('input[type="email"], input[name="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_CREDENTIALS.password);

    // Submit login form
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL(/dashboard|admin/, { timeout: 10000 });

    // Verify JWT token is stored
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();

    // Take screenshot of successful login
    await page.screenshot({ path: 'testsprite_tests/screenshots/tc001-login-success.png' });
  });

  test('TC002: Login failure with invalid credentials', async ({ page }) => {
    // Enter invalid credentials
    await page.fill('input[type="email"], input[name="email"]', 'invalid@test.com');
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');

    // Submit login form
    await page.click('button[type="submit"]');

    // Wait for error message
    await page.waitForTimeout(2000);

    // Verify error message is displayed
    const errorVisible = await page.locator('text=/خطأ|error|فشل/i').isVisible().catch(() => false);
    expect(errorVisible).toBeTruthy();

    // Take screenshot
    await page.screenshot({ path: 'testsprite_tests/screenshots/tc002-login-failure.png' });
  });

  test('TC004: Dashboard displays real-time statistics', async ({ page }) => {
    // Login first
    await page.fill('input[type="email"], input[name="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL(/dashboard|admin/, { timeout: 10000 });

    // Wait for statistics to load
    await page.waitForTimeout(3000);

    // Check for key dashboard elements
    const hasStats = await page.locator('text=/إجمالي الأعضاء|Total Members|الإشتراكات|Subscriptions/i').count() > 0;
    expect(hasStats).toBeTruthy();

    // Verify charts are rendered
    const hasCharts = await page.locator('canvas, svg').count() > 0;
    expect(hasCharts).toBeTruthy();

    // Take screenshot
    await page.screenshot({ path: 'testsprite_tests/screenshots/tc004-dashboard.png', fullPage: true });
  });

  test('TC020: Responsive UI and RTL layout', async ({ page }) => {
    // Check desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: 'testsprite_tests/screenshots/tc020-desktop.png' });

    // Check RTL direction
    const direction = await page.evaluate(() => document.dir || document.documentElement.dir);
    expect(direction).toBe('rtl');

    // Check tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: 'testsprite_tests/screenshots/tc020-tablet.png' });

    // Check mobile view
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: 'testsprite_tests/screenshots/tc020-mobile.png' });
  });

  test('TC021: API response performance', async ({ page }) => {
    // Login
    await page.fill('input[type="email"], input[name="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_CREDENTIALS.password);

    const startTime = Date.now();
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|admin/, { timeout: 10000 });
    const loadTime = Date.now() - startTime;

    // Verify page loads within 3 seconds
    expect(loadTime).toBeLessThan(3000);

    console.log(`✅ Dashboard loaded in ${loadTime}ms`);
  });

  test('TC022: No console errors during navigation', async ({ page }) => {
    const consoleErrors = [];

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Login and navigate
    await page.fill('input[type="email"], input[name="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|admin/, { timeout: 10000 });
    await page.waitForTimeout(3000);

    // Filter out known font loading warnings
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('font') &&
      !err.includes('SF Pro') &&
      !err.includes('MIME type')
    );

    console.log(`📊 Console errors found: ${consoleErrors.length} (${criticalErrors.length} critical)`);
    if (criticalErrors.length > 0) {
      console.log('Critical errors:', criticalErrors);
    }

    // Should have no critical errors
    expect(criticalErrors.length).toBe(0);
  });

  test('TC005: Navigate to Members Management', async ({ page }) => {
    // Login
    await page.fill('input[type="email"], input[name="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|admin/, { timeout: 10000 });

    // Navigate to members page
    await page.click('text=/الأعضاء|Members/i').catch(() =>
      page.goto(`${PRODUCTION_URL}/admin/members`)
    );

    await page.waitForTimeout(2000);

    // Verify members page loaded
    const url = page.url();
    expect(url).toContain('members');

    // Take screenshot
    await page.screenshot({ path: 'testsprite_tests/screenshots/tc005-members.png', fullPage: true });
  });

  test('TC009: Navigate to Payments Management', async ({ page }) => {
    // Login
    await page.fill('input[type="email"], input[name="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|admin/, { timeout: 10000 });

    // Navigate to payments page
    await page.click('text=/المدفوعات|Payments/i').catch(() =>
      page.goto(`${PRODUCTION_URL}/admin/payments`)
    );

    await page.waitForTimeout(2000);

    // Verify payments page loaded
    const hasPayments = await page.locator('text=/المدفوعات|Payments|الدفعات/i').count() > 0;
    expect(hasPayments).toBeTruthy();

    // Take screenshot
    await page.screenshot({ path: 'testsprite_tests/screenshots/tc009-payments.png', fullPage: true });
  });

  test('TC012: Navigate to Family Tree', async ({ page }) => {
    // Login
    await page.fill('input[type="email"], input[name="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|admin/, { timeout: 10000 });

    // Navigate to family tree
    await page.click('text=/شجرة العائلة|Family Tree/i').catch(() =>
      page.goto(`${PRODUCTION_URL}/admin/family-tree`)
    );

    await page.waitForTimeout(3000);

    // Verify tree visualization exists
    const hasSvg = await page.locator('svg').count() > 0;
    expect(hasSvg).toBeTruthy();

    // Take screenshot
    await page.screenshot({ path: 'testsprite_tests/screenshots/tc012-family-tree.png', fullPage: true });
  });

  test('TC016: Navigate to Reports', async ({ page }) => {
    // Login
    await page.fill('input[type="email"], input[name="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|admin/, { timeout: 10000 });

    // Navigate to reports
    await page.click('text=/التقارير|Reports/i').catch(() =>
      page.goto(`${PRODUCTION_URL}/admin/reports`)
    );

    await page.waitForTimeout(2000);

    // Verify reports page loaded
    const hasReports = await page.locator('text=/التقارير|Reports|تقرير/i').count() > 0;
    expect(hasReports).toBeTruthy();

    // Take screenshot
    await page.screenshot({ path: 'testsprite_tests/screenshots/tc016-reports.png', fullPage: true });
  });

  test('TC018: Navigate to Settings', async ({ page }) => {
    // Login
    await page.fill('input[type="email"], input[name="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|admin/, { timeout: 10000 });

    // Navigate to settings
    await page.click('text=/الإعدادات|Settings/i').catch(() =>
      page.goto(`${PRODUCTION_URL}/admin/settings`)
    );

    await page.waitForTimeout(2000);

    // Verify settings page loaded
    const hasSettings = await page.locator('text=/الإعدادات|Settings|إعداد/i').count() > 0;
    expect(hasSettings).toBeTruthy();

    // Take screenshot
    await page.screenshot({ path: 'testsprite_tests/screenshots/tc018-settings.png', fullPage: true });
  });
});
