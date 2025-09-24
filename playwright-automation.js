const { chromium } = require('playwright');

(async () => {
  // Launch browser
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });
  const context = await browser.newContext({
    viewport: null
  });
  const page = await context.newPage();

  console.log('1. Navigating to localhost:3002...');
  await page.goto('http://localhost:3002');
  await page.waitForTimeout(2000);

  console.log('2. Taking screenshot of current page...');
  await page.screenshot({
    path: 'screenshot-initial.png',
    fullPage: true
  });
  console.log('Screenshot saved as screenshot-initial.png');

  // Analyze layout
  console.log('3. Analyzing page layout...');
  const title = await page.title();
  console.log('Page title:', title);

  const dimensions = await page.evaluate(() => {
    return {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight
    }
  });
  console.log('Page dimensions:', dimensions);

  // Check for login button
  console.log('4. Looking for login button...');
  try {
    const loginButton = await page.locator('button:has-text("login"), button:has-text("Login"), button:has-text("تسجيل الدخول"), a:has-text("login"), a:has-text("Login")').first();
    if (await loginButton.count() > 0) {
      console.log('Login button found, clicking...');
      await loginButton.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshot-after-login-click.png' });
      console.log('Screenshot after login click saved');
    } else {
      console.log('No login button found on the page');
    }
  } catch (e) {
    console.log('Could not find or click login button:', e.message);
  }

  // Open DevTools and inspect header CSS
  console.log('5. Inspecting header component CSS...');
  const headerStyles = await page.evaluate(() => {
    const header = document.querySelector('header, [class*="header"], [class*="Header"], nav, [class*="navbar"]');
    if (header) {
      const styles = window.getComputedStyle(header);
      return {
        found: true,
        tagName: header.tagName,
        className: header.className,
        id: header.id,
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        height: styles.height,
        display: styles.display,
        position: styles.position,
        zIndex: styles.zIndex,
        padding: styles.padding,
        margin: styles.margin
      };
    }
    return { found: false };
  });
  console.log('Header CSS styles:', headerStyles);

  // Test responsive design
  console.log('6. Testing responsive design...');
  const viewports = [
    { name: 'Desktop', width: 1920, height: 1080 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Mobile', width: 375, height: 812 }
  ];

  for (const viewport of viewports) {
    console.log(`Testing ${viewport.name} view (${viewport.width}x${viewport.height})...`);
    await page.setViewportSize(viewport);
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: `screenshot-${viewport.name.toLowerCase()}.png`,
      fullPage: true
    });
    console.log(`${viewport.name} screenshot saved`);
  }

  console.log('\n✅ All automation tasks completed!');
  console.log('Screenshots saved:');
  console.log('  - screenshot-initial.png');
  console.log('  - screenshot-after-login-click.png (if login button found)');
  console.log('  - screenshot-desktop.png');
  console.log('  - screenshot-tablet.png');
  console.log('  - screenshot-mobile.png');

  // Keep browser open for manual inspection
  console.log('\nBrowser will remain open for manual inspection.');
  console.log('Press Ctrl+C to close the browser and exit.');

  // Keep the script running
  await new Promise(() => {});
})();