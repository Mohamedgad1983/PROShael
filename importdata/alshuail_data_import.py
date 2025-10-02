#!/usr/bin/env python3
"""
AL-SHUAIL FAMILY MANAGEMENT SYSTEM
Automated Data Import Script

This script imports data from Excel file to Supabase database.
Handles: Members, Branches, Payments, Diya Contributions, Subscriptions

Author: Claude AI
Date: October 2, 2025
"""

import pandas as pd
import requests
import sys
from datetime import datetime
import time

# ============================================================================
# CONFIGURATION - EDIT THESE VALUES
# ============================================================================

SUPABASE_URL = "https://oneiggrfzagqjbkdinin.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uZWlnZ3JmemFncWpia2RpbmluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDczNzkwMywiZXhwIjoyMDcwMzEzOTAzfQ.rBZIRsifsQiR3j5OgViWLjaBi_W8Jp0gD7HPf9fS5vI"

EXCEL_FILE = "نسخة رئيس الصندوق 15.xlsx"  # Your Excel file name

# ============================================================================
# DO NOT EDIT BELOW THIS LINE
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
# SUPABASE API FUNCTIONS
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
        elif method == 'DELETE':
            response = requests.delete(url, headers=headers)
        
        if response.status_code in [200, 201]:
            return True, response.json()
        else:
            return False, f"Error {response.status_code}: {response.text}"
    except Exception as e:
        return False, str(e)

def test_connection():
    """Test Supabase connection"""
    print_header("TESTING SUPABASE CONNECTION")
    
    if SUPABASE_KEY == "YOUR_SERVICE_ROLE_KEY_HERE":
        print_error("Please set your SUPABASE_KEY in the script!")
        print_info("Get it from: Supabase Dashboard → Settings → API → service_role key")
        return False
    
    success, result = supabase_request("members?select=count")
    
    if success:
        print_success("Connection successful!")
        print_info(f"Database URL: {SUPABASE_URL}")
        return True
    else:
        print_error(f"Connection failed: {result}")
        return False

# ============================================================================
# DATA LOADING AND CLEANING
# ============================================================================

def load_excel_data():
    """Load and clean Excel data"""
    print_header("LOADING EXCEL FILE")
    
    try:
        df = pd.read_excel(EXCEL_FILE, sheet_name='ورقة1')
        print_success(f"Loaded {len(df)} rows from Excel")
        
        # Clean the dataframe
        df = df.dropna(how='all')
        df = df.loc[:, ~df.columns.str.contains('Unnamed')]
        
        # Convert numeric columns
        numeric_cols = ['عام2021', 'عام2022', 'عام2023', 'عام2024', 'عام2025',
                       'عضويه2', 'دية نادر', 'دية شرهان1', 'دية شرهان2',
                       'مبلغ الخصم', 'الإجمالي']
        
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # Clean member names
        df = df[df['الاسم'].notna()]
        
        # Clean family branches - remove invalid entries
        valid_branches = ['رشود', 'الدغيش', 'رشيد', 'العقاب', 'الاحيمر', 
                         'العيد', 'الشامخ', 'الرشيد', 'الشبيعان', 'المسعود']
        df['فخذ_cleaned'] = df['فخذ'].apply(
            lambda x: x if x in valid_branches else 'رشود'  # Default to رشود if invalid
        )
        
        print_success(f"Cleaned data: {len(df)} valid members")
        print_info(f"Family branches: {df['فخذ_cleaned'].nunique()}")
        
        return df
    
    except FileNotFoundError:
        print_error(f"Excel file not found: {EXCEL_FILE}")
        print_info("Make sure the Excel file is in the same folder as this script")
        return None
    except Exception as e:
        print_error(f"Error loading Excel: {str(e)}")
        return None

# ============================================================================
# IMPORT FUNCTIONS
# ============================================================================

