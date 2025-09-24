const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Go to the login page
    await page.goto('http://localhost:3002');
    await page.waitForTimeout(2000);

    // Take screenshot of login page
    await page.screenshot({ path: 'screenshot-login.png', fullPage: true });
    console.log('Login page screenshot saved as screenshot-login.png');

    // Try to login
    await page.fill('input[type="email"]', 'admin@alshuail.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for navigation or page change
    await page.waitForTimeout(3000);

    // Take screenshot of dashboard
    await page.screenshot({ path: 'screenshot-dashboard.png', fullPage: true });
    console.log('Dashboard screenshot saved as screenshot-dashboard.png');

  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: 'screenshot-error.png', fullPage: true });
    console.log('Error screenshot saved as screenshot-error.png');
  } finally {
    await browser.close();
  }
})();