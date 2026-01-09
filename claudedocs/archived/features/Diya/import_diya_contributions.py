#!/usr/bin/env python3
"""
AL-SHUAIL DIYA CONTRIBUTIONS IMPORT
Import diya (blood money) contributions from Excel to database

This script:
1. Reads diya columns from Excel
2. Matches to existing members
3. Creates financial_contribution records
4. Links to activities for each diya case
"""

import pandas as pd
import requests
import sys
from datetime import datetime

# ============================================================================
# CONFIGURATION
# ============================================================================

SUPABASE_URL = "https://oneiggrfzagqjbkdinin.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uZWlnZ3JmemFncWpia2RpbmluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDczNzkwMywiZXhwIjoyMDcwMzEzOTAzfQ.rBZIRsifsQiR3j5OgViWLjaBi_W8Jp0gD7HPf9fS5vI"  # Service key configured

EXCEL_FILE = r"D:\PROShael\importdata\نسخة رئيس الصندوق 15.xlsx"

# ============================================================================
# COLORS FOR OUTPUT
# ============================================================================

class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.END}\n")

def print_success(text):
    print(f"{Colors.GREEN}✓ {text}{Colors.END}")

def print_warning(text):
    print(f"{Colors.YELLOW}⚠ {text}{Colors.END}")

def print_error(text):
    print(f"{Colors.RED}✗ {text}{Colors.END}")

def print_info(text):
    print(f"{Colors.BLUE}ℹ {text}{Colors.END}")

# ============================================================================
# SUPABASE FUNCTIONS
# ============================================================================

def supabase_request(endpoint, method='GET', data=None):
    """Make request to Supabase API"""
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
    
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    
    try:
        if method == 'GET':
            response = requests.get(url, headers=headers)
        elif method == 'POST':
            response = requests.post(url, headers=headers, json=data)
        
        if response.status_code in [200, 201]:
            return True, response.json()
        else:
            return False, f"Error {response.status_code}: {response.text}"
    except Exception as e:
        return False, str(e)

def test_connection():
    """Test Supabase connection"""
    print_header("TESTING CONNECTION")
    
    if SUPABASE_KEY == "YOUR_SERVICE_ROLE_KEY_HERE":
        print_error("Please set your SUPABASE_KEY in the script!")
        return False
    
    success, result = supabase_request("members?select=count")
    
    if success:
        print_success("Connection successful!")
        return True
    else:
        print_error(f"Connection failed: {result}")
        return False

# ============================================================================
# DATA LOADING
# ============================================================================

def load_excel_data():
    """Load Excel file with diya contributions"""
    print_header("LOADING EXCEL DATA")
    
    try:
        df = pd.read_excel(EXCEL_FILE, sheet_name='ورقة1')
        print_success(f"Loaded {len(df)} rows from Excel")
        
        # Clean dataframe
        df = df.dropna(how='all')
        df = df.loc[:, ~df.columns.str.contains('Unnamed')]
        
        # Convert diya columns to numeric
        diya_cols = ['دية نادر', 'دية شرهان1', 'دية شرهان2']
        for col in diya_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # Remove rows with no member name
        df = df[df['الاسم'].notna()].copy()
        
        print_success(f"Cleaned data: {len(df)} valid rows")
        
        # Show summary
        for col in diya_cols:
            count = df[col].notna().sum()
            total = df[col].sum(skipna=True)
            print_info(f"{col}: {count} contributions = {total:,.0f} SAR")
        
        return df
    
    except FileNotFoundError:
        print_error(f"Excel file not found: {EXCEL_FILE}")
        return None
    except Exception as e:
        print_error(f"Error loading Excel: {str(e)}")
        return None

def get_existing_members():
    """Get all existing members from database"""
    print_header("FETCHING EXISTING MEMBERS")
    
    success, result = supabase_request("members?select=id,full_name,membership_number")
    
    if not success:
        print_error(f"Failed to fetch members: {result}")
        return None
    
    members = result
    print_success(f"Found {len(members)} members in database")
    
    # Create lookup by membership number
    member_map = {}
    for member in members:
        # Membership numbers are 10001-10344
        num = member.get('membership_number', '')
        if num:
            member_map[num] = member['id']
    
    return member_map

# ============================================================================
# ACTIVITY CREATION
# ============================================================================

