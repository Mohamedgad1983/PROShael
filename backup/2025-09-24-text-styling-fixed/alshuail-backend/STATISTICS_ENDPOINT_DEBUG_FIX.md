# 🐛 Statistics Endpoint Debug & Fix Guide

## Issue Description
**Error:** `"Cannot read properties of undefined (reading 'query')"`
**Endpoint:** `GET /api/activities/statistics`
**Status:** Backend running but statistics API failing

## Root Cause Analysis

The error indicates that the database client object is undefined when the statistics controller tries to execute a query. This commonly happens due to:

1. **Database client not properly imported**
2. **Supabase client not initialized correctly**
3. **Database connection middleware not applied**
4. **Incorrect database client reference in controller**

## 🔧 Immediate Fix Steps

### Step 1: Check Database Configuration

**File to check:** `config/database.js`

**Expected structure:**
```javascript
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };
```

### Step 2: Fix Statistics Controller

**File to update:** `controllers/activitiesController.js`

**Current problematic code pattern:**
```javascript
// ❌ This likely causes the error
const getActivityStatistics = async (req, res) => {
  try {
    const { data, error } = await req.db.query('...');  // req.db is undefined
    // or
    const { data, error } = await db.query('...');      // db is undefined
  } catch (error) {
    // error handling
  }
};
```

**Correct implementation:**
```javascript
const { supabase } = require('../config/database');

const getActivityStatistics = async (req, res) => {
  try {
    // ✅ Correct Supabase query pattern
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('*');

    if (activitiesError) {
      throw activitiesError;
    }

    const { data: contributions, error: contributionsError } = await supabase
      .from('financial_contributions')
      .select('*');

    if (contributionsError) {
      throw contributionsError;
    }

    // Calculate statistics
    const statistics = {
      overview: {
        total_activities: activities.length,
        upcoming_activities: activities.filter(a => a.status === 'upcoming').length,
        completed_activities: activities.filter(a => a.status === 'completed').length,
        cancelled_activities: activities.filter(a => a.status === 'cancelled').length,
        total_participants: activities.reduce((sum, a) => sum + (a.current_participants || 0), 0),
        total_revenue: contributions.reduce((sum, c) => sum + (c.amount || 0), 0)
      },
      by_category: [],
      by_month: []
    };

    res.json({
      status: 'success',
      message_ar: 'تم جلب إحصائيات الأنشطة بنجاح',
      message_en: 'Activity statistics retrieved successfully',
      data: statistics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Statistics error:', error);
    res.status(500).json({
      status: 'error',
      message_ar: 'خطأ في جلب الإحصائيات',
      message_en: 'Error retrieving statistics',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
```

### Step 3: Verify Environment Variables

**Check file:** `.env` in `alshuail-backend/`

**Required variables:**
```env
SUPABASE_URL=https://oneiggrfzagqjbkdinin.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DB_HOST=db.oneiggrfzagqjbkdinin.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=OverJar@@!(*#222!
JWT_SECRET=AlShuail2024@KuwaitFamily!SecretKey#786
```

### Step 4: Complete Fixed Statistics Controller

**Complete implementation for `controllers/activitiesController.js`:**

