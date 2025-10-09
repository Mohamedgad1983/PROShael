// ============================================
// TEST NEW FEATURES - INITIATIVES & NEWS APIs
// ============================================

const API_URL = 'http://localhost:3001/api';

// Test credentials
const TEST_ADMIN = {
    email: 'admin@alshuail.com',
    password: 'Admin@123'
};

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

let authToken = null;

// Helper function to make API requests
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authToken ? `Bearer ${authToken}` : '',
                ...options.headers
            }
        });

        const data = await response.json();
        return { ok: response.ok, status: response.status, data };
    } catch (error) {
        return { ok: false, error: error.message };
    }
}

// Test functions
async function testLogin() {
    console.log(`\n${colors.cyan}═══ Testing Admin Login ═══${colors.reset}`);

    const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(TEST_ADMIN)
    });

    if (response.ok && response.data.token) {
        authToken = response.data.token;
        console.log(`${colors.green}✓ Login successful${colors.reset}`);
        console.log(`  Token: ${authToken.substring(0, 20)}...`);
        return true;
    } else {
        console.log(`${colors.red}✗ Login failed: ${JSON.stringify(response.data)}${colors.reset}`);
        return false;
    }
}

async function testInitiativesEndpoints() {
    console.log(`\n${colors.cyan}═══ Testing Initiatives Endpoints ═══${colors.reset}`);

    // Test 1: Get active initiatives (member endpoint)
    console.log(`\n${colors.blue}Testing GET /initiatives/active${colors.reset}`);
    let response = await apiRequest('/initiatives-enhanced/active');
    if (response.ok) {
        console.log(`${colors.green}✓ Get active initiatives successful${colors.reset}`);
        console.log(`  Found ${response.data.initiatives?.length || 0} active initiatives`);
    } else {
        console.log(`${colors.red}✗ Get active initiatives failed: ${response.status}${colors.reset}`);
    }

    // Test 2: Get all initiatives (admin endpoint)
    console.log(`\n${colors.blue}Testing GET /initiatives/admin/all${colors.reset}`);
    response = await apiRequest('/initiatives-enhanced/admin/all');
    if (response.ok) {
        console.log(`${colors.green}✓ Get all initiatives (admin) successful${colors.reset}`);
        console.log(`  Found ${response.data.initiatives?.length || 0} total initiatives`);
    } else {
        console.log(`${colors.yellow}⚠ Admin endpoint returned: ${response.status}${colors.reset}`);
    }

    // Test 3: Get previous initiatives
    console.log(`\n${colors.blue}Testing GET /initiatives/previous${colors.reset}`);
    response = await apiRequest('/initiatives-enhanced/previous');
    if (response.ok) {
        console.log(`${colors.green}✓ Get previous initiatives successful${colors.reset}`);
        console.log(`  Found ${response.data.initiatives?.length || 0} completed initiatives`);
    } else {
        console.log(`${colors.red}✗ Get previous initiatives failed: ${response.status}${colors.reset}`);
    }

    // Test 4: Get my contributions
    console.log(`\n${colors.blue}Testing GET /initiatives/my-contributions${colors.reset}`);
    response = await apiRequest('/initiatives-enhanced/my-contributions');
    if (response.ok) {
        console.log(`${colors.green}✓ Get my contributions successful${colors.reset}`);
        console.log(`  Found ${response.data.contributions?.length || 0} contributions`);
    } else {
        console.log(`${colors.yellow}⚠ My contributions endpoint returned: ${response.status}${colors.reset}`);
    }
}

async function testNewsEndpoints() {
    console.log(`\n${colors.cyan}═══ Testing News Endpoints ═══${colors.reset}`);

    // Test 1: Get published news
    console.log(`\n${colors.blue}Testing GET /news${colors.reset}`);
    let response = await apiRequest('/news');
    if (response.ok) {
        console.log(`${colors.green}✓ Get published news successful${colors.reset}`);
        console.log(`  Found ${response.data.news?.length || 0} published news items`);
    } else {
        console.log(`${colors.red}✗ Get published news failed: ${response.status}${colors.reset}`);
    }

    // Test 2: Get all news (admin)
    console.log(`\n${colors.blue}Testing GET /news/admin/all${colors.reset}`);
    response = await apiRequest('/news/admin/all');
    if (response.ok) {
        console.log(`${colors.green}✓ Get all news (admin) successful${colors.reset}`);
        console.log(`  Found ${response.data.news?.length || 0} total news items`);
    } else {
        console.log(`${colors.yellow}⚠ Admin news endpoint returned: ${response.status}${colors.reset}`);
    }

    // Test 3: Get my notifications
    console.log(`\n${colors.blue}Testing GET /news/notifications/my${colors.reset}`);
    response = await apiRequest('/news/notifications/my');
    if (response.ok) {
        console.log(`${colors.green}✓ Get my notifications successful${colors.reset}`);
        console.log(`  Found ${response.data.notifications?.length || 0} notifications`);
    } else {
        console.log(`${colors.yellow}⚠ My notifications endpoint returned: ${response.status}${colors.reset}`);
    }

    // Test 4: Get unread count
    console.log(`\n${colors.blue}Testing GET /news/notifications/unread-count${colors.reset}`);
    response = await apiRequest('/news/notifications/unread-count');
    if (response.ok) {
        console.log(`${colors.green}✓ Get unread count successful${colors.reset}`);
        console.log(`  Unread count: ${response.data.unread_count || 0}`);
    } else {
        console.log(`${colors.yellow}⚠ Unread count endpoint returned: ${response.status}${colors.reset}`);
    }
}

// Main test function
async function runTests() {
    console.log(`${colors.cyan}╔═══════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║     Testing New Features: Initiatives & News APIs     ║${colors.reset}`);
    console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════╝${colors.reset}`);
    console.log(`\nAPI URL: ${API_URL}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);

    // Login first
    const loginSuccess = await testLogin();
    if (!loginSuccess) {
        console.log(`\n${colors.red}Cannot proceed without authentication${colors.reset}`);
        return;
    }

    // Test Initiatives
    await testInitiativesEndpoints();

    // Test News
    await testNewsEndpoints();

    console.log(`\n${colors.cyan}╔═══════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║                  Test Suite Complete                  ║${colors.reset}`);
    console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════╝${colors.reset}`);
}

// Run tests
runTests().catch(console.error);