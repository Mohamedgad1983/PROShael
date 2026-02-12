# 🚀 Deploy Local Storage Fix to VPS

**Status**: storage.js rewritten - ready for deployment
**Critical**: This MUST be deployed before production use

---

## What Was Fixed

✅ **alshuail-backend/config/storage.js**
- Removed `import { createClient } from '@supabase/supabase-js'`
- Replaced all Supabase Storage calls with local filesystem (fs/promises)
- Maintained exact same API (uploadToSupabase, deleteFromSupabase, getSignedUrl)
- Routes (documents.js, memberStatement.js) require NO changes

✅ **alshuail-backend/.env**
- Added `UPLOAD_DIR=/var/www/uploads/alshuail`
- Added `API_BASE_URL=https://api.alshailfund.com`

✅ **Backup Created**
- `alshuail-backend/config/storage.js.supabase-backup` (in case rollback needed)

---

## VPS Deployment Steps

### Step 1: Prepare Upload Directory on VPS

SSH into VPS and run:

```bash
# Connect to VPS
ssh root@213.199.62.185

# Create upload directories
sudo mkdir -p /var/www/uploads/alshuail/{national_id,marriage_certificate,property_deed,birth_certificate,death_certificate,passport,driver_license,education,medical,other}

# Set ownership (www-data is the Nginx/Node.js user)
sudo chown -R www-data:www-data /var/www/uploads/alshuail

# Set permissions (755 = read/execute for all, write for owner)
sudo chmod -R 755 /var/www/uploads/alshuail

# Verify
ls -la /var/www/uploads/alshuail/
```

### Step 2: Configure Nginx to Serve Uploads

Edit Nginx config:

```bash
sudo nano /etc/nginx/sites-available/alshuail
```

Add this location block inside the `server` block:

```nginx
server {
    listen 80;
    server_name api.alshailfund.com;

    # Existing proxy_pass for /api ...

    # NEW: Serve uploaded files
    location /uploads/ {
        alias /var/www/uploads/alshuail/;

        # Security: Disable directory listing
        autoindex off;

        # Cache static files for 30 days
        expires 30d;
        add_header Cache-Control "public, immutable";

        # Only serve specific file types
        location ~ \.(jpg|jpeg|png|pdf)$ {
            # Files are served
        }

        # Block all other files
        location ~ \..* {
            return 403;
        }
    }

    # ... rest of config
}
```

Test and reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 3: Deploy Updated Code

```bash
# On VPS
cd /var/www/PROShael/alshuail-backend

# Pull latest changes
git pull origin 003-supabase-to-vps-migration

# Install dependencies (if any new ones)
npm install

# Restart PM2
pm2 restart alshuail-backend

# Check logs
pm2 logs alshuail-backend --lines 50
```

### Step 4: Verify Upload Directory is Writable

```bash
# Test write permission
sudo -u www-data touch /var/www/uploads/alshuail/test.txt

# Should succeed without errors
ls -l /var/www/uploads/alshuail/test.txt

# Clean up test file
rm /var/www/uploads/alshuail/test.txt
```

---

## Testing After Deployment

### Test 1: Backend Starts Without Errors

```bash
pm2 logs alshuail-backend --lines 50
# Should NOT see any @supabase or Supabase-related errors
```

### Test 2: Health Check

```bash
curl https://api.alshailfund.com/api/health
# Should return 200 OK with PostgreSQL database check passing
```

### Test 3: Document Upload (via API)

```bash
# Get a valid JWT token first (login)
TOKEN="your-jwt-token-here"

# Upload a test document
curl -X POST https://api.alshailfund.com/api/documents/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "document=@/path/to/test.pdf" \
  -F "title=Test Document" \
  -F "category=other" \
  -F "member_id=1"

# Should return success with a URL like:
# {
#   "success": true,
#   "document": {
#     "url": "https://api.alshailfund.com/uploads/1/other/1234567890_test.pdf",
#     ...
#   }
# }
```

### Test 4: Document Download

```bash
# Use the URL from the upload response
curl -I https://api.alshailfund.com/uploads/1/other/1234567890_test.pdf

# Should return 200 OK with Content-Type: application/pdf
```

### Test 5: Document Delete

```bash
# Delete the test document via API
curl -X DELETE https://api.alshailfund.com/api/documents/:documentId \
  -H "Authorization: Bearer $TOKEN"

# Should return success
```

---

## Environment Variables on VPS

Ensure `.env` on VPS has:

```env
UPLOAD_DIR=/var/www/uploads/alshuail
API_BASE_URL=https://api.alshailfund.com
```

---

## Rollback Plan (If Issues)

If uploads fail after deployment:

```bash
cd /var/www/PROShael/alshuail-backend/config

# Restore old Supabase version
mv storage.js storage.js.new
mv storage.js.supabase-backup storage.js

# Restart
pm2 restart alshuail-backend

# Note: This will bring back Supabase dependency!
# Only use for emergency rollback while debugging
```

---

## Monitoring After Deployment

Check these for 24-48 hours:

1. **Disk space**: `df -h` (uploads will consume disk)
2. **Upload directory size**: `du -sh /var/www/uploads/alshuail/`
3. **PM2 logs**: `pm2 logs alshuail-backend`
4. **Nginx error logs**: `sudo tail -f /var/log/nginx/error.log`

---

## Expected Results

✅ Backend starts without Supabase errors
✅ Document upload creates files in `/var/www/uploads/alshuail/`
✅ Document download serves files via Nginx
✅ Document delete removes files from filesystem
✅ No `@supabase` references in production code
✅ All document routes work normally

---

## Post-Deployment Cleanup

After confirming everything works (48+ hours):

```bash
# Delete Supabase backup (no longer needed)
rm /var/www/PROShael/alshuail-backend/config/storage.js.supabase-backup

# Update VERIFICATION_REPORT.md to mark storage.js as fixed
```

---

## Troubleshooting

### Issue: "File upload failed: EACCES: permission denied"
**Solution**: Check directory permissions
```bash
sudo chown -R www-data:www-data /var/www/uploads/alshuail
sudo chmod -R 755 /var/www/uploads/alshuail
```

### Issue: "404 Not Found" when accessing uploaded files
**Solution**: Check Nginx config
```bash
sudo nginx -t
sudo systemctl reload nginx
# Verify /uploads/ location block exists
```

### Issue: "File not found" when downloading
**Solution**: Check file path in database matches filesystem
```bash
# List uploaded files
find /var/www/uploads/alshuail -type f -name "*.pdf"

# Check database paths
psql -d alshuail_db -c "SELECT file_path FROM documents LIMIT 5;"
```

---

## Success Criteria

- [ ] Upload directory created with correct permissions
- [ ] Nginx serves /uploads/ path (test with curl)
- [ ] Code deployed and PM2 restarted
- [ ] Backend logs show no Supabase errors
- [ ] Document upload test passes
- [ ] Document download test passes
- [ ] Document delete test passes
- [ ] Health check passes
- [ ] No @supabase imports in `grep -r "@supabase" config/ routes/`

---

**Last Updated**: 2026-02-12
**Deployed By**: ___________
**Deployment Date**: ___________
**Status**: ☐ DEPLOYED ☐ VERIFIED ☐ PRODUCTION READY
