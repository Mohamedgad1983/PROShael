# Database Connection Test Script
# تطبيق الشعيل - Al-Shuail Family App Database Testing

## 🔧 Quick Connection Test for All Agents

### Backend Developer Test

Create `test-connection.js` in your backend folder:

```javascript
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Test Supabase connection
async function testSupabaseConnection() {
  console.log('🧪 اختبار اتصال قاعدة البيانات - Testing Database Connection');
  
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Test 1: Basic connection
    const { data: healthCheck, error: healthError } = await supabase
      .from('members')
      .select('count(*)')
      .limit(1);

    if (healthError) {
      console.log('❌ خطأ في الاتصال:', healthError.message);
      return false;
    }

    console.log('✅ الاتصال بقاعدة البيانات نجح - Database connection successful');

    // Test 2: Check tables exist
    const tables = ['members', 'member_subscriptions', 'payments', 'events'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ جدول ${table} غير موجود - Table ${table} not found:`, error.message);
      } else {
        console.log(`✅ جدول ${table} موجود - Table ${table} exists`);
      }
    }

    // Test 3: Insert test record (then delete)
    const testMember = {
      name: 'اختبار الاتصال',
      email: `test-${Date.now()}@alshuail.com`,
      phone: '0551234567',
      role: 'member',
      status: 'pending_verification'
    };

    const { data: insertResult, error: insertError } = await supabase
      .from('members')
      .insert([testMember])
      .select();

    if (insertError) {
      console.log('❌ خطأ في إدراج البيانات:', insertError.message);
      return false;
    }

    console.log('✅ تم إدراج البيانات الاختبارية بنجاح - Test data inserted successfully');

    // Clean up test data
    if (insertResult && insertResult[0]) {
      await supabase
        .from('members')
        .delete()
        .eq('id', insertResult[0].id);
      console.log('✅ تم حذف البيانات الاختبارية - Test data cleaned up');
    }

    console.log('🎉 جميع الاختبارات نجحت - All tests passed!');
    return true;

  } catch (error) {
    console.log('❌ خطأ عام في الاختبار:', error.message);
    return false;
  }
}

// Run the test
testSupabaseConnection()
  .then(success => {
    if (success) {
      console.log('\n🚀 Backend Agent ready for development!');
      process.exit(0);
    } else {
      console.log('\n❌ Database connection failed. Check your .env file');
      process.exit(1);
    }
  });
```

**Run with:**
```bash
node test-connection.js
```

---

### Frontend Developer Test

Create `test-supabase.js` in your frontend folder:

```javascript
import { createClient } from '@supabase/supabase-js';

// Test frontend Supabase connection
const testFrontendConnection = async () => {
  console.log('🧪 اختبار اتصال Frontend - Testing Frontend Connection');
  
  try {
    const supabase = createClient(
      process.env.REACT_APP_SUPABASE_URL,
      process.env.REACT_APP_SUPABASE_ANON_KEY
    );

    // Test public read access
    const { data, error } = await supabase
      .from('members')
      .select('id, name, role')
      .eq('status', 'active')
      .limit(1);

    if (error) {
      console.log('❌ خطأ في الاتصال:', error.message);
      return false;
    }

    console.log('✅ Frontend connection successful');
    console.log('🚀 Frontend Agent ready for development!');
    return true;

  } catch (error) {
    console.log('❌ Connection error:', error.message);
    return false;
  }
};

export default testFrontendConnection;
```

---

### DevOps Engineer Test

Create `test-infrastructure.sh`:

```bash
#!/bin/bash
echo "🧪 اختبار البنية التحتية - Testing Infrastructure"

# Test database connection
echo "Testing database connection..."
PGPASSWORD="OverJar@@!(*#222!" psql -h db.oneiggrfzagqjbkdinin.supabase.co -U postgres -d postgres -c "SELECT version();"

if [ $? -eq 0 ]; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
    exit 1
fi

# Test API endpoint
echo "Testing API health endpoint..."
curl -f http://localhost:5000/api/health

if [ $? -eq 0 ]; then
    echo "✅ API endpoint reachable"
else
    echo "❌ API endpoint not reachable"
fi

echo "🚀 DevOps Agent ready for deployment!"
```

**Run with:**
```bash
chmod +x test-infrastructure.sh
./test-infrastructure.sh
```

---

### QA Engineer Test

Create `test-qa-setup.js`:

```javascript
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function setupQATestData() {
  console.log('🧪 إعداد بيانات الاختبار - Setting up QA test data');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const testUsers = [
    {
      name: 'مدير اختبار',
      email: 'admin.test@alshuail.com',
      phone: '0552222222',
      role: 'admin',
      status: 'active',
      password: 'TestAdmin123!'
    },
    {
      name: 'عضو اختبار',
      email: 'member.test@alshuail.com', 
      phone: '0554444444',
      role: 'member',
      status: 'active',
      password: 'TestMember123!'
    }
  ];

  try {
    for (const user of testUsers) {
      const { data, error } = await supabase
        .from('members')
        .upsert([user], { onConflict: 'email' });
      
      if (error) {
        console.log(`❌ خطأ في إنشاء ${user.name}:`, error.message);
      } else {
        console.log(`✅ تم إنشاء ${user.name} للاختبار`);
      }
    }

    console.log('🚀 QA test data setup complete!');
    return true;

  } catch (error) {
    console.log('❌ QA setup error:', error.message);
    return false;
  }
}

setupQATestData();
```

---

## 🔒 Security Notes

### Environment File Security:
- ⚠️  **NEVER** commit `.env` files to git
- 🔐 **Service Role Key** is for backend/DevOps only
- 📱 **Anon Key** is safe for frontend use
- 🛡️  Use different keys for different environments

### Add to your `.gitignore`:
```
# Environment files
.env
.env.local
.env.development
.env.test
.env.production
.env.*
```

---

## ✅ Quick Setup Checklist

**For each agent:**

1. **Copy the appropriate .env file** to your project root
2. **Rename** from `.env.backend` to `.env` (for example)
3. **Install dependencies** if needed
4. **Run the connection test** script
5. **Verify** you see ✅ success messages

**Example for Backend Agent:**
```bash
# 1. Copy environment file
cp .env.backend .env

# 2. Install dependencies
npm install @supabase/supabase-js

# 3. Test connection
node test-connection.js

# 4. Should see: "🚀 Backend Agent ready for development!"
```

---

## 🆘 Troubleshooting

### Common Issues:

**"Invalid API key"**
- Check your SUPABASE_URL and keys are correct
- Ensure no extra spaces in .env file

**"relation does not exist"**  
- Verify the 27 tables exist in your Supabase project
- Check table names match exactly

**"Connection refused"**
- Verify your Supabase project is active
- Check network connectivity

**"Permission denied"**
- Backend: Use SERVICE_KEY for write operations
- Frontend: Use ANON_KEY for read operations

---

## 📞 Support

If agents encounter connection issues:
1. **Check** the connection test output
2. **Verify** environment variables are loaded correctly  
3. **Confirm** Supabase project is running
4. **Test** individual API keys in Supabase dashboard

**🎉 All agents should now have database access to start Phase 1 development!**
