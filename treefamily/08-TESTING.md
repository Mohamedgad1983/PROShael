# 08-TESTING.md
# Al-Shuail System Testing & Validation - Claude Code Instructions

## 📋 OVERVIEW

Comprehensive testing strategy for:
- API endpoint testing
- Integration testing
- Phone number validation testing
- OTP workflow testing
- Security testing
- Performance testing
- User acceptance testing

**Prerequisites**: Files 01-07 completed

---

## 🎯 TESTING CHECKLIST

```
□ Unit tests for services
□ API endpoint tests
□ Phone validation tests
□ OTP workflow tests
□ Authentication tests
□ Family tree tests
□ Admin workflow tests
□ Performance tests
□ Security tests
□ UAT scenarios
```

---

## 📁 FILE STRUCTURE TO CREATE

```
backend/
├── tests/
│   ├── unit/
│   │   ├── phone-formatter.test.js    ← Create this
│   │   ├── otp-service.test.js        ← Create this
│   │   └── tree-generator.test.js     ← Create this
│   ├── integration/
│   │   ├── registration.test.js       ← Create this
│   │   ├── approval.test.js           ← Create this
│   │   └── family-tree.test.js        ← Create this
│   └── e2e/
│       └── workflows.test.js          ← Create this
├── test-data/
│   ├── sample-members.json            ← Create this
│   └── test-phones.json               ← Create this
└── package.json                       ← Update this
```

---

## STEP 1: INSTALL TESTING FRAMEWORKS

```bash
cd backend

# Install Jest and testing utilities
npm install --save-dev jest supertest @jest/globals

# Install test database utilities
npm install --save-dev @supabase/supabase-js dotenv
```

---

## STEP 2: UPDATE PACKAGE.JSON

```bash
cat > backend/package.json << 'EOF'
{
  "name": "alshuail-backend",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:e2e": "jest tests/e2e"
  },
  "jest": {
    "testEnvironment": "node",
    "coverageDirectory": "coverage",
    "collectCoverageFrom": [
      "services/**/*.js",
      "controllers/**/*.js",
      "utils/**/*.js",
      "!**/node_modules/**"
    ],
    "testMatch": [
      "**/__tests__/**/*.js",
      "**/?(*.)+(spec|test).js"
    ]
  }
}
EOF
```

---

## STEP 3: UNIT TESTS

### File: `backend/tests/unit/phone-formatter.test.js`

```javascript
// Phone Formatter Unit Tests
const {
  formatPhoneE164,
  isValidSaudiPhone,
  isValidKuwaitiPhone,
  isValidPhone,
  getCountryCode,
  formatForDisplay
} = require('../../utils/phone-formatter');

describe('Phone Formatter', () => {
  
  describe('Saudi Phone Numbers', () => {
    test('should format Saudi mobile number correctly', () => {
      expect(formatPhoneE164('0501234567')).toBe('+966501234567');
      expect(formatPhoneE164('966501234567')).toBe('+966501234567');
      expect(formatPhoneE164('+966501234567')).toBe('+966501234567');
      expect(formatPhoneE164('501234567')).toBe('+966501234567');
    });

    test('should validate Saudi mobile numbers', () => {
      expect(isValidSaudiPhone('0501234567')).toBe(true);
      expect(isValidSaudiPhone('966501234567')).toBe(true);
      expect(isValidSaudiPhone('+966501234567')).toBe(true);
      expect(isValidSaudiPhone('0401234567')).toBe(false); // Must start with 5
      expect(isValidSaudiPhone('050123456')).toBe(false);  // Too short
    });

    test('should format Saudi number for display', () => {
      expect(formatForDisplay('+966501234567')).toBe('+966 50 123 4567');
    });
  });

  describe('Kuwaiti Phone Numbers', () => {
    test('should format Kuwaiti mobile number correctly', () => {
      expect(formatPhoneE164('50001234')).toBe('+96550001234');
      expect(formatPhoneE164('96550001234')).toBe('+96550001234');
      expect(formatPhoneE164('+96550001234')).toBe('+96550001234');
    });

    test('should validate Kuwaiti mobile numbers', () => {
      expect(isValidKuwaitiPhone('50001234')).toBe(true);
      expect(isValidKuwaitiPhone('60001234')).toBe(true);
      expect(isValidKuwaitiPhone('90001234')).toBe(true);
      expect(isValidKuwaitiPhone('96550001234')).toBe(true);
      expect(isValidKuwaitiPhone('40001234')).toBe(false); // Must start with 5,6,9
      expect(isValidKuwaitiPhone('5000123')).toBe(false);  // Too short
    });

    test('should format Kuwaiti number for display', () => {
      expect(formatForDisplay('+96550001234')).toBe('+965 5000 1234');
    });
  });

  describe('General Phone Validation', () => {
    test('should validate both Saudi and Kuwaiti numbers', () => {
      expect(isValidPhone('+966501234567')).toBe(true);
      expect(isValidPhone('+96550001234')).toBe(true);
      expect(isValidPhone('+971501234567')).toBe(false); // UAE not supported
    });

    test('should get correct country code', () => {
      expect(getCountryCode('+966501234567')).toBe('SA');
      expect(getCountryCode('+96550001234')).toBe('KW');
      expect(getCountryCode('0501234567')).toBe('SA');
    });
  });

  describe('Error Handling', () => {
    test('should throw error for invalid formats', () => {
      expect(() => formatPhoneE164('123456')).toThrow();
      expect(() => formatPhoneE164('+971501234567')).toThrow();
      expect(() => formatPhoneE164('invalid')).toThrow();
    });
  });
});
```

**Command to create:**
```bash
mkdir -p backend/tests/unit
cat > backend/tests/unit/phone-formatter.test.js << 'EOF'
[paste code above]
EOF
```

---

### File: `backend/tests/unit/otp-service.test.js`

```javascript
// OTP Service Unit Tests
const { generateOTP } = require('../../services/otp.service');

describe('OTP Service', () => {
  
  describe('OTP Generation', () => {
    test('should generate 6-digit OTP', () => {
      const otp = generateOTP();
      expect(otp).toHaveLength(6);
      expect(/^\d{6}$/.test(otp)).toBe(true);
    });

    test('should generate unique OTPs', () => {
      const otp1 = generateOTP();
      const otp2 = generateOTP();
      const otp3 = generateOTP();
      
      // While they could theoretically be the same, 
      // probability is very low
      const unique = new Set([otp1, otp2, otp3]);
      expect(unique.size).toBeGreaterThan(1);
    });

    test('should generate OTP within valid range', () => {
      const otp = parseInt(generateOTP());
      expect(otp).toBeGreaterThanOrEqual(100000);
      expect(otp).toBeLessThan(1000000);
    });
  });
});
```

**Command to create:**
```bash
cat > backend/tests/unit/otp-service.test.js << 'EOF'
[paste code above]
EOF
```

---

### File: `backend/tests/unit/tree-generator.test.js`

```javascript
// Tree Generator Unit Tests
const {
  calculateGenerationLevel,
  buildTreeStructure,
  getDescendants,
  getAncestors,
  getSiblings
} = require('../../utils/tree-generator');

describe('Tree Generator', () => {
  
  const mockMembers = [
    { id: '1', full_name_ar: 'جد', parent_member_id: null },
    { id: '2', full_name_ar: 'أب', parent_member_id: '1' },
    { id: '3', full_name_ar: 'ابن', parent_member_id: '2' },
    { id: '4', full_name_ar: 'أخ', parent_member_id: '2' },
  ];

  describe('Tree Structure Building', () => {
    test('should build tree structure correctly', () => {
      const { roots, memberMap } = buildTreeStructure(mockMembers);
      
      expect(roots).toHaveLength(1);
      expect(roots[0].id).toBe('1');
      expect(memberMap.size).toBe(4);
    });

    test('should create parent-child relationships', () => {
      const { memberMap } = buildTreeStructure(mockMembers);
      const parent = memberMap.get('2');
      
      expect(parent.children).toHaveLength(2);
      expect(parent.children.map(c => c.id)).toContain('3');
      expect(parent.children.map(c => c.id)).toContain('4');
    });
  });

  describe('Generation Calculation', () => {
    test('should calculate generation level correctly', () => {
      const { memberMap } = buildTreeStructure(mockMembers);
      const grandson = memberMap.get('3');
      const allMembersArray = Array.from(memberMap.values());
      
      const level = calculateGenerationLevel(grandson, allMembersArray);
      expect(level).toBe(2); // Grandson is 2 generations from root
    });
  });

  describe('Relationship Functions', () => {
    test('should get descendants correctly', () => {
      const { memberMap } = buildTreeStructure(mockMembers);
      const descendants = getDescendants('1', memberMap);
      
      expect(descendants).toHaveLength(3); // Father, two sons
      expect(descendants.map(d => d.id)).toContain('2');
      expect(descendants.map(d => d.id)).toContain('3');
      expect(descendants.map(d => d.id)).toContain('4');
    });

    test('should get ancestors correctly', () => {
      const { memberMap } = buildTreeStructure(mockMembers);
      const ancestors = getAncestors('3', memberMap);
      
      expect(ancestors).toHaveLength(2); // Father, Grandfather
      expect(ancestors.map(a => a.id)).toContain('1');
      expect(ancestors.map(a => a.id)).toContain('2');
    });

    test('should get siblings correctly', () => {
      const { memberMap } = buildTreeStructure(mockMembers);
      const siblings = getSiblings('3', memberMap);
      
      expect(siblings).toHaveLength(1);
      expect(siblings[0].id).toBe('4');
    });
  });
});
```

