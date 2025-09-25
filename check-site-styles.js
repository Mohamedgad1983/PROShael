const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Checking Al-Shuail Admin site styles...\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    console.log('📱 Navigating to: https://alshuail-admin.pages.dev');
    await page.goto('https://alshuail-admin.pages.dev', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for page to load
    await page.waitForTimeout(3000);

    // Take screenshot of current state
    await page.screenshot({
      path: 'current-login-page.png',
      fullPage: true
    });
    console.log('📸 Screenshot saved: current-login-page.png');

    // Check for bold text elements
    console.log('\n🔤 Checking text styles...');
    const boldElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const boldTexts = [];

      elements.forEach(el => {
        const styles = window.getComputedStyle(el);
        const fontWeight = styles.fontWeight;

        // Check if font-weight is bold (600, 700, 800, 900, or 'bold')
        if (fontWeight === 'bold' || parseInt(fontWeight) >= 600) {
          if (el.textContent && el.textContent.trim() && el.children.length === 0) {
            boldTexts.push({
              text: el.textContent.trim().substring(0, 50),
              weight: fontWeight,
              tagName: el.tagName,
              className: el.className
            });
          }
        }
      });

      return boldTexts;
    });

    console.log(`Found ${boldElements.length} bold text elements:`);
    boldElements.slice(0, 10).forEach(el => {
      console.log(`  - ${el.tagName}: "${el.text}" (weight: ${el.weight})`);
    });

    // Check page height and scrolling
    console.log('\n📏 Checking page dimensions...');
    const pageInfo = await page.evaluate(() => {
      return {
        windowHeight: window.innerHeight,
        bodyHeight: document.body.scrollHeight,
        hasScroll: document.body.scrollHeight > window.innerHeight,
        overflow: window.getComputedStyle(document.body).overflow,
        htmlHeight: document.documentElement.scrollHeight
      };
    });

    console.log('Page dimensions:');
    console.log(`  - Window height: ${pageInfo.windowHeight}px`);
    console.log(`  - Body height: ${pageInfo.bodyHeight}px`);
    console.log(`  - Has scroll: ${pageInfo.hasScroll ? 'YES ❌' : 'NO ✅'}`);
    console.log(`  - Body overflow: ${pageInfo.overflow}`);

    // Check specific font weights in use
    console.log('\n🎨 Checking CSS font-weight usage...');
    const fontWeights = await page.evaluate(() => {
      const weights = new Set();
      const elements = document.querySelectorAll('*');

      elements.forEach(el => {
        const weight = window.getComputedStyle(el).fontWeight;
        if (weight) weights.add(weight);
      });

      return Array.from(weights);
    });

    console.log('Font weights in use:', fontWeights.join(', '));

    // Try to navigate to other pages if logged in
    console.log('\n🔐 Checking if we can access other pages...');

    // Check if we're on login page or dashboard
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    if (currentUrl.includes('/login')) {
      console.log('📝 Currently on login page');

      // Check login form elements
      const loginElements = await page.evaluate(() => {
        return {
          hasEmailField: !!document.querySelector('input[type="email"], input[name="email"], input[placeholder*="بريد"]'),
          hasPasswordField: !!document.querySelector('input[type="password"]'),
          hasSubmitButton: !!document.querySelector('button[type="submit"], button:has-text("دخول"), button:has-text("تسجيل")')
        };
      });

      console.log('Login form elements:', loginElements);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n✅ Analysis complete! Keeping browser open for manual inspection...');
  console.log('Press Ctrl+C to close the browser and exit.');

  // Keep browser open for manual inspection
  await page.waitForTimeout(60000);

  await browser.close();
})();