def create_diya_activities():
    """Create activity records for each diya case"""
    print_header("CREATING DIYA ACTIVITIES")
    
    diya_activities = {
        'دية نادر': {
            'title_ar': 'دية نادر',
            'title_en': 'Nader Diya Case',
            'description_ar': 'دية للمساهمة في قضية نادر',
            'description_en': 'Blood money contribution for Nader case'
        },
        'دية شرهان1': {
            'title_ar': 'دية شرهان 1',
            'title_en': 'Sharhan Diya Case 1',
            'description_ar': 'دية للمساهمة في قضية شرهان - المرحلة الأولى',
            'description_en': 'Blood money contribution for Sharhan case - Phase 1'
        },
        'دية شرهان2': {
            'title_ar': 'دية شرهان 2',
            'title_en': 'Sharhan Diya Case 2',
            'description_ar': 'دية للمساهمة في قضية شرهان - المرحلة الثانية',
            'description_en': 'Blood money contribution for Sharhan case - Phase 2'
        }
    }
    
    activity_map = {}
    
    for ar_name, details in diya_activities.items():
        # Check if activity exists
        success, result = supabase_request(f"activities?title_ar=eq.{details['title_ar']}")
        
        if success and len(result) > 0:
            activity_id = result[0]['id']
            activity_map[ar_name] = activity_id
            print_info(f"Activity '{ar_name}' already exists (ID: {activity_id})")
        else:
            # Create new activity
            # First get or create main category for diya
            cat_success, cat_result = supabase_request(f"main_categories?name_ar=eq.الديات")
            if cat_success and len(cat_result) > 0:
                main_category_id = cat_result[0]['id']
            else:
                # Create main category if it doesn't exist
                cat_data = {
                    'name_ar': 'الديات',
                    'name_en': 'Blood Money (Diya)',
                    'code': 'diya',
                    'icon': '💰',
                    'color': '#FFB800',
                    'description_ar': 'مساهمات الدية',
                    'description_en': 'Blood money contributions',
                    'requires_financial_tracking': True,
                    'supports_target_amount': True,
                    'is_active': True,
                    'sort_order': 3,
                    'status': 'active'
                }
                cat_success, cat_result = supabase_request("main_categories", method='POST', data=cat_data)
                if cat_success:
                    main_category_id = cat_result[0]['id']
                else:
                    print_error(f"Failed to create main category: {cat_result}")
                    # Use existing financial category as fallback
                    main_category_id = '7f08c100-2665-4bd2-b1ab-138a52d5aafc'

            activity_data = {
                'main_category_id': main_category_id,
                'organizer_id': '335a3270-31b7-4e99-b9ae-c3ab18a22899',  # Using temp_member as organizer
                'title_ar': details['title_ar'],
                'title_en': details['title_en'],
                'description_ar': details['description_ar'],
                'description_en': details['description_en'],
                'status': 'completed',
                'collection_status': 'completed',
                'target_amount': 100000.00,  # Default target
                'current_amount': 0.00
            }
            
            success, result = supabase_request("activities", method='POST', data=activity_data)
            
            if success:
                activity_id = result[0]['id']
                activity_map[ar_name] = activity_id
                print_success(f"Created activity: {ar_name} (ID: {activity_id})")
            else:
                print_error(f"Failed to create activity {ar_name}: {result}")
    
    return activity_map

# ============================================================================
# IMPORT DIYA CONTRIBUTIONS
# ============================================================================

