#!/usr/bin/env python3

import requests

SUPABASE_URL = "https://oneiggrfzagqjbkdinin.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uZWlnZ3JmemFncWpia2RpbmluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDczNzkwMywiZXhwIjoyMDcwMzEzOTAzfQ.rBZIRsifsQiR3j5OgViWLjaBi_W8Jp0gD7HPf9fS5vI"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

# Test various table names
tables_to_test = [
    'financial_contributions',
    'contributions',
    'activity_contributions',
    'payments',
    'transactions',
    'financial_records',
    'member_contributions'
]

for table_name in tables_to_test:
    url = f"{SUPABASE_URL}/rest/v1/{table_name}?select=*&limit=1"
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        data = response.json()
        if data:
            print(f"✓ Table '{table_name}' exists with columns:", list(data[0].keys())[:5], "...")
        else:
            print(f"✓ Table '{table_name}' exists but is empty")
    elif response.status_code == 404:
        print(f"✗ Table '{table_name}' does not exist")
    else:
        print(f"? Table '{table_name}' returned: {response.status_code}")

# Check payments table in detail
print("\n=== Payments Table Schema ===")
url = f"{SUPABASE_URL}/rest/v1/payments?select=*&limit=1"
response = requests.get(url, headers=headers)

if response.status_code == 200:
    data = response.json()
    if data:
        print("Full columns:", list(data[0].keys()))