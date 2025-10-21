# Manual Deployment Instructions for Render.com

## Updated Backend Files (2025-01-20)

### New Files to Upload:
1. **src/controllers/family-tree-extended.controller.js** - New endpoints for member assignment
2. **src/controllers/family-tree.controller.js** - Main family tree controller
3. **src/routes/family-tree.routes.js** - Routes for family tree API
4. **src/utils/tree-generator.js** - Tree generation utilities

### Modified Files:
1. **server.js** - Updated CORS configuration
2. **src/middleware/auth.js** - Authentication middleware updates

## Deployment Steps via Render.com Dashboard:

### Method 1: Via Render Dashboard (Recommended - No Git Required)

1. **Login to Render.com**: https://dashboard.render.com/
2. **Go to your service**: Find "alshuail-backend" or "proshael" service
3. **Manual Deploy**:
   - Click on your service
   - Go to "Manual Deploy" tab
   - Click "Deploy latest commit" OR
   - Use "Clear build cache & deploy"

### Method 2: Via Render CLI (If available)

```bash
# Install Render CLI if not already installed
npm install -g @render/cli

# Login to Render
render login

# Deploy the service
render deploy --service <your-service-id>
```

### Method 3: Connect to GitHub (When limits reset)

The backend repository needs these files committed and pushed:
```bash
git add src/controllers/family-tree-extended.controller.js
git add src/controllers/family-tree.controller.js
git add src/routes/family-tree.routes.js
git add src/utils/tree-generator.js
git add server.js
git add src/middleware/auth.js

git commit -m "feat: Add member assignment endpoints for 252 unassigned members"
git push origin main
```

Then Render.com will auto-deploy if connected to GitHub.

## New API Endpoints Added:

### 1. Get Unassigned Members
```
GET /api/tree/unassigned-members
Query params: page, limit, search
Returns: 252 members with family_branch_id = NULL
```

### 2. Assign Member to Branch
```
POST /api/tree/assign-member
Body: { memberId, branchId }
Returns: Updated member with branch assignment
```

### 3. Bulk Assign Members
```
POST /api/tree/bulk-assign
Body: { assignments: [{ memberId, branchId }, ...] }
Returns: Batch assignment results
```

## Environment Variables Required:

Make sure these are set in Render.com dashboard:
```
SUPABASE_URL=https://oneiggrfzagqjbkdinin.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=alshuail-super-secure-jwt-secret-key-2024-production-ready-32chars
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NODE_ENV=production
FRONTEND_URL=https://alshuail-admin.pages.dev
CORS_ORIGIN=https://alshuail-admin.pages.dev
```

## Verification After Deployment:

1. **Check Service Status**: Ensure service is "Live" on Render dashboard
2. **Test API Endpoint**:
   ```bash
   curl https://proshael.onrender.com/api/tree/branches
   # Should return 401 (Unauthorized) if working - means endpoint exists
   # Should NOT return 404 (Not Found)
   ```

3. **Test Frontend Integration**:
   - Open: https://722e6d3f.alshuail-admin.pages.dev/family-tree/assign-members.html
   - Should see 252 unassigned members loading
   - Console should NOT show 404 errors

## Current Status:

- ✅ Frontend deployed with correct API URL (https://proshael.onrender.com/api)
- ✅ CORS configuration fixed
- ✅ Local backend has all new endpoints working
- ❌ Production backend missing new code (showing 404 errors)

**After deployment, the 252 unassigned members will load correctly!**

## Troubleshooting:

### If you see 404 errors after deployment:
1. Check Render logs for build/start errors
2. Verify all files were uploaded correctly
3. Clear build cache and redeploy

### If you see CORS errors:
1. Verify FRONTEND_URL and CORS_ORIGIN environment variables
2. Check server.js CORS configuration is updated

### If deployment fails:
1. Check Node.js version (should be 18.x or 20.x)
2. Verify package.json has all dependencies
3. Check build logs for missing dependencies
