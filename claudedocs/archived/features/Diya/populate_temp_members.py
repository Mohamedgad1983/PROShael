#!/usr/bin/env python3

import requests

SUPABASE_URL = "https://oneiggrfzagqjbkdinin.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uZWlnZ3JmemFncWpia2RpbmluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDczNzkwMywiZXhwIjoyMDcwMzEzOTAzfQ.rBZIRsifsQiR3j5OgViWLjaBi_W8Jp0gD7HPf9fS5vI"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

# Get all members
url = f"{SUPABASE_URL}/rest/v1/members?select=*"
response = requests.get(url, headers=headers)

if response.status_code == 200:
    members = response.json()
    print(f"Found {len(members)} members to copy to temp_members")

    # Copy each member to temp_members
    for i, member in enumerate(members):
        temp_member_data = {
            'id': member['id'],  # Use same ID
            'member_id': member['id'],
            'full_name': member['full_name'],
            'phone': member.get('phone', ''),
            'tribal_section': member.get('tribal_section', ''),
            'status': 'active'
        }

        url = f"{SUPABASE_URL}/rest/v1/temp_members"
        response = requests.post(url, headers=headers, json=temp_member_data)

        if response.status_code in [200, 201]:
            if i % 50 == 0:
                print(f"Created {i+1}/{len(members)} temp_members...")
        else:
            print(f"Error creating temp_member for {member['full_name']}: {response.text}")
            if i == 0:
                # Stop on first error to debug
                break

    print(f"Completed! Created temp_members from members table")

    # Get first temp_member ID to use
    url = f"{SUPABASE_URL}/rest/v1/temp_members?select=*&limit=1"
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        temp_members = response.json()
        if temp_members:
            print(f"\nFirst temp_member ID: {temp_members[0]['id']}")
else:
    print(f"Failed to get members: {response.text}")