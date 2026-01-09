# 🚀 CLAUDE CODE PROMPT: Complete VPS Database Migration & Testing

## 🎯 MISSION

You have full access to the Al-Shuail Family Fund system via MCP servers:
- **Filesystem MCP:** Access to local project files at `D:\PROShael`
- **VPS SSH Access:** Contabo VPS at `213.199.62.185`
- **Database:** PostgreSQL on VPS (migrated from Supabase)

Your mission is to:
1. Verify and fix the backend database connection
2. Test all API endpoints
3. Set up missing infrastructure (storage, backups)
4. Generate a completion report

---

## 📋 SYSTEM INFORMATION

### Infrastructure:
```
VPS Server:
- IP: 213.199.62.185
- OS: Ubuntu 24.04 LTS
- User: root

Backend:
- Location: /var/www/PROShael/alshuail-backend
- Port: 5001
- Process Manager: PM2
- API URL: https://api.alshailfund.com

Database:
- Type: PostgreSQL 15
- Host: localhost
- Port: 5432
- Database: alshuail_db
- User: alshuail_admin
- Tables: 64 tables
- Members: 347 active members

Frontend:
- Admin: https://alshailfund.com (Cloudflare Pages)
- Mobile PWA: https://app.alshailfund.com (Cloudflare Pages)
```

### Local Project Path:
```
D:\PROShael\
├── alshuail-backend\      # Backend source code
├── alshuail-admin-arabic\ # Admin dashboard
├── Mobile\                # Mobile PWA
└── DataBase\              # Database scripts
```

---

## 🔧 PHASE 1: VERIFY DATABASE CONNECTION

### Step 1.1: Check Current Backend Configuration

```bash
# SSH to VPS
ssh root@213.199.62.185

# Navigate to backend
cd /var/www/PROShael/alshuail-backend

# Check current .env file
cat .env
```

**Look for these variables:**
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

### Step 1.2: Determine Connection Type

**If you see Supabase URLs (e.g., `db.oneiggrfzagqjbkdinin.supabase.co`):**
- ⚠️ Backend is still using Supabase
- Action: Update to local PostgreSQL

**If you see `localhost` or `127.0.0.1`:**
- ✅ Backend is using local PostgreSQL
- Action: Verify connection works

### Step 1.3: Update .env if Needed

If backend is still pointing to Supabase, update the .env file:

```bash
# Backup current .env
cp .env .env.backup.$(date +%Y%m%d)

# Edit .env
nano .env
```

**Required Configuration for Local PostgreSQL:**

```env
# ============================================
# DATABASE CONFIGURATION (LOCAL POSTGRESQL)
# ============================================
DB_MODE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=alshuail_db
DB_USER=alshuail_admin
DB_PASSWORD=[CHECK_EXISTING_PASSWORD_OR_ASK_USER]
DATABASE_URL=postgresql://alshuail_admin:[PASSWORD]@localhost:5432/alshuail_db

# ============================================
# DISABLE/COMMENT SUPABASE (if present)
# ============================================
# SUPABASE_URL=
# SUPABASE_ANON_KEY=
# SUPABASE_SERVICE_ROLE_KEY=

# ============================================
# KEEP THESE EXISTING SETTINGS
# ============================================
NODE_ENV=production
PORT=5001
JWT_SECRET=[KEEP_EXISTING]
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://alshailfund.com
CORS_ORIGIN=https://alshailfund.com,https://app.alshailfund.com,http://localhost:3000
```

### Step 1.4: Restart Backend

```bash
# Restart PM2
pm2 restart all

# Check logs for errors
pm2 logs --lines 50

# Verify backend is running
pm2 status
```

### Step 1.5: Test Database Connection

```bash
# Test PostgreSQL directly
psql -U alshuail_admin -d alshuail_db -h localhost -c "SELECT COUNT(*) FROM members;"

# Expected output: 347 (or similar count)
```

### Step 1.6: Test API Health

```bash
# Test health endpoint
curl http://localhost:5001/api/health

# Test from public URL
curl https://api.alshailfund.com/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "..."
}
```

---

## 🧪 PHASE 2: API ENDPOINT TESTING

### Step 2.1: Authentication APIs

```bash
# Test auth endpoints
curl -X GET https://api.alshailfund.com/api/auth/me \
  -H "Content-Type: application/json"

# Expected: 401 Unauthorized (no token) - this is correct!
```

### Step 2.2: Members APIs

```bash
# Get all members (may need auth token)
curl -X GET https://api.alshailfund.com/api/members \
  -H "Content-Type: application/json"

# Get member statistics
curl -X GET https://api.alshailfund.com/api/members/statistics \
  -H "Content-Type: application/json"

# Search members
curl -X GET "https://api.alshailfund.com/api/members/search?q=محمد" \
  -H "Content-Type: application/json"
```

### Step 2.3: Subscriptions APIs

```bash
# Get subscriptions
curl -X GET https://api.alshailfund.com/api/subscriptions \
  -H "Content-Type: application/json"

# Get subscription statistics
curl -X GET https://api.alshailfund.com/api/subscriptions/statistics \
  -H "Content-Type: application/json"
```

### Step 2.4: Family Tree APIs

```bash
# Get family branches
curl -X GET https://api.alshailfund.com/api/family-branches \
  -H "Content-Type: application/json"

# Get family tree
curl -X GET https://api.alshailfund.com/api/family-tree \
  -H "Content-Type: application/json"
```

### Step 2.5: Activities APIs

```bash
# Get activities
curl -X GET https://api.alshailfund.com/api/activities \
  -H "Content-Type: application/json"
```

### Step 2.6: Create Test Results Log

Document all API test results:

```bash
# Create test results file
cat > /var/www/PROShael/API_TEST_RESULTS.md << 'EOF'
# API Test Results
Date: [CURRENT_DATE]

## Authentication
- [ ] GET /api/auth/me: [STATUS]
- [ ] POST /api/auth/send-otp: [STATUS]
- [ ] POST /api/auth/verify-otp: [STATUS]

## Members
- [ ] GET /api/members: [STATUS]
- [ ] GET /api/members/statistics: [STATUS]
- [ ] GET /api/members/search: [STATUS]

## Subscriptions
- [ ] GET /api/subscriptions: [STATUS]
- [ ] GET /api/subscriptions/statistics: [STATUS]

## Family Tree
- [ ] GET /api/family-branches: [STATUS]
- [ ] GET /api/family-tree: [STATUS]

## Activities
- [ ] GET /api/activities: [STATUS]

## Overall Status
- Total Endpoints Tested: X
- Passed: X
- Failed: X
EOF
```

---

## 📁 PHASE 3: STORAGE SETUP

### Step 3.1: Create Storage Directories

```bash
# Create storage structure
mkdir -p /var/www/alshuail/storage/{members,documents,photos,receipts,temp}

# Set permissions
chmod -R 755 /var/www/alshuail/storage
chown -R www-data:www-data /var/www/alshuail/storage

# Verify
ls -la /var/www/alshuail/storage/
```

### Step 3.2: Update Backend Storage Configuration

Add to `.env` if not present:

```env
# ============================================
# STORAGE CONFIGURATION
# ============================================
STORAGE_PATH=/var/www/alshuail/storage/
STORAGE_URL=https://api.alshailfund.com/uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx
```

### Step 3.3: Configure Nginx for Static Files

```bash
# Edit Nginx config
nano /etc/nginx/sites-available/alshuail-backend
```

Add this location block inside the server block:

```nginx
# Static file serving for uploads
location /uploads {
    alias /var/www/alshuail/storage;
    expires 30d;
    add_header Cache-Control "public, immutable";
    
    # Security headers
    add_header X-Content-Type-Options nosniff;
    
    # Only allow specific file types
    location ~* \.(jpg|jpeg|png|gif|pdf|doc|docx|xls|xlsx)$ {
        try_files $uri =404;
    }
}
```

```bash
# Test and reload Nginx
nginx -t
systemctl reload nginx
```

---

## 💾 PHASE 4: AUTOMATED BACKUP SYSTEM

### Step 4.1: Create Backup Script

```bash
# Create backup script
cat > /root/backup-alshuail-db.sh << 'EOF'
#!/bin/bash
# Al-Shuail Database Backup Script
# Runs daily at 3 AM

# Configuration
BACKUP_DIR="/var/backups/postgresql"
DB_NAME="alshuail_db"
DB_USER="alshuail_admin"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

# Create backup
echo "[$(date)] Starting backup of $DB_NAME..."
pg_dump -U $DB_USER $DB_NAME > $BACKUP_DIR/alshuail_$DATE.sql

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "[$(date)] Backup successful: alshuail_$DATE.sql"
    
    # Compress the backup
    gzip $BACKUP_DIR/alshuail_$DATE.sql
    echo "[$(date)] Compressed backup: alshuail_$DATE.sql.gz"
    
    # Calculate size
    SIZE=$(du -h $BACKUP_DIR/alshuail_$DATE.sql.gz | cut -f1)
    echo "[$(date)] Backup size: $SIZE"
else
    echo "[$(date)] ERROR: Backup failed!"
    exit 1
fi

# Delete old backups (older than RETENTION_DAYS)
echo "[$(date)] Cleaning up old backups..."
find $BACKUP_DIR -name "alshuail_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# List remaining backups
echo "[$(date)] Current backups:"
ls -lh $BACKUP_DIR/alshuail_*.sql.gz 2>/dev/null || echo "No backups found"

echo "[$(date)] Backup process completed."
EOF

# Make executable
chmod +x /root/backup-alshuail-db.sh
```

