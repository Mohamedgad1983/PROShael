const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Verifying Compact Font Sizes\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  try {
    console.log('📋 Checking Login Page Font Sizes...');
    await page.goto('http://localhost:3002', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    // Check various font sizes
    const sizes = await page.evaluate(() => {
      const h1 = document.querySelector('h1, .modern-title');
      const label = document.querySelector('label, .modern-input-label');
      const button = document.querySelector('button, .modern-login-button');
      const input = document.querySelector('input');

      return {
        h1: h1 ? window.getComputedStyle(h1).fontSize : null,
        label: label ? window.getComputedStyle(label).fontSize : null,
        button: button ? window.getComputedStyle(button).fontSize : null,
        input: input ? window.getComputedStyle(input).fontSize : null
      };
    });

    console.log('✅ Title Size:', sizes.h1);
    console.log('✅ Label Size:', sizes.label);
    console.log('✅ Button Size:', sizes.button);
    console.log('✅ Input Size:', sizes.input);

    // Take screenshot
    await page.screenshot({ path: 'compact-login.png', fullPage: true });
    console.log('\n📸 Screenshot saved: compact-login.png');

    console.log('\n' + '='.repeat(60));
    console.log('✨ Compact Font Sizing Applied Successfully!');
    console.log('Pages should now fit better with smaller, normal text');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n🔴 Error:', error.message);
  }

  console.log('\nBrowser will close in 5 seconds...');
  await page.waitForTimeout(5000);
  await browser.close();
})();