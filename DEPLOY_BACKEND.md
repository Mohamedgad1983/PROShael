# Backend Deployment Guide

## 🚀 Deploy to Render (Recommended - FREE)

### Step 1: Create Render Account
1. Go to https://render.com
2. Sign up with GitHub (easiest option)
3. Authorize Render to access your repositories

### Step 2: Create New Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository: `Mohamedgad1983/PROShael`
3. Configure the service:
   - **Name**: `alshuail-backend`
   - **Root Directory**: `alshuail-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

### Step 3: Add Environment Variables
Click "Environment" and add these variables:

```
NODE_ENV=production
PORT=5001
SUPABASE_URL=https://oneiggrfzagqjbkdinin.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uZWlnZ3JmemFncWpia2RpbmluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3Mzc5MDMsImV4cCI6MjA3MDMxMzkwM30.AqaBlip7Dwd0DIMQ0DbhtlHk9jUd9MEZJND9J5GbEmk
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uZWlnZ3JmemFncWpia2RpbmluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDczNzkwMywiZXhwIjoyMDcwMzEzOTAzfQ.rBZIRsifsQiR3j5OgViWLjaBi_W8Jp0gD7HPf9fS5vI
JWT_SECRET=AlShuail2024@KuwaitFamily!SecretKey#786
FRONTEND_URL=https://alshuail-admin.pages.dev
```

### Step 4: Deploy
1. Click **"Create Web Service"**
2. Wait for deployment (5-10 minutes)
3. Your backend URL will be: `https://alshuail-backend.onrender.com`

### Step 5: Update Frontend
After deployment, update your frontend to use the new backend URL.

---

## 🎯 Alternative: Deploy to Vercel (Also FREE)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Deploy
```bash
cd alshuail-backend
vercel
```

### Step 3: Follow prompts
- Choose project name: `alshuail-backend`
- Link to existing project: No
- Which scope: Personal
- Found project "alshuail-backend": Yes

### Step 4: Add Environment Variables
```bash
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_KEY
vercel env add JWT_SECRET
vercel env add FRONTEND_URL
```

### Step 5: Deploy to Production
```bash
vercel --prod
```

Your backend URL will be: `https://alshuail-backend.vercel.app`

---

## 📝 Important Notes

### Free Tier Limitations

**Render:**
- Spins down after 15 minutes of inactivity
- Takes 30 seconds to wake up on first request
- 750 hours/month (enough for 1 app 24/7)
- Auto-deploys from GitHub

**Vercel:**
- 10-second timeout for API routes
- Serverless (not persistent)
- Better for simple APIs
- Instant cold starts

### After Deployment

1. **Test the health endpoint**:
   ```
   https://your-backend-url.onrender.com/api/health
   ```

2. **Update GitHub Secrets** for frontend:
   - Go to: https://github.com/Mohamedgad1983/PROShael/settings/secrets/actions
   - Add/Update: `REACT_APP_API_URL` with your backend URL

3. **Update local .env files** if needed

### Monitoring

- Render Dashboard: https://dashboard.render.com
- Check logs for any errors
- Monitor response times

### Keeping App Awake (Optional)

To prevent Render from sleeping, you can use:
- UptimeRobot (https://uptimerobot.com) - Free
- Set it to ping your health endpoint every 5 minutes

---

## 🔧 Troubleshooting

### If deployment fails:
1. Check logs in Render dashboard
2. Ensure all environment variables are set
3. Verify package.json has correct start script
4. Check Node version compatibility

### If API calls fail:
1. Check CORS settings in server.js
2. Verify frontend is using correct backend URL
3. Check browser console for errors
4. Test with Postman/curl first

### Support
- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs