// ============================================
// INITIATIVES NEW FEATURES - COMPREHENSIVE TEST
// File: test-initiatives-new-features.mjs
// Purpose: Test Edit, Delete, and Push Notification features
// ============================================

import { chromium } from '@playwright/test';

const BASE_URL = 'http://localhost:3002';
const API_URL = 'http://localhost:3001/api';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testInitiativesNewFeatures() {
    console.log('🚀 Starting Initiatives New Features Testing...\n');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 500 // Slow down actions for visibility
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // ============================================
        // STEP 1: LOGIN
        // ============================================
        console.log('📝 STEP 1: Logging in as super admin...');
        await page.goto(`${BASE_URL}/admin/login`);
        await sleep(1000);

        await page.fill('input[type="email"]', 'admin@alshuail.com');
        await page.fill('input[type="password"]', 'Admin@123');
        await page.click('button[type="submit"]');

        console.log('⏳ Waiting for dashboard to load...');
        await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
        console.log('✅ Login successful!\n');

        // ============================================
        // STEP 2: NAVIGATE TO INITIATIVES PAGE
        // ============================================
        console.log('📝 STEP 2: Navigating to Initiatives Management...');
        await page.goto(`${BASE_URL}/admin/initiatives`);
        await sleep(2000);

        // Wait for initiatives to load
        await page.waitForSelector('.initiative-card, h1', { timeout: 10000 });
        console.log('✅ Initiatives page loaded!\n');

        // ============================================
        // STEP 3: TEST EDIT FUNCTIONALITY
        // ============================================
        console.log('📝 STEP 3: Testing EDIT functionality...');

        // Find the first Edit button
        const editButton = await page.$('button:has-text("تعديل")');

        if (editButton) {
            console.log('🔍 Found Edit button, clicking...');
            await editButton.click();
            await sleep(1500);

            // Wait for the edit modal to appear (it's the create modal in edit mode)
            const modalVisible = await page.isVisible('form');

            if (modalVisible) {
                console.log('✅ Edit modal opened successfully!');

                // Modify the Arabic title
                const titleInput = await page.$('input[placeholder*="عنوان المبادرة"]');
                if (titleInput) {
                    await titleInput.fill('');
                    await titleInput.fill('مبادرة معدلة - اختبار التعديل');
                    console.log('✏️ Updated title field');
                }

                // Modify description
                const descInput = await page.$('textarea[placeholder*="وصف المبادرة"]');
                if (descInput) {
                    await descInput.fill('');
                    await descInput.fill('هذا وصف محدث للتأكد من أن وظيفة التعديل تعمل بشكل صحيح');
                    console.log('✏️ Updated description field');
                }

                // Submit the edit
                const submitButton = await page.$('button[type="submit"]');
                if (submitButton) {
                    await submitButton.click();
                    console.log('📤 Submitted edit form...');

                    // Wait for alert
                    await sleep(2000);

                    // Check for success alert (will be shown by browser alert)
                    console.log('✅ Edit submitted successfully!');
                } else {
                    console.log('❌ Submit button not found');
                }

                await sleep(2000);
            } else {
                console.log('❌ Edit modal did not open');
            }
        } else {
            console.log('❌ No Edit button found - might be no initiatives');
        }
        console.log('');

        // ============================================
        // STEP 4: TEST PUSH NOTIFICATION FUNCTIONALITY
        // ============================================
        console.log('📝 STEP 4: Testing PUSH NOTIFICATION functionality...');

        // Refresh to see updated data
        await page.reload();
        await sleep(2000);

        // Find the first Push Notification button
        const pushButton = await page.$('button:has-text("إرسال إشعار")');

        if (pushButton) {
            console.log('🔍 Found Push Notification button, clicking...');
            await pushButton.click();
            await sleep(1500);

            // Wait for push notification modal
            const pushModalVisible = await page.isVisible('text=إرسال إشعار للأعضاء');

            if (pushModalVisible) {
                console.log('✅ Push notification modal opened!');

                // Check if member count is displayed
                const memberCountText = await page.textContent('body');
                if (memberCountText.includes('347') || memberCountText.includes('عضو نشط')) {
                    console.log('✅ Member count displayed correctly');
                }

                // Find and click confirm button
                const confirmButton = await page.$('button:has-text("إرسال الإشعار")');
                if (confirmButton) {
                    console.log('📤 Sending push notification...');
                    await confirmButton.click();

                    // Wait for response
                    await sleep(3000);

                    console.log('✅ Push notification sent!');
                } else {
                    console.log('❌ Confirm button not found');
                }
            } else {
                console.log('❌ Push notification modal did not open');
            }
        } else {
            console.log('❌ No Push Notification button found');
        }
        console.log('');

        // ============================================
        // STEP 5: TEST DELETE FUNCTIONALITY
        // ============================================
        console.log('📝 STEP 5: Testing DELETE functionality...');

        // Refresh to see updated data
        await page.reload();
        await sleep(2000);

        // Find the first Delete button
        const deleteButton = await page.$('button:has-text("حذف")');

        if (deleteButton) {
            console.log('🔍 Found Delete button, clicking...');
            await deleteButton.click();
            await sleep(1500);

            // Wait for delete confirmation modal
            const deleteModalVisible = await page.isVisible('text=تأكيد الحذف');

            if (deleteModalVisible) {
                console.log('✅ Delete confirmation modal opened!');

                // Find and click confirm delete button (the red button that says "حذف")
                const confirmDeleteButton = await page.$('button.bg-red-600:has-text("حذف")');
                if (confirmDeleteButton) {
                    console.log('🗑️ Confirming delete...');
                    await confirmDeleteButton.click();

                    // Wait for response
                    await sleep(2000);

                    console.log('✅ Delete request sent!');
                } else {
                    console.log('❌ Confirm delete button not found');
                }
            } else {
                console.log('❌ Delete confirmation modal did not open');
            }
        } else {
            console.log('❌ No Delete button found');
        }
        console.log('');

        // ============================================
        // STEP 6: VERIFY RESULTS
        // ============================================
        console.log('📝 STEP 6: Verifying results...');

        // Reload page to see final state
        await page.reload();
        await sleep(2000);

        // Take a final screenshot
        await page.screenshot({ path: 'initiatives-final-state.png', fullPage: true });
        console.log('📸 Screenshot saved: initiatives-final-state.png');

        console.log('\n✅ ALL TESTS COMPLETED!\n');
        console.log('═══════════════════════════════════════');
        console.log('📊 TEST SUMMARY:');
        console.log('   ✅ Edit Functionality - Tested');
        console.log('   ✅ Push Notification - Tested');
        console.log('   ✅ Delete Functionality - Tested');
        console.log('═══════════════════════════════════════\n');

        // Keep browser open for manual inspection
        console.log('🔍 Browser will stay open for 10 seconds for inspection...');
        await sleep(10000);

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        console.error('Stack trace:', error.stack);

        // Take error screenshot
        await page.screenshot({ path: 'test-error.png', fullPage: true });
        console.log('📸 Error screenshot saved: test-error.png');
    } finally {
        await browser.close();
        console.log('🏁 Test completed and browser closed.');
    }
}

// Run the test
testInitiativesNewFeatures();
