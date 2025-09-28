const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(__dirname, 'member-edit-screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

async function testMemberEdit() {
  console.log('Starting Member Edit Functionality Test...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: 'ar-SA'
  });

  const page = await context.newPage();

  try {
    // Step 1: Navigate to login page
    console.log('Step 1: Navigating to login page...');
    await page.goto('https://alshuail-admin.pages.dev/login', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: path.join(screenshotsDir, '01-login-page.png'),
      fullPage: true
    });
    console.log('✅ Screenshot saved: 01-login-page.png');

    // Debug: Get all input fields
    const inputs = await page.evaluate(() => {
      const allInputs = document.querySelectorAll('input');
      return Array.from(allInputs).map(input => ({
        type: input.type,
        name: input.name,
        id: input.id,
        placeholder: input.placeholder,
        className: input.className
      }));
    });
    console.log('Available input fields:', JSON.stringify(inputs, null, 2));

    // Step 2: Login with flexible selectors
    console.log('\nStep 2: Logging in...');

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Find username field
    const usernameField = await page.locator('input').first();
    await usernameField.waitFor({ state: 'visible', timeout: 10000 });
    await usernameField.fill('admin');
    console.log('✅ Username filled');

    // Find password field
    const passwordField = await page.locator('input[type="password"]').first();
    await passwordField.waitFor({ state: 'visible', timeout: 10000 });
    await passwordField.fill('Admin@2024$$');
    console.log('✅ Password filled');

    await page.screenshot({
      path: path.join(screenshotsDir, '02-credentials-filled.png'),
      fullPage: true
    });
    console.log('✅ Screenshot saved: 02-credentials-filled.png');

    // Find and click submit button
    const submitButton = await page.locator('button[type="submit"]').first();
    await submitButton.click();
    console.log('✅ Login button clicked');

    // Wait for navigation
    await page.waitForTimeout(5000);
    await page.screenshot({
      path: path.join(screenshotsDir, '03-after-login.png'),
      fullPage: true
    });
    console.log('✅ Screenshot saved: 03-after-login.png\n');

    // Step 3: Navigate to Members Management
    console.log('Step 3: Navigating to Members Management...');
    await page.goto('https://alshuail-admin.pages.dev/members', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForTimeout(4000);
    await page.screenshot({
      path: path.join(screenshotsDir, '04-members-page.png'),
      fullPage: true
    });
    console.log('✅ Screenshot saved: 04-members-page.png\n');

    // Step 4: Find and click first edit button
    console.log('Step 4: Finding and clicking edit button...');

    // Wait for table to load
    await page.waitForTimeout(2000);

    // Find all buttons and look for edit button
    const buttons = await page.locator('button').all();
    console.log(`Found ${buttons.length} buttons on the page`);

    let editButton = null;
    for (let i = 0; i < Math.min(buttons.length, 50); i++) {
      const button = buttons[i];
      const ariaLabel = await button.getAttribute('aria-label').catch(() => null);
      const title = await button.getAttribute('title').catch(() => null);
      const innerHTML = await button.innerHTML().catch(() => '');

      if (
        (ariaLabel && ariaLabel.includes('تعديل')) ||
        (title && title.includes('تعديل')) ||
        innerHTML.includes('pencil') ||
        innerHTML.includes('edit')
      ) {
        editButton = button;
        console.log(`✅ Found edit button at index ${i}`);
        break;
      }
    }

    if (!editButton) {
      // Try SVG-based approach
      editButton = await page.locator('button').filter({ has: page.locator('svg') }).first();
    }

    if (editButton) {
      await editButton.click();
      console.log('✅ Edit button clicked');
    } else {
      throw new Error('Could not find edit button');
    }

    await page.waitForTimeout(3000);

    // Step 5: Capture edit modal
    console.log('\nStep 5: Capturing edit modal...');
    await page.screenshot({
      path: path.join(screenshotsDir, '05-edit-modal-opened.png'),
      fullPage: true
    });
    console.log('✅ Screenshot saved: 05-edit-modal-opened.png');

    // Extract all form fields
    const formFields = await page.evaluate(() => {
      const fields = [];
      const allFields = document.querySelectorAll('input, select, textarea');

      allFields.forEach((field, index) => {
        const label = field.labels?.[0]?.textContent ||
                     field.previousElementSibling?.textContent ||
                     field.closest('div')?.querySelector('label')?.textContent ||
                     'No label';

        const fieldData = {
          index,
          tag: field.tagName,
          type: field.type,
          name: field.name,
          id: field.id,
          value: field.value,
          label: label.trim()
        };

        if (field.tagName === 'SELECT') {
          fieldData.options = Array.from(field.options).map(opt => ({
            value: opt.value,
            text: opt.text,
            selected: opt.selected
          }));
        }

        fields.push(fieldData);
      });

      return fields;
    });

    console.log('\nForm fields found:');
    formFields.forEach(field => {
      console.log(`- ${field.label}: ${field.tag}${field.name ? ' (name: ' + field.name + ')' : ''}`);
      if (field.tag === 'SELECT' && field.options) {
        console.log(`  Options: ${field.options.map(o => o.text).join(', ')}`);
      }
    });

    // Step 6: Test Gender dropdown
    console.log('\nStep 6: Testing Gender (الجنس) dropdown...');

    const genderSelect = await page.locator('select').filter({
      has: page.locator('option:has-text("ذكر"), option:has-text("أنثى")')
    }).first().catch(() => null);

    if (genderSelect) {
      const genderOptions = await page.evaluate(() => {
        const selects = document.querySelectorAll('select');
        for (const select of selects) {
          const optionsText = Array.from(select.options).map(o => o.text).join(',');
          if (optionsText.includes('ذكر') || optionsText.includes('أنثى')) {
            return {
              value: select.value,
              options: Array.from(select.options).map(opt => ({
                value: opt.value,
                text: opt.text,
                selected: opt.selected
              }))
            };
          }
        }
        return null;
      });

      console.log('Gender field found!');
      console.log('Current value:', genderOptions?.value);
      console.log('Options:', JSON.stringify(genderOptions?.options, null, 2));

      await genderSelect.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(screenshotsDir, '06-gender-dropdown-opened.png'),
        fullPage: true
      });
      console.log('✅ Screenshot saved: 06-gender-dropdown-opened.png');

      // Check if options show dots
      const hasDotsIssue = genderOptions?.options.some(opt =>
        opt.text === '...' || opt.text.includes('…')
      );
      if (hasDotsIssue) {
        console.log('⚠️  ISSUE DETECTED: Gender dropdown shows dots instead of values!');
      }
    } else {
      console.log('❌ Could not find gender dropdown');
    }

    // Step 7: Test Tribal Section dropdown
    console.log('\nStep 7: Testing Tribal Section (الفخذ) dropdown...');

    const tribalOptions = await page.evaluate(() => {
      const selects = document.querySelectorAll('select');
      for (const select of selects) {
        const optionsText = Array.from(select.options).map(o => o.text).join(',');
        if (optionsText.includes('الفخذ') || select.previousElementSibling?.textContent?.includes('الفخذ')) {
          return {
            value: select.value,
            options: Array.from(select.options).map(opt => ({
              value: opt.value,
              text: opt.text,
              selected: opt.selected
            }))
          };
        }
      }

      // Alternative: find by checking if options have tribal section names
      for (const select of selects) {
        const firstOption = select.options[0]?.text;
        if (firstOption && (firstOption.includes('...') || firstOption.includes('…'))) {
          return {
            value: select.value,
            options: Array.from(select.options).map(opt => ({
              value: opt.value,
              text: opt.text,
              selected: opt.selected
            })),
            possiblyTribal: true
          };
        }
      }

      return null;
    });

    if (tribalOptions) {
      console.log('Tribal section field found!');
      console.log('Current value:', tribalOptions.value);
      console.log('Options:', JSON.stringify(tribalOptions.options, null, 2));

      const tribalSelect = await page.locator('select').nth(1);
      await tribalSelect.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(screenshotsDir, '07-tribal-dropdown-opened.png'),
        fullPage: true
      });
      console.log('✅ Screenshot saved: 07-tribal-dropdown-opened.png');

      // Check if options show dots
      const hasDotsIssue = tribalOptions.options.some(opt =>
        opt.text === '...' || opt.text.includes('…')
      );
      if (hasDotsIssue) {
        console.log('⚠️  ISSUE DETECTED: Tribal section dropdown shows dots instead of values!');
      }
    } else {
      console.log('❌ Could not find tribal section dropdown');
    }

    // Step 8: Attempt to save
    console.log('\nStep 8: Attempting to save...');

    // Listen for network responses
    page.on('response', async (response) => {
      if (response.url().includes('/api/members') && response.request().method() === 'PUT') {
        console.log(`API Response: ${response.status()}`);
        if (response.status() >= 400) {
          const body = await response.text().catch(() => 'Could not read body');
          console.log('Error response:', body);
        }
      }
    });

    const saveButton = await page.locator('button').filter({ hasText: /حفظ|تحديث|Save/ }).first();
    if (saveButton) {
      await saveButton.click();
      console.log('✅ Save button clicked');
      await page.waitForTimeout(3000);

      await page.screenshot({
        path: path.join(screenshotsDir, '08-after-save-attempt.png'),
        fullPage: true
      });
      console.log('✅ Screenshot saved: 08-after-save-attempt.png');

      // Check for error messages
      const errors = await page.locator('[role="alert"], .error, .toast').all();
      if (errors.length > 0) {
        console.log(`⚠️  Found ${errors.length} error message(s)`);
        for (const error of errors) {
          const text = await error.textContent();
          console.log(`Error: ${text}`);
        }
      }
    }

    // Final screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, '09-final-state.png'),
      fullPage: true
    });
    console.log('✅ Screenshot saved: 09-final-state.png');

    // Save all form data
    fs.writeFileSync(
      path.join(screenshotsDir, 'form-analysis.json'),
      JSON.stringify(formFields, null, 2)
    );
    console.log('✅ Form analysis saved to form-analysis.json');

    console.log('\n========================================');
    console.log('✅ Test completed successfully!');
    console.log('📁 Screenshots saved in:', screenshotsDir);
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);
    await page.screenshot({
      path: path.join(screenshotsDir, 'ERROR-screenshot.png'),
      fullPage: true
    });
    console.log('📸 Error screenshot saved as: ERROR-screenshot.png');
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
  }
}

// Run the test
testMemberEdit().catch(console.error);