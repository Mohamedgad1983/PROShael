const { chromium } = require('playwright');

(async () => {
  console.log('Starting Playwright to check login page...');

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    console.log('Navigating to login page...');
    await page.goto('http://localhost:3002', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for login page to load
    await page.waitForTimeout(2000);

    // Take screenshot
    const timestamp = Date.now();
    await page.screenshot({
      path: `login-page-${timestamp}.png`,
      fullPage: true
    });
    console.log(`Screenshot saved as login-page-${timestamp}.png`);

    // Check for logo
    const logoExists = await page.locator('img[alt="Shuail Al-Anzi Fund"]').isVisible();
    console.log('Logo visible:', logoExists);

    // Check for title
    const titleText = await page.locator('h1').textContent();
    console.log('Page title:', titleText);

    // Check for gradient background
    const bgStyle = await page.locator('.login-container').evaluate(el => {
      return window.getComputedStyle(el).background;
    });
    console.log('Background style:', bgStyle.substring(0, 100));

    // Check form wrapper
    const formStyle = await page.locator('.login-form-wrapper').evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        background: styles.background.substring(0, 100),
        backdropFilter: styles.backdropFilter
      };
    });
    console.log('Form styles:', formStyle);

    // Keep browser open for 5 seconds to view
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
    console.log('Browser closed');
  }
})();