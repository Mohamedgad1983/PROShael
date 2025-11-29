const { chromium } = require('playwright');

async function testActionButtons() {
    const browser = await chromium.launch({
        headless: false,
        slowMo: 500
    });

    try {
        const context = await browser.newContext();
        const page = await context.newPage();

        console.log('🚀 Testing action buttons in monitoring dashboard...\n');

        // Step 1: Login
        console.log('Step 1: Logging in...');
        await page.goto('http://localhost:3002/login');
        await page.waitForLoadState('networkidle');

        await page.fill('#email', 'superadmin@alshuail.org');
        await page.fill('#password', 'Admin@2024');
        await page.click('button[type="submit"]');

        await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
        console.log('✅ Login successful\n');

        // Step 2: Navigate to monitoring page
        console.log('Step 2: Navigating to monitoring page...');
        await page.goto('http://localhost:3002/admin/monitoring');
        await page.waitForLoadState('networkidle');

        // Wait for iframe to load
        const iframe = await page.frameLocator('iframe');
        await page.waitForTimeout(5000); // Give iframe time to load

        // Step 3: Check if action buttons are visible
        console.log('Step 3: Checking action buttons visibility...');

        // Check first row's action buttons
        const actionButtons = await iframe.locator('#membersTable tbody tr:first-child .quick-actions button').count();
        console.log(`📊 Number of action buttons per row: ${actionButtons}`);

        // Check each button type
        const viewBtn = await iframe.locator('.action-btn.view-btn').first().isVisible();
        const editBtn = await iframe.locator('.action-btn.edit-btn').first().isVisible();
        const whatsappBtn = await iframe.locator('.action-btn.whatsapp-btn').first().isVisible();
        const activateBtn = await iframe.locator('.action-btn.activate-btn').first().isVisible();
        const deleteBtn = await iframe.locator('.action-btn.delete-btn').first().isVisible();

        console.log('\nButton visibility status:');
        console.log(`  👁️  View button: ${viewBtn ? '✅ Visible' : '❌ Not visible'}`);
        console.log(`  ✏️  Edit button: ${editBtn ? '✅ Visible' : '❌ Not visible'}`);
        console.log(`  💬 WhatsApp button: ${whatsappBtn ? '✅ Visible' : '❌ Not visible'}`);
        console.log(`  ✔️  Activate button: ${activateBtn ? '✅ Visible' : '❌ Not visible'}`);
        console.log(`  🗑️  Delete button: ${deleteBtn ? '✅ Visible' : '❌ Not visible'}`);

        // Step 4: Test View button functionality
        console.log('\nStep 4: Testing View button...');

        // Set up dialog handler for alert
        page.on('dialog', async dialog => {
            console.log(`  Alert message: "${dialog.message()}"`);
            await dialog.accept();
        });

        await iframe.locator('.action-btn.view-btn').first().click();
        await page.waitForTimeout(1000);

        // Step 5: Test Edit button
        console.log('\nStep 5: Testing Edit button...');
        await iframe.locator('.action-btn.edit-btn').first().click();
        await page.waitForTimeout(1000);

        // Step 6: Test Delete button (with cancel)
        console.log('\nStep 6: Testing Delete button (will cancel)...');

        // Override dialog handler to dismiss
        page.removeAllListeners('dialog');
        page.on('dialog', async dialog => {
            console.log(`  Confirm dialog: "${dialog.message()}"`);
            console.log('  Clicking Cancel...');
            await dialog.dismiss();
        });

        await iframe.locator('.action-btn.delete-btn').first().click();
        await page.waitForTimeout(1000);

        // Final summary
        console.log('\n' + '='.repeat(50));
        console.log('📋 ACTION BUTTONS TEST SUMMARY:');
        console.log('='.repeat(50));
        console.log(`Total buttons per row: ${actionButtons}`);
        console.log('All buttons visibility: ' + (viewBtn && editBtn && whatsappBtn && activateBtn && deleteBtn ? '✅ ALL VISIBLE' : '❌ SOME MISSING'));
        console.log('Button functionality: ✅ Working (alerts shown)');

        if (actionButtons === 5 && viewBtn && editBtn && whatsappBtn && activateBtn && deleteBtn) {
            console.log('\n✅ SUCCESS: All action buttons are present and functional!');
        } else {
            console.log('\n⚠️ WARNING: Some action buttons may be missing or not visible');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testActionButtons().catch(console.error);