### Step 4.2: Test Backup Script

```bash
# Run backup manually to test
/root/backup-alshuail-db.sh

# Check backup was created
ls -la /var/backups/postgresql/
```

### Step 4.3: Schedule Daily Backup

```bash
# Add to crontab
(crontab -l 2>/dev/null; echo "0 3 * * * /root/backup-alshuail-db.sh >> /var/log/alshuail-backup.log 2>&1") | crontab -

# Verify crontab
crontab -l
```

### Step 4.4: Create Backup Restore Script

```bash
cat > /root/restore-alshuail-db.sh << 'EOF'
#!/bin/bash
# Al-Shuail Database Restore Script

if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    echo ""
    echo "Available backups:"
    ls -lh /var/backups/postgresql/alshuail_*.sql.gz 2>/dev/null
    exit 1
fi

BACKUP_FILE=$1
DB_NAME="alshuail_db"
DB_USER="alshuail_admin"

# Check if file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "WARNING: This will replace ALL data in $DB_NAME!"
echo "Backup file: $BACKUP_FILE"
read -p "Are you sure? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo "[$(date)] Starting restore..."

# Decompress if gzipped
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "Decompressing backup..."
    gunzip -c $BACKUP_FILE > /tmp/restore_temp.sql
    RESTORE_FILE="/tmp/restore_temp.sql"
else
    RESTORE_FILE=$BACKUP_FILE
fi

# Restore
echo "Restoring database..."
psql -U $DB_USER -d $DB_NAME < $RESTORE_FILE

if [ $? -eq 0 ]; then
    echo "[$(date)] Restore completed successfully!"
else
    echo "[$(date)] ERROR: Restore failed!"
    exit 1
fi

# Cleanup
rm -f /tmp/restore_temp.sql
EOF

chmod +x /root/restore-alshuail-db.sh
```

---

## 📊 PHASE 5: DATABASE VERIFICATION

### Step 5.1: Verify All Tables Exist

```bash
# Connect to database and list tables
psql -U alshuail_admin -d alshuail_db -c "\dt"
```

**Expected:** 64 tables

### Step 5.2: Verify Data Counts

```bash
# Check critical table counts
psql -U alshuail_admin -d alshuail_db << 'EOF'
SELECT 'members' as table_name, COUNT(*) as count FROM members
UNION ALL
SELECT 'subscriptions', COUNT(*) FROM subscriptions
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'family_branches', COUNT(*) FROM family_branches
UNION ALL
SELECT 'activities', COUNT(*) FROM activities
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'settings', COUNT(*) FROM settings;
EOF
```

### Step 5.3: Verify Foreign Key Relationships

```bash
psql -U alshuail_admin -d alshuail_db -c "
SELECT COUNT(*) as foreign_key_count 
FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY' 
AND table_schema = 'public';
"
```

**Expected:** ~94 foreign keys

---

## 🔐 PHASE 6: SECURITY CHECK

### Step 6.1: Verify PostgreSQL is Not Exposed

```bash
# Check PostgreSQL is only listening on localhost
ss -tlnp | grep 5432

# Should show: 127.0.0.1:5432 (localhost only)
```

### Step 6.2: Verify Firewall Rules

```bash
# Check UFW status
ufw status verbose

# Should show:
# - 22 (SSH) ALLOW
# - 80 (HTTP) ALLOW
# - 443 (HTTPS) ALLOW
# - 5432 should NOT be open to public
```

### Step 6.3: Check SSL Certificate

```bash
# Verify SSL certificate
curl -vI https://api.alshailfund.com 2>&1 | grep -i "SSL certificate"

# Check certificate expiry
echo | openssl s_client -servername api.alshailfund.com -connect api.alshailfund.com:443 2>/dev/null | openssl x509 -noout -dates
```

---

## 📝 PHASE 7: GENERATE COMPLETION REPORT

### Step 7.1: Create Completion Report