**Command to create:**
```bash
cat > backend/tests/unit/tree-generator.test.js << 'EOF'
[paste code above]
EOF
```

---

## STEP 4: INTEGRATION TESTS

### File: `backend/tests/integration/registration.test.js`

```javascript
// Registration API Integration Tests
const request = require('supertest');
const app = require('../../server');

describe('Registration API', () => {
  
  let authToken;
  
  beforeAll(async () => {
    // Login as admin to get token
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@alshuail.com',
        password: 'Admin@123'
      });
    
    authToken = response.body.data.token;
  });

  describe('POST /api/admin/members', () => {
    test('should add new member with Saudi phone', async () => {
      const response = await request(app)
        .post('/api/admin/members')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          full_name_ar: 'أحمد محمد الشعيل',
          full_name_en: 'Ahmed Mohammed Al-Shuail',
          phone: '+966501234567',
          family_branch_id: 'valid-uuid'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.phone).toBe('+966501234567');
    });

    test('should add new member with Kuwaiti phone', async () => {
      const response = await request(app)
        .post('/api/admin/members')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          full_name_ar: 'خالد سعد الشعيل',
          phone: '+96550001234',
          family_branch_id: 'valid-uuid'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.phone).toBe('+96550001234');
    });

    test('should reject invalid phone number', async () => {
      const response = await request(app)
        .post('/api/admin/members')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          full_name_ar: 'اسم تجريبي',
          phone: '+971501234567', // UAE number
          family_branch_id: 'valid-uuid'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/admin/members')
        .send({
          full_name_ar: 'اسم',
          phone: '+966501234567',
          family_branch_id: 'uuid'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/registration/complete', () => {
    test('should complete member registration', async () => {
      // First, member needs to be added by admin
      // Then member completes their data
      
      const response = await request(app)
        .post('/api/registration/complete')
        .send({
          member_id: 'existing-member-uuid',
          phone: '+966501234567',
          otp: '123456',
          national_id: '1234567890',
          date_of_birth: '1990-01-01',
          hijri_date_of_birth: '1410-05-15'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
```

**Command to create:**
```bash
mkdir -p backend/tests/integration
cat > backend/tests/integration/registration.test.js << 'EOF'
[paste code above]
EOF
```

---

## STEP 5: TEST DATA

### File: `backend/test-data/test-phones.json`

```json
{
  "valid_saudi": [
    "+966501234567",
    "0501234567",
    "966501234567",
    "501234567"
  ],
  "valid_kuwaiti": [
    "+96550001234",
    "50001234",
    "96550001234",
    "+96560001234",
    "+96590001234"
  ],
  "invalid": [
    "+971501234567",
    "123456",
    "+966401234567",
    "040123456"
  ]
}
```

**Command to create:**
```bash
mkdir -p backend/test-data
cat > backend/test-data/test-phones.json << 'EOF'
[paste JSON above]
EOF
```

---

