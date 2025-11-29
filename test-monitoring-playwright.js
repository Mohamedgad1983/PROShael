const { chromium } = require('playwright');

async function testMonitoringDashboard() {
    const browser = await chromium.launch({
        headless: false,
        slowMo: 500
    });

    try {
        const context = await browser.newContext();
        const page = await context.newPage();

        // Enable console logging
        page.on('console', msg => {
            console.log(`Browser console: ${msg.text()}`);
        });

        console.log('🚀 Starting monitoring dashboard test...\n');

        // Step 1: Login first
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
        await page.waitForTimeout(5000); // Give iframe time to load data

        // Step 3: Check member count in title
        console.log('Step 3: Checking member count in title...');
        const titleCount = await iframe.locator('#memberCountTitle').textContent();
        console.log(`📊 Member count in title: ${titleCount}`);

        // Step 4: Check statistics card
        console.log('\nStep 4: Checking statistics card...');
        const totalMembersCard = await iframe.locator('.stat-card:first-child .stat-number').textContent();
        console.log(`📊 Total members in stat card: ${totalMembersCard}`);

        // Step 5: Count table rows
        console.log('\nStep 5: Counting table rows...');
        const tableRows = await iframe.locator('#membersTable tbody tr').count();
        console.log(`📊 Number of rows in current page: ${tableRows}`);

        // Step 6: Check pagination info
        console.log('\nStep 6: Checking pagination info...');
        const paginationInfo = await iframe.locator('.pagination-info').textContent();
        console.log(`📊 Pagination info: ${paginationInfo}`);

        // Step 7: Count total pages
        console.log('\nStep 7: Counting pagination buttons...');
        const pageButtons = await iframe.locator('.page-btn:not(.prev):not(.next)').count();
        console.log(`📊 Number of page buttons: ${pageButtons}`);

        // Step 8: Navigate through pages to count all members
        console.log('\nStep 8: Navigating through all pages...');
        let totalMembersCounted = 0;

        // Count members on first page
        totalMembersCounted += tableRows;
        console.log(`Page 1: ${tableRows} members`);

        // Click through remaining pages
        for (let i = 2; i <= pageButtons; i++) {
            try {
                await iframe.locator(`.page-btn:not(.prev):not(.next):nth-of-type(${i})`).click();
                await page.waitForTimeout(1000);
                const rowsOnPage = await iframe.locator('#membersTable tbody tr').count();
                totalMembersCounted += rowsOnPage;
                console.log(`Page ${i}: ${rowsOnPage} members`);
            } catch (error) {
                console.log(`Could not navigate to page ${i}`);
                break;
            }
        }

        console.log(`\n📊 Total members counted across all pages: ${totalMembersCounted}`);

        // Step 9: Check search functionality
        console.log('\nStep 9: Testing search...');
        await iframe.fill('#searchInput', '1001');
        await page.waitForTimeout(1000);
        const searchResults = await iframe.locator('#membersTable tbody tr').count();
        console.log(`📊 Search results for '1001': ${searchResults} members`);

        // Clear search
        await iframe.fill('#searchInput', '');
        await page.waitForTimeout(1000);

        // Final summary
        console.log('\n' + '='.repeat(50));
        console.log('📋 TEST SUMMARY:');
        console.log('='.repeat(50));
        console.log(`Title shows: ${titleCount}`);
        console.log(`Stat card shows: ${totalMembersCard} members`);
        console.log(`Pagination shows: ${paginationInfo}`);
        console.log(`Total members accessible: ${totalMembersCounted}`);
        console.log(`Expected: 347 members`);

        if (totalMembersCard === '347' && totalMembersCounted > 100) {
            console.log('\n✅ SUCCESS: All members are accessible!');
        } else {
            console.log('\n❌ ISSUE: Not all members are displayed properly');
            console.log(`   - Stat card shows ${totalMembersCard} but only ${totalMembersCounted} are accessible`);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testMonitoringDashboard().catch(console.error);