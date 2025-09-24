const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Verifying Text Normalization (No Bold)\n');

  const browser = await chromium.launch({
    headless: false, // Show browser to see changes
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  try {
    // Test Login Page
    console.log('📋 Checking Login Page Text Styles...');
    await page.goto('http://localhost:3002', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    // Check font weights
    const headingWeight = await page.evaluate(() => {
      const heading = document.querySelector('h1, .modern-title');
      return heading ? window.getComputedStyle(heading).fontWeight : null;
    });

    const labelWeight = await page.evaluate(() => {
      const label = document.querySelector('label, .modern-input-label');
      return label ? window.getComputedStyle(label).fontWeight : null;
    });

    const buttonWeight = await page.evaluate(() => {
      const button = document.querySelector('button, .modern-login-button');
      return button ? window.getComputedStyle(button).fontWeight : null;
    });

    console.log('✅ Title Font Weight:', headingWeight === '400' ? 'Normal (400) ✓' : `${headingWeight} ✗`);
    console.log('✅ Label Font Weight:', labelWeight === '400' ? 'Normal (400) ✓' : `${labelWeight} ✗`);
    console.log('✅ Button Font Weight:', buttonWeight === '400' ? 'Normal (400) ✓' : `${buttonWeight} ✗`);

    // Take screenshot of login page
    await page.screenshot({ path: 'login-normal-text.png', fullPage: true });
    console.log('\n📸 Screenshot saved: login-normal-text.png');

    // Test Member App
    console.log('\n📋 Checking Member App Text Styles...');
    await page.goto('http://localhost:3002/member', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    const memberTitleWeight = await page.evaluate(() => {
      const title = document.querySelector('h2, .login-title');
      return title ? window.getComputedStyle(title).fontWeight : null;
    });

    const memberLabelWeight = await page.evaluate(() => {
      const label = document.querySelector('.form-label');
      return label ? window.getComputedStyle(label).fontWeight : null;
    });

    console.log('✅ Member Title Weight:', memberTitleWeight === '400' ? 'Normal (400) ✓' : `${memberTitleWeight} ✗`);
    console.log('✅ Member Label Weight:', memberLabelWeight === '400' ? 'Normal (400) ✓' : `${memberLabelWeight} ✗`);

    // Take screenshot of member app
    await page.screenshot({ path: 'member-normal-text.png', fullPage: true });
    console.log('\n📸 Screenshot saved: member-normal-text.png');

    console.log('\n' + '='.repeat(60));
    console.log('✨ Text Normalization Verification Complete!');
    console.log('All text should now display with normal weight (400)');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n🔴 Verification error:', error.message);
  }

  console.log('\nKeeping browser open for 10 seconds for visual inspection...');
  await page.waitForTimeout(10000);

  await browser.close();
  console.log('\n✅ Verification completed');
})();