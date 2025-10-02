#!/usr/bin/env python3

import requests

SUPABASE_URL = "https://oneiggrfzagqjbkdinin.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uZWlnZ3JmemFncWpia2RpbmluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDczNzkwMywiZXhwIjoyMDcwMzEzOTAzfQ.rBZIRsifsQiR3j5OgViWLjaBi_W8Jp0gD7HPf9fS5vI"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

# Get users to find an admin or suitable organizer
url = f"{SUPABASE_URL}/rest/v1/users?select=*&limit=5"
response = requests.get(url, headers=headers)

print("=== Users ===")
if response.status_code == 200:
    users = response.json()
    print(f"Found {len(users)} users:")
    for user in users:
        print(f"  - ID: {user['id']}")
        print(f"    Name: {user.get('full_name', 'N/A')}")
        print(f"    Role: {user.get('role', 'N/A')}")
        print(f"    Phone: {user.get('phone', 'N/A')}")
        print()

    if users:
        print(f"First user ID to use as organizer: {users[0]['id']}")
else:
    print(f"Error: {response.status_code} - {response.text}")