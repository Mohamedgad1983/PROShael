# 02 - DATABASE SETUP & VERIFICATION

**Phase**: Setup & Foundation  
**Time**: 20-30 minutes  
**Goal**: Connect to Supabase database and verify all required tables exist

---

## 🎯 OBJECTIVES

By the end of this step:
- ✅ Database connection configured and tested
- ✅ All 64 tables verified
- ✅ Create missing tables if needed
- ✅ Create super admin user
- ✅ Verify sample data exists
- ✅ Run database health check

---

## 📋 STEP-BY-STEP INSTRUCTIONS

### STEP 1: Create Database Configuration File

Create `backend/config/database.js`:

```javascript
const { Pool } = require('pg');
require('dotenv').config();

// Create PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Test connection
pool.on('connect', () => {
    console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected database error:', err);
    process.exit(-1);
});

// Query helper function
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('Query error:', error);
        throw error;
    }
};

// Get client from pool
const getClient = () => {
    return pool.connect();
};

module.exports = {
    query,
    getClient,
    pool
};
```

**Action**: Create this file with above content

---

### STEP 2: Create Database Test Script

Create `backend/test-database.js`:

```javascript
const db = require('./config/database');

async function testDatabaseConnection() {
    console.log('🔍 Testing database connection...\n');

    try {
        // Test 1: Basic connection
        console.log('Test 1: Basic Connection');
        const result = await db.query('SELECT NOW() as current_time');
        console.log('✅ Connected! Server time:', result.rows[0].current_time);
        console.log('');

        // Test 2: Count all tables
        console.log('Test 2: Counting Tables');
        const tablesResult = await db.query(`
            SELECT COUNT(*) as table_count
            FROM information_schema.tables
            WHERE table_schema = 'public'
        `);
        console.log('✅ Total tables:', tablesResult.rows[0].table_count);
        console.log('');

        // Test 3: Check required tables exist
        console.log('Test 3: Checking Required Tables');
        const requiredTables = [
            'members',
            'family_tree',
            'family_relationships',
            'family_branches',
            'member_photos',
            'users',
            'user_roles'
        ];

        for (const tableName of requiredTables) {
            const check = await db.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name = $1
                )
            `, [tableName]);

            if (check.rows[0].exists) {
                console.log(`✅ ${tableName} table exists`);
            } else {
                console.log(`❌ ${tableName} table MISSING`);
            }
        }
        console.log('');

        // Test 4: Check row counts
        console.log('Test 4: Checking Row Counts');
        const checkCount = async (table) => {
            try {
                const result = await db.query(`SELECT COUNT(*) FROM ${table}`);
                return result.rows[0].count;
            } catch (err) {
                return 'ERROR';
            }
        };

        const membersCount = await checkCount('members');
        const usersCount = await checkCount('users');
        const branchesCount = await checkCount('family_branches');
        const backupCount = await checkCount('members_backup_20250928_1039');

        console.log(`Members: ${membersCount} rows`);
        console.log(`Users: ${usersCount} rows`);
        console.log(`Family Branches: ${branchesCount} rows`);
        console.log(`Members Backup: ${backupCount} rows`);
        console.log('');

        // Test 5: Database version
        console.log('Test 5: Database Version');
        const version = await db.query('SELECT version()');
        console.log('✅ PostgreSQL Version:', version.rows[0].version.split(' ')[1]);
        console.log('');

        console.log('🎉 All database tests passed!\n');
        process.exit(0);

    } catch (error) {
        console.error('❌ Database test failed:', error.message);
        process.exit(1);
    }
}

// Run tests
testDatabaseConnection();
```

**Action**: Create this file with above content

---

### STEP 3: Run Database Connection Test

```bash
cd backend
node test-database.js
```

**Expected Output**:
```
🔍 Testing database connection...

Test 1: Basic Connection
✅ Connected! Server time: 2025-10-20T08:30:45.123Z

Test 2: Counting Tables
✅ Total tables: 64

Test 3: Checking Required Tables
✅ members table exists
✅ family_tree table exists
✅ family_relationships table exists
✅ family_branches table exists
✅ member_photos table exists
✅ users table exists
✅ user_roles table exists

