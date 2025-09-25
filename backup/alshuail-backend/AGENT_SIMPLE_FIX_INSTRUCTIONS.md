# 🔧 Simple Fix Instructions - Database Query Error

## Priority: HIGH - Apply this fix immediately

### Problem
Statistics API endpoint failing with error: "Cannot read properties of undefined (reading 'query')"

### Solution Overview
Replace incorrect database query pattern with correct Supabase client usage.

---

## Step 1: Locate the Problem File

Navigate to your backend directory:
```bash
cd D:\PROShael\alshuail-backend
```

Find and open the file:
```
controllers/activitiesController.js
```

## Step 2: Find the Problematic Function

Look for a function named `getActivityStatistics` or similar.

You'll see code that looks like this (WRONG):
```javascript
// ❌ This is causing the error
const { data, error } = await req.db.query('...');
// OR
const { data, error } = await db.query('...');
```

## Step 3: Replace with Correct Code

Replace the entire `getActivityStatistics` function with this:

```javascript
const { supabase } = require('../config/database');

const getActivityStatistics = async (req, res) => {
  try {
    console.log('Fetching activity statistics...');

    // Get all activities
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('*');

    if (activitiesError) {
      throw activitiesError;
    }

    // Get all contributions  
    const { data: contributions, error: contributionsError } = await supabase
      .from('financial_contributions')
      .select('*');

    if (contributionsError) {
      throw contributionsError;
    }

    // Calculate statistics
    const overview = {
      total_activities: activities?.length || 0,
      upcoming_activities: activities?.filter(a => a.status === 'upcoming').length || 0,
      completed_activities: activities?.filter(a => a.status === 'completed').length || 0,
      cancelled_activities: activities?.filter(a => a.status === 'cancelled').length || 0,
      total_participants: activities?.reduce((sum, a) => sum + (a.current_participants || 0), 0) || 0,
      total_revenue: contributions?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0
    };

    const statistics = {
      overview,
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

## Step 4: Save and Test

1. Save the file
2. The server should automatically restart (if using nodemon)
3. Test the fix:

```bash
curl http://localhost:5001/api/activities/statistics
```

## Step 5: Verify Success

You should see a response like:
```json
{
  "status": "success",
  "message_ar": "تم جلب إحصائيات الأنشطة بنجاح",
  "data": {
    "overview": {
      "total_activities": 0,
      "upcoming_activities": 0,
      "completed_activities": 0,
      "total_participants": 0,
      "total_revenue": 0
    }
  }
}
```

## If Still Having Issues

1. Check that this line is at the top of the controller file:
```javascript
const { supabase } = require('../config/database');
```

2. Verify your .env file contains:
```
SUPABASE_URL=https://oneiggrfzagqjbkdinin.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. Check server logs for any error messages

## Next Steps After Fix

1. Continue with React admin panel setup
2. Include this fix details in your next milestone review
3. Proceed with Phase 2 development

**Estimated fix time: 15-30 minutes**
**Report completion to Senior PM immediately**
