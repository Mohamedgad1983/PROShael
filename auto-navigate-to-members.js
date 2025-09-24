const { chromium } = require('playwright');

async function navigateToMembers() {
    const browser = await chromium.launch({
        headless: false,
        slowMo: 500 // Slow down actions so you can see them
    });

    const page = await browser.newPage();

    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3002');

    // Wait for the page to load
    await page.waitForTimeout(2000);

    console.log('2. Filling login credentials...');
    // Fill in the email
    await page.fill('input[type="email"]', 'admin@alshuail.com');

    // Fill in the password
    await page.fill('input[type="password"]', 'admin123');

    console.log('3. Clicking login button...');
    // Click the login button
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForTimeout(3000);

    console.log('4. Clicking on Members menu item...');
    // Click on the Members section in the sidebar
    // Try multiple possible selectors
    try {
        // Try clicking by text
        await page.click('text=الأعضاء');
    } catch (e) {
        try {
            // Try clicking by icon class
            await page.click('.sidebar-item:has-text("الأعضاء")');
        } catch (e2) {
            // Try clicking the second menu item (usually members)
            await page.click('.sidebar-item:nth-child(2)');
        }
    }

    console.log('5. You should now see the Apple-designed Members Management page!');
    console.log('   - Look for the gradient header with "عائلة الشعيل"');
    console.log('   - 5-step registration form');
    console.log('   - Beautiful animations and form fields');

    // Keep the browser open
    console.log('\nBrowser will stay open. Close it manually when done.');
}

navigateToMembers().catch(console.error);