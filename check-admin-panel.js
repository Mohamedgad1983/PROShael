const { chromium } = require('playwright');

(async () => {
  console.log('Starting Playwright check for Admin Panel...');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  try {
    console.log('Navigating to http://localhost:3002...');

    // Navigate to the admin panel
    const response = await page.goto('http://localhost:3002', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('Response status:', response.status());

    // Wait for the page to load
    await page.waitForTimeout(3000);

    // Get page title
    const title = await page.title();
    console.log('Page Title:', title);

    // Check for any error messages
    const errorMessages = await page.$$eval('.error, .error-message, [class*="error"]',
      elements => elements.map(el => el.textContent)
    );
    if (errorMessages.length > 0) {
      console.log('Error messages found:', errorMessages);
    }

    // Check for login form
    const loginForm = await page.$('form');
    if (loginForm) {
      console.log('Login form detected');

      // Check for input fields
      const usernameField = await page.$('input[type="text"], input[type="email"], input[name*="user"], input[name*="email"]');
      const passwordField = await page.$('input[type="password"]');

      if (usernameField && passwordField) {
        console.log('Username and password fields found');
      }
    }

    // Check page content
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('\nPage content preview (first 500 chars):');
    console.log(bodyText.substring(0, 500));

    // Check for React app
    const reactRoot = await page.$('#root');
    if (reactRoot) {
      console.log('\nReact root element found');
      const reactContent = await reactRoot.evaluate(el => el.innerHTML);
      if (reactContent.includes('dashboard') || reactContent.includes('Dashboard')) {
        console.log('Dashboard elements detected');
      }
    }

    // Check console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console Error:', msg.text());
      }
    });

    // Take a screenshot
    await page.screenshot({ path: 'admin-panel-check.png' });
    console.log('\nScreenshot saved as admin-panel-check.png');

    // Check for specific Arabic text
    const arabicText = await page.$$eval('*', elements => {
      return elements
        .filter(el => /[\u0600-\u06FF]/.test(el.textContent))
        .slice(0, 5)
        .map(el => el.textContent.trim())
        .filter(text => text.length > 0);
    });

    if (arabicText.length > 0) {
      console.log('\nArabic text found on page:');
      arabicText.forEach(text => console.log('- ' + text.substring(0, 50)));
    }

    // Check network errors
    const failedRequests = [];
    page.on('requestfailed', request => {
      failedRequests.push({
        url: request.url(),
        failure: request.failure().errorText
      });
    });

    await page.reload();
    await page.waitForTimeout(2000);

    if (failedRequests.length > 0) {
      console.log('\nFailed network requests:');
      failedRequests.forEach(req => {
        console.log(`- ${req.url}: ${req.failure}`);
      });
    }

    console.log('\n✅ Page check completed');

  } catch (error) {
    console.error('Error during check:', error.message);

    // Take error screenshot
    await page.screenshot({ path: 'admin-panel-error.png' });
    console.log('Error screenshot saved as admin-panel-error.png');
  }

  await browser.close();
  console.log('\nBrowser closed');
})();