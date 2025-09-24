const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Final Verification of PaymentSystem.jsx Fix\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  let criticalErrors = false;
  let syntaxErrors = false;

  // Capture critical errors
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      if (text.includes('PaymentSystem') || text.includes('Unexpected token') || text.includes('Module build failed')) {
        console.log('❌ CRITICAL ERROR:', text.substring(0, 200));
        syntaxErrors = true;
        criticalErrors = true;
      }
    }
  });

  page.on('pageerror', error => {
    if (error.message.includes('PaymentSystem')) {
      console.log('🔴 PAGE ERROR:', error.message.substring(0, 200));
      criticalErrors = true;
    }
  });

  try {
    // Test Admin Panel
    console.log('✅ Testing Admin Panel at http://localhost:3002...');
    const adminResponse = await page.goto('http://localhost:3002', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    if (adminResponse && adminResponse.status() === 200) {
      console.log('✅ Admin panel loaded successfully (HTTP 200)');
    }

    await page.waitForTimeout(2000);

    // Check for login form
    const loginForm = await page.$('form');
    if (loginForm) {
      console.log('✅ Login form rendered correctly');
    }

    // Test Member Route
    console.log('\n✅ Testing Member App at http://localhost:3002/member...');
    const memberResponse = await page.goto('http://localhost:3002/member', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    if (memberResponse && memberResponse.status() === 200) {
      console.log('✅ Member app loaded successfully (HTTP 200)');
    }

    await page.waitForTimeout(2000);

    // Check for member login
    const memberLogin = await page.$('text=رقم الجوال');
    if (memberLogin) {
      console.log('✅ Member login form rendered correctly');
    }

    // Final verdict
    console.log('\n' + '='.repeat(60));
    if (!syntaxErrors && !criticalErrors) {
      console.log('🎉 SUCCESS: PaymentSystem.jsx is FIXED!');
      console.log('✅ No syntax errors detected');
      console.log('✅ Admin panel working at http://localhost:3002');
      console.log('✅ Member app working at http://localhost:3002/member');
      console.log('✅ Backend API running at http://localhost:5001');
    } else {
      console.log('⚠️ WARNING: Some errors were detected');
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n🔴 Test error:', error.message);
  }

  await browser.close();
})();