```javascript
const { supabase } = require('../config/database');

// Statistics endpoint - fixed version
const getActivityStatistics = async (req, res) => {
  try {
    console.log('Fetching activity statistics...');

    // Get all activities
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select(`
        *,
        main_categories(name_ar, name_en)
      `);

    if (activitiesError) {
      console.error('Activities query error:', activitiesError);
      throw activitiesError;
    }

    // Get all contributions
    const { data: contributions, error: contributionsError } = await supabase
      .from('financial_contributions')
      .select('*');

    if (contributionsError) {
      console.error('Contributions query error:', contributionsError);
      throw contributionsError;
    }

    // Get categories for breakdown
    const { data: categories, error: categoriesError } = await supabase
      .from('main_categories')
      .select('*');

    if (categoriesError) {
      console.error('Categories query error:', categoriesError);
      throw categoriesError;
    }

    // Calculate overview statistics
    const overview = {
      total_activities: activities?.length || 0,
      upcoming_activities: activities?.filter(a => a.status === 'upcoming').length || 0,
      completed_activities: activities?.filter(a => a.status === 'completed').length || 0,
      cancelled_activities: activities?.filter(a => a.status === 'cancelled').length || 0,
      total_participants: activities?.reduce((sum, a) => sum + (a.current_participants || 0), 0) || 0,
      total_revenue: contributions?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0
    };

    // Calculate category breakdown
    const by_category = categories?.map(category => {
      const categoryActivities = activities?.filter(a => a.category_id === category.id) || [];
      return {
        category_name_ar: category.name_ar,
        category_name_en: category.name_en,
        count: categoryActivities.length,
        percentage: overview.total_activities > 0 ? 
          Math.round((categoryActivities.length / overview.total_activities) * 100) : 0
      };
    }) || [];

    // Calculate monthly breakdown (last 12 months)
    const by_month = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthActivities = activities?.filter(a => {
        const activityDate = new Date(a.created_at);
        return activityDate >= monthStart && activityDate <= monthEnd;
      }) || [];

      by_month.push({
        month: monthStart.toISOString().slice(0, 7), // YYYY-MM format
        activities_count: monthActivities.length,
        participants_count: monthActivities.reduce((sum, a) => sum + (a.current_participants || 0), 0)
      });
    }

    const statistics = {
      overview,
      by_category,
      by_month
    };

    console.log('Statistics calculated successfully:', {
      totalActivities: overview.total_activities,
      totalContributions: contributions?.length || 0
    });

    res.json({
      status: 'success',
      message_ar: 'تم جلب إحصائيات الأنشطة بنجاح',
      message_en: 'Activity statistics retrieved successfully',
      data: statistics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Statistics endpoint error:', error);
    res.status(500).json({
      status: 'error',
      message_ar: 'خطأ في جلب الإحصائيات',
      message_en: 'Error retrieving statistics',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  // ... other controller methods
  getActivityStatistics
};
```

## 🧪 Testing Commands

### Test the fix:
```bash
# Test statistics endpoint
curl -X GET http://localhost:5001/api/activities/statistics

# Expected response:
{
  "status": "success",
  "message_ar": "تم جلب إحصائيات الأنشطة بنجاح",
  "data": {
    "overview": {
      "total_activities": 4,
      "upcoming_activities": 2,
      "completed_activities": 1,
      "total_participants": 25,
      "total_revenue": 5000
    }
  }
}
```

### Debug logging:
```bash
# Check server logs for detailed error info
# The console.log statements will show:
# - "Fetching activity statistics..."
# - Query results
# - Calculated statistics
# - Any errors with full details
```

## 🔍 Alternative Debugging Methods

### Method 1: Test Supabase Connection Directly
```javascript
// Add this test endpoint to verify database connection
const testDatabaseConnection = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('activities')
      .select('count(*)', { count: 'exact' });
    
    if (error) throw error;
    
    res.json({
      status: 'success',
      message: 'Database connection working',
      count: data
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message
    });
  }
};
```

### Method 2: Check All Required Tables
```javascript
// Verify all required tables exist
const checkTables = async (req, res) => {
  const tables = ['activities', 'financial_contributions', 'main_categories', 'temp_members'];
  const results = {};
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      results[table] = error ? `Error: ${error.message}` : 'OK';
    } catch (err) {
      results[table] = `Exception: ${err.message}`;
    }
  }
  
  res.json({ tables: results });
};
```

## 📋 Implementation Checklist

- [ ] Check `config/database.js` exports supabase client correctly
- [ ] Verify `.env` file has all required Supabase credentials
- [ ] Update `controllers/activitiesController.js` with fixed statistics method
- [ ] Test statistics endpoint with curl
- [ ] Verify all database tables are accessible
- [ ] Check server logs for any remaining errors
- [ ] Test with frontend admin panel

## 🚨 If Issue Persists

1. **Check Supabase Dashboard:**
   - Verify database is active
   - Check for API usage limits
   - Confirm table structures

2. **Verify Network Connectivity:**
   ```bash
   ping db.oneiggrfzagqjbkdinin.supabase.co
   ```

3. **Test Manual Database Query:**
   ```javascript
   // Add to a test route
   const { data, error } = await supabase
     .from('activities')
     .select('id, title_ar')
     .limit(5);
   console.log('Manual test:', { data, error });
   ```

This fix should resolve the `undefined query` error and restore statistics endpoint functionality.
