const { chromium } = require('playwright');

async function loginAndShow() {
  console.log('Launching visible browser...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();

  console.log('Navigating to login page...');
  await page.goto('http://localhost:3002/login', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  await page.waitForTimeout(2000);

  console.log('Filling login credentials...');

  // Fill email field
  await page.fill('input#email', 'admin@alshuail.com');
  await page.waitForTimeout(500);

  // Fill password field
  await page.fill('input#password', 'Admin@123');
  await page.waitForTimeout(500);

  console.log('Clicking login button...');

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for navigation
  await page.waitForTimeout(5000);

  console.log('Current URL:', page.url());

  // Take screenshot after login
  await page.screenshot({ path: 'screenshots/after-login.png', fullPage: true });
  console.log('Screenshot saved to screenshots/after-login.png');

  console.log('Browser will stay open for 120 seconds for inspection...');

  // Keep browser open for inspection
  await page.waitForTimeout(120000);

  await browser.close();
  console.log('Browser closed.');
}

loginAndShow().catch(console.error);
