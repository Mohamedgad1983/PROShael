const { chromium } = require('playwright');

async function debugLogin() {
  console.log('Launching visible browser...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();

  console.log('Navigating to login page...');
  await page.goto('http://localhost:3002/login', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  // Wait for page to load
  await page.waitForTimeout(3000);

  // Take screenshot to see current state
  await page.screenshot({ path: 'screenshots/debug-login.png', fullPage: true });
  console.log('Screenshot saved to screenshots/debug-login.png');

  // Log page content
  const html = await page.content();
  console.log('Page URL:', page.url());
  console.log('Page has input[name="phone"]:', html.includes('name="phone"'));
  console.log('Page has input#phone:', html.includes('id="phone"'));

  // List all inputs on the page
  const inputs = await page.locator('input').all();
  console.log('Found', inputs.length, 'input elements');

  for (let i = 0; i < inputs.length; i++) {
    const type = await inputs[i].getAttribute('type');
    const name = await inputs[i].getAttribute('name');
    const id = await inputs[i].getAttribute('id');
    console.log(`  Input ${i}: type=${type}, name=${name}, id=${id}`);
  }

  console.log('Browser will stay open for 60 seconds...');
  await page.waitForTimeout(60000);

  await browser.close();
}

debugLogin().catch(console.error);
