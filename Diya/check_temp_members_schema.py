#!/usr/bin/env python3

import requests

SUPABASE_URL = "https://oneiggrfzagqjbkdinin.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uZWlnZ3JmemFncWpia2RpbmluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDczNzkwMywiZXhwIjoyMDcwMzEzOTAzfQ.rBZIRsifsQiR3j5OgViWLjaBi_W8Jp0gD7HPf9fS5vI"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

# Get temp_members schema
url = f"{SUPABASE_URL}/rest/v1/temp_members?select=*&limit=1"
response = requests.head(url, headers=headers)

print("=== temp_members Table Schema Check ===")
print(f"Response status: {response.status_code}")
print(f"Headers: {response.headers}")

# Try a different approach - insert an empty record
url = f"{SUPABASE_URL}/rest/v1/temp_members"
test_data = {
    'full_name': 'Test Member'
}

response = requests.post(url, headers=headers, json=test_data)
print(f"\nInsert test response: {response.status_code}")
print(f"Response: {response.text}")

# Check if we can just copy member data directly
print("\n=== Trying to insert member data as temp_member ===")
# Get a member
url = f"{SUPABASE_URL}/rest/v1/members?select=*&limit=1"
response = requests.get(url, headers=headers)
if response.status_code == 200:
    members = response.json()
    if members:
        member = members[0]
        # Try to insert as temp_member
        url = f"{SUPABASE_URL}/rest/v1/temp_members"
        response = requests.post(url, headers=headers, json=member)
        print(f"Insert response: {response.status_code}")
        print(f"Response: {response.text[:500] if response.text else 'No response'}")