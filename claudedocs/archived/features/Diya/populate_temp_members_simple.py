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
url = f"{SUPABASE_URL}/rest/v1/members?select=id,full_name,phone,tribal_section&limit=10"
response = requests.get(url, headers=headers)

if response.status_code == 200:
    members = response.json()
    print(f"Found {len(members)} members to copy to temp_members")

    # Copy each member to temp_members with minimal fields
    for i, member in enumerate(members):
        temp_member_data = {
            'id': member['id'],  # Use same ID
            'full_name': member['full_name'],
            'phone': member.get('phone', ''),
            'tribal_section': member.get('tribal_section', ''),
            'status': 'active'
        }

        url = f"{SUPABASE_URL}/rest/v1/temp_members"
        response = requests.post(url, headers=headers, json=temp_member_data)

        if response.status_code in [200, 201]:
            print(f"Created temp_member: {member['full_name']}")
        else:
            print(f"Error: {response.text[:200]}")

    # Check result
    url = f"{SUPABASE_URL}/rest/v1/temp_members?select=*"
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        temp_members = response.json()
        print(f"\nTotal temp_members: {len(temp_members)}")
        if temp_members:
            print(f"First temp_member ID: {temp_members[0]['id']}")
else:
    print(f"Failed to get members: {response.text}")