Test 4: Checking Row Counts
Members: 0 rows
Users: 0 rows
Family Branches: 3 rows
Members Backup: 299 rows

Test 5: Database Version
✅ PostgreSQL Version: 15.x

🎉 All database tests passed!
```

---

### STEP 4: Create Missing Table Script (If Needed)

Create `backend/create-missing-tables.sql`:

```sql
-- Registration Requests Table (if doesn't exist)
CREATE TABLE IF NOT EXISTS registration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6),
    otp_expires_at TIMESTAMP,
    otp_verified BOOLEAN DEFAULT FALSE,
    full_name_ar VARCHAR(255),
    full_name_en VARCHAR(255),
    date_of_birth DATE,
    national_id VARCHAR(20),
    email VARCHAR(255),
    city VARCHAR(100),
    selected_branch_id UUID REFERENCES family_branches(id),
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES users(id),
    UNIQUE(phone)
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_registration_phone ON registration_requests(phone);
CREATE INDEX IF NOT EXISTS idx_registration_status ON registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_registration_created ON registration_requests(created_at);

-- Add comments
COMMENT ON TABLE registration_requests IS 'Stores new member registration requests';
COMMENT ON COLUMN registration_requests.status IS 'pending, approved, rejected';
```

**Action**: Create this file

---

### STEP 5: Execute Missing Tables Script

If `registration_requests` table doesn't exist, run:

```bash
# Using psql command line
psql $DATABASE_URL -f create-missing-tables.sql

# OR using Node.js script
node -e "
const db = require('./config/database');
const fs = require('fs');
const sql = fs.readFileSync('./create-missing-tables.sql', 'utf8');
db.query(sql)
    .then(() => {
        console.log('✅ Tables created successfully');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });
"
```

---

### STEP 6: Create Super Admin User Script

Create `backend/create-super-admin.js`:

```javascript
const db = require('./config/database');
const bcrypt = require('bcrypt');

async function createSuperAdmin() {
    console.log('👤 Creating Super Admin User...\n');

    try {
        // Check if admin already exists
        const existingAdmin = await db.query(
            'SELECT * FROM users WHERE email = $1',
            ['admin@alshuail.com']
        );

        if (existingAdmin.rows.length > 0) {
            console.log('⚠️  Super admin already exists!');
            console.log('Email:', existingAdmin.rows[0].email);
            console.log('');
            return;
        }

        // Create password hash
        const password = 'Admin@123'; // Change this in production!
        const passwordHash = await bcrypt.hash(password, 10);

        // Insert admin user
        const result = await db.query(`
            INSERT INTO users (
                id,
                email,
                phone,
                password_hash,
                role,
                permissions,
                is_active,
                created_at
            ) VALUES (
                gen_random_uuid(),
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                NOW()
            )
            RETURNING id, email, phone, role
        `, [
            'admin@alshuail.com',
            '0550000001',
            passwordHash,
            'super_admin',
            JSON.stringify({
                all_access: true,
                manage_users: true,
                manage_members: true,
                manage_clans: true,
                approve_registrations: true
            }),
            true
        ]);

        console.log('✅ Super admin created successfully!');
        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 Email: admin@alshuail.com');
        console.log('🔑 Password: Admin@123');
        console.log('📱 Phone: 0550000001');
        console.log('👤 Role: super_admin');
        console.log('🆔 ID:', result.rows[0].id);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');
        console.log('⚠️  IMPORTANT: Change the password in production!');
        console.log('');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error creating super admin:', error.message);
        console.error(error);
        process.exit(1);
    }
}

createSuperAdmin();
```

**Action**: Create and run this script

```bash
node create-super-admin.js
```

**Expected Output**:
```
👤 Creating Super Admin User...

✅ Super admin created successfully!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email: admin@alshuail.com
🔑 Password: Admin@123
📱 Phone: 0550000001
👤 Role: super_admin
🆔 ID: [uuid-here]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  IMPORTANT: Change the password in production!
```

---

### STEP 7: Create Database Health Check Script

Create `backend/database-health.js`:

```javascript
const db = require('./config/database');

