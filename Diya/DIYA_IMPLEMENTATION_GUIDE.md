# 🎯 DIYA DASHBOARD - COMPLETE IMPLEMENTATION GUIDE

**Date:** October 2, 2025  
**Purpose:** Add real, dynamic diya dashboard with clickable reports

---

## 📋 WHAT YOU'LL BUILD

### Dashboard Cards (3 Cards)
```
┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐
│   دية نادر              │  │   دية شرهان 1           │  │   دية شرهان 2           │
│                         │  │                         │  │                         │
│   28,200 ريال           │  │   29,200 ريال           │  │   83,400 ريال           │
│   282 مساهم             │  │   292 مساهم             │  │   278 مساهم             │
│   [مكتمل]               │  │   [مكتمل]               │  │   [مكتمل]               │
└─────────────────────────┘  └─────────────────────────┘  └─────────────────────────┘
       ↓ Click                    ↓ Click                    ↓ Click
```

### Click Opens Report Modal
```
┌────────────────────────────────────────────────────────────────┐
│  دية نادر - قائمة المساهمين                                    │
├────────────────────────────────────────────────────────────────┤
│  إجمالي: 282 مساهم  |  المبلغ: 28,200 ريال  |  متوسط: 100 ريال │
├────────────────────────────────────────────────────────────────┤
│  رقم    │  الاسم                    │  الفخذ    │  المبلغ        │
│  10001  │  ابراهيم فلاح العايد      │  الدغيش   │  100 ريال      │
│  10002  │  ابراهيم نواش غضبان       │  رشود     │  100 ريال      │
│  ...                                                           │
└────────────────────────────────────────────────────────────────┘
```

---

## 🚀 IMPLEMENTATION STEPS

### Step 1: Import Diya Data (If Not Done)

Run the import script first:
```bash
python import_diya_contributions.py
```

This creates:
- 3 activity records (diya cases)
- ~852 financial_contribution records
- Links members to diya cases

---

### Step 2: Create Database View (Run in Supabase SQL Editor)

```sql
-- Create view for dashboard data
CREATE OR REPLACE VIEW diya_dashboard_stats AS
SELECT 
    a.id as activity_id,
    a.title_ar,
    a.title_en,
    COUNT(DISTINCT fc.contributor_id) as total_contributors,
    COALESCE(SUM(fc.amount), 0) as total_collected,
    COALESCE(AVG(fc.amount), 0) as average_contribution,
    a.collection_status,
    a.status
FROM activities a
LEFT JOIN financial_contributions fc ON a.id = fc.activity_id
WHERE fc.contribution_type = 'diya'
GROUP BY a.id, a.title_ar, a.title_en, a.status, a.collection_status
ORDER BY a.created_at;

-- Test the view
SELECT * FROM diya_dashboard_stats;
```

Expected result:
```
activity_id | title_ar      | total_contributors | total_collected
xxx...      | دية نادر      | 282               | 28,200
xxx...      | دية شرهان 1   | 292               | 29,200
xxx...      | دية شرهان 2   | 278               | 83,400
```

---

### Step 3: Create Function for Contributors List

```sql
-- Function to get contributors for a specific diya
CREATE OR REPLACE FUNCTION get_diya_contributors(p_activity_id UUID)
RETURNS TABLE (
    member_id UUID,
    member_name VARCHAR,
    membership_number VARCHAR,
    tribal_section VARCHAR,
    amount DECIMAL,
    contribution_date DATE,
    status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.full_name,
        m.membership_number,
        m.tribal_section,
        fc.amount,
        fc.contribution_date,
        fc.status
    FROM financial_contributions fc
    JOIN members m ON fc.contributor_id = m.id
    WHERE fc.activity_id = p_activity_id
    ORDER BY m.full_name;
END;
$$ LANGUAGE plpgsql;

-- Test the function (replace with actual activity_id)
SELECT * FROM get_diya_contributors('your-activity-id-here');
```

---

### Step 4: Create API Endpoints

#### A. Backend API (Node.js/Express Example)

Create file: `api/diya.js`

```javascript
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// GET /api/diya/dashboard - Get all diya cases
router.get('/dashboard', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('diya_dashboard_stats')
      .select('*');
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/diya/:id/contributors - Get contributors for specific diya
router.get('/:id/contributors', async (req, res) => {
  try {
    const { data, error } = await supabase
      .rpc('get_diya_contributors', { 
        p_activity_id: req.params.id 
      });
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/diya/:id/stats - Get detailed stats for one diya
router.get('/:id/stats', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('diya_dashboard_stats')
      .select('*')
      .eq('activity_id', req.params.id)
      .single();
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

#### B. Next.js API Routes

Create file: `pages/api/diya/dashboard.js`

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data, error } = await supabase
      .from('diya_dashboard_stats')
      .select('*');
    
    if (error) throw error;
    
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

Create file: `pages/api/diya/[id]/contributors.js`

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const { id } = req.query;

  try {
    const { data, error } = await supabase
      .rpc('get_diya_contributors', { p_activity_id: id });
    
    if (error) throw error;
    
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

### Step 5: Add Components to Dashboard

#### In your main dashboard file (`Dashboard.jsx` or `page.tsx`):

```jsx
import { DiyaDashboard } from '@/components/dashboard/DiyaDashboard';