def import_diya_contributions(df, member_map, activity_map):
    """Import diya contributions"""
    print_header("IMPORTING DIYA CONTRIBUTIONS")
    
    diya_columns = {
        'دية نادر': 'دية نادر',
        'دية شرهان1': 'دية شرهان1',
        'دية شرهان2': 'دية شرهان2'
    }
    
    # Define reasonable maximum amounts to filter out total rows
    max_amounts = {
        'دية نادر': 500,      # Individual contributions should be ≤ 500
        'دية شرهان1': 500,    # Individual contributions should be ≤ 500
        'دية شرهان2': 1000    # Individual contributions should be ≤ 1000
    }
    
    total_imported = 0
    total_skipped = 0
    total_filtered = 0
    
    for excel_col, activity_name in diya_columns.items():
        print_info(f"\nProcessing {activity_name}...")
        
        if activity_name not in activity_map:
            print_warning(f"No activity found for {activity_name}, skipping")
            continue
        
        activity_id = activity_map[activity_name]
        imported = 0
        skipped = 0
        filtered = 0
        
        for idx, row in df.iterrows():
            amount = row[excel_col]
            
            # Skip if no contribution
            if pd.isna(amount) or amount <= 0:
                continue
            
            # IMPORTANT: Skip total/summary rows (amounts > reasonable max)
            if amount > max_amounts[excel_col]:
                filtered += 1
                print_warning(f"Skipping total row: {amount:,.0f} SAR (row {idx})")
                continue
            
            # Calculate membership number from index
            # Member numbers are 10001-10344, Excel rows are 0-343
            membership_num = f"{10001 + idx}"
            
            if membership_num not in member_map:
                print_warning(f"Member {membership_num} not found in database")
                skipped += 1
                continue
            
            member_id = member_map[membership_num]
            
            # Create contribution record
            contribution_data = {
                'contributor_id': member_id,
                'activity_id': activity_id,
                'contribution_amount': float(amount),
                'contribution_date': '2024-12-31',
                'payment_method': 'cash',
                'payment_status': 'approved',
                'notes': f'Contribution for {activity_name}'
            }
            
            success, result = supabase_request(
                "financial_contributions", 
                method='POST', 
                data=contribution_data
            )
            
            if success:
                imported += 1
            else:
                skipped += 1
                if imported % 50 == 0:  # Only show some errors
                    print_warning(f"Failed to import contribution: {result}")
        
        print_success(f"{activity_name}: {imported} contributions imported")
        if filtered > 0:
            print_warning(f"{activity_name}: {filtered} total rows filtered out")
        if skipped > 0:
            print_warning(f"{activity_name}: {skipped} skipped (member not found)")
        
        total_imported += imported
        total_skipped += skipped
        total_filtered += filtered
    
    print_header("IMPORT SUMMARY")
    print_success(f"Total imported: {total_imported} contributions")
    if total_filtered > 0:
        print_info(f"Total rows filtered (summary/totals): {total_filtered}")
    if total_skipped > 0:
        print_warning(f"Total skipped (no member): {total_skipped}")
    
    return total_imported

# ============================================================================
# VERIFICATION
# ============================================================================

def verify_import():
    """Verify contributions were imported"""
    print_header("VERIFYING IMPORT")
    
    # Count contributions by activity
    success, result = supabase_request(
        "financial_contributions?select=activity_id,contribution_amount"
    )

    if not success:
        print_error("Failed to verify import")
        return

    contributions = result
    total_amount = sum(c['contribution_amount'] for c in contributions)
    
    print_success(f"Total contributions in database: {len(contributions)}")
    print_success(f"Total amount: {total_amount:,.0f} SAR")
    
    # Group by activity
    from collections import defaultdict
    by_activity = defaultdict(lambda: {'count': 0, 'amount': 0})
    
    for contrib in contributions:
        activity_id = contrib['activity_id']
        by_activity[activity_id]['count'] += 1
        by_activity[activity_id]['amount'] += contrib['contribution_amount']
    
    print_info(f"\nBreakdown by activity:")
    for activity_id, stats in by_activity.items():
        print_info(f"  Activity {activity_id}: {stats['count']} contributions = {stats['amount']:,.0f} SAR")

# ============================================================================
# MAIN
# ============================================================================

def main():
    """Main execution"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}")
    print("=" * 70)
    print("    AL-SHUAIL DIYA CONTRIBUTIONS IMPORT")
    print("=" * 70)
    print(f"{Colors.END}\n")
    
    print_info(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Test connection
    if not test_connection():
        sys.exit(1)
    
    # Load Excel data
    df = load_excel_data()
    if df is None:
        sys.exit(1)
    
    # Get existing members
    member_map = get_existing_members()
    if member_map is None:
        sys.exit(1)
    
    # Create activities
    activity_map = create_diya_activities()
    if not activity_map:
        print_error("Failed to create activities")
        sys.exit(1)
    
    # Import contributions
    total = import_diya_contributions(df, member_map, activity_map)
    
    # Verify
    verify_import()
    
    print_header("IMPORT COMPLETE!")
    print_success(f"Successfully imported {total} diya contributions")
    print_info(f"Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print_info("Check your admin panel: https://alshuail-admin.pages.dev")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print_error("\n\nImport cancelled by user")
        sys.exit(1)
    except Exception as e:
        print_error(f"\n\nUnexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