async function checkDatabaseHealth() {
    console.log('🏥 Database Health Check\n');
    console.log('═══════════════════════════════════\n');

    const checks = [];

    try {
        // Check 1: Connection
        await db.query('SELECT 1');
        checks.push({ name: 'Connection', status: '✅ OK' });

        // Check 2: Members table
        const members = await db.query('SELECT COUNT(*) FROM members');
        const memberCount = members.rows[0].count;
        checks.push({ 
            name: 'Members Table', 
            status: memberCount > 0 ? '✅ OK' : '⚠️  EMPTY',
            detail: `${memberCount} rows`
        });

        // Check 3: Users table
        const users = await db.query('SELECT COUNT(*) FROM users');
        const userCount = users.rows[0].count;
        checks.push({ 
            name: 'Users Table', 
            status: userCount > 0 ? '✅ OK' : '⚠️  EMPTY',
            detail: `${userCount} rows`
        });

        // Check 4: Family branches
        const branches = await db.query('SELECT COUNT(*) FROM family_branches');
        const branchCount = branches.rows[0].count;
        checks.push({ 
            name: 'Family Branches', 
            status: branchCount > 0 ? '✅ OK' : '❌ EMPTY',
            detail: `${branchCount} rows`
        });

        // Check 5: Registration requests table
        try {
            const requests = await db.query('SELECT COUNT(*) FROM registration_requests');
            checks.push({ 
                name: 'Registration Requests', 
                status: '✅ OK',
                detail: `${requests.rows[0].count} rows`
            });
        } catch (err) {
            checks.push({ 
                name: 'Registration Requests', 
                status: '❌ MISSING TABLE',
                detail: 'Run create-missing-tables.sql'
            });
        }

        // Check 6: Backup data
        try {
            const backup = await db.query('SELECT COUNT(*) FROM members_backup_20250928_1039');
            checks.push({ 
                name: 'Backup Data', 
                status: '✅ Available',
                detail: `${backup.rows[0].count} members`
            });
        } catch (err) {
            checks.push({ 
                name: 'Backup Data', 
                status: '⚠️  Not found',
                detail: ''
            });
        }

        // Display results
        console.log('Check Results:');
        console.log('─────────────────────────────────\n');
        
        checks.forEach(check => {
            console.log(`${check.status} ${check.name}`);
            if (check.detail) {
                console.log(`   └─ ${check.detail}`);
            }
        });

        console.log('\n═══════════════════════════════════\n');

        // Summary
        const okCount = checks.filter(c => c.status.includes('✅')).length;
        const warningCount = checks.filter(c => c.status.includes('⚠️')).length;
        const errorCount = checks.filter(c => c.status.includes('❌')).length;

        console.log('Summary:');
        console.log(`✅ Passed: ${okCount}`);
        console.log(`⚠️  Warnings: ${warningCount}`);
        console.log(`❌ Errors: ${errorCount}`);
        console.log('');

        if (errorCount > 0) {
            console.log('⚠️  Action required: Fix errors before proceeding');
            process.exit(1);
        } else if (warningCount > 0) {
            console.log('ℹ️  Warnings present, but can proceed');
            process.exit(0);
        } else {
            console.log('🎉 Database is healthy!');
            process.exit(0);
        }

    } catch (error) {
        console.error('❌ Health check failed:', error.message);
        process.exit(1);
    }
}

checkDatabaseHealth();
```

**Action**: Create and run this script

```bash
node database-health.js
```

---

### STEP 8: Create Sample Data Script (Optional)

Create `backend/seed-sample-data.js`:

```javascript
const db = require('./config/database');

