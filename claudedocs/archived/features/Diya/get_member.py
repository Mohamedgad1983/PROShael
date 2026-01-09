#!/usr/bin/env python3

import requests

SUPABASE_URL = "https://oneiggrfzagqjbkdinin.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uZWlnZ3JmemFncWpia2RpbmluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDczNzkwMywiZXhwIjoyMDcwMzEzOTAzfQ.rBZIRsifsQiR3j5OgViWLjaBi_W8Jp0gD7HPf9fS5vI"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

# Get first member to use as organizer
url = f"{SUPABASE_URL}/rest/v1/members?select=*&limit=1"
response = requests.get(url, headers=headers)

print("=== First Member ===")
if response.status_code == 200:
    members = response.json()
    if members:
        member = members[0]
        print(f"ID: {member['id']}")
        print(f"Name: {member.get('full_name', 'N/A')}")
        print(f"Membership Number: {member.get('membership_number', 'N/A')}")
        print(f"\nUse this ID as organizer: {member['id']}")
    else:
        print("No members found")
else:
    print(f"Error: {response.status_code} - {response.text}")

# Also check temp_members table
url = f"{SUPABASE_URL}/rest/v1/temp_members?select=*&limit=1"
response = requests.get(url, headers=headers)

print("\n=== Temp Members ===")
if response.status_code == 200:
    temp_members = response.json()
    if temp_members:
        member = temp_members[0]
        print(f"Found temp_members table")
        print(f"First temp_member ID: {member['id']}")
        print(f"Name: {member.get('full_name', 'N/A')}")