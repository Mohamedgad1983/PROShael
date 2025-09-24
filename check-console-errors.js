const { chromium } = require('playwright');

(async () => {
  console.log('Checking for console errors and page issues...\n');

  const browser = await chromium.launch({
    headless: false, // Show browser to see what's happening
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  // Capture all console messages
  const consoleMessages = [];
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    consoleMessages.push({ type, text });

    if (type === 'error') {
      console.log('❌ Console Error:', text);
    } else if (type === 'warning') {
      console.log('⚠️ Console Warning:', text);
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    console.log('🔴 Page Error:', error.message);
  });

  // Capture failed requests
  page.on('requestfailed', request => {
    console.log('🚫 Failed Request:', request.url());
    console.log('   Failure:', request.failure().errorText);
  });

  try {
    console.log('Loading http://localhost:3002...\n');

    await page.goto('http://localhost:3002', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Wait a bit for React to render
    await page.waitForTimeout(5000);

    // Check if React app is loaded
    const reactRoot = await page.$('#root');
    if (reactRoot) {
      const innerHTML = await reactRoot.innerHTML();
      console.log('React root content length:', innerHTML.length);

      // Check for loading spinner
      const loadingSpinner = await page.$('.spinner, .loading, [class*="loading"], [class*="spinner"]');
      if (loadingSpinner) {
        console.log('⏳ Loading spinner detected - app may be stuck loading\n');
      }

      // Check for login form
      const loginForm = await page.$('form');
      if (loginForm) {
        console.log('✅ Login form found\n');
      } else {
        console.log('❌ Login form NOT found\n');
      }
    }

    // Check network activity
    console.log('\n📊 Checking network requests...');

    // Intercept responses
    const responses = [];
    page.on('response', response => {
      if (response.status() >= 400) {
        responses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });

    // Reload to capture network activity
    await page.reload();
    await page.waitForTimeout(3000);

    if (responses.length > 0) {
      console.log('\n❌ Failed responses:');
      responses.forEach(resp => {
        console.log(`  ${resp.status} - ${resp.url}`);
      });
    }

    // Check localStorage for any auth issues
    const localStorage = await page.evaluate(() => {
      const items = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        items[key] = window.localStorage.getItem(key);
      }
      return items;
    });

    console.log('\n📦 LocalStorage keys:', Object.keys(localStorage));

    // Try to get React error boundary errors
    const errorBoundary = await page.evaluate(() => {
      const errorElement = document.querySelector('[class*="error"], .error-boundary');
      return errorElement ? errorElement.textContent : null;
    });

    if (errorBoundary) {
      console.log('\n❌ React Error Boundary:', errorBoundary);
    }

    // Check if the page is actually showing content
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.includes('تسجيل الدخول') || bodyText.includes('Login')) {
      console.log('\n✅ Login page content is visible');
    } else if (bodyText.trim().length < 100) {
      console.log('\n⚠️ Page has very little content - may be stuck loading');
    }

    console.log('\n📸 Taking screenshot...');
    await page.screenshot({ path: 'console-check.png', fullPage: true });

    console.log('\nKeeping browser open for 10 seconds to observe...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('\n🔴 Error during check:', error.message);
  }

  await browser.close();
  console.log('\n✅ Check completed');
})();