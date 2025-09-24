const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Starting Playwright browser automation...\n');

  // Launch browser
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized'],
    devtools: true // Open with DevTools
  });

  const context = await browser.newContext({
    viewport: null,
    locale: 'ar-SA',
    colorScheme: 'dark'
  });

  const page = await context.newPage();

  try {
    // 1. Navigate to localhost:3002
    console.log('1️⃣ Navigating to localhost:3002...');
    await page.goto('http://localhost:3002', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    console.log('✅ Navigation successful\n');

    // 2. Take screenshot and analyze layout
    console.log('2️⃣ Taking screenshot and analyzing layout...');

    // Take initial screenshot
    await page.screenshot({
      path: 'app-screenshot-full.png',
      fullPage: true
    });
    console.log('📸 Full page screenshot saved: app-screenshot-full.png');

    // Analyze layout
    const layoutAnalysis = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;

      // Check for RTL
      const isRTL = html.dir === 'rtl' || body.dir === 'rtl' ||
                    window.getComputedStyle(body).direction === 'rtl';

      // Get main containers
      const mainContainer = document.querySelector('.login-container, .dashboard-container, main, [role="main"]');
      const header = document.querySelector('header, .header, .login-header, nav');
      const sidebar = document.querySelector('.sidebar, aside, [role="navigation"]');

      return {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        document: {
          width: html.scrollWidth,
          height: html.scrollHeight
        },
        rtl: isRTL,
        hasHeader: !!header,
        hasSidebar: !!sidebar,
        hasMainContent: !!mainContainer,
        backgroundColor: window.getComputedStyle(body).backgroundColor,
        fontFamily: window.getComputedStyle(body).fontFamily,
        title: document.title,
        metaDescription: document.querySelector('meta[name="description"]')?.content
      };
    });

    console.log('📊 Layout Analysis:', JSON.stringify(layoutAnalysis, null, 2));
    console.log();

    // 3. Look for and click login button
    console.log('3️⃣ Looking for login button...');

    // Try multiple selectors for login button
    const loginSelectors = [
      'button:has-text("تسجيل الدخول")',
      'button:has-text("Login")',
      'button:has-text("دخول")',
      'button[type="submit"]',
      'a:has-text("Login")',
      '.login-button',
      '#login-button'
    ];

    let loginClicked = false;
    for (const selector of loginSelectors) {
      try {
        const button = await page.locator(selector).first();
        if (await button.count() > 0) {
          // Check if button is visible and not covered
          const isVisible = await button.isVisible();
          if (isVisible) {
            console.log(`✅ Found login button with selector: ${selector}`);

            // Remove any overlays that might be blocking
            await page.evaluate(() => {
              const overlays = document.querySelectorAll('iframe#webpack-dev-server-client-overlay');
              overlays.forEach(overlay => overlay.remove());
            });

            await button.click({ force: true });
            loginClicked = true;
            console.log('✅ Login button clicked');

            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'app-after-login.png' });
            console.log('📸 Screenshot after login saved: app-after-login.png\n');
            break;
          }
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (!loginClicked) {
      console.log('⚠️ No login button found or clickable\n');
    }

    // 4. Inspect CSS of header component
    console.log('4️⃣ Inspecting header CSS...');

    const headerCSS = await page.evaluate(() => {
      const headerElement = document.querySelector('header, .header, .login-header, nav, .navbar');

      if (!headerElement) {
        return { found: false };
      }

      const styles = window.getComputedStyle(headerElement);
      const rect = headerElement.getBoundingClientRect();

      // Get all CSS properties
      const cssProperties = {
        found: true,
        selector: headerElement.className || headerElement.tagName.toLowerCase(),
        position: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        },
        styles: {
          backgroundColor: styles.backgroundColor,
          color: styles.color,
          fontSize: styles.fontSize,
          fontFamily: styles.fontFamily,
          padding: styles.padding,
          margin: styles.margin,
          display: styles.display,
          position: styles.position,
          zIndex: styles.zIndex,
          boxShadow: styles.boxShadow,
          borderRadius: styles.borderRadius,
          backdropFilter: styles.backdropFilter || styles.webkitBackdropFilter,
          background: styles.background
        },
        classes: headerElement.className,
        id: headerElement.id
      };

      return cssProperties;
    });

    console.log('🎨 Header CSS Properties:', JSON.stringify(headerCSS, null, 2));
    console.log();

    // 5. Test responsive design
    console.log('5️⃣ Testing responsive design...');

    const viewports = [
      { name: 'Desktop-4K', width: 3840, height: 2160 },
      { name: 'Desktop-FHD', width: 1920, height: 1080 },
      { name: 'Laptop', width: 1366, height: 768 },
      { name: 'Tablet-Landscape', width: 1024, height: 768 },
      { name: 'Tablet-Portrait', width: 768, height: 1024 },
      { name: 'Mobile-Large', width: 414, height: 896 },
      { name: 'Mobile-Standard', width: 375, height: 812 },
      { name: 'Mobile-Small', width: 320, height: 568 }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500);

      // Check if layout is responsive
      const isResponsive = await page.evaluate(() => {
        const body = document.body;
        const hasOverflow = body.scrollWidth > window.innerWidth;
        const elements = document.querySelectorAll('*');
        let hasHiddenElements = false;

        elements.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.right > window.innerWidth || rect.left < 0) {
            hasHiddenElements = true;
          }
        });

        return {
          hasHorizontalScroll: hasOverflow,
          hasElementsOutOfView: hasHiddenElements,
          isResponsive: !hasOverflow && !hasHiddenElements
        };
      });

      await page.screenshot({
        path: `responsive-${viewport.name.toLowerCase()}.png`,
        fullPage: false
      });

      console.log(`📱 ${viewport.name} (${viewport.width}x${viewport.height}):`,
                  isResponsive.isResponsive ? '✅ Responsive' : '❌ Layout issues',
                  isResponsive.hasHorizontalScroll ? '(horizontal scroll detected)' : '');
    }

    console.log('\n✨ All tests completed successfully!');
    console.log('\n📁 Screenshots saved:');
    console.log('  - app-screenshot-full.png');
    console.log('  - app-after-login.png (if login was successful)');
    console.log('  - responsive-*.png (8 different viewports)');

    console.log('\n🔧 Browser remains open with DevTools for manual inspection.');
    console.log('Press Ctrl+C to close the browser and exit.\n');

  } catch (error) {
    console.error('❌ Error during automation:', error.message);
  }

  // Keep browser open for manual inspection
  await new Promise(() => {});
})();