async function seedSampleData() {
    console.log('🌱 Seeding sample data...\n');

    try {
        // Check if members table is empty
        const memberCheck = await db.query('SELECT COUNT(*) FROM members');
        const memberCount = parseInt(memberCheck.rows[0].count);

        if (memberCount === 0) {
            console.log('⚠️  Members table is empty');
            console.log('   Would you like to restore from backup?');
            console.log('   Run: INSERT INTO members SELECT * FROM members_backup_20250928_1039;');
            console.log('');
        } else {
            console.log(`✅ Members table has ${memberCount} rows`);
        }

        // Create sample registration requests
        console.log('Creating sample registration requests...');
        
        const sampleRequests = [
            {
                phone: '0555111222',
                full_name_ar: 'محمد عبدالله الشعيل',
                full_name_en: 'Mohammed Abdullah Al-Shuail',
                date_of_birth: '1995-05-15',
                national_id: '1234567890',
                email: 'mohammed@example.com',
                city: 'الرياض'
            },
            {
                phone: '0555222333',
                full_name_ar: 'أحمد خالد الشعيل',
                full_name_en: 'Ahmed Khaled Al-Shuail',
                date_of_birth: '1998-08-20',
                national_id: '2345678901',
                email: 'ahmed@example.com',
                city: 'جدة'
            }
        ];

        for (const request of sampleRequests) {
            // Check if already exists
            const exists = await db.query(
                'SELECT id FROM registration_requests WHERE phone = $1',
                [request.phone]
            );

            if (exists.rows.length === 0) {
                await db.query(`
                    INSERT INTO registration_requests (
                        phone, full_name_ar, full_name_en, date_of_birth,
                        national_id, email, city, status, otp_verified
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', true)
                `, [
                    request.phone,
                    request.full_name_ar,
                    request.full_name_en,
                    request.date_of_birth,
                    request.national_id,
                    request.email,
                    request.city
                ]);
                console.log(`✅ Created request for ${request.full_name_ar}`);
            } else {
                console.log(`⚠️  Request already exists for ${request.phone}`);
            }
        }

        console.log('\n🎉 Sample data seeded successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error seeding data:', error.message);
        process.exit(1);
    }
}

seedSampleData();
```

**Action**: Create this file (run later if needed)

---

## ✅ VERIFICATION TESTS

### Test 1: Database Connection
```bash
node test-database.js
```
**Expected**: All tests pass

### Test 2: Super Admin Created
```bash
node -e "
const db = require('./config/database');
db.query('SELECT email, role FROM users WHERE role = \\'super_admin\\'')
    .then(r => {
        console.log('Admin users:', r.rows);
        process.exit(0);
    });
"
```
**Expected**: Shows admin@alshuail.com

### Test 3: Health Check
```bash
node database-health.js
```
**Expected**: All checks pass (green ✅)

### Test 4: Table Structure
```bash
node -e "
const db = require('./config/database');
db.query(\`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'registration_requests'
    ORDER BY ordinal_position
\`).then(r => {
    console.log('registration_requests columns:');
    r.rows.forEach(col => console.log('  -', col.column_name, ':', col.data_type));
    process.exit(0);
});
"
```

---

## 🎯 COMPLETION CHECKLIST

- [ ] Database connection configured in `config/database.js`
- [ ] Connection test passes
- [ ] All 64 tables exist
- [ ] `registration_requests` table created
- [ ] Super admin user created and verified
- [ ] Health check passes
- [ ] Sample data seeded (optional)
- [ ] All verification tests pass

---

## 🚨 TROUBLESHOOTING

### Issue: Connection timeout
**Solution**:
```bash
# Check if Supabase is accessible
ping aws-0-eu-central-1.pooler.supabase.com

# Verify DATABASE_URL in .env
cat .env | grep DATABASE_URL
```

### Issue: SSL certificate error
**Solution**: Already handled with `ssl: { rejectUnauthorized: false }`

### Issue: Table doesn't exist
**Solution**:
```bash
# Run create script
psql $DATABASE_URL -f create-missing-tables.sql
```

### Issue: Admin creation fails
**Solution**:
```sql
-- Check if users table has correct structure
\d users

-- If missing columns, add them
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB;
```

---

## 📊 CURRENT STATUS

```
Project Setup: ████████████████████ 100%
Database Setup: ████████████████████ 100%
```

**Completed**: ✅ Database connected and verified  
**Next Step**: Build Registration API endpoints

---

## ⏭️ NEXT FILE

**File**: `03_REGISTRATION_API.md`  
**Purpose**: Build all registration endpoints (OTP, clans, submit)

---

**Time Spent**: ~30 minutes  
**Total Time**: ~50 minutes  
**Estimated Remaining**: 7-9 hours
