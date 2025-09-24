const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Checking design at http://localhost:3002...');

  const browser = await chromium.launch({
    headless: false,  // Show browser window
    slowMo: 500
  });

  const page = await browser.newPage();

  try {
    // Navigate to the application
    console.log('📱 Opening application...');
    await page.goto('http://localhost:3002', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for the login page to load
    await page.waitForTimeout(2000);

    // Take a full page screenshot
    console.log('📸 Taking screenshot of current design...');
    await page.screenshot({
      path: 'current-design.png',
      fullPage: true
    });

    // Check for specific design elements
    console.log('\n🎨 Checking design elements:\n');

    // Check for logo
    const logo = await page.locator('img[alt="Shuail Al-Anzi Fund"]').count();
    console.log(`✅ Logo present: ${logo > 0 ? 'YES' : 'NO'}`);

    // Check for Apple login container
    const appleContainer = await page.locator('.apple-login-container').count();
    console.log(`✅ Apple-style container: ${appleContainer > 0 ? 'YES' : 'NO'}`);

    // Check for gradient header
    const header = await page.locator('.apple-header-login').count();
    console.log(`✅ Premium header: ${header > 0 ? 'YES' : 'NO'}`);

    // Check for glass morphism card
    const loginCard = await page.locator('.apple-login-card').count();
    console.log(`✅ Glass morphism login card: ${loginCard > 0 ? 'YES' : 'NO'}`);

    // Check for Arabic title
    const arabicTitle = await page.locator('h1:has-text("صندوق شعيل العنزي")').count();
    console.log(`✅ Arabic title: ${arabicTitle > 0 ? 'YES' : 'NO'}`);

    // Check for login form
    const loginForm = await page.locator('.apple-login-form').count();
    console.log(`✅ Apple-style login form: ${loginForm > 0 ? 'YES' : 'NO'}`);

    // Check for gradient button
    const loginButton = await page.locator('.apple-login-button').count();
    console.log(`✅ Premium login button: ${loginButton > 0 ? 'YES' : 'NO'}`);

    // Get page title and any visible text
    const pageTitle = await page.title();
    console.log(`\n📄 Page title: ${pageTitle}`);

    // Check if there's a simple login form (non-premium)
    const simpleLogin = await page.locator('.login-container.glass-effect').count();
    if (simpleLogin > 0) {
      console.log('\n⚠️ WARNING: Simple login form detected instead of premium design!');
    }

    // Get computed styles of key elements
    const logoElement = await page.locator('img').first();
    if (await logoElement.count() > 0) {
      const logoStyles = await logoElement.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          width: styles.width,
          height: styles.height,
          animation: styles.animation || 'none'
        };
      });
      console.log('\n🎨 Logo styles:', logoStyles);
    }

    console.log('\n✅ Screenshot saved as: current-design.png');
    console.log('📊 Please check the screenshot to see the actual design!');

  } catch (error) {
    console.error('❌ Error checking design:', error.message);
  } finally {
    // Keep browser open for manual inspection
    console.log('\n👀 Browser will stay open for 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
})();