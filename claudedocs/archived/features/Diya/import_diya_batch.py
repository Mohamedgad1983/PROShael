#!/usr/bin/env python3
"""
Optimized batch import for diya contributions
"""

import pandas as pd
import requests
import sys
from datetime import datetime

# Configuration
SUPABASE_URL = "https://oneiggrfzagqjbkdinin.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uZWlnZ3JmemFncWpia2RpbmluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDczNzkwMywiZXhwIjoyMDcwMzEzOTAzfQ.rBZIRsifsQiR3j5OgViWLjaBi_W8Jp0gD7HPf9fS5vI"

EXCEL_FILE = r"D:\PROShael\importdata\نسخة رئيس الصندوق 15.xlsx"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

print("Starting optimized diya import...")

# Load Excel data
df = pd.read_excel(EXCEL_FILE, sheet_name='ورقة1')
df = df.dropna(how='all')
df = df.loc[:, ~df.columns.str.contains('Unnamed')]

# Get all members in one call
url = f"{SUPABASE_URL}/rest/v1/members?select=id,membership_number"
response = requests.get(url, headers=headers)
members = response.json()
member_map = {m['membership_number']: m['id'] for m in members}
print(f"Loaded {len(member_map)} members")

# Get diya activity IDs
url = f"{SUPABASE_URL}/rest/v1/activities?title_ar=ilike.دية%&select=id,title_ar"
response = requests.get(url, headers=headers)
activities = response.json()
activity_map = {a['title_ar'].replace(' ', ''): a['id'] for a in activities}

print(f"Found activities: {list(activity_map.keys())}")

# Prepare all contributions in batches
all_contributions = []

diya_columns = {
    'دية نادر': 'ديةنادر',
    'دية شرهان1': 'ديةشرهان1',
    'دية شرهان2': 'ديةشرهان2'
}

for excel_col, activity_key in diya_columns.items():
    if activity_key not in activity_map:
        print(f"Warning: Activity {activity_key} not found")
        continue

    activity_id = activity_map[activity_key]

    for idx, row in df.iterrows():
        if idx >= 344:  # Only process member rows
            break

        amount = row.get(excel_col, 0)
        if pd.isna(amount) or amount <= 0 or amount > 1000:
            continue

        membership_num = f"{10001 + idx}"
        if membership_num not in member_map:
            continue

        all_contributions.append({
            'contributor_id': member_map[membership_num],
            'activity_id': activity_id,
            'contribution_amount': float(amount),
            'contribution_date': '2024-12-31',
            'payment_method': 'cash'
        })

print(f"Prepared {len(all_contributions)} contributions for import")

# Batch insert in chunks
BATCH_SIZE = 50
for i in range(0, len(all_contributions), BATCH_SIZE):
    batch = all_contributions[i:i+BATCH_SIZE]

    url = f"{SUPABASE_URL}/rest/v1/financial_contributions"
    response = requests.post(url, headers=headers, json=batch)

    if response.status_code in [200, 201]:
        print(f"✓ Imported batch {i//BATCH_SIZE + 1} ({len(batch)} records)")
    else:
        print(f"✗ Failed batch {i//BATCH_SIZE + 1}: {response.status_code}")
        if i == 0:  # Show error for first batch only
            print(f"Error: {response.text[:500]}")

# Verify the import
url = f"{SUPABASE_URL}/rest/v1/financial_contributions?select=contribution_amount"
response = requests.get(url, headers=headers)
if response.status_code == 200:
    contribs = response.json()
    total = sum(c['contribution_amount'] for c in contribs)
    print(f"\n=== IMPORT COMPLETE ===")
    print(f"Total contributions: {len(contribs)}")
    print(f"Total amount: {total:,.0f} SAR")
    print(f"Expected: 140,800 SAR (excluding large amounts)")