```bash
cat > /var/www/PROShael/VPS_MIGRATION_COMPLETION_REPORT.md << 'EOF'
# 🎉 AL-SHUAIL VPS MIGRATION - COMPLETION REPORT

**Date:** [CURRENT_DATE]
**Generated by:** Claude Code

---

## ✅ INFRASTRUCTURE STATUS

| Component | Status | Details |
|-----------|--------|---------|
| VPS Server | ✅ | Ubuntu 24.04, Contabo |
| PostgreSQL | ✅ | Version 15, localhost:5432 |
| Node.js | ✅ | Version 20.x |
| PM2 | ✅ | Running, auto-restart enabled |
| Nginx | ✅ | SSL configured |
| SSL Certificate | ✅ | Let's Encrypt |

---

## ✅ DATABASE STATUS

| Item | Count/Status |
|------|--------------|
| Total Tables | 64 |
| Foreign Keys | 94 |
| Members | [COUNT] |
| Subscriptions | [COUNT] |
| Connection | Local PostgreSQL |

---

## ✅ API ENDPOINTS STATUS

| Category | Tested | Passed | Failed |
|----------|--------|--------|--------|
| Authentication | X | X | X |
| Members | X | X | X |
| Subscriptions | X | X | X |
| Family Tree | X | X | X |
| Activities | X | X | X |
| **Total** | **X** | **X** | **X** |

---

## ✅ STORAGE STATUS

| Directory | Status | Path |
|-----------|--------|------|
| Members | ✅ | /var/www/alshuail/storage/members |
| Documents | ✅ | /var/www/alshuail/storage/documents |
| Photos | ✅ | /var/www/alshuail/storage/photos |
| Receipts | ✅ | /var/www/alshuail/storage/receipts |

---

## ✅ BACKUP STATUS

| Item | Status |
|------|--------|
| Backup Script | ✅ /root/backup-alshuail-db.sh |
| Restore Script | ✅ /root/restore-alshuail-db.sh |
| Cron Schedule | ✅ Daily at 3 AM |
| Retention | 7 days |
| Backup Location | /var/backups/postgresql/ |

---

## ✅ SECURITY STATUS

| Check | Status |
|-------|--------|
| PostgreSQL localhost only | ✅ |
| Firewall (UFW) | ✅ |
| SSL/HTTPS | ✅ |
| No public DB port | ✅ |

---

## 📋 REMAINING TASKS (Optional)

- [ ] WhatsApp/Ultramsg integration (code ready)
- [ ] Firebase Push Notifications (configured)
- [ ] Socket.io for real-time updates
- [ ] pgAdmin installation (optional)

---

## 🔗 IMPORTANT URLS

- **API:** https://api.alshailfund.com
- **Admin Panel:** https://alshailfund.com
- **Mobile PWA:** https://app.alshailfund.com

---

## 🔐 CREDENTIALS (SAVE SECURELY)

```
Database:
- Host: localhost
- Port: 5432
- Database: alshuail_db
- User: alshuail_admin
- Password: [CONFIGURED_IN_ENV]

VPS:
- IP: 213.199.62.185
- User: root

Backup:
- Location: /var/backups/postgresql/
- Script: /root/backup-alshuail-db.sh
```

---

**Migration Status: ✅ COMPLETE**

EOF
```

---

## 🎯 EXECUTION CHECKLIST

Execute each phase in order and report results:

### Phase 1: Database Connection
- [ ] Check current .env configuration
- [ ] Update to local PostgreSQL if needed
- [ ] Restart PM2
- [ ] Verify database connection
- [ ] Test API health endpoint

### Phase 2: API Testing
- [ ] Test authentication endpoints
- [ ] Test members endpoints
- [ ] Test subscriptions endpoints
- [ ] Test family tree endpoints
- [ ] Test activities endpoints
- [ ] Document results

### Phase 3: Storage Setup
- [ ] Create storage directories
- [ ] Set permissions
- [ ] Update Nginx configuration
- [ ] Test static file serving

### Phase 4: Backup System
- [ ] Create backup script
- [ ] Test backup script
- [ ] Schedule daily cron job
- [ ] Create restore script

### Phase 5: Database Verification
- [ ] Verify table count (64)
- [ ] Verify data counts
- [ ] Verify foreign keys (94)

### Phase 6: Security Check
- [ ] Verify PostgreSQL is localhost only
- [ ] Verify firewall rules
- [ ] Verify SSL certificate

### Phase 7: Generate Report
- [ ] Create completion report
- [ ] Document all results

---

## ⚠️ IMPORTANT NOTES

1. **Before making any changes:**
   - Always backup current configuration
   - Document current state

2. **If you encounter errors:**
   - Check PM2 logs: `pm2 logs --lines 100`
   - Check Nginx logs: `tail -f /var/log/nginx/error.log`
   - Check PostgreSQL logs: `tail -f /var/log/postgresql/postgresql-15-main.log`

3. **If database connection fails:**
   - Verify PostgreSQL is running: `systemctl status postgresql`
   - Verify user/password: `psql -U alshuail_admin -d alshuail_db -h localhost`
   - Check pg_hba.conf for authentication settings

4. **Do NOT:**
   - Expose PostgreSQL port 5432 to public internet
   - Delete Supabase data until migration is fully verified
   - Change passwords without documenting them

---

## 🚀 START EXECUTION

Begin with **Phase 1: Verify Database Connection**

Report your progress after each phase. Ask for clarification if anything is unclear.

**You have full access via MCP servers. Let's complete this migration!**
