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
    slowMo: 1000 // Slow down for better observation
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: 'ar-SA'
  });

  const page = await context.newPage();

  // Enable console logging
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  // Capture network errors
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`❌ Network Error: ${response.status()} ${response.url()}`);
    }
  });

  try {
    // Step 1: Navigate to login page
    console.log('Step 1: Navigating to login page...');
    await page.goto('https://alshuail-admin.pages.dev/login', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(screenshotsDir, '01-login-page.png'),
      fullPage: true
    });
    console.log('✅ Screenshot saved: 01-login-page.png\n');

    // Step 2: Login
    console.log('Step 2: Logging in...');
    await page.fill('input[name="username"], input[type="email"], input[type="text"]', 'admin@alshuail.com');
    await page.fill('input[name="password"], input[type="password"]', 'Admin@123456');
    await page.screenshot({
      path: path.join(screenshotsDir, '02-credentials-filled.png'),
      fullPage: true
    });
    console.log('✅ Screenshot saved: 02-credentials-filled.png');

    await page.click('button[type="submit"]');
    console.log('Waiting for navigation after login...');
    await page.waitForTimeout(5000);
    await page.screenshot({
      path: path.join(screenshotsDir, '03-after-login.png'),
      fullPage: true
    });
    console.log('✅ Screenshot saved: 03-after-login.png\n');

    // Step 3: Navigate to Members Management
    console.log('Step 3: Navigating to Members Management...');

    // Try multiple selectors for the members link
    const memberSelectors = [
      'a[href="/members"]',
      'text=إدارة الأعضاء',
      '[class*="sidebar"] a:has-text("إدارة الأعضاء")',
      'nav a:has-text("الأعضاء")'
    ];

    let memberLinkClicked = false;
    for (const selector of memberSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          await element.click();
          memberLinkClicked = true;
          console.log(`✅ Clicked members link using selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!memberLinkClicked) {
      // Fallback: Navigate directly
      console.log('Navigating directly to /members');
      await page.goto('https://alshuail-admin.pages.dev/members', {
        waitUntil: 'networkidle',
        timeout: 60000
      });
    }

    await page.waitForTimeout(3000);
    await page.screenshot({
      path: path.join(screenshotsDir, '04-members-page.png'),
      fullPage: true
    });
    console.log('✅ Screenshot saved: 04-members-page.png\n');

    // Step 4: Find and click edit button
    console.log('Step 4: Finding edit button for a member...');
    await page.waitForTimeout(3000);

    // Wait for table to load
    await page.waitForSelector('table', { timeout: 10000 }).catch(() => {
      console.log('Table not found, checking for cards...');
    });

    // Try multiple selectors for edit button - updated for current UI
    const editSelectors = [
      'button[title*="تعديل"]',
      'button:has-text("تعديل")',
      'button.edit-btn',
      '.actions button:first-child',
      'td button:first-child',
      'button[aria-label*="edit"]',
      'button[class*="primary"]:has(svg)',
      'button:has(svg[class*="pencil"])',
      'button:has(svg path[d*="M3"])',  // Pencil icon path
      'tbody tr:first-child button:first-child'
    ];

    let editButtonClicked = false;
    for (const selector of editSelectors) {
      try {
        console.log(`Trying selector: ${selector}`);
        const editButtons = await page.$$(selector);
        if (editButtons && editButtons.length > 0) {
          await editButtons[0].click();
          editButtonClicked = true;
          console.log(`✅ Clicked edit button using selector: ${selector}`);
          break;
        }
      } catch (e) {
        console.log(`Failed with ${selector}: ${e.message}`);
        continue;
      }
    }

    // If still not found, try to get all buttons and click the first one in a table row
    if (!editButtonClicked) {
      console.log('Trying to find any button in table rows...');
      const buttons = await page.$$('tbody button');
      if (buttons && buttons.length > 0) {
        await buttons[0].click();
        editButtonClicked = true;
        console.log('✅ Clicked first button in table');
      }
    }

    if (!editButtonClicked) {
      console.log('❌ Could not find edit button');

      // Take a screenshot to see what's on the page
      await page.screenshot({
        path: path.join(screenshotsDir, 'DEBUG-no-edit-button.png'),
        fullPage: true
      });

      // Log all buttons found on page
      const allButtons = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.map(b => ({
          text: b.textContent,
          className: b.className,
          title: b.title,
          innerHTML: b.innerHTML.substring(0, 100)
        }));
      });
      console.log('All buttons on page:', JSON.stringify(allButtons, null, 2));

      throw new Error('Edit button not found');
    }

    await page.waitForTimeout(3000);

    // Step 5: Capture edit modal
    console.log('\nStep 5: Capturing edit modal...');
    await page.screenshot({
      path: path.join(screenshotsDir, '05-edit-modal-opened.png'),
      fullPage: true
    });
    console.log('✅ Screenshot saved: 05-edit-modal-opened.png\n');

    // Step 6: Test Gender dropdown
    console.log('Step 6: Testing Gender (الجنس) dropdown...');

    // Find gender field - try multiple selectors
    const genderSelectors = [
      'select[name="gender"]',
      'select#gender',
      'label:has-text("الجنس") ~ select',
      'label:has-text("الجنس") + select',
      '[class*="gender"] select'
    ];

    let genderField = null;
    for (const selector of genderSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          genderField = element;
          console.log(`✅ Found gender field using selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (genderField) {
      // Get current value
      const genderValue = await genderField.evaluate(el => el.value);
      console.log(`Current gender value: ${genderValue}`);

      // Get options
      const genderOptions = await genderField.evaluate(el => {
        return Array.from(el.options).map(opt => ({
          value: opt.value,
          text: opt.text,
          selected: opt.selected
        }));
      });
      console.log('Gender options:', JSON.stringify(genderOptions, null, 2));

      // Click to open dropdown
      await genderField.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(screenshotsDir, '06-gender-dropdown-opened.png'),
        fullPage: true
    });
      console.log('✅ Screenshot saved: 06-gender-dropdown-opened.png\n');
    } else {
      console.log('❌ Could not find gender field');
    }

    // Step 7: Test Tribal Section dropdown
    console.log('Step 7: Testing Tribal Section (الفخذ) dropdown...');

    const tribalSelectors = [
      'select[name="tribalSection"]',
      'select[name="tribal_section"]',
      'select#tribalSection',
      'label:has-text("الفخذ") ~ select',
      'label:has-text("الفخذ") + select'
    ];

    let tribalField = null;
    for (const selector of tribalSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          tribalField = element;
          console.log(`✅ Found tribal section field using selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (tribalField) {
      // Get current value
      const tribalValue = await tribalField.evaluate(el => el.value);
      console.log(`Current tribal section value: ${tribalValue}`);

      // Get options
      const tribalOptions = await tribalField.evaluate(el => {
        return Array.from(el.options).map(opt => ({
          value: opt.value,
          text: opt.text,
          selected: opt.selected
        }));
      });
      console.log('Tribal section options:', JSON.stringify(tribalOptions, null, 2));

      // Click to open dropdown
      await tribalField.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(screenshotsDir, '07-tribal-dropdown-opened.png'),
        fullPage: true
      });
      console.log('✅ Screenshot saved: 07-tribal-dropdown-opened.png\n');
    } else {
      console.log('❌ Could not find tribal section field');
    }

    // Step 8: Try to change values
    console.log('Step 8: Attempting to change dropdown values...');

    if (genderField) {
      try {
        await genderField.selectOption({ index: 1 });
        console.log('✅ Changed gender value');
      } catch (e) {
        console.log('❌ Failed to change gender value:', e.message);
      }
    }

    if (tribalField) {
      try {
        await tribalField.selectOption({ index: 1 });
        console.log('✅ Changed tribal section value');
      } catch (e) {
        console.log('❌ Failed to change tribal section value:', e.message);
      }
    }

    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(screenshotsDir, '08-after-changing-values.png'),
      fullPage: true
    });
    console.log('✅ Screenshot saved: 08-after-changing-values.png\n');

    // Step 9: Try to save
    console.log('Step 9: Attempting to save changes...');

    // Set up response listener before clicking save
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/members') && response.request().method() === 'PUT',
      { timeout: 10000 }
    ).catch(() => null);

    const saveSelectors = [
      'button[type="submit"]',
      'button:has-text("حفظ")',
      'button:has-text("تحديث")',
      'button:has-text("Save")'
    ];

    let saveButtonClicked = false;
    for (const selector of saveSelectors) {
      try {
        const saveButton = await page.$(selector);
        if (saveButton) {
          await saveButton.click();
          saveButtonClicked = true;
          console.log(`✅ Clicked save button using selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!saveButtonClicked) {
      console.log('❌ Could not find save button');
    }

    await page.waitForTimeout(3000);

    // Check for error messages
    const errorSelectors = [
      '[class*="error"]',
      '[class*="alert"]',
      '[role="alert"]',
      '.toast',
      '[class*="notification"]'
    ];

    for (const selector of errorSelectors) {
      const errors = await page.$$(selector);
      if (errors.length > 0) {
        for (const error of errors) {
          const text = await error.textContent();
          if (text && text.trim()) {
            console.log(`❌ Error message found: ${text}`);
          }
        }
      }
    }

    await page.screenshot({
      path: path.join(screenshotsDir, '09-after-save-attempt.png'),
      fullPage: true
    });
    console.log('✅ Screenshot saved: 09-after-save-attempt.png\n');

    // Check the API response
    const response = await responsePromise;
    if (response) {
      const status = response.status();
      console.log(`API Response Status: ${status}`);

      if (status >= 400) {
        const body = await response.text().catch(() => 'Could not read response body');
        console.log('API Error Response:', body);
      }
    }

    // Step 10: Capture network tab
    console.log('Step 10: Capturing final state...');
    await page.screenshot({
      path: path.join(screenshotsDir, '10-final-state.png'),
      fullPage: true
    });
    console.log('✅ Screenshot saved: 10-final-state.png\n');

    // Extract all form data for analysis
    console.log('Extracting complete form data...');
    const formData = await page.evaluate(() => {
      const data = {};
      const inputs = document.querySelectorAll('input, select, textarea');
      inputs.forEach((input, index) => {
        const id = input.id || input.name || `field-${index}`;
        const label = input.labels?.[0]?.textContent ||
                     input.previousElementSibling?.textContent ||
                     'Unknown';
        data[id] = {
          label: label.trim(),
          type: input.tagName.toLowerCase(),
          value: input.value,
          name: input.name,
          placeholder: input.placeholder
        };

        if (input.tagName.toLowerCase() === 'select') {
          data[id].options = Array.from(input.options).map(opt => ({
            value: opt.value,
            text: opt.text,
            selected: opt.selected
          }));
        }
      });
      return data;
    });

    console.log('\nComplete form data:');
    console.log(JSON.stringify(formData, null, 2));

    // Save form data to file
    fs.writeFileSync(
      path.join(screenshotsDir, 'form-data.json'),
      JSON.stringify(formData, null, 2)
    );
    console.log('✅ Form data saved to form-data.json\n');

    console.log('\n========================================');
    console.log('Test completed successfully!');
    console.log('Screenshots saved in:', screenshotsDir);
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    await page.screenshot({
      path: path.join(screenshotsDir, 'ERROR-screenshot.png'),
      fullPage: true
    });
    console.log('Error screenshot saved as: ERROR-screenshot.png');
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
  }
}

// Run the test
testMemberEdit().catch(console.error);