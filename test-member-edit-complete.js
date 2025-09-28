const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const screenshotsDir = path.join(__dirname, 'member-edit-test-results');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

async function testMemberEdit() {
  console.log('🔍 Complete Member Edit Functionality Test\n');
  console.log('='.repeat(70));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: 'ar-SA'
  });

  const page = await context.newPage();

  // Track all console messages
  const consoleMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push({ type: msg.type(), text });
    if (msg.type() === 'error') {
      console.log(`🔴 Console Error: ${text}`);
    }
  });

  // Track network requests
  const apiCalls = [];
  page.on('response', response => {
    const url = response.url();
    if (url.includes('/api/')) {
      const call = {
        method: response.request().method(),
        url,
        status: response.status()
      };
      apiCalls.push(call);
      console.log(`📡 API: ${call.method} ${call.status} ${url}`);
    }
  });

  try {
    // ============================================================
    // STEP 1: LOGIN
    // ============================================================
    console.log('\n📝 STEP 1: Navigating to login page...');
    await page.goto('https://alshuail-admin.pages.dev/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: path.join(screenshotsDir, '01-login-page.png'),
      fullPage: true
    });
    console.log('✅ Login page loaded');

    // Check for any visible error messages before login
    const initialErrors = await page.evaluate(() => {
      const errors = document.querySelectorAll('[class*="error"], [role="alert"]');
      return Array.from(errors).map(e => e.textContent.trim()).filter(t => t);
    });

    if (initialErrors.length > 0) {
      console.log('⚠️  Initial errors on page:', initialErrors);
    }

    console.log('\n🔐 Filling in credentials...');
    const emailInput = page.locator('input[type="email"], input#email').first();
    await emailInput.clear();
    await emailInput.fill('admin');
    await page.waitForTimeout(500);

    const passwordInput = page.locator('input[type="password"], input#password').first();
    await passwordInput.clear();
    await passwordInput.fill('Admin@2024$$');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(screenshotsDir, '02-credentials-filled.png'),
      fullPage: true
    });

    console.log('✅ Credentials filled');
    console.log('🖱️  Clicking login button...');

    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    // Wait for either navigation or error message
    await Promise.race([
      page.waitForNavigation({ timeout: 10000 }).catch(() => null),
      page.waitForTimeout(8000)
    ]);

    await page.screenshot({
      path: path.join(screenshotsDir, '03-after-login-attempt.png'),
      fullPage: true
    });

    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);

    // Check for login errors
    const loginErrors = await page.evaluate(() => {
      const errors = document.querySelectorAll('[class*="error"], [role="alert"], .toast');
      return Array.from(errors).map(e => e.textContent.trim()).filter(t => t);
    });

    if (loginErrors.length > 0) {
      console.log('❌ Login errors found:', loginErrors);
    }

    // Check auth status
    const authStatus = await page.evaluate(() => {
      const ls = {...localStorage};
      return {
        hasLocalStorage: Object.keys(localStorage).length > 0,
        localStorageKeys: Object.keys(localStorage),
        hasToken: !!localStorage.getItem('token') ||
                  !!localStorage.getItem('authToken') ||
                  !!localStorage.getItem('auth_token')
      };
    });

    console.log('🔑 Auth Status:', JSON.stringify(authStatus, null, 2));

    if (!authStatus.hasToken && currentUrl.includes('/login')) {
      console.log('❌ Login appears to have failed - still on login page with no token');

      // Try to see if there's a validation issue
      const formValidation = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input');
        return Array.from(inputs).map(input => ({
          name: input.name,
          value: input.value,
          validity: input.validity.valid,
          validationMessage: input.validationMessage
        }));
      });

      console.log('📋 Form validation:', JSON.stringify(formValidation, null, 2));
    }

    // ============================================================
    // STEP 2: Navigate to Members Page
    // ============================================================
    console.log('\n📋 STEP 2: Navigating to Members Management...');

    // Force navigation to members page
    await page.goto('https://alshuail-admin.pages.dev/members', {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(5000);

    const membersUrl = page.url();
    console.log(`📍 Current URL: ${membersUrl}`);

    if (membersUrl.includes('/login')) {
      console.log('❌ Redirected back to login - authentication failed');
      console.log('\n🔴 CRITICAL ISSUE: Cannot proceed with test - login is failing');
      console.log('   The provided credentials (admin / Admin@2024$$) are not working');
      console.log('   Please verify the correct admin credentials');

      await page.screenshot({
        path: path.join(screenshotsDir, 'ISSUE-login-failed.png'),
        fullPage: true
      });

      // Generate report
      const report = {
        testStatus: 'FAILED',
        failureReason: 'Authentication Failed',
        issue: 'Login credentials do not work - redirected back to login page',
        currentUrl: membersUrl,
        authStatus,
        loginErrors,
        consoleErrors: consoleMessages.filter(m => m.type === 'error'),
        apiCalls
      };

      fs.writeFileSync(
        path.join(screenshotsDir, 'test-report.json'),
        JSON.stringify(report, null, 2)
      );

      console.log('\n📄 Test report saved to: test-report.json');
      console.log('='.repeat(70));

      return;
    }

    // If we got here, we're on members page
    console.log('✅ Successfully reached members page');

    // Close any modals
    console.log('🔄 Attempting to close any modals...');
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    await page.screenshot({
      path: path.join(screenshotsDir, '04-members-page.png'),
      fullPage: true
    });

    // Wait for table
    await page.waitForTimeout(3000);

    // ============================================================
    // STEP 3: Find and Click Edit Button
    // ============================================================
    console.log('\n✏️  STEP 3: Finding edit button...');

    const pageAnalysis = await page.evaluate(() => {
      return {
        hasTables: document.querySelectorAll('table').length > 0,
        tableRows: document.querySelectorAll('table tbody tr').length,
        totalButtons: document.querySelectorAll('button').length,
        visibleButtons: Array.from(document.querySelectorAll('button'))
          .filter(b => b.offsetParent !== null)
          .map(b => ({
            text: b.textContent.trim().substring(0, 30),
            hasSVG: !!b.querySelector('svg'),
            title: b.title,
            ariaLabel: b.ariaLabel
          }))
      };
    });

    console.log('📊 Page Analysis:', JSON.stringify(pageAnalysis, null, 2));

    if (pageAnalysis.tableRows === 0) {
      console.log('⚠️  No table rows found - members table may not have loaded');
    }

    // Try to find edit button
    let editClicked = false;

    // Strategy 1: Find button with SVG in table
    const tableButtons = await page.locator('table button svg').all();
    if (tableButtons.length > 0) {
      await tableButtons[0].click();
      editClicked = true;
      console.log('✅ Clicked edit button (Strategy 1: Table SVG button)');
    }

    if (!editClicked) {
      // Strategy 2: Find button with edit-related attributes
      const editBtn = page.locator('button[title*="تعديل"], button[aria-label*="تعديل"]').first();
      if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editBtn.click();
        editClicked = true;
        console.log('✅ Clicked edit button (Strategy 2: Edit attributes)');
      }
    }

    if (!editClicked) {
      console.log('❌ Could not find edit button');
      throw new Error('Edit button not found');
    }

    await page.waitForTimeout(3000);
    await page.screenshot({
      path: path.join(screenshotsDir, '05-edit-modal-opened.png'),
      fullPage: true
    });

    // ============================================================
    // STEP 4: Analyze Form Fields
    // ============================================================
    console.log('\n📝 STEP 4: Analyzing edit form...');

    const formFields = await page.evaluate(() => {
      const selects = document.querySelectorAll('select');
      return Array.from(selects).map((select, idx) => {
        const parent = select.closest('div');
        const label = select.labels?.[0]?.textContent ||
                     parent?.querySelector('label')?.textContent ||
                     select.previousElementSibling?.textContent ||
                     `Select Field ${idx + 1}`;

        const options = Array.from(select.options).map(opt => ({
          value: opt.value,
          text: opt.text,
          selected: opt.selected
        }));

        return {
          index: idx,
          label: label.trim(),
          name: select.name,
          id: select.id,
          value: select.value,
          selectedIndex: select.selectedIndex,
          optionsCount: options.length,
          options
        };
      });
    });

    console.log(`\n✅ Found ${formFields.length} select fields`);

    // ============================================================
    // STEP 5: Test Gender Dropdown
    // ============================================================
    console.log('\n🚻 STEP 5: Testing Gender dropdown...');

    const genderField = formFields.find(f =>
      f.label.includes('الجنس') ||
      f.name === 'gender' ||
      f.options.some(o => o.value === 'male' || o.value === 'female' || o.text === 'ذكر' || o.text === 'أنثى')
    );

    if (genderField) {
      console.log(`✅ Gender field found: "${genderField.label}"`);
      console.log(`   Name: ${genderField.name}`);
      console.log(`   Current value: ${genderField.value}`);
      console.log(`   Options (${genderField.optionsCount}):`);

      genderField.options.forEach((opt, i) => {
        const marker = opt.selected ? '✓' : ' ';
        console.log(`   [${marker}] ${i}: "${opt.text}" (value: "${opt.value}")`);
      });

      // CHECK FOR DOTS ISSUE
      const hasDotsIssue = genderField.options.some(opt =>
        opt.text === '...' ||
        opt.text === '…' ||
        opt.text === '' ||
        (opt.text.length < 2 && opt.value !== '')
      );

      if (hasDotsIssue) {
        console.log('\n🔴 ISSUE DETECTED: Gender dropdown shows dots (...) or empty text!');
      } else {
        console.log('\n✅ Gender dropdown text appears normal');
      }

      // Take screenshot
      if (genderField.name) {
        const genderSelect = page.locator(`select[name="${genderField.name}"]`).first();
        await genderSelect.click();
        await page.waitForTimeout(1000);
        await page.screenshot({
          path: path.join(screenshotsDir, '06-gender-dropdown.png'),
          fullPage: true
        });
        console.log('📸 Screenshot: 06-gender-dropdown.png');
      }
    } else {
      console.log('❌ Gender field not found');
    }

    // ============================================================
    // STEP 6: Test Tribal Section Dropdown
    // ============================================================
    console.log('\n🏛️  STEP 6: Testing Tribal Section dropdown...');

    const tribalField = formFields.find(f =>
      f.label.includes('الفخذ') ||
      f.label.includes('القبيلة') ||
      f.name === 'tribalSection' ||
      f.name === 'tribal_section'
    );

    if (tribalField) {
      console.log(`✅ Tribal section field found: "${tribalField.label}"`);
      console.log(`   Name: ${tribalField.name}`);
      console.log(`   Current value: ${tribalField.value}`);
      console.log(`   Options (${tribalField.optionsCount}):`);

      tribalField.options.forEach((opt, i) => {
        const marker = opt.selected ? '✓' : ' ';
        console.log(`   [${marker}] ${i}: "${opt.text}" (value: "${opt.value}")`);
      });

      // CHECK FOR DOTS ISSUE
      const hasDotsIssue = tribalField.options.some(opt =>
        opt.text === '...' ||
        opt.text === '…' ||
        opt.text === '' ||
        (opt.text.length < 2 && opt.value !== '')
      );

      if (hasDotsIssue) {
        console.log('\n🔴 ISSUE DETECTED: Tribal section dropdown shows dots (...) or empty text!');
      } else {
        console.log('\n✅ Tribal section dropdown text appears normal');
      }

      // Take screenshot
      if (tribalField.name) {
        const tribalSelect = page.locator(`select[name="${tribalField.name}"]`).first();
        await tribalSelect.click();
        await page.waitForTimeout(1000);
        await page.screenshot({
          path: path.join(screenshotsDir, '07-tribal-dropdown.png'),
          fullPage: true
        });
        console.log('📸 Screenshot: 07-tribal-dropdown.png');
      }
    } else {
      console.log('❌ Tribal section field not found');
    }

    // ============================================================
    // STEP 7: Test Save Functionality
    // ============================================================
    console.log('\n💾 STEP 7: Testing save functionality...');

    const saveBtn = page.locator('button').filter({ hasText: /حفظ|تحديث|Save/ }).first();
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('✅ Save button found - clicking...');
      await saveBtn.click();
      await page.waitForTimeout(4000);

      await page.screenshot({
        path: path.join(screenshotsDir, '08-after-save.png'),
        fullPage: true
      });

      // Check for errors
      const saveErrors = await page.evaluate(() => {
        const errors = document.querySelectorAll('[role="alert"], .error, .toast');
        return Array.from(errors).map(e => e.textContent.trim()).filter(t => t);
      });

      if (saveErrors.length > 0) {
        console.log('⚠️  Errors after save:', saveErrors);
      } else {
        console.log('✅ No visible errors after save');
      }
    }

    // ============================================================
    // GENERATE REPORT
    // ============================================================
    const issues = [];

    if (genderField) {
      const genderHasDots = genderField.options.some(o =>
        o.text === '...' || o.text === '…' || o.text === ''
      );
      if (genderHasDots) {
        issues.push({
          field: 'Gender (الجنس)',
          severity: 'HIGH',
          issue: 'Dropdown displays dots (...) instead of readable text',
          options: genderField.options
        });
      }
    }

    if (tribalField) {
      const tribalHasDots = tribalField.options.some(o =>
        o.text === '...' || o.text === '…' || o.text === ''
      );
      if (tribalHasDots) {
        issues.push({
          field: 'Tribal Section (الفخذ)',
          severity: 'HIGH',
          issue: 'Dropdown displays dots (...) instead of readable text',
          options: tribalField.options
        });
      }
    }

    const report = {
      testStatus: 'COMPLETED',
      timestamp: new Date().toISOString(),
      testUrl: 'https://alshuail-admin.pages.dev',
      formFields,
      issues,
      apiCalls: apiCalls.filter(c => c.url.includes('/members')),
      consoleErrors: consoleMessages.filter(m => m.type === 'error')
    };

    fs.writeFileSync(
      path.join(screenshotsDir, 'test-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n' + '='.repeat(70));
    console.log('✅ TEST COMPLETED SUCCESSFULLY');
    console.log('='.repeat(70));
    console.log(`📁 Results directory: ${screenshotsDir}`);
    console.log(`📄 Detailed report: test-report.json`);

    if (issues.length > 0) {
      console.log(`\n🔴 ${issues.length} ISSUE(S) FOUND:`);
      issues.forEach((issue, i) => {
        console.log(`\n${i + 1}. ${issue.field}`);
        console.log(`   Severity: ${issue.severity}`);
        console.log(`   Issue: ${issue.issue}`);
      });
    } else {
      console.log('\n✅ No issues detected - all dropdowns working correctly');
    }

    console.log('\n' + '='.repeat(70));

  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
    console.error(error.stack);

    await page.screenshot({
      path: path.join(screenshotsDir, 'ERROR.png'),
      fullPage: true
    });

    const errorReport = {
      testStatus: 'ERROR',
      error: error.message,
      stack: error.stack,
      consoleMessages,
      apiCalls
    };

    fs.writeFileSync(
      path.join(screenshotsDir, 'error-report.json'),
      JSON.stringify(errorReport, null, 2)
    );
  } finally {
    console.log('\n⏳ Keeping browser open for 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

testMemberEdit().catch(console.error);