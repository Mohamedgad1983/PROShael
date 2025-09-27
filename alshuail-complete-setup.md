# 🚀 Al-Shuail Complete Setup Guide
**One-File Setup for Saudi & Kuwaiti Phone Authentication**

---

## 📋 **STEP 1: Backend Environment Setup**

### Create `.env` file in `alshuail-backend/` directory:

```bash
# Al-Shuail Backend Environment Configuration
# Copy this to your alshuail-backend/.env file

# === SUPABASE CONFIGURATION ===
SUPABASE_URL=https://oneiggrfzagqjbkdinin.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uZWlnZ3JmemFncWpia2RpbmluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3Mzc5MDMsImV4cCI6MjA3MDMxMzkwM30.AqaBlip7Dwd0DIMQ0DbhtlHk9jUd9MEZJND9J5GbEmk
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uZWlnZ3JmemFncWpia2RpbmluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDczNzkwMywiZXhwIjoyMDcwMzEzOTAzfQ.rBZIRsifsQiR3j5OgViWLjaBi_W8Jp0gD7HPf9fS5vI

# === JWT AUTHENTICATION ===
JWT_SECRET=alshuail-super-secure-jwt-secret-key-2024-production-ready-32chars

# === DUAL-COUNTRY PHONE AUTHENTICATION ===
SUPPORTED_COUNTRIES=+966,+965
PHONE_VALIDATION_REGEX=^(\+96[56]|96[56]|0)?[569][0-9]{7,8}$
DEFAULT_COUNTRY_CODE=+965

# === TEST MEMBER CONFIGURATION ===
ALLOW_TEST_MEMBER_LOGINS=true
TEST_MEMBER_PHONE_SA=+966501234567
TEST_MEMBER_PHONE_KW=+96550123456
TEST_MEMBER_PASSWORD=TestMember123!

# === SERVER CONFIGURATION ===
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# === SECURITY SETTINGS ===
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_TIME_MINUTES=15
SESSION_SECRET=alshuail-session-secret-key-for-express-sessions
SESSION_EXPIRE_HOURS=24

# === FEATURE FLAGS ===
ENABLE_AUDIT_LOG=true
ENABLE_REAL_TIME_NOTIFICATIONS=true
ENABLE_MOBILE_APP_SUPPORT=true
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 📱 **STEP 2: Phone Number Format Support**

### **Supported Phone Formats:**

#### 🇸🇦 **Saudi Arabia (+966)**
- `+966501234567` ✅ (International)
- `966501234567` ✅ (Without +)
- `0501234567` ✅ (Local format)
- `501234567` ✅ (Without leading 0)

#### 🇰🇼 **Kuwait (+965)**
- `+96550123456` ✅ (International)
- `96550123456` ✅ (Without +)
- `50123456` ✅ (5-prefix mobile)
- `65987654` ✅ (6-prefix mobile)
- `95111222` ✅ (9-prefix mobile)

### **Auto-Format Function** (Add to your backend):
```javascript
function formatPhoneNumber(input) {
  const digits = input.replace(/\D/g, '');
  
  // Saudi formats
  if (digits.startsWith('966')) return '+' + digits;
  if (digits.startsWith('05') && digits.length === 10) return '+966' + digits.substring(1);
  if (digits.startsWith('5') && digits.length === 9) return '+966' + digits;
  
  // Kuwaiti formats
  if (digits.startsWith('965')) return '+' + digits;
  if (/^[569]/.test(digits) && digits.length === 8) return '+965' + digits;
  
  return input;
}
```

---

## 🧪 **STEP 3: Test Credentials**

### **Admin Accounts:**
```bash
# Saudi Admin
Phone: +966500000001
Password: Admin123!
Role: admin

# Kuwaiti Admin  
Phone: +96550000001
Password: Admin123!
Role: admin
```

### **Member Accounts:**
```bash
# Saudi Member
Phone: +966501234567
Password: TestMember123!
Role: member

# Kuwaiti Member
Phone: +96550123456
Password: TestMember123!
Role: member
```

---

## 🔧 **STEP 4: Quick Setup Commands**

### **Backend Setup:**
```bash
# 1. Navigate to backend directory
cd alshuail-backend

# 2. Create .env file (copy the configuration above)
nano .env  # or use your preferred editor

# 3. Install dependencies
npm install

# 4. Start the server
npm start

# Expected output: "Server running on port 3001"
```

### **Frontend Setup:**
```bash
# 1. Navigate to frontend directory
cd alshuail-admin-arabic

# 2. Install dependencies
npm install

# 3. Start the frontend
npm start

# Expected output: "Local: http://localhost:3000"
```

---

## ✅ **STEP 5: Verification Tests**

### **Test 1: Backend Health Check**
```bash
curl http://localhost:3001/api/health
# Expected: {"status": "ok", "timestamp": "..."}
```

### **Test 2: Saudi Phone Login**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+966501234567",
    "password": "TestMember123!",
    "role": "member"
  }'
# Expected: {"token": "...", "user": {...}}
```

### **Test 3: Kuwaiti Phone Login**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+96550123456",
    "password": "TestMember123!",
    "role": "member"
  }'
# Expected: {"token": "...", "user": {...}}
```

### **Test 4: Local Format Auto-Conversion**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "0501234567",
    "password": "TestMember123!",
    "role": "member"
  }'
# Expected: Should auto-convert to +966501234567
```

