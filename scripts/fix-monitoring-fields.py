#!/usr/bin/env python3
"""
Fix member field names in monitoring-standalone/index.html
to match the actual API response from /api/members
"""

import sys
import os

# File to fix
FILE_PATH = os.path.join(os.path.dirname(__file__), '..', 'alshuail-admin-arabic', 'public', 'monitoring-standalone', 'index.html')

# Old code to replace
OLD_CODE = """        function createMemberRow(member) {
            const row = document.createElement('tr');

            // Map member data
            const memberId = member.member_number || member.id || 'N/A';
            const name = member.full_name_arabic || member.name || 'غير محدد';
            const phone = member.phone_number || member.phone || 'غير محدد';
            const branch = member.branch_arabic || member.branch || 'غير محدد';
            const membershipStatus = member.membership_status || 'unknown';
            const financialStatus = member.financial_status || 'unknown';
            const balance = member.current_balance || 0;
            const due = member.amount_due || 0;"""

# New correct code
NEW_CODE = """        function createMemberRow(member) {
            const row = document.createElement('tr');

            // Map member data - using correct API field names from members table
            const memberId = member.membership_number || member.id || 'N/A';
            const name = member.full_name || 'غير محدد';
            const phone = member.phone || 'غير محدد';
            const branch = member.tribal_section || 'غير محدد';
            const membershipStatus = member.membership_status || 'active';
            const financialStatus = member.financial_status || 'paid';
            // Fix: Use explicit undefined check to preserve 0 values (same fix as statement search)
            const balance = member.current_balance !== undefined ? member.current_balance : 0;
            // Required amount: 3000 SAR for each member until 2025
            const requiredAmount = 3000;
            const due = Math.max(0, requiredAmount - balance);"""

def main():
    # Read file
    print(f"📖 Reading: {FILE_PATH}")
    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if old code exists
    if OLD_CODE not in content:
        print("❌ Old code not found! File may have already been fixed or modified.")
        print("\n🔍 Searching for createMemberRow function...")
        if "function createMemberRow(member)" in content:
            print("✅ Function exists but code structure is different")
            print("⚠️  Manual review needed")
        else:
            print("❌ Function not found at all!")
        return 1

    # Replace old code with new code
    print("🔄 Applying fix...")
    new_content = content.replace(OLD_CODE, NEW_CODE)

    # Verify replacement worked
    if OLD_CODE in new_content:
        print("❌ Replacement failed!")
        return 1

    if NEW_CODE not in new_content:
        print("❌ New code not in result!")
        return 1

    # Write back
    print(f"💾 Writing fixed file...")
    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print("✅ Fix applied successfully!")
    print("\n📋 Changes made:")
    print("  • member.member_number → member.membership_number")
    print("  • member.full_name_arabic → member.full_name")
    print("  • member.phone_number → member.phone")
    print("  • member.branch_arabic → member.tribal_section")
    print("  • member.current_balance || 0 → explicit undefined check")
    print("  • member.amount_due → calculated: Math.max(0, 3000 - balance)")
    print("\n🚀 Next: Deploy to Cloudflare Pages")
    return 0

if __name__ == '__main__':
    sys.exit(main())
