# Credential Rotation Guide

## Why Rotation Is Needed
The `.env.production` file was previously tracked in git, exposing production credentials in repository history. Even though the file has been removed from tracking, the credentials exist in git history and should be rotated.

## Credentials to Rotate

### 1. Database Password (CRITICAL)
- **Where**: VPS (213.199.62.185), PostgreSQL 16
- **Variable**: `DB_PASSWORD`, `DATABASE_URL`
- **Steps**:
  ```bash
  ssh root@213.199.62.185
  sudo -u postgres psql
  ALTER USER alshuail WITH PASSWORD 'new-secure-password';
  ```
  Then update `.env.production` on VPS with new password.

### 2. JWT Secret (CRITICAL)
- **Variable**: `JWT_SECRET`
- **Impact**: All active sessions will be invalidated
- **Steps**:
  ```bash
  # Generate new secret
  openssl rand -base64 64
  ```
  Update `.env.production` on VPS. All users will need to re-login.

### 3. Ultramsg WhatsApp Token (HIGH)
- **Variables**: `ULTRAMSG_INSTANCE_ID`, `ULTRAMSG_TOKEN`
- **Where**: https://ultramsg.com dashboard
- **Steps**: Regenerate token from Ultramsg dashboard, update `.env.production`

### 4. Supabase Keys (LOW - if still used)
- **Variables**: `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
- **Status**: May be deprecated if fully migrated to VPS PostgreSQL
- **Steps**: Regenerate from Supabase dashboard if still in use

## After Rotation
1. Update `.env.production` on VPS with new values
2. Restart backend: `systemctl restart alshuail-backend.service`
3. Verify health: `curl https://api.alshailfund.com/api/health`
4. Test login flow