### File: `backend/test-data/sample-members.json`

```json
{
  "members": [
    {
      "full_name_ar": "محمد أحمد الشعيل",
      "full_name_en": "Mohammed Ahmed Al-Shuail",
      "phone": "+966501111111",
      "national_id": "1012345678",
      "date_of_birth": "1985-03-15",
      "family_branch_id": "branch-1"
    },
    {
      "full_name_ar": "خالد سعد الشعيل",
      "full_name_en": "Khaled Saad Al-Shuail",
      "phone": "+96550001111",
      "national_id": "285012345678",
      "date_of_birth": "1990-07-20",
      "family_branch_id": "branch-2"
    },
    {
      "full_name_ar": "فاطمة محمد الشعيل",
      "full_name_en": "Fatimah Mohammed Al-Shuail",
      "phone": "+966502222222",
      "national_id": "1087654321",
      "date_of_birth": "1995-11-10",
      "family_branch_id": "branch-1"
    }
  ]
}
```

**Command to create:**
```bash
cat > backend/test-data/sample-members.json << 'EOF'
[paste JSON above]
EOF
```

---

## STEP 6: RUN TESTS

### Run All Tests
```bash
cd backend
npm test
```

### Run Specific Test Suites
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode (for development)
npm run test:watch

# With coverage report
npm test -- --coverage
```

---

## STEP 7: MANUAL TESTING CHECKLIST

### ✅ Phone Number Testing

Test these phone numbers manually:

**Saudi Numbers:**
```bash
# Test 1: Full format
curl -X POST http://localhost:3000/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{"phone": "+966501234567"}'

# Test 2: Without country code
curl -X POST http://localhost:3000/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{"phone": "0501234567"}'

# Test 3: With spaces
curl -X POST http://localhost:3000/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{"phone": "+966 50 123 4567"}'
```

**Kuwaiti Numbers:**
```bash
# Test 4: Kuwaiti full format
curl -X POST http://localhost:3000/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{"phone": "+96550001234"}'

# Test 5: Kuwaiti without country code
curl -X POST http://localhost:3000/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{"phone": "50001234"}'
```

**Invalid Numbers:**
```bash
# Test 6: Should fail - UAE number
curl -X POST http://localhost:3000/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{"phone": "+971501234567"}'

# Test 7: Should fail - Too short
curl -X POST http://localhost:3000/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{"phone": "12345"}'
```

---

### ✅ OTP Workflow Testing

```bash
# Step 1: Send OTP
curl -X POST http://localhost:3000/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{"phone": "+966501234567"}'

# Get OTP from WhatsApp or check database:
# SELECT code FROM sms_otp WHERE phone = '+966501234567' 
#   AND is_active = true ORDER BY created_at DESC LIMIT 1;

# Step 2: Verify OTP
curl -X POST http://localhost:3000/api/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phone": "+966501234567", "code": "123456"}'

# Step 3: Test wrong code
curl -X POST http://localhost:3000/api/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phone": "+966501234567", "code": "000000"}'

# Step 4: Test expired OTP (wait 11 minutes)

# Step 5: Test rate limiting (send 4 requests in 5 minutes)
for i in {1..4}; do
  curl -X POST http://localhost:3000/api/otp/send \
    -H "Content-Type: application/json" \
    -d '{"phone": "+966501234567"}'
  sleep 10
done
```

---

### ✅ Registration Workflow Testing

```bash
# Login as admin
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@alshuail.com","password":"Admin@123"}' \
  | jq -r '.data.token')

# Add member
MEMBER_RESPONSE=$(curl -X POST http://localhost:3000/api/admin/members \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "full_name_ar": "أحمد محمد الشعيل",
    "phone": "+966501234567",
    "family_branch_id": "branch-uuid"
  }')

# Get member ID
MEMBER_ID=$(echo $MEMBER_RESPONSE | jq -r '.data.id')

# Member completes registration
curl -X POST http://localhost:3000/api/registration/complete \
  -H "Content-Type: application/json" \
  -d "{
    \"member_id\": \"$MEMBER_ID\",
    \"phone\": \"+966501234567\",
    \"otp\": \"123456\",
    \"national_id\": \"1234567890\",
    \"date_of_birth\": \"1990-01-01\"
  }"

