const puppeteer = require('puppeteer');

async function testPWALogin() {
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Set mobile viewport
    await page.setViewport({ width: 428, height: 926 });

    // Navigate to PWA login page
    console.log('🔄 Navigating to PWA login page...');
    await page.goto('http://localhost:3002/pwa/login', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for the page to load
    await page.waitForTimeout(2000);

    // Take screenshot of login page
    await page.screenshot({ path: 'pwa-login-before.png' });

    // Log any console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console error:', msg.text());
      }
    });

    // Check if login form elements exist
    console.log('🔍 Checking login form elements...');

    const phoneInput = await page.$('input[type="tel"]');
    const passwordInput = await page.$('input[type="password"]');
    const loginButton = await page.$('button.login-btn');

    if (!phoneInput) {
      console.log('❌ Phone input not found');
      return;
    }

    if (!passwordInput) {
      console.log('❌ Password input not found');
      return;
    }

    if (!loginButton) {
      console.log('❌ Login button not found');
      return;
    }

    console.log('✅ All form elements found');

    // Fill in the test credentials
    console.log('📝 Filling in test credentials...');
    await phoneInput.type('0501234567');
    await passwordInput.type('password123');

    // Take screenshot before clicking
    await page.screenshot({ path: 'pwa-login-filled.png' });

    // Click login button
    console.log('🚀 Clicking login button...');
    await loginButton.click();

    // Wait for navigation or error
    try {
      await page.waitForNavigation({
        waitUntil: 'networkidle0',
        timeout: 10000
      });

      const currentUrl = page.url();
      console.log('✅ Navigation successful! Current URL:', currentUrl);

      if (currentUrl.includes('/pwa/dashboard')) {
        console.log('🎉 Login successful - redirected to dashboard');
        await page.screenshot({ path: 'pwa-dashboard-success.png' });
      } else {
        console.log('⚠️ Redirected but not to dashboard:', currentUrl);
      }

    } catch (navigationError) {
      console.log('⚠️ No navigation occurred, checking for errors...');

      // Check for error messages
      const errorElement = await page.$('.error-message');
      if (errorElement) {
        const errorText = await errorElement.evaluate(el => el.textContent);
        console.log('❌ Error message found:', errorText);
      }

      // Take screenshot of any error state
      await page.screenshot({ path: 'pwa-login-error.png' });
    }

    // Wait a bit more to see final state
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'pwa-login-final.png' });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testPWALogin();