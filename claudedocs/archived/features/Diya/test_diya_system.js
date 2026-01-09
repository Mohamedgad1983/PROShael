/**
 * Diya System Integration Test
 * Tests the complete implementation of the Diya Dashboard
 */

const BASE_URL = 'http://localhost:3001';

// Color codes for terminal output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

// Helper function to make API calls
async function testAPI(endpoint, description) {
    try {
        const response = await fetch(`${BASE_URL}${endpoint}`);
        const data = await response.json();

        if (response.ok && data.success) {
            console.log(`${colors.green}✓${colors.reset} ${description}`);
            return data;
        } else {
            console.log(`${colors.red}✗${colors.reset} ${description}`);
            console.error('  Error:', data.error || 'Unknown error');
            return null;
        }
    } catch (error) {
        console.log(`${colors.red}✗${colors.reset} ${description}`);
        console.error('  Error:', error.message);
        return null;
    }
}

// Main test function
async function runTests() {
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.blue}DIYA DASHBOARD SYSTEM INTEGRATION TEST${colors.reset}`);
    console.log('='.repeat(60) + '\n');

    console.log(`${colors.yellow}Testing Backend API Endpoints...${colors.reset}\n`);

    // Test 1: Dashboard endpoint
    const dashboardData = await testAPI(
        '/api/diya/dashboard',
        'GET /api/diya/dashboard - Fetch all diya activities'
    );

    if (dashboardData && dashboardData.data) {
        console.log(`  Found ${dashboardData.data.length} diya activities`);
        dashboardData.data.forEach(diya => {
            console.log(`  - ${diya.title_ar}: ${diya.total_contributors} contributors, ${diya.total_collected} SAR`);
        });
    }

    // Test 2: Summary endpoint
    const summaryData = await testAPI(
        '/api/diya/summary',
        'GET /api/diya/summary - Fetch overall diya statistics'
    );

    if (summaryData && summaryData.data) {
        console.log(`  Total cases: ${summaryData.data.total_diya_cases}`);
        console.log(`  Total contributors: ${summaryData.data.total_contributors}`);
        console.log(`  Total collected: ${summaryData.data.total_collected} SAR`);
    }

    // Test 3: Get first activity's contributors
    if (dashboardData && dashboardData.data && dashboardData.data.length > 0) {
        const firstActivity = dashboardData.data[0];
        const contributorsData = await testAPI(
            `/api/diya/${firstActivity.activity_id}/contributors`,
            `GET /api/diya/:id/contributors - Fetch contributors for "${firstActivity.title_ar}"`
        );

        if (contributorsData) {
            console.log(`  Found ${contributorsData.total} contributors`);
        }

        // Test 4: Get detailed stats for first activity
        const statsData = await testAPI(
            `/api/diya/${firstActivity.activity_id}/stats`,
            `GET /api/diya/:id/stats - Fetch detailed stats for "${firstActivity.title_ar}"`
        );

        if (statsData && statsData.data) {
            console.log(`  Completion: ${statsData.data.completion_percentage}%`);
            console.log(`  Average contribution: ${statsData.data.average_contribution} SAR`);
        }
    }

    // Test 5: Check frontend accessibility
    console.log(`\n${colors.yellow}Testing Frontend Accessibility...${colors.reset}\n`);

    try {
        const frontendResponse = await fetch('http://localhost:3002');
        if (frontendResponse.ok) {
            console.log(`${colors.green}✓${colors.reset} Frontend is running at http://localhost:3002`);
            console.log('  Navigate to: http://localhost:3002 -> Login -> Diyas section');
        } else {
            console.log(`${colors.red}✗${colors.reset} Frontend not accessible`);
        }
    } catch (error) {
        console.log(`${colors.yellow}!${colors.reset} Frontend may not be running`);
        console.log('  Start it with: cd alshuail-admin-arabic && npm start');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.blue}TEST SUMMARY${colors.reset}`);
    console.log('='.repeat(60));

    if (dashboardData) {
        console.log(`\n${colors.green}✓ Backend API is operational${colors.reset}`);
        console.log(`${colors.green}✓ Diya dashboard endpoints are working${colors.reset}`);

        if (dashboardData.data.some(d => d.total_contributors > 0)) {
            console.log(`${colors.green}✓ Contribution data is present${colors.reset}`);
        } else {
            console.log(`${colors.yellow}! No contribution data found (import may be needed)${colors.reset}`);
        }
    } else {
        console.log(`${colors.red}✗ Backend API is not responding${colors.reset}`);
    }

    console.log('\n' + '='.repeat(60) + '\n');
}

// Run the tests
runTests().catch(error => {
    console.error(`${colors.red}Test suite failed:${colors.reset}`, error);
    process.exit(1);
});