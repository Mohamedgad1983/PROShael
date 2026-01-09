# 📘 DIYA CONTRIBUTIONS IMPORT - QUICK GUIDE

**Date:** October 2, 2025  
**Purpose:** Import diya (blood money) contributions into financial_contributions table

---

## 🎯 What This Script Does

Imports **855 diya contribution records** from your Excel file:

- **دية نادر** (Nader Diya): 283 contributions = 56,400 SAR
- **دية شرهان1** (Sharhan 1): 293 contributions = 58,400 SAR  
- **دية شرهان2** (Sharhan 2): 279 contributions = 166,800 SAR

**Total:** 855 records = 281,600 SAR

---

## ⚡ Quick Start (3 Steps)

### Step 1: Edit the Script (2 min)

Open `import_diya_contributions.py` and add your Supabase key on line 19:

```python
SUPABASE_KEY = "YOUR_SERVICE_ROLE_KEY_HERE"  # Replace with your actual key
```

### Step 2: Run the Script (5 min)

```bash
# Make sure these files are in same folder:
# - import_diya_contributions.py
# - نسخة_رئيس_الصندوق_15.xlsx

# Run the import
python import_diya_contributions.py
```

### Step 3: Verify (2 min)

Check in Supabase:
```sql
SELECT COUNT(*) FROM financial_contributions;
-- Should show 855

SELECT 
    a.title_ar,
    COUNT(*) as contributions,
    SUM(fc.amount) as total
FROM financial_contributions fc
JOIN activities a ON fc.activity_id = a.id
GROUP BY a.title_ar;
```

---

## 📊 What Gets Created

### 1. Activities (3 records)
```
- دية نادر (Nader Diya Case)
- دية شرهان 1 (Sharhan Diya Case 1)
- دية شرهان 2 (Sharhan Diya Case 2)
```

### 2. Financial Contributions (855 records)
Each record contains:
- contributor_id → links to member
- activity_id → links to diya case
- amount → contribution amount
- contribution_date → 2024-12-31
- payment_method → cash
- status → approved
- contribution_type → diya

---

## 🔍 Expected Output

```
==================================================================
    AL-SHUAIL DIYA CONTRIBUTIONS IMPORT
==================================================================

✓ Connection successful!

==================================================================
LOADING EXCEL DATA
==================================================================

✓ Loaded 355 rows from Excel
✓ Cleaned data: 344 valid rows
ℹ دية نادر: 283 contributions = 56,400 SAR
ℹ دية شرهان1: 293 contributions = 58,400 SAR
ℹ دية شرهان2: 279 contributions = 166,800 SAR

==================================================================
FETCHING EXISTING MEMBERS
==================================================================

✓ Found 344 members in database

==================================================================
CREATING DIYA ACTIVITIES
==================================================================

✓ Created activity: دية نادر (ID: xxx...)
✓ Created activity: دية شرهان1 (ID: xxx...)
✓ Created activity: دية شرهان2 (ID: xxx...)

==================================================================
IMPORTING DIYA CONTRIBUTIONS
==================================================================

ℹ Processing دية نادر...
✓ دية نادر: 283 contributions imported

ℹ Processing دية شرهان1...
✓ دية شرهان1: 293 contributions imported

ℹ Processing دية شرهان2...
✓ دية شرهان2: 279 contributions imported

==================================================================
IMPORT SUMMARY
==================================================================

✓ Total imported: 855 contributions

==================================================================
VERIFYING IMPORT
==================================================================

✓ Total contributions in database: 855
✓ Total amount: 281,600 SAR

ℹ Breakdown by activity:
  Activity xxx: 283 contributions = 56,400 SAR
  Activity xxx: 293 contributions = 58,400 SAR
  Activity xxx: 279 contributions = 166,800 SAR

==================================================================
IMPORT COMPLETE!
==================================================================

✓ Successfully imported 855 diya contributions
```

---

## 📋 How It Works

### Matching Process:
```
Excel Row 0 → Membership Number 10001 → Member ID → Contribution
Excel Row 1 → Membership Number 10002 → Member ID → Contribution
...
Excel Row 343 → Membership Number 10344 → Member ID → Contribution
```

### Data Flow:
```
1. Read Excel file (نسخة_رئيس_الصندوق_15.xlsx)
2. Get existing members from database (344 members)
3. Create 3 activity records (diya cases)
4. For each diya column:
   - Read amount from Excel
   - Find matching member by membership number
   - Create financial_contribution record
   - Link member + activity + amount
5. Verify all records imported
```

---

## ⚠️ Important Notes

### Prerequisites:
- ✅ 344 members must already be imported
- ✅ Members must have membership numbers 10001-10344
- ✅ Excel file must be in same folder as script

### What If Members Not Found?
The script will skip contributions for missing members and show warnings:
```
⚠ Member 10234 not found in database
```

This is normal if some members weren't imported.

---

## 🔧 Troubleshooting

### Error: "Member not found"
**Problem:** Membership numbers don't match

**Solution:** Check your members table:
```sql
SELECT membership_number, full_name 
FROM members 
ORDER BY membership_number;
```

Make sure they're 10001-10344.

---

### Error: "Activity already exists"
**Problem:** Activities were created before

**Solution:** This is fine! The script will use existing activities.

---

### Error: "Connection failed"
**Problem:** Wrong Supabase key

**Solution:** 
1. Get key from Supabase Dashboard → Settings → API
2. Use service_role key (not anon)
3. Update line 19 in script

---

## 📊 After Import

### Check in Admin Panel:
1. Go to: https://alshuail-admin.pages.dev
2. Navigate to Financial section
3. View Contributions
4. Filter by activity (diya cases)

### Financial Reports Will Show:
- Total diya contributions: 281,600 SAR
- Breakdown by case
- Contributors list
- Payment history

---

## 🔄 Can I Run This Multiple Times?

**Yes!** But it will create duplicate records. 

**Best practice:**
1. Run once successfully
2. If errors occur, delete contributions first:
```sql
DELETE FROM financial_contributions 
WHERE contribution_type = 'diya';
```
3. Run script again

---

## 📈 Database Structure After Import

```
members (344 rows)
  ↓
financial_contributions (855 rows)
  ↓
activities (3 diya cases)
```

Each contribution links:
- **Who contributed** → member
- **What case** → activity  
- **How much** → amount

---

## ✅ Success Checklist

After running, you should have:
- ☐ 855 records in financial_contributions
- ☐ 3 activities for diya cases
- ☐ Total amount: 281,600 SAR
- ☐ All contributions linked to members
- ☐ Viewable in admin panel

---

## 💡 Next Steps

After importing diya contributions:

1. **Review in Admin Panel**
   - Check contribution lists
   - Verify amounts
   - Test filtering by activity

2. **Generate Reports**
   - Diya contribution summary
   - Member contribution history
   - Financial statements

3. **Import Other Data** (if needed)
   - Subscriptions (عضويه2 column)
   - Deductions (مبلغ الخصم column)

---

## 🆘 Need Help?

**Common Issues:**

| Problem | Solution |
|---------|----------|
| Members not found | Check membership numbers |
| Duplicates created | Delete and re-run |
| Wrong amounts | Check Excel data |
| Script errors | Check Python/packages |

---

**Quick Commands:**

```bash
# Check if Python installed
python --version

# Install if needed
pip install pandas openpyxl requests

# Run the script
python import_diya_contributions.py
```

---

**Created:** October 2, 2025  
**For:** Al-Shuail Family Management System  
**Script:** import_diya_contributions.py  
**Time to complete:** ~5-10 minutes
