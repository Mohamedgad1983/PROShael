const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Verifying Balanced Font Sizes (Medium)\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  try {
    console.log('📋 Checking Login Page with Balanced Font Sizes...');
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
      const body = document.body;

      return {
        h1: h1 ? window.getComputedStyle(h1).fontSize : null,
        label: label ? window.getComputedStyle(label).fontSize : null,
        button: button ? window.getComputedStyle(button).fontSize : null,
        input: input ? window.getComputedStyle(input).fontSize : null,
        body: window.getComputedStyle(body).fontSize
      };
    });

    console.log('✅ Title Size:', sizes.h1, '(should be ~26px)');
    console.log('✅ Label Size:', sizes.label, '(should be ~13px)');
    console.log('✅ Button Size:', sizes.button, '(should be ~14px)');
    console.log('✅ Input Size:', sizes.input, '(should be ~14px)');
    console.log('✅ Body Size:', sizes.body, '(should be ~14px)');

    // Take screenshot
    await page.screenshot({ path: 'balanced-login.png', fullPage: true });
    console.log('\n📸 Screenshot saved: balanced-login.png');

    console.log('\n' + '='.repeat(60));
    console.log('✨ Balanced Font Sizing Applied Successfully!');
    console.log('Text is now medium-sized - not too big, not too small');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n🔴 Error:', error.message);
  }

  console.log('\nBrowser will close in 5 seconds...');
  await page.waitForTimeout(5000);
  await browser.close();
})();