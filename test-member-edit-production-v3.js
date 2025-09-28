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
    slowMo: 300
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

    // Step 2: Login
    console.log('\nStep 2: Logging in...');
    await page.waitForLoadState('networkidle');

    const emailField = await page.locator('input[type="email"], input#email').first();
    await emailField.fill('admin');
    console.log('✅ Email filled');

    const passwordField = await page.locator('input[type="password"]').first();
    await passwordField.fill('Admin@2024$$');
    console.log('✅ Password filled');

    await page.screenshot({
      path: path.join(screenshotsDir, '02-credentials-filled.png'),
      fullPage: true
    });

    const submitButton = await page.locator('button[type="submit"]').first();
    await submitButton.click();
    console.log('✅ Login button clicked');

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
    await page.waitForTimeout(3000);

    // Close any modals that might be open
    console.log('Checking for and closing any open modals...');
    const closeButtons = await page.locator('button').filter({ hasText: /إغلاق|Close|×/ }).all();
    for (const btn of closeButtons) {
      try {
        const isVisible = await btn.isVisible();
        if (isVisible) {
          await btn.click();
          console.log('✅ Closed a modal');
          await page.waitForTimeout(1000);
        }
      } catch (e) {
        // Ignore
      }
    }

    // Press Escape to close any modals
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(screenshotsDir, '04-members-page.png'),
      fullPage: true
    });
    console.log('✅ Screenshot saved: 04-members-page.png');

    // Wait for members table to load
    console.log('Waiting for members table to load...');
    await page.waitForTimeout(3000);

    // Step 4: Find the members table and edit button
    console.log('\nStep 4: Looking for members table and edit buttons...');

    // Get page content to debug
    const pageContent = await page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      const buttons = document.querySelectorAll('button');
      return {
        tablesCount: tables.length,
        buttonsCount: buttons.length,
        hasTable: tables.length > 0,
        tableHeaders: tables.length > 0 ? Array.from(tables[0].querySelectorAll('th')).map(th => th.textContent.trim()) : []
      };
    });

    console.log('Page analysis:', JSON.stringify(pageContent, null, 2));

    // Look for table rows with action buttons
    const rows = await page.locator('table tbody tr').all();
    console.log(`Found ${rows.length} table rows`);

    if (rows.length === 0) {
      console.log('⚠️  No table rows found. Taking screenshot...');
      await page.screenshot({
        path: path.join(screenshotsDir, 'DEBUG-no-rows.png'),
        fullPage: true
      });
    }

    // Find edit button in the first row
    let editButton = null;
    if (rows.length > 0) {
      const firstRow = rows[0];
      // Look for buttons in the first row
      const rowButtons = await firstRow.locator('button').all();
      console.log(`Found ${rowButtons.length} buttons in first row`);

      // Try to find edit button (usually has pencil icon or edit text)
      for (let i = 0; i < rowButtons.length; i++) {
        const btn = rowButtons[i];
        const innerHTML = await btn.innerHTML();
        const title = await btn.getAttribute('title');
        const ariaLabel = await btn.getAttribute('aria-label');

        console.log(`Button ${i}: title="${title}", aria-label="${ariaLabel}"`);

        if (
          innerHTML.includes('pencil') ||
          innerHTML.includes('edit') ||
          (title && title.includes('تعديل')) ||
          (ariaLabel && ariaLabel.includes('تعديل'))
        ) {
          editButton = btn;
          console.log(`✅ Found edit button at index ${i}`);
          break;
        }
      }

      // If not found, try the first button in action column
      if (!editButton && rowButtons.length > 0) {
        editButton = rowButtons[0];
        console.log('Using first button in row as edit button');
      }
    }

    if (!editButton) {
      console.log('❌ Could not find edit button. Trying alternative approach...');

      // Try finding any button with pencil icon in the entire page
      const allButtons = await page.locator('button').all();
      for (const btn of allButtons) {
        const innerHTML = await btn.innerHTML();
        if (innerHTML.includes('pencil') || innerHTML.includes('edit')) {
          editButton = btn;
          console.log('✅ Found edit button using alternative approach');
          break;
        }
      }
    }

    if (editButton) {
      await editButton.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await editButton.click();
      console.log('✅ Edit button clicked');
      await page.waitForTimeout(3000);
    } else {
      throw new Error('Could not find any edit button');
    }

    // Step 5: Capture edit modal
    console.log('\nStep 5: Capturing edit modal...');
    await page.screenshot({
      path: path.join(screenshotsDir, '05-edit-modal-opened.png'),
      fullPage: true
    });
    console.log('✅ Screenshot saved: 05-edit-modal-opened.png');

    // Extract all visible form fields in the modal
    const modalData = await page.evaluate(() => {
      // Find the modal
      const modal = document.querySelector('[role="dialog"], .modal, [class*="modal"]');

      if (!modal) {
        return { error: 'No modal found' };
      }

      const fields = [];
      const allFields = modal.querySelectorAll('input, select, textarea');

      allFields.forEach((field, index) => {
        // Find label
        let label = '';
        if (field.labels && field.labels[0]) {
          label = field.labels[0].textContent;
        } else {
          const parent = field.closest('div');
          const labelEl = parent?.querySelector('label');
          if (labelEl) label = labelEl.textContent;
        }

        const fieldData = {
          index,
          tag: field.tagName,
          type: field.type || 'text',
          name: field.name,
          id: field.id,
          value: field.value,
          label: label.trim(),
          placeholder: field.placeholder
        };

        if (field.tagName === 'SELECT') {
          fieldData.options = Array.from(field.options).map(opt => ({
            value: opt.value,
            text: opt.text,
            selected: opt.selected
          }));
          fieldData.selectedIndex = field.selectedIndex;
        }

        fields.push(fieldData);
      });

      return { fields, modalFound: true };
    });

    console.log('\nModal Form Analysis:');
    console.log(JSON.stringify(modalData, null, 2));

    if (modalData.error) {
      console.log('❌', modalData.error);
      throw new Error(modalData.error);
    }

    // Step 6: Test Gender dropdown
    console.log('\nStep 6: Testing Gender (الجنس) dropdown...');

    const genderField = modalData.fields.find(f =>
      f.label.includes('الجنس') || f.label.includes('Gender') || f.name === 'gender'
    );

    if (genderField) {
      console.log('✅ Gender field found:', genderField.label);
      console.log('Current value:', genderField.value);
      console.log('Options:', JSON.stringify(genderField.options, null, 2));

      // Check for dots issue
      const hasDotsIssue = genderField.options.some(opt =>
        opt.text === '...' || opt.text.includes('…') || opt.text === ''
      );

      if (hasDotsIssue) {
        console.log('⚠️  🔴 ISSUE DETECTED: Gender dropdown shows dots or empty values instead of actual text!');
      } else {
        console.log('✅ Gender dropdown appears to have proper values');
      }

      // Click the gender dropdown
      const genderSelect = await page.locator(`select[name="${genderField.name}"]`).first();
      await genderSelect.scrollIntoViewIfNeeded();
      await genderSelect.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(screenshotsDir, '06-gender-dropdown-opened.png'),
        fullPage: true
      });
      console.log('✅ Screenshot saved: 06-gender-dropdown-opened.png');
    } else {
      console.log('❌ Gender field not found in modal');
    }

    // Step 7: Test Tribal Section dropdown
    console.log('\nStep 7: Testing Tribal Section (الفخذ) dropdown...');

    const tribalField = modalData.fields.find(f =>
      f.label.includes('الفخذ') || f.label.includes('Tribal') || f.name === 'tribalSection' || f.name === 'tribal_section'
    );

    if (tribalField) {
      console.log('✅ Tribal section field found:', tribalField.label);
      console.log('Current value:', tribalField.value);
      console.log('Options:', JSON.stringify(tribalField.options, null, 2));

      // Check for dots issue
      const hasDotsIssue = tribalField.options.some(opt =>
        opt.text === '...' || opt.text.includes('…') || opt.text === ''
      );

      if (hasDotsIssue) {
        console.log('⚠️  🔴 ISSUE DETECTED: Tribal section dropdown shows dots or empty values instead of actual text!');
      } else {
        console.log('✅ Tribal section dropdown appears to have proper values');
      }

      // Click the tribal dropdown
      const tribalSelect = await page.locator(`select[name="${tribalField.name}"]`).first();
      await tribalSelect.scrollIntoViewIfNeeded();
      await tribalSelect.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(screenshotsDir, '07-tribal-dropdown-opened.png'),
        fullPage: true
      });
      console.log('✅ Screenshot saved: 07-tribal-dropdown-opened.png');
    } else {
      console.log('❌ Tribal section field not found in modal');
    }

    // Step 8: Try to change values and save
    console.log('\nStep 8: Attempting to change values...');

    if (genderField) {
      try {
        const genderSelect = await page.locator(`select[name="${genderField.name}"]`).first();
        // Try to select a different option
        await genderSelect.selectOption({ index: 1 });
        console.log('✅ Changed gender dropdown value');
      } catch (e) {
        console.log('❌ Failed to change gender:', e.message);
      }
    }

    if (tribalField) {
      try {
        const tribalSelect = await page.locator(`select[name="${tribalField.name}"]`).first();
        await tribalSelect.selectOption({ index: 1 });
        console.log('✅ Changed tribal section dropdown value');
      } catch (e) {
        console.log('❌ Failed to change tribal section:', e.message);
      }
    }

    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(screenshotsDir, '08-after-changing-values.png'),
      fullPage: true
    });
    console.log('✅ Screenshot saved: 08-after-changing-values.png');

    // Step 9: Attempt to save
    console.log('\nStep 9: Attempting to save...');

    // Listen for API responses
    let apiResponse = null;
    page.on('response', async (response) => {
      if (response.url().includes('/api/members') && response.request().method() === 'PUT') {
        apiResponse = {
          status: response.status(),
          statusText: response.statusText(),
          url: response.url()
        };
        console.log(`📡 API Response: ${response.status()} ${response.statusText()}`);

        if (response.status() >= 400) {
          const body = await response.text().catch(() => 'Could not read body');
          apiResponse.body = body;
          console.log('❌ Error response body:', body);
        }
      }
    });

    const saveButton = await page.locator('button').filter({ hasText: /حفظ|تحديث|Save|Update/ }).first();
    if (saveButton) {
      await saveButton.click();
      console.log('✅ Save button clicked');
      await page.waitForTimeout(4000);

      await page.screenshot({
        path: path.join(screenshotsDir, '09-after-save-attempt.png'),
        fullPage: true
      });
      console.log('✅ Screenshot saved: 09-after-save-attempt.png');

      // Check for error messages
      const errorMessages = await page.evaluate(() => {
        const errors = [];
        const errorElements = document.querySelectorAll('[role="alert"], .error, .toast, [class*="error"], [class*="alert"]');
        errorElements.forEach(el => {
          const text = el.textContent.trim();
          if (text) errors.push(text);
        });
        return errors;
      });

      if (errorMessages.length > 0) {
        console.log(`⚠️  Found ${errorMessages.length} error message(s):`);
        errorMessages.forEach(msg => console.log(`  - ${msg}`));
      } else {
        console.log('No error messages found on the page');
      }

      if (apiResponse) {
        console.log('\n📊 API Response Summary:');
        console.log(JSON.stringify(apiResponse, null, 2));
      }
    } else {
      console.log('❌ Save button not found');
    }

    // Final screenshot
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(screenshotsDir, '10-final-state.png'),
      fullPage: true
    });
    console.log('✅ Screenshot saved: 10-final-state.png');

    // Save complete analysis
    const analysis = {
      timestamp: new Date().toISOString(),
      modalData,
      genderField,
      tribalField,
      apiResponse,
      issues: []
    };

    if (genderField && genderField.options.some(o => o.text === '...' || o.text === '')) {
      analysis.issues.push('Gender dropdown shows dots or empty values');
    }

    if (tribalField && tribalField.options.some(o => o.text === '...' || o.text === '')) {
      analysis.issues.push('Tribal section dropdown shows dots or empty values');
    }

    fs.writeFileSync(
      path.join(screenshotsDir, 'test-analysis.json'),
      JSON.stringify(analysis, null, 2)
    );
    console.log('✅ Complete analysis saved to test-analysis.json');

    console.log('\n========================================');
    console.log('✅ Test completed successfully!');
    console.log('📁 Screenshots saved in:', screenshotsDir);
    if (analysis.issues.length > 0) {
      console.log('\n🔴 ISSUES FOUND:');
      analysis.issues.forEach(issue => console.log(`  - ${issue}`));
    }
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