# Admin approves
curl -X POST "http://localhost:3000/api/approvals/$MEMBER_ID/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"notes": "تم التحقق"}'
```

---

## STEP 8: PERFORMANCE TESTING

### Load Test Script

Create `backend/tests/load-test.js`:

```javascript
// Simple Load Test
const axios = require('axios');

async function loadTest() {
  const results = {
    successful: 0,
    failed: 0,
    totalTime: 0
  };

  const requests = 100;
  const promises = [];

  console.log(`Starting load test with ${requests} requests...`);

  for (let i = 0; i < requests; i++) {
    const startTime = Date.now();
    
    const promise = axios.get('http://localhost:3000/api/health')
      .then(() => {
        results.successful++;
        results.totalTime += Date.now() - startTime;
      })
      .catch(() => {
        results.failed++;
      });

    promises.push(promise);
  }

  await Promise.all(promises);

  console.log('\nLoad Test Results:');
  console.log(`Successful: ${results.successful}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Average Response Time: ${(results.totalTime / results.successful).toFixed(2)}ms`);
}

loadTest();
```

Run with:
```bash
node backend/tests/load-test.js
```

---

## STEP 9: SECURITY TESTING

### SQL Injection Test
```bash
# Try SQL injection in search
curl "http://localhost:3000/api/family-tree/search?query=' OR '1'='1" \
  -H "Authorization: Bearer $TOKEN"

# Should NOT return all members
```

### Authentication Bypass Test
```bash
# Try accessing protected endpoint without token
curl http://localhost:3000/api/admin/members

# Should return 401 Unauthorized
```

### Rate Limiting Test
```bash
# Rapid OTP requests
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/otp/send \
    -H "Content-Type: application/json" \
    -d '{"phone": "+966501234567"}'
done

# Should be blocked after 3 requests in 5 minutes
```

---

## ✅ FINAL VERIFICATION CHECKLIST

```
UNIT TESTS:
□ Phone formatter tests passing
□ OTP generation tests passing
□ Tree generator tests passing

INTEGRATION TESTS:
□ Registration API tests passing
□ Approval workflow tests passing
□ Family tree API tests passing

MANUAL TESTS:
□ Saudi phone numbers working (+966)
□ Kuwaiti phone numbers working (+965)
□ Invalid numbers rejected
□ OTP send/verify working
□ WhatsApp messages received
□ SMS fallback working
□ Rate limiting working
□ Registration workflow complete
□ Approval workflow working
□ Family tree display correct

PERFORMANCE:
□ API responds within 500ms
□ Can handle 100+ concurrent requests
□ Database queries optimized

SECURITY:
□ SQL injection protected
□ Authentication working
□ Rate limiting active
□ HTTPS enforced (production)
□ Sensitive data encrypted
```

---

## 📊 TEST COVERAGE REPORT

After running tests, view coverage:

```bash
npm test -- --coverage

# View detailed HTML report
open coverage/lcov-report/index.html
```

Target coverage:
- **Lines**: > 80%
- **Functions**: > 75%
- **Branches**: > 70%

---

## 🔧 TROUBLESHOOTING TEST FAILURES

### Issue: Tests timing out
**Solution**: Increase Jest timeout:
```javascript
// In test file
jest.setTimeout(30000); // 30 seconds
```

### Issue: Database connection errors
**Solution**: Check test database configuration:
```bash
# Create .env.test file
cp backend/.env backend/.env.test

# Update with test database
SUPABASE_URL=your-test-database-url
```

### Issue: Phone validation tests failing
**Solution**: Verify phone-formatter.js is correct:
```bash
node -e "
const { formatPhoneE164 } = require('./utils/phone-formatter');
console.log(formatPhoneE164('0501234567'));
"
```

---

## 📝 NEXT STEPS

After completing testing:
- ✅ All unit tests passing
- ✅ All integration tests passing
- ✅ Manual tests verified
- ✅ Performance acceptable
- ✅ Security validated
- ⏭️ **NEXT**: File 09 - Deployment

---

**Status**: Ready for Claude Code execution
**Estimated Time**: 45-60 minutes
**Dependencies**: Files 01-07 completed
**Next File**: 09-DEPLOYMENT.md