export default function Dashboard() {
  return (
    <div className="container mx-auto p-6" dir="rtl">
      {/* Existing dashboard header */}
      <h1 className="text-3xl font-bold mb-8">لوحة التحكم</h1>
      
      {/* Your existing stats cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        {/* Total members, active members, etc. */}
      </div>
      
      {/* ADD DIYA SECTION HERE */}
      <div className="mb-8">
        <DiyaDashboard />
      </div>
      
      {/* Rest of your dashboard */}
    </div>
  );
}
```

---

### Step 6: Test Everything

#### A. Test Database Queries

In Supabase SQL Editor:
```sql
-- Check if view works
SELECT * FROM diya_dashboard_stats;

-- Check if function works (use actual activity_id)
SELECT * FROM get_diya_contributors('activity-id-here');
```

#### B. Test API Endpoints

```bash
# Test dashboard endpoint
curl http://localhost:3000/api/diya/dashboard

# Test contributors endpoint
curl http://localhost:3000/api/diya/{activity-id}/contributors
```

#### C. Test Frontend

1. Open dashboard in browser
2. You should see 3 diya cards
3. Click on any card
4. Modal should open with contributors list
5. Verify data is real from database

---

## 🎨 CUSTOMIZATION OPTIONS

### Change Card Colors

In `DiyaCard` component:
```jsx
// Change orange to any color
<div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
  <svg className="h-6 w-6 text-blue-600" ...>
```

### Add More Stats

Add to the modal summary:
```jsx
<div className="grid grid-cols-4 gap-4">
  <div>
    <div className="text-sm">أعلى مساهمة</div>
    <div className="text-xl font-bold">
      {Math.max(...contributors.map(c => c.amount))} ريال
    </div>
  </div>
  {/* Add more stats */}
</div>
```

### Filter by Tribal Section

Add filter dropdown:
```jsx
const [selectedBranch, setSelectedBranch] = useState('all');

<select onChange={(e) => setSelectedBranch(e.target.value)}>
  <option value="all">كل الأفخاذ</option>
  <option value="رشود">رشود</option>
  <option value="الدغيش">الدغيش</option>
  {/* etc */}
</select>

// Then filter contributors:
const filteredContributors = selectedBranch === 'all' 
  ? contributors 
  : contributors.filter(c => c.tribal_section === selectedBranch);
```

---

## 📊 ANALYTICS & REPORTS

### Add Analytics Card

```jsx
<Card>
  <CardHeader>
    <CardTitle>إحصائيات الدية</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      <div>إجمالي المبالغ المحصلة: {totalCollected.toLocaleString()} ريال</div>
      <div>عدد المساهمين الفريدين: {uniqueContributors}</div>
      <div>متوسط المساهمة: {averageContribution.toFixed(0)} ريال</div>
    </div>
  </CardContent>
</Card>
```

### Export to Excel

Install library:
```bash
npm install xlsx
```

Add export function:
```javascript
import * as XLSX from 'xlsx';

const exportToExcel = (contributors, diyaTitle) => {
  const ws = XLSX.utils.json_to_sheet(contributors);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "المساهمين");
  XLSX.writeFile(wb, `${diyaTitle}_contributors.xlsx`);
};
```

---

## 🔐 SECURITY CONSIDERATIONS

### Row Level Security (RLS)

Enable RLS on tables:
```sql
ALTER TABLE financial_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated read"
ON financial_contributions FOR SELECT
TO authenticated
USING (true);
```

### API Authentication

Add authentication check:
```javascript
// In API routes
const user = await supabase.auth.getUser();
if (!user) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

---

## ✅ VERIFICATION CHECKLIST

After implementation:

- [ ] 3 diya cards visible on dashboard
- [ ] Each card shows correct amount and contributor count
- [ ] Cards are clickable
- [ ] Modal opens when clicking card
- [ ] Contributors list shows real data
- [ ] Can filter/search contributors
- [ ] Export buttons work
- [ ] Mobile responsive
- [ ] RTL (Arabic) layout correct
- [ ] Loading states work
- [ ] Error handling works

---

## 🐛 TROUBLESHOOTING

### Cards not showing data

**Check:**
```sql
SELECT * FROM diya_dashboard_stats;
```

If empty, diya data wasn't imported. Run import script.

---

### Contributors not loading

**Check:**
```sql
SELECT * FROM financial_contributions WHERE contribution_type = 'diya' LIMIT 5;
```

If empty, import data. If showing data, check function:
```sql
SELECT * FROM get_diya_contributors('activity-id');
```

---

### API returns 500 error

**Check:**
1. Supabase credentials in `.env`
2. Database view exists
3. Function exists
4. Network connectivity

---

## 📱 MOBILE RESPONSIVE

Add mobile styles:
```jsx
<div className="grid gap-4 grid-cols-1 md:grid-cols-3">
  {/* Cards will stack on mobile, 3 columns on desktop */}
</div>
```

---

## 🎯 NEXT STEPS

After diya dashboard works:

1. **Add Charts** - Show contribution trends over time
2. **Add Notifications** - Alert when someone contributes
3. **Add Reports** - Detailed PDF reports
4. **Add Search** - Search contributors by name
5. **Add Filters** - Filter by branch, date, amount

---

**Implementation Time:** 2-3 hours  
**Difficulty:** Medium  
**Requirements:** React, Next.js or Node.js backend, Supabase

**Files Provided:**
1. `diya_dashboard_queries.sql` - Database queries
2. `DiyaDashboardComponents.jsx` - React components
3. `DIYA_IMPLEMENTATION_GUIDE.md` - This file

**Ready to implement?** Follow the steps above and you'll have a working diya dashboard with real data!
