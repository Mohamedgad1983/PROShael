const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const screenshotsDir = path.join(__dirname, 'member-edit-screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

async function testMemberEdit() {
  console.log('🔍 Debugging Member Edit Flow...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 800
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: 'ar-SA'
  });

  const page = await context.newPage();

  // Log all navigation
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) {
      console.log(`📍 Navigated to: ${frame.url()}`);
    }
  });

  try {
    // Step 1: Login
    console.log('Step 1: Logging in...');
    await page.goto('https://alshuail-admin.pages.dev/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log(`Current URL after loading login: ${page.url()}`);

    await page.locator('input[type="email"]').first().fill('admin');
    await page.locator('input[type="password"]').first().fill('Admin@2024$$');
    await page.screenshot({ path: path.join(screenshotsDir, 'DEBUG-01-before-login.png'), fullPage: true });

    console.log('Clicking login button...');
    await page.locator('button[type="submit"]').first().click();

    // Wait for navigation after login
    console.log('Waiting for navigation after login...');
    await page.waitForTimeout(8000); // Give it more time

    const urlAfterLogin = page.url();
    console.log(`URL after login: ${urlAfterLogin}`);

    await page.screenshot({ path: path.join(screenshotsDir, 'DEBUG-02-after-login.png'), fullPage: true });

    // Check if we're logged in
    const hasAuthToken = await page.evaluate(() => {
      return {
        localStorage: Object.keys(localStorage),
        hasToken: !!localStorage.getItem('token') || !!localStorage.getItem('auth_token') || !!localStorage.getItem('authToken'),
        cookies: document.cookie
      };
    });
    console.log('Auth status:', JSON.stringify(hasAuthToken, null, 2));

    // Step 2: Try to access members page directly
    console.log('\nStep 2: Navigating to members page...');
    console.log('Going to: https://alshuail-admin.pages.dev/members');

    await page.goto('https://alshuail-admin.pages.dev/members', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    await page.waitForTimeout(5000);
    console.log(`Current URL: ${page.url()}`);

    await page.screenshot({ path: path.join(screenshotsDir, 'DEBUG-03-members-page-initial.png'), fullPage: true });

    // Try to close modal aggressively
    console.log('\nAttempting to close any modals...');

    for (let attempt = 0; attempt < 10; attempt++) {
      console.log(`Attempt ${attempt + 1} to close modal...`);

      // Press Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Try clicking outside modal (backdrop)
      try {
        await page.mouse.click(50, 50);
        await page.waitForTimeout(300);
      } catch (e) {}

      // Try finding and clicking close button
      const closeBtns = [
        'button:has-text("×")',
        'button:has-text("إغلاق")',
        'button[aria-label*="close"]',
        'button[aria-label*="إغلاق"]',
        '[role="dialog"] button:first-child'
      ];

      for (const selector of closeBtns) {
        try {
          const btn = page.locator(selector).first();
          if (await btn.isVisible({ timeout: 500 })) {
            await btn.click();
            console.log(`✅ Clicked close button: ${selector}`);
            await page.waitForTimeout(500);
          }
        } catch (e) {}
      }

      // Check if modal is still there
      const modalVisible = await page.evaluate(() => {
        const modals = document.querySelectorAll('[role="dialog"], .modal, [class*="Modal"]');
        return modals.length > 0 && Array.from(modals).some(m =>
          m.offsetParent !== null // visible check
        );
      });

      if (!modalVisible) {
        console.log('✅ Modal closed successfully');
        break;
      }

      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: path.join(screenshotsDir, 'DEBUG-04-after-closing-modal.png'), fullPage: true });

    // Wait longer for table to load
    console.log('\nWaiting for members table to load...');
    await page.waitForTimeout(5000);

    // Check page content
    const pageContent = await page.evaluate(() => {
      return {
        url: window.location.href,
        tables: document.querySelectorAll('table').length,
        tableRows: document.querySelectorAll('table tbody tr').length,
        allText: document.body.textContent.substring(0, 500),
        hasModal: document.querySelectorAll('[role="dialog"]').length > 0,
        buttons: Array.from(document.querySelectorAll('button')).map(b => ({
          text: b.textContent.trim().substring(0, 40),
          visible: b.offsetParent !== null
        })).filter(b => b.visible).slice(0, 15)
      };
    });

    console.log('\n📊 Page Content Analysis:');
    console.log(JSON.stringify(pageContent, null, 2));

    await page.screenshot({ path: path.join(screenshotsDir, 'DEBUG-05-page-state.png'), fullPage: true });

    // If we still see the modal, try clicking outside it more aggressively
    if (pageContent.hasModal) {
      console.log('\n⚠️  Modal still present. Trying to interact with page behind it...');

      // Try clicking at different positions
      const positions = [
        { x: 100, y: 100 },
        { x: 1800, y: 100 },
        { x: 100, y: 1000 },
        { x: 1800, y: 1000 }
      ];

      for (const pos of positions) {
        try {
          await page.mouse.click(pos.x, pos.y);
          await page.waitForTimeout(500);
        } catch (e) {}
      }

      await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    }

    // Look for any visible edit buttons
    console.log('\nLooking for edit buttons...');

    const allButtons = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.map((btn, idx) => ({
        index: idx,
        text: btn.textContent.trim(),
        visible: btn.offsetParent !== null,
        hasSVG: btn.querySelector('svg') !== null,
        classes: btn.className,
        title: btn.getAttribute('title'),
        ariaLabel: btn.getAttribute('aria-label')
      })).filter(b => b.visible);
    });

    console.log(`\nFound ${allButtons.length} visible buttons:`);
    allButtons.slice(0, 20).forEach(btn => {
      console.log(`  [${btn.index}] "${btn.text}" ${btn.hasSVG ? '(has icon)' : ''} ${btn.title || btn.ariaLabel || ''}`);
    });

    // Try to find and click an edit button
    const editButtonIndex = allButtons.findIndex(btn =>
      btn.hasSVG &&
      (btn.title?.includes('تعديل') ||
       btn.ariaLabel?.includes('تعديل') ||
       btn.classes?.includes('edit'))
    );

    if (editButtonIndex >= 0) {
      console.log(`\n✅ Found potential edit button at index ${editButtonIndex}`);
      const editBtn = page.locator('button').nth(editButtonIndex);
      await editBtn.scrollIntoViewIfNeeded();
      await editBtn.click();
      console.log('✅ Clicked edit button');

      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(screenshotsDir, 'DEBUG-06-after-edit-click.png'), fullPage: true });

      // Now analyze the form
      const formData = await page.evaluate(() => {
        const selects = document.querySelectorAll('select');
        return Array.from(selects).map((select, idx) => {
          const label = select.labels?.[0]?.textContent ||
                       select.previousElementSibling?.textContent ||
                       'Unknown';

          return {
            index: idx,
            label: label.trim(),
            name: select.name,
            value: select.value,
            options: Array.from(select.options).map(opt => ({
              value: opt.value,
              text: opt.text
            }))
          };
        });
      });

      console.log('\n📋 Form Select Fields:');
      console.log(JSON.stringify(formData, null, 2));

      // Save analysis
      fs.writeFileSync(
        path.join(screenshotsDir, 'debug-analysis.json'),
        JSON.stringify({ pageContent, allButtons, formData }, null, 2)
      );

      console.log('\n✅ Debug analysis saved to debug-analysis.json');
    } else {
      console.log('\n❌ Could not find edit button');
    }

    console.log('\n' + '='.repeat(60));
    console.log('Debug session completed');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: path.join(screenshotsDir, 'DEBUG-ERROR.png'), fullPage: true });
  } finally {
    console.log('\nKeeping browser open for manual inspection (will close in 10 seconds)...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

testMemberEdit().catch(console.error);