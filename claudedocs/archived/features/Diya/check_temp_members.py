#!/usr/bin/env python3

import requests

SUPABASE_URL = "https://oneiggrfzagqjbkdinin.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uZWlnZ3JmemFncWpia2RpbmluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDczNzkwMywiZXhwIjoyMDcwMzEzOTAzfQ.rBZIRsifsQiR3j5OgViWLjaBi_W8Jp0gD7HPf9fS5vI"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

# Check if temp_members table exists and has data
url = f"{SUPABASE_URL}/rest/v1/temp_members?select=*&limit=5"
response = requests.get(url, headers=headers)

print("=== Checking temp_members table ===")
if response.status_code == 200:
    temp_members = response.json()
    print(f"Found {len(temp_members)} temp_members:")
    for tm in temp_members:
        print(f"  - ID: {tm['id']}")
        print(f"    Name: {tm.get('full_name', 'N/A')}")
        print(f"    Member ID: {tm.get('member_id', 'N/A')}")

    if temp_members:
        print(f"\nFirst temp_member ID to use: {temp_members[0]['id']}")
else:
    print(f"Error or table doesn't exist: {response.status_code}")
    print("Creating temp_members from members...")

    # Get first member
    url = f"{SUPABASE_URL}/rest/v1/members?select=*&limit=1"
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        members = response.json()
        if members:
            member = members[0]
            # Create temp_member
            temp_member_data = {
                'member_id': member['id'],
                'full_name': member['full_name'],
                'phone': member.get('phone', ''),
                'tribal_section': member.get('tribal_section', ''),
                'status': 'active'
            }

            url = f"{SUPABASE_URL}/rest/v1/temp_members"
            response = requests.post(url, headers=headers, json=temp_member_data)

            if response.status_code in [200, 201]:
                result = response.json()
                print(f"Created temp_member: {result[0]['id']}")
                print(f"Use this ID: {result[0]['id']}")
            else:
                print(f"Failed to create temp_member: {response.text}")