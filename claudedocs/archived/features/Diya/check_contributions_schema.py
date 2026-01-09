#!/usr/bin/env python3

import requests

SUPABASE_URL = "https://oneiggrfzagqjbkdinin.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uZWlnZ3JmemFncWpia2RpbmluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDczNzkwMywiZXhwIjoyMDcwMzEzOTAzfQ.rBZIRsifsQiR3j5OgViWLjaBi_W8Jp0gD7HPf9fS5vI"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

# Check financial_contributions table schema
url = f"{SUPABASE_URL}/rest/v1/financial_contributions?select=*&limit=1"
response = requests.get(url, headers=headers)

print("=== financial_contributions table ===")
if response.status_code == 200:
    data = response.json()
    if data:
        print("Columns:", list(data[0].keys()))
        print("\nSample data:")
        for key, value in data[0].items():
            print(f"  {key}: {value}")
    else:
        print("Table exists but is empty")
else:
    print("Error accessing table:", response.status_code, response.text)

# Check activities we just created
url = f"{SUPABASE_URL}/rest/v1/activities?title_ar=ilike.دية%&select=*"
response = requests.get(url, headers=headers)

print("\n=== Diya Activities Created ===")
if response.status_code == 200:
    activities = response.json()
    print(f"Found {len(activities)} diya activities:")
    for act in activities:
        print(f"  - {act['title_ar']}: ID={act['id']}")