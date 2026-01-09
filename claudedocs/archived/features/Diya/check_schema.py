#!/usr/bin/env python3

import requests

SUPABASE_URL = "https://oneiggrfzagqjbkdinin.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uZWlnZ3JmemFncWpia2RpbmluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDczNzkwMywiZXhwIjoyMDcwMzEzOTAzfQ.rBZIRsifsQiR3j5OgViWLjaBi_W8Jp0gD7HPf9fS5vI"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

# Check main_categories table schema
url = f"{SUPABASE_URL}/rest/v1/main_categories?select=*&limit=1"
response = requests.get(url, headers=headers)

print("=== main_categories table ===")
if response.status_code == 200:
    data = response.json()
    if data:
        print("Columns:", list(data[0].keys()))
        print("Sample data:", data[0])
    else:
        print("Table exists but is empty")
else:
    print("Error accessing table:", response.status_code, response.text)

print("\n=== Getting existing main categories ===")
url = f"{SUPABASE_URL}/rest/v1/main_categories"
response = requests.get(url, headers=headers)
if response.status_code == 200:
    categories = response.json()
    print(f"Found {len(categories)} categories:")
    for cat in categories:
        print(f"  - ID: {cat['id']}, Name: {cat.get('name_ar', cat.get('name', 'N/A'))}")

print("\n=== Checking activities table ===")
url = f"{SUPABASE_URL}/rest/v1/activities?select=*&limit=1"
response = requests.get(url, headers=headers)
if response.status_code == 200:
    data = response.json()
    if data:
        print("Sample activity:", data[0])