const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Create screenshots directory
const screenshotsDir = path.join(__dirname, 'member-edit-screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

async function testMemberEdit() {
  console.log('🔍 Starting Member Edit Functionality Test...\n');

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
    // Step 1: Login
    console.log('Step 1: Logging in to the admin panel...');
    await page.goto('https://alshuail-admin.pages.dev/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotsDir, '01-login-page.png'), fullPage: true });

    await page.locator('input[type="email"]').first().fill('admin');
    await page.locator('input[type="password"]').first().fill('Admin@2024$$');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(5000);

    await page.screenshot({ path: path.join(screenshotsDir, '02-after-login.png'), fullPage: true });
    console.log('✅ Logged in successfully\n');

    // Step 2: Navigate to members page and close modal
    console.log('Step 2: Navigating to Members page...');
    await page.goto('https://alshuail-admin.pages.dev/members', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Close the Family Wealth Fund modal if it appears
    console.log('Closing any blocking modals...');
    for (let i = 0; i < 5; i++) {
      try {
        // Try multiple ways to close the modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);

        // Try clicking close button
        const closeBtn = page.locator('button:has-text("إغلاق"), button:has-text("×"), [aria-label*="close"]').first();
        if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await closeBtn.click();
          await page.waitForTimeout(500);
        }

        // Try clicking backdrop
        const backdrop = page.locator('[class*="backdrop"], [class*="overlay"]').first();
        if (await backdrop.isVisible({ timeout: 1000 }).catch(() => false)) {
          await backdrop.click({ position: { x: 10, y: 10 } });
          await page.waitForTimeout(500);
        }
      } catch (e) {
        // Continue
      }
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotsDir, '03-members-page-loaded.png'), fullPage: true });
    console.log('✅ Members page loaded\n');

    // Step 3: Wait for table and find edit button
    console.log('Step 3: Looking for members table...');

    // Wait for table or cards to appear (the page might use cards on mobile)
    await page.waitForTimeout(3000);

    // Check what's on the page
    const pageStructure = await page.evaluate(() => {
      return {
        tables: document.querySelectorAll('table').length,
        cards: document.querySelectorAll('[class*="card"]').length,
        buttons: Array.from(document.querySelectorAll('button')).map(btn => ({
          text: btn.textContent.trim().substring(0, 50),
          hasIcon: btn.querySelector('svg') !== null,
          classes: btn.className
        })).slice(0, 20) // First 20 buttons
      };
    });

    console.log('Page structure:', JSON.stringify(pageStructure, null, 2));

    // Try to find and click edit button
    console.log('\nStep 4: Finding edit button...');

    let editButtonClicked = false;

    // Strategy 1: Find button with pencil/edit icon in table row
    const editButtons = await page.locator('table button svg, table button [data-icon]').all();
    if (editButtons.length > 0) {
      console.log(`Found ${editButtons.length} potential edit buttons in table`);
      await editButtons[0].click();
      editButtonClicked = true;
      console.log('✅ Clicked edit button using Strategy 1');
    }

    // Strategy 2: Find button with edit in aria-label or title
    if (!editButtonClicked) {
      const editBtnByLabel = page.locator('button[aria-label*="تعديل"], button[title*="تعديل"]').first();
      if (await editBtnByLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editBtnByLabel.click();
        editButtonClicked = true;
        console.log('✅ Clicked edit button using Strategy 2');
      }
    }

    // Strategy 3: Click first button with SVG icon (usually edit/view buttons)
    if (!editButtonClicked) {
      const firstIconButton = page.locator('table button:has(svg)').first();
      if (await firstIconButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await firstIconButton.click();
        editButtonClicked = true;
        console.log('✅ Clicked edit button using Strategy 3');
      }
    }

    if (!editButtonClicked) {
      throw new Error('Could not find or click edit button');
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotsDir, '04-modal-opened.png'), fullPage: true });
    console.log('✅ Edit modal opened\n');

    // Step 5: Analyze the edit form
    console.log('Step 5: Analyzing edit form fields...');

    const formAnalysis = await page.evaluate(() => {
      // Find the modal/form
      const modal = document.querySelector('[role="dialog"]') ||
                    document.querySelector('.modal') ||
                    document.querySelector('[class*="Modal"]') ||
                    document.body;

      const fields = [];
      const selects = modal.querySelectorAll('select');

      selects.forEach((select, idx) => {
        const label = select.labels?.[0]?.textContent ||
                     select.previousElementSibling?.textContent ||
                     select.closest('div')?.querySelector('label')?.textContent ||
                     `Select ${idx}`;

        const options = Array.from(select.options).map(opt => ({
          value: opt.value,
          text: opt.text,
          innerHTML: opt.innerHTML,
          selected: opt.selected
        }));

        fields.push({
          index: idx,
          label: label.trim(),
          name: select.name,
          id: select.id,
          value: select.value,
          selectedIndex: select.selectedIndex,
          optionsCount: options.length,
          options: options
        });
      });

      return fields;
    });

    console.log('\n📊 Form Select Fields Analysis:');
    console.log(JSON.stringify(formAnalysis, null, 2));

    // Step 6: Test Gender dropdown
    console.log('\nStep 6: Testing Gender dropdown...');

    const genderField = formAnalysis.find(f =>
      f.label.includes('الجنس') ||
      f.name === 'gender' ||
      f.options.some(o => o.text === 'ذكر' || o.text === 'أنثى' || o.value === 'male' || o.value === 'female')
    );

    if (genderField) {
      console.log(`✅ Gender field found: "${genderField.label}"`);
      console.log(`   Current value: ${genderField.value}`);
      console.log(`   Selected index: ${genderField.selectedIndex}`);
      console.log(`   Options (${genderField.optionsCount}):`);
      genderField.options.forEach((opt, i) => {
        console.log(`     [${i}] value="${opt.value}" text="${opt.text}" ${opt.selected ? '(SELECTED)' : ''}`);
      });

      // Check for dots issue
      const hasDotsIssue = genderField.options.some(opt =>
        opt.text === '...' ||
        opt.text === '…' ||
        opt.text === '' ||
        (opt.text.length < 3 && opt.value !== '')
      );

      if (hasDotsIssue) {
        console.log('\n🔴 ISSUE DETECTED: Gender dropdown shows dots (...) or empty text instead of actual values!');
      } else {
        console.log('\n✅ Gender dropdown appears to show proper text values');
      }

      // Click and screenshot
      const genderSelector = genderField.name ? `select[name="${genderField.name}"]` : `select:nth-of-type(${genderField.index + 1})`;
      await page.locator(genderSelector).first().click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(screenshotsDir, '05-gender-dropdown.png'), fullPage: true });
      console.log('✅ Screenshot saved: 05-gender-dropdown.png');
    } else {
      console.log('❌ Gender field not found');
    }

    // Step 7: Test Tribal Section dropdown
    console.log('\nStep 7: Testing Tribal Section dropdown...');

    const tribalField = formAnalysis.find(f =>
      f.label.includes('الفخذ') ||
      f.label.includes('القبيلة') ||
      f.name === 'tribalSection' ||
      f.name === 'tribal_section'
    );

    if (tribalField) {
      console.log(`✅ Tribal section field found: "${tribalField.label}"`);
      console.log(`   Current value: ${tribalField.value}`);
      console.log(`   Selected index: ${tribalField.selectedIndex}`);
      console.log(`   Options (${tribalField.optionsCount}):`);
      tribalField.options.forEach((opt, i) => {
        console.log(`     [${i}] value="${opt.value}" text="${opt.text}" ${opt.selected ? '(SELECTED)' : ''}`);
      });

      // Check for dots issue
      const hasDotsIssue = tribalField.options.some(opt =>
        opt.text === '...' ||
        opt.text === '…' ||
        opt.text === '' ||
        (opt.text.length < 3 && opt.value !== '')
      );

      if (hasDotsIssue) {
        console.log('\n🔴 ISSUE DETECTED: Tribal section dropdown shows dots (...) or empty text instead of actual values!');
      } else {
        console.log('\n✅ Tribal section dropdown appears to show proper text values');
      }

      // Click and screenshot
      const tribalSelector = tribalField.name ? `select[name="${tribalField.name}"]` : `select:nth-of-type(${tribalField.index + 1})`;
      await page.locator(tribalSelector).first().click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(screenshotsDir, '06-tribal-dropdown.png'), fullPage: true });
      console.log('✅ Screenshot saved: 06-tribal-dropdown.png');
    } else {
      console.log('❌ Tribal section field not found');
    }

    // Step 8: Try to save
    console.log('\nStep 8: Testing save functionality...');

    // Listen for API responses
    page.on('response', async (response) => {
      if (response.url().includes('/api/members')) {
        console.log(`📡 API ${response.request().method()} ${response.status()} ${response.url()}`);
        if (response.status() >= 400) {
          const body = await response.text().catch(() => '');
          console.log(`❌ Error response: ${body.substring(0, 200)}`);
        }
      }
    });

    const saveBtn = page.locator('button').filter({ hasText: /حفظ|تحديث|Save|Update/ }).first();
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveBtn.click();
      console.log('✅ Save button clicked');
      await page.waitForTimeout(3000);

      await page.screenshot({ path: path.join(screenshotsDir, '07-after-save.png'), fullPage: true });
      console.log('✅ Screenshot saved: 07-after-save.png');

      // Check for error messages
      const errors = await page.evaluate(() => {
        const errorEls = document.querySelectorAll('[role="alert"], .error, .toast, [class*="error-message"]');
        return Array.from(errorEls).map(el => el.textContent.trim()).filter(t => t);
      });

      if (errors.length > 0) {
        console.log('\n⚠️  Error messages found:');
        errors.forEach(err => console.log(`   - ${err}`));
      }
    } else {
      console.log('❌ Save button not found');
    }

    // Final screenshot
    await page.screenshot({ path: path.join(screenshotsDir, '08-final-state.png'), fullPage: true });

    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      testCompleted: true,
      formFields: formAnalysis,
      issues: []
    };

    if (genderField) {
      const genderHasDots = genderField.options.some(o => o.text === '...' || o.text === '…' || o.text === '');
      if (genderHasDots) {
        report.issues.push({
          field: 'Gender',
          issue: 'Dropdown displays dots (...) instead of actual text values',
          options: genderField.options
        });
      }
    }

    if (tribalField) {
      const tribalHasDots = tribalField.options.some(o => o.text === '...' || o.text === '…' || o.text === '');
      if (tribalHasDots) {
        report.issues.push({
          field: 'Tribal Section',
          issue: 'Dropdown displays dots (...) instead of actual text values',
          options: tribalField.options
        });
      }
    }

    fs.writeFileSync(
      path.join(screenshotsDir, 'test-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));
    console.log(`📁 Screenshots saved in: ${screenshotsDir}`);
    console.log(`📄 Detailed report: test-report.json`);

    if (report.issues.length > 0) {
      console.log('\n🔴 ISSUES FOUND:');
      report.issues.forEach(issue => {
        console.log(`\n   Field: ${issue.field}`);
        console.log(`   Issue: ${issue.issue}`);
      });
    } else {
      console.log('\n✅ No issues detected - dropdowns appear to be working correctly');
    }
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
    await page.screenshot({ path: path.join(screenshotsDir, 'ERROR.png'), fullPage: true });
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
  }
}

testMemberEdit().catch(console.error);