---

## 🛠️ **STEP 6: Common Issues & Solutions**

### **Issue: Server won't start**
```bash
# Check if port 3001 is already in use
lsof -i :3001

# Kill existing process if needed
kill -9 $(lsof -t -i:3001)

# Try starting again
npm start
```

### **Issue: Authentication fails**
```bash
# Check environment variables are loaded
node -e "require('dotenv').config(); console.log(process.env.JWT_SECRET)"

# Verify Supabase connection
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
console.log('Supabase client created successfully');
"
```

### **Issue: Phone validation fails**
```bash
# Test phone regex
node -e "
const regex = /^(\+96[56]|96[56]|0)?[569][0-9]{7,8}$/;
console.log('Saudi +966501234567:', regex.test('+966501234567'));
console.log('Kuwaiti +96550123456:', regex.test('+96550123456'));
console.log('Local 0501234567:', regex.test('0501234567'));
console.log('Local 50123456:', regex.test('50123456'));
"
```

---

## 🚀 **STEP 7: Frontend Integration**

### **AuthContext Hook Usage:**
```typescript
// In your React components
import { useAuth } from './contexts/AuthContext';

function LoginForm() {
  const { login, loading, error } = useAuth();
  
  const handleLogin = async (phone, password, role) => {
    // Phone will auto-format: "0501234567" → "+966501234567"
    await login(phone, password, role);
  };
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleLogin(phone, password, 'member');
    }}>
      <input 
        type="tel" 
        placeholder="+966 50 123 4567 or +965 5012 3456"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <input 
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
```

### **Phone Input Component:**
```typescript
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

function MultiCountryPhoneInput({ value, onChange }) {
  return (
    <PhoneInput
      country={'kw'}  // Default to Kuwait
      onlyCountries={['sa', 'kw']}  // Restrict to Saudi & Kuwait
      value={value}
      onChange={onChange}
      placeholder="Select country..."
      inputStyle={{
        width: '100%',
        fontSize: '16px',
        direction: 'ltr'  // Left-to-right for phone numbers
      }}
    />
  );
}
```

---

## 📊 **STEP 8: Database Schema Verification**

### **Required Tables:**
```sql
-- Members table
CREATE TABLE members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone varchar(15) UNIQUE NOT NULL,
  country_code varchar(4) NOT NULL,
  password_hash varchar(255) NOT NULL,
  full_name varchar(255) NOT NULL,
  role varchar(20) DEFAULT 'member',
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Auth logs table
CREATE TABLE auth_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone varchar(15) NOT NULL,
  login_time timestamp DEFAULT now(),
  ip_address inet,
  user_agent text,
  success boolean DEFAULT true
);

-- Create indexes
CREATE INDEX idx_members_phone ON members(phone);
CREATE INDEX idx_members_country_code ON members(country_code);
CREATE INDEX idx_auth_logs_phone ON auth_logs(phone);
```

---

## 🎯 **STEP 9: Success Checklist**

After setup, verify these work:

### **Backend Checklist:**
- [ ] Server starts without errors on port 3001
- [ ] Environment variables loaded correctly
- [ ] Supabase connection established
- [ ] JWT secret configured (32+ characters)
- [ ] Phone validation regex working

### **Authentication Checklist:**
- [ ] Saudi admin login: `+966500000001` / `Admin123!`
- [ ] Kuwaiti admin login: `+96550000001` / `Admin123!`
- [ ] Saudi member login: `+966501234567` / `TestMember123!`
- [ ] Kuwaiti member login: `+96550123456` / `TestMember123!`
- [ ] Local format conversion: `0501234567` → `+966501234567`
- [ ] Local format conversion: `50123456` → `+96550123456`

### **Frontend Checklist:**
- [ ] React app starts on port 3000
- [ ] AuthContext provides login functions
- [ ] Phone input accepts both country formats
- [ ] Login form handles authentication
- [ ] Error messages display correctly
- [ ] JWT tokens stored and used for API calls

### **Integration Checklist:**
- [ ] Frontend can authenticate with backend
- [ ] CORS configured correctly
- [ ] API endpoints respond with proper data
- [ ] Phone numbers display in correct format
- [ ] Role-based access control working

---

## 🚨 **STEP 10: Security Notes**

### **Production Deployment:**
1. **Change JWT Secret**: Generate new 64-character secret
2. **Update Environment**: Set `NODE_ENV=production`
3. **Configure HTTPS**: Use SSL certificates
4. **Update CORS**: Restrict to production domains
5. **Rate Limiting**: Enable strict rate limits
6. **Audit Logging**: Monitor all login attempts

### **Phone Security:**
1. **Format Validation**: Always validate phone format server-side
2. **Country Detection**: Log which country each login comes from
3. **Rate Limiting**: Limit login attempts per phone number
4. **SMS Verification**: Consider adding SMS OTP for extra security

---

## 🎉 **COMPLETION**

**Your Al-Shuail system is now ready!** 

- ✅ **Dual-country phone authentication** (Saudi + Kuwaiti)
- ✅ **Secure JWT token system**
- ✅ **Auto-format phone numbers**
- ✅ **Production-ready environment**
- ✅ **Test credentials configured**

**Next Phase**: Proceed to Step 2 (Frontend Tests) or Step 3 (Dashboard Modularization)

---

**Contact**: If you encounter any issues, check the verification tests above or refer to the error logs in your console.
