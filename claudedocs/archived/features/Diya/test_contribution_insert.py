#!/usr/bin/env python3

import requests

SUPABASE_URL = "https://oneiggrfzagqjbkdinin.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uZWlnZ3JmemFncWpia2RpbmluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDczNzkwMywiZXhwIjoyMDcwMzEzOTAzfQ.rBZIRsifsQiR3j5OgViWLjaBi_W8Jp0gD7HPf9fS5vI"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

# Get a member ID
url = f"{SUPABASE_URL}/rest/v1/members?select=id&limit=1"
response = requests.get(url, headers=headers)
member_id = response.json()[0]['id']

# Get activity ID (diya)
url = f"{SUPABASE_URL}/rest/v1/activities?title_ar=eq.دية نادر&select=id"
response = requests.get(url, headers=headers)
activity_id = response.json()[0]['id']

# Try different column names to find the correct one
test_data = [
    {
        'contributor_id': member_id,
        'activity_id': activity_id,
        'amount': 100.0
    },
    {
        'contributor_id': member_id,
        'activity_id': activity_id,
        'contribution_amount': 100.0
    },
    {
        'member_id': member_id,
        'activity_id': activity_id,
        'amount': 100.0
    }
]

for i, data in enumerate(test_data):
    print(f"\n=== Test {i+1} ===")
    print(f"Testing with: {list(data.keys())}")

    url = f"{SUPABASE_URL}/rest/v1/financial_contributions"
    response = requests.post(url, headers=headers, json=data)

    if response.status_code in [200, 201]:
        print("✓ SUCCESS! Correct columns:", list(data.keys()))
        print("Response:", response.json())
        break
    else:
        error = response.json()
        if 'message' in error:
            print(f"✗ Error: {error['message']}")
        else:
            print(f"✗ Error: {error}")