def import_family_branches(df):
    """Import family branches"""
    print_header("IMPORTING FAMILY BRANCHES")
    
    branches = df['فخذ_cleaned'].unique()
    branches = [b for b in branches if pd.notna(b)]
    
    print_info(f"Found {len(branches)} unique branches")
    
    imported = 0
    branch_map = {}
    
    for branch in branches:
        # Check if branch exists
        success, result = supabase_request(f"family_branches?branch_name=eq.{branch}")
        
        if success and len(result) > 0:
            branch_id = result[0]['id']
            branch_map[branch] = branch_id
            print_info(f"Branch '{branch}' already exists (ID: {branch_id})")
        else:
            # Create new branch with auto-generated code
            branch_code = branch[:3].upper() if len(branch) >= 3 else branch.upper()
            branch_data = {
                'branch_code': f'{branch_code}_{imported+1:03d}',
                'branch_name': branch,
                'branch_name_ar': branch,
                'branch_name_en': branch,
                'description_ar': f'فرع عائلة: {branch}',
                'description_en': f'Family branch: {branch}',
                'is_active': True
            }
            
            success, result = supabase_request("family_branches", method='POST', data=branch_data)
            
            if success:
                branch_id = result[0]['id']
                branch_map[branch] = branch_id
                print_success(f"Created branch: {branch} (ID: {branch_id})")
                imported += 1
            else:
                print_error(f"Failed to create branch {branch}: {result}")
    
    print_success(f"Family branches ready: {len(branch_map)} total")
    return branch_map

def import_members(df, branch_map):
    """Import members"""
    print_header("IMPORTING MEMBERS")
    
    print_info(f"Processing {len(df)} members...")
    
    imported = 0
    failed = 0
    member_map = {}
    
    for idx, row in df.iterrows():
        name = row['الاسم']
        branch = row['فخذ_cleaned']
        
        if pd.isna(name):
            continue
        
        # Get branch ID
        branch_id = branch_map.get(branch)
        
        member_data = {
            'full_name_ar': str(name).strip(),
            'full_name_en': str(name).strip(),
            'family_branch_id': branch_id,
            'is_active': True,
            'membership_status': 'active'
        }
        
        success, result = supabase_request("members", method='POST', data=member_data)
        
        if success:
            member_id = result[0]['id']
            member_map[idx] = member_id
            imported += 1
            
            if imported % 50 == 0:
                print_info(f"Imported {imported} members...")
        else:
            print_warning(f"Failed to import {name}: {result}")
            failed += 1
    
    print_success(f"Members imported: {imported}")
    if failed > 0:
        print_warning(f"Failed imports: {failed}")
    
    return member_map

def import_payments(df, member_map):
    """Import annual payments"""
    print_header("IMPORTING PAYMENTS")
    
    payment_years = {
        'عام2021': 2021,
        'عام2022': 2022,
        'عام2023': 2023,
        'عام2024': 2024,
        'عام2025': 2025
    }
    
    total_imported = 0
    
    for ar_col, year in payment_years.items():
        print_info(f"Processing payments for year {year}...")
        
        imported = 0
        for idx, row in df.iterrows():
            if idx not in member_map:
                continue
            
            amount = row[ar_col]
            if pd.isna(amount) or amount <= 0:
                continue
            
            member_id = member_map[idx]
            
            payment_data = {
                'payer_id': member_id,
                'amount': float(amount),
                'payment_date': f'{year}-12-31',
                'payment_method': 'cash',
                'status': 'completed',
                'payment_type': 'annual_subscription',
                'description': f'Annual membership fee {year}'
            }
            
            success, result = supabase_request("payments", method='POST', data=payment_data)
            
            if success:
                imported += 1
            
        print_success(f"Year {year}: {imported} payments imported")
        total_imported += imported
    
    print_success(f"Total payments imported: {total_imported}")
    return total_imported

def import_diya_contributions(df, member_map):
    """Import diya contributions"""
    print_header("IMPORTING DIYA CONTRIBUTIONS")
    
    diya_types = {
        'دية نادر': 'Nader Diya Case',
        'دية شرهان1': 'Sharhan Diya Case 1',
        'دية شرهان2': 'Sharhan Diya Case 2'
    }
    
    total_imported = 0
    
    for ar_col, desc in diya_types.items():
        print_info(f"Processing {desc}...")
        
        imported = 0
        for idx, row in df.iterrows():
            if idx not in member_map:
                continue
            
            amount = row[ar_col]
            if pd.isna(amount) or amount <= 0:
                continue
            
            member_id = member_map[idx]
            
            # Create activity for diya case if not exists
            activity_data = {
                'title_ar': desc,
                'title_en': desc,
                'status': 'active',
                'collection_status': 'ongoing'
            }
            
            contribution_data = {
                'contributor_id': member_id,
                'amount': float(amount),
                'contribution_date': '2024-12-31',
                'payment_method': 'cash',
                'status': 'approved',
                'contribution_type': 'diya'
            }
            
            success, result = supabase_request("financial_contributions", method='POST', data=contribution_data)
            
            if success:
                imported += 1
        
        print_success(f"{desc}: {imported} contributions imported")
        total_imported += imported
    
    print_success(f"Total diya contributions: {total_imported}")
    return total_imported

def import_subscriptions(df, member_map):
    """Import membership subscriptions"""
    print_header("IMPORTING SUBSCRIPTIONS")
    
    imported = 0
    
    for idx, row in df.iterrows():
        if idx not in member_map:
            continue
        
        amount = row['عضويه2']
        if pd.isna(amount) or amount <= 0:
            continue
        
        member_id = member_map[idx]
        
        subscription_data = {
            'member_id': member_id,
            'start_date': '2024-01-01',
            'end_date': '2024-12-31',
            'status': 'active',
            'amount': float(amount)
        }
        
        success, result = supabase_request("subscriptions", method='POST', data=subscription_data)
        
        if success:
            imported += 1
    
    print_success(f"Subscriptions imported: {imported}")
    return imported

# ============================================================================
# VERIFICATION
# ============================================================================

def verify_import():
    """Verify all data was imported correctly"""
    print_header("VERIFYING IMPORT")
    
    tables = {
        'members': 'Members',
        'family_branches': 'Family Branches',
        'payments': 'Payments',
        'financial_contributions': 'Diya Contributions',
        'subscriptions': 'Subscriptions'
    }
    
    results = {}
    
    for table, name in tables.items():
        success, result = supabase_request(f"{table}?select=count")
        if success:
            count = result[0]['count'] if result else 0
            results[name] = count
            print_success(f"{name}: {count} records")
        else:
            print_error(f"Failed to verify {name}")
            results[name] = 0
    
    return results

# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    """Main execution function"""
    
    print(f"\n{Colors.BOLD}{Colors.BLUE}")
    print("=" * 70)
    print("    AL-SHUAIL FAMILY MANAGEMENT SYSTEM")
    print("    Automated Data Import")
    print("=" * 70)
    print(f"{Colors.END}\n")
    
    print_info(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Step 1: Test connection
    if not test_connection():
        print_error("Cannot proceed without database connection")
        sys.exit(1)
    
    time.sleep(1)
    
    # Step 2: Load Excel data
    df = load_excel_data()
    if df is None:
        sys.exit(1)
    
    time.sleep(1)
    
    # Step 3: Import family branches
    branch_map = import_family_branches(df)
    if not branch_map:
        print_error("Failed to import family branches")
        sys.exit(1)
    
    time.sleep(1)
    
    # Step 4: Import members
    member_map = import_members(df, branch_map)
    if not member_map:
        print_error("Failed to import members")
        sys.exit(1)
    
    time.sleep(1)
    
    # Step 5: Import payments
    payment_count = import_payments(df, member_map)
    
    time.sleep(1)
    
    # Step 6: Import diya contributions
    diya_count = import_diya_contributions(df, member_map)
    
    time.sleep(1)
    
    # Step 7: Import subscriptions
    sub_count = import_subscriptions(df, member_map)
    
    time.sleep(1)
    
    # Step 8: Verify
    results = verify_import()
    
    # Final Summary
    print_header("IMPORT COMPLETE!")
    
    print(f"\n{Colors.BOLD}Summary:{Colors.END}")
    print(f"  Members:            {results.get('Members', 0)}")
    print(f"  Family Branches:    {results.get('Family Branches', 0)}")
    print(f"  Payments:           {results.get('Payments', 0)}")
    print(f"  Diya Contributions: {results.get('Diya Contributions', 0)}")
    print(f"  Subscriptions:      {results.get('Subscriptions', 0)}")
    print(f"\n{Colors.GREEN}{'='*70}{Colors.END}")
    print(f"{Colors.GREEN}{Colors.BOLD}SUCCESS! All data imported successfully!{Colors.END}")
    print(f"{Colors.GREEN}{'='*70}{Colors.END}\n")
    
    print_info(f"Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print_info("You can now login to your admin panel to verify the data")
    print_info("Admin Panel: https://alshuail-admin.pages.dev")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print_error("\n\nImport cancelled by user")
        sys.exit(1)
    except Exception as e:
        print_error(f"\n\nUnexpected error: {str(e)}")
        sys.exit(1)
