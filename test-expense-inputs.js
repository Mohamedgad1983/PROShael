const puppeteer = require('puppeteer');

async function testExpenseForm() {
  console.log('Starting expense form test...');

  try {
    const browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Navigate to the app
    console.log('Navigating to http://localhost:3002...');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle0' });

    // Wait for page to load
    await page.waitForTimeout(3000);

    // Navigate to Reports section
    console.log('Looking for Reports button...');
    const reportsButton = await page.$('text/التقارير');
    if (reportsButton) {
      await reportsButton.click();
      await page.waitForTimeout(2000);
    }

    // Click on expense management tab
    console.log('Looking for Expense Management tab...');
    const expenseTab = await page.$('text/إدارة المصروفات');
    if (expenseTab) {
      await expenseTab.click();
      await page.waitForTimeout(2000);
    }

    // Click Add New Expense button
    console.log('Looking for Add Expense button...');
    const addButton = await page.$('text/إضافة مصروف جديد');
    if (addButton) {
      await addButton.click();
      await page.waitForTimeout(2000);
    }

    // Try to type in the first input field
    console.log('Testing input fields...');
    const inputs = await page.$$('input[type="text"]');

    if (inputs.length > 0) {
      console.log(`Found ${inputs.length} text inputs`);

      // Test the first input (Arabic title)
      const firstInput = inputs[0];
      await firstInput.click();
      await page.keyboard.type('اختبار الإدخال');

      // Check if value was entered
      const value = await page.evaluate(el => el.value, firstInput);

      if (value === 'اختبار الإدخال') {
        console.log('✅ SUCCESS: Input field accepts text!');
        console.log('Input value:', value);
      } else {
        console.log('❌ FAILED: Input field not accepting text');
        console.log('Current value:', value);
      }
    } else {
      console.log('❌ No input fields found');
    }

    // Take a screenshot
    await page.screenshot({ path: 'expense-form-test.png' });
    console.log('Screenshot saved as expense-form-test.png');

    await browser.close();

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testExpenseForm();