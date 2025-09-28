"""
Supabase Data Verification Script
==================================
This script connects to Supabase and verifies member data against expected values from Excel.
It provides detailed analysis and can optionally correct the data.

Requirements:
    pip install supabase python-dotenv pandas colorama tabulate
"""

import os
import sys
from datetime import datetime
from typing import Dict, List, Tuple, Optional
import json
from supabase import create_client, Client
from dotenv import load_dotenv
import pandas as pd
from colorama import init, Fore, Style
from tabulate import tabulate

# Initialize colorama for colored output
init(autoreset=True)

class SupabaseDataVerifier:
    """Verifies and optionally corrects member data in Supabase"""

    # Expected tribal distribution from Excel
    EXPECTED_DISTRIBUTION = {
        'رشود': 172,
        'الدغيش': 45,
        'رشيد': 36,
        'العيد': 14,
        'الرشيد': 12,
        'الشبيعان': 5,
        'المسعود': 4,
        'عقاب': 1
    }

    EXPECTED_TOTAL_MEMBERS = 289
    EXPECTED_TOTAL_BALANCE = 397040

    def __init__(self, supabase_url: str, supabase_key: str):
        """Initialize Supabase client"""
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.members_data = None
        self.verification_results = {}

    def fetch_members(self) -> List[Dict]:
        """Fetch all members from Supabase"""
        print(f"{Fore.CYAN}Fetching members from Supabase...{Style.RESET_ALL}")

        try:
            # Fetch all members excluding test accounts
            response = self.supabase.table('members').select("*").execute()

            # Filter out test and admin accounts
            self.members_data = [
                member for member in response.data
                if not any([
                    'test' in (member.get('email', '') or '').lower(),
                    'admin' in (member.get('email', '') or '').lower(),
                    'Test' in (member.get('name', '') or '')
                ])
            ]

            print(f"{Fore.GREEN}✓ Fetched {len(self.members_data)} members{Style.RESET_ALL}")
            return self.members_data

        except Exception as e:
            print(f"{Fore.RED}✗ Error fetching members: {e}{Style.RESET_ALL}")
            sys.exit(1)

    def verify_total_count(self) -> Tuple[bool, Dict]:
        """Verify total member count"""
        actual_count = len(self.members_data)
        expected_count = self.EXPECTED_TOTAL_MEMBERS

        status = actual_count == expected_count

        result = {
            'check': 'Total Members',
            'expected': expected_count,
            'actual': actual_count,
            'difference': actual_count - expected_count,
            'status': '✓ PASS' if status else '✗ FAIL',
            'pass': status
        }

        self.verification_results['total_count'] = result
        return status, result

    def verify_tribal_distribution(self) -> Tuple[bool, Dict]:
        """Verify tribal distribution matches expected values"""
        # Count actual distribution
        actual_distribution = {}
        for member in self.members_data:
            tribal_section = member.get('tribal_section', 'Unknown')
            actual_distribution[tribal_section] = actual_distribution.get(tribal_section, 0) + 1

        # Compare with expected
        distribution_check = []
        all_match = True

        for tribe, expected_count in self.EXPECTED_DISTRIBUTION.items():
            actual_count = actual_distribution.get(tribe, 0)
            difference = actual_count - expected_count
            match = actual_count == expected_count

            if not match:
                all_match = False

            distribution_check.append({
                'tribe': tribe,
                'expected': expected_count,
                'actual': actual_count,
                'difference': difference,
                'percentage': f"{(actual_count/len(self.members_data)*100):.1f}%",
                'status': '✓' if match else '✗'
            })

        # Check for unexpected tribes
        for tribe, count in actual_distribution.items():
            if tribe not in self.EXPECTED_DISTRIBUTION:
                all_match = False
                distribution_check.append({
                    'tribe': tribe,
                    'expected': 0,
                    'actual': count,
                    'difference': count,
                    'percentage': f"{(count/len(self.members_data)*100):.1f}%",
                    'status': '✗ UNEXPECTED'
                })

        self.verification_results['tribal_distribution'] = {
            'details': distribution_check,
            'pass': all_match
        }

        return all_match, distribution_check

    def check_for_mock_data(self) -> Tuple[bool, List]:
        """Check for patterns indicating mock data (e.g., equal distribution)"""
        tribal_counts = {}
        for member in self.members_data:
            tribal_section = member.get('tribal_section', 'Unknown')
            tribal_counts[tribal_section] = tribal_counts.get(tribal_section, 0) + 1

        suspicious_patterns = []

        # Check if all tribes have exactly 36 members (mock data pattern)
        if all(count == 36 for count in tribal_counts.values()):
            suspicious_patterns.append({
                'pattern': 'All tribes have exactly 36 members',
                'severity': 'HIGH',
                'description': 'This is the exact pattern of mock data - needs immediate correction!'
            })

        # Check for other suspicious patterns
        unique_counts = set(tribal_counts.values())
        if len(unique_counts) == 1:
            suspicious_patterns.append({
                'pattern': f'All tribes have same count: {list(unique_counts)[0]}',
                'severity': 'HIGH',
                'description': 'Uniform distribution indicates mock data'
            })

        # Check for sequential member IDs with same data
        member_ids = sorted([m.get('member_id', '') for m in self.members_data if m.get('member_id')])
        if len(member_ids) == self.EXPECTED_TOTAL_MEMBERS:
            # Check if IDs are perfectly sequential
            expected_ids = [f"SH{i:04d}" for i in range(1, self.EXPECTED_TOTAL_MEMBERS + 1)]
            if member_ids == expected_ids:
                suspicious_patterns.append({
                    'pattern': 'Perfectly sequential member IDs',
                    'severity': 'MEDIUM',
                    'description': 'IDs are perfectly sequential - might indicate generated data'
                })

        self.verification_results['mock_data_check'] = {
            'suspicious_patterns': suspicious_patterns,
            'pass': len(suspicious_patterns) == 0
        }

        return len(suspicious_patterns) == 0, suspicious_patterns

    def verify_balance(self) -> Tuple[bool, Dict]:
        """Verify total balance matches expected value"""
        total_balance = sum(member.get('balance', 0) for member in self.members_data)
        expected_balance = self.EXPECTED_TOTAL_BALANCE
        difference = abs(total_balance - expected_balance)

        # Consider it passing if within 1% of expected
        tolerance = expected_balance * 0.01
        status = difference <= tolerance

        # Calculate balance distribution
        balance_dist = {
            'zero': sum(1 for m in self.members_data if m.get('balance', 0) == 0),
            'under_1k': sum(1 for m in self.members_data if 0 < m.get('balance', 0) < 1000),
            '1k_to_3k': sum(1 for m in self.members_data if 1000 <= m.get('balance', 0) < 3000),
            '3k_to_5k': sum(1 for m in self.members_data if 3000 <= m.get('balance', 0) < 5000),
            'over_5k': sum(1 for m in self.members_data if m.get('balance', 0) >= 5000),
        }

        compliant_count = sum(1 for m in self.members_data if m.get('balance', 0) >= 3000)
        compliance_rate = (compliant_count / len(self.members_data) * 100) if self.members_data else 0

        result = {
            'total_balance': total_balance,
            'expected_balance': expected_balance,
            'difference': difference,
            'status': '✓ PASS' if status else '✗ FAIL',
            'distribution': balance_dist,
            'compliant_members': compliant_count,
            'compliance_rate': f"{compliance_rate:.1f}%",
            'pass': status
        }

        self.verification_results['balance'] = result
        return status, result

    def check_data_integrity(self) -> Tuple[bool, Dict]:
        """Check for data integrity issues"""
        issues = {
            'null_member_ids': 0,
            'duplicate_member_ids': [],
            'null_names': 0,
            'null_tribal_sections': 0,
            'invalid_id_format': [],
            'negative_balances': 0,
            'unusually_high_balances': []
        }

        member_ids = {}

        for member in self.members_data:
            member_id = member.get('member_id')
            name = member.get('name')
            tribal_section = member.get('tribal_section')
            balance = member.get('balance', 0)

            # Check for nulls
            if not member_id:
                issues['null_member_ids'] += 1
            if not name:
                issues['null_names'] += 1
            if not tribal_section:
                issues['null_tribal_sections'] += 1

            # Check for duplicates
            if member_id:
                if member_id in member_ids:
                    issues['duplicate_member_ids'].append(member_id)
                member_ids[member_id] = member_ids.get(member_id, 0) + 1

            # Check ID format (should be SH0001 to SH0289)
            if member_id and not (member_id.startswith('SH') and len(member_id) == 6 and member_id[2:].isdigit()):
                issues['invalid_id_format'].append(member_id)

            # Check balances
            if balance < 0:
                issues['negative_balances'] += 1
            if balance > 50000:
                issues['unusually_high_balances'].append({
                    'member_id': member_id,
                    'name': name,
                    'balance': balance
                })

        has_issues = any([
            issues['null_member_ids'] > 0,
            len(issues['duplicate_member_ids']) > 0,
            issues['null_names'] > 0,
            issues['null_tribal_sections'] > 0,
            len(issues['invalid_id_format']) > 0,
            issues['negative_balances'] > 0
        ])

        self.verification_results['data_integrity'] = {
            'issues': issues,
            'pass': not has_issues
        }

        return not has_issues, issues

    def print_results(self):
        """Print verification results in a formatted manner"""
        print(f"\n{Fore.CYAN}{'='*80}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}SUPABASE DATA VERIFICATION REPORT{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{'='*80}{Style.RESET_ALL}")
        print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        # Overall status
        all_pass = all(r.get('pass', False) for r in self.verification_results.values())
        overall_status = f"{Fore.GREEN}✓ ALL CHECKS PASSED{Style.RESET_ALL}" if all_pass else f"{Fore.RED}✗ ISSUES DETECTED{Style.RESET_ALL}"
        print(f"\nOverall Status: {overall_status}")

        # 1. Total Count Check
        print(f"\n{Fore.YELLOW}1. TOTAL MEMBER COUNT{Style.RESET_ALL}")
        count_result = self.verification_results.get('total_count', {})
        count_color = Fore.GREEN if count_result.get('pass') else Fore.RED
        print(f"   Expected: {count_result.get('expected')}")
        print(f"   Actual: {count_result.get('actual')}")
        print(f"   Status: {count_color}{count_result.get('status')}{Style.RESET_ALL}")

        # 2. Tribal Distribution
        print(f"\n{Fore.YELLOW}2. TRIBAL DISTRIBUTION{Style.RESET_ALL}")
        tribal_result = self.verification_results.get('tribal_distribution', {})
        if tribal_result.get('details'):
            headers = ['Tribe', 'Expected', 'Actual', 'Diff', '%', 'Status']
            rows = []
            for tribe_data in tribal_result['details']:
                status_color = Fore.GREEN if tribe_data['status'] == '✓' else Fore.RED
                rows.append([
                    tribe_data['tribe'],
                    tribe_data['expected'],
                    tribe_data['actual'],
                    tribe_data['difference'],
                    tribe_data['percentage'],
                    f"{status_color}{tribe_data['status']}{Style.RESET_ALL}"
                ])
            print(tabulate(rows, headers=headers, tablefmt='grid'))

        # 3. Mock Data Check
        print(f"\n{Fore.YELLOW}3. MOCK DATA PATTERNS{Style.RESET_ALL}")
        mock_result = self.verification_results.get('mock_data_check', {})
        if mock_result.get('suspicious_patterns'):
            for pattern in mock_result['suspicious_patterns']:
                severity_color = Fore.RED if pattern['severity'] == 'HIGH' else Fore.YELLOW
                print(f"   {severity_color}[{pattern['severity']}]{Style.RESET_ALL} {pattern['pattern']}")
                print(f"   → {pattern['description']}")
        else:
            print(f"   {Fore.GREEN}✓ No suspicious patterns detected{Style.RESET_ALL}")

        # 4. Balance Verification
        print(f"\n{Fore.YELLOW}4. BALANCE VERIFICATION{Style.RESET_ALL}")
        balance_result = self.verification_results.get('balance', {})
        if balance_result:
            balance_color = Fore.GREEN if balance_result.get('pass') else Fore.RED
            print(f"   Total Balance: {balance_result.get('total_balance', 0):,.2f} SAR")
            print(f"   Expected: {balance_result.get('expected_balance', 0):,.2f} SAR")
            print(f"   Difference: {balance_result.get('difference', 0):,.2f} SAR")
            print(f"   Status: {balance_color}{balance_result.get('status')}{Style.RESET_ALL}")
            print(f"\n   Balance Distribution:")
            if balance_result.get('distribution'):
                for range_name, count in balance_result['distribution'].items():
                    print(f"      {range_name}: {count} members")
            print(f"\n   Compliance (≥3000 SAR): {balance_result.get('compliant_members')} members ({balance_result.get('compliance_rate')})")

        # 5. Data Integrity
        print(f"\n{Fore.YELLOW}5. DATA INTEGRITY{Style.RESET_ALL}")
        integrity_result = self.verification_results.get('data_integrity', {})
        if integrity_result.get('issues'):
            issues = integrity_result['issues']
            has_issues = False

            if issues['null_member_ids'] > 0:
                print(f"   {Fore.RED}✗ Null member IDs: {issues['null_member_ids']}{Style.RESET_ALL}")
                has_issues = True
            if len(issues['duplicate_member_ids']) > 0:
                print(f"   {Fore.RED}✗ Duplicate IDs: {', '.join(issues['duplicate_member_ids'][:5])}{Style.RESET_ALL}")
                has_issues = True
            if issues['null_names'] > 0:
                print(f"   {Fore.RED}✗ Null names: {issues['null_names']}{Style.RESET_ALL}")
                has_issues = True
            if len(issues['invalid_id_format']) > 0:
                print(f"   {Fore.RED}✗ Invalid ID format: {len(issues['invalid_id_format'])} members{Style.RESET_ALL}")
                has_issues = True
            if issues['negative_balances'] > 0:
                print(f"   {Fore.RED}✗ Negative balances: {issues['negative_balances']}{Style.RESET_ALL}")
                has_issues = True

            if not has_issues:
                print(f"   {Fore.GREEN}✓ No integrity issues found{Style.RESET_ALL}")

        # Summary
        print(f"\n{Fore.CYAN}{'='*80}{Style.RESET_ALL}")
        if all_pass:
            print(f"{Fore.GREEN}VERIFICATION COMPLETE: All checks passed! Data matches Excel specifications.{Style.RESET_ALL}")
        else:
            print(f"{Fore.RED}VERIFICATION COMPLETE: Issues detected! Data needs correction.{Style.RESET_ALL}")
            print(f"{Fore.YELLOW}Run with --fix flag to attempt automatic correction.{Style.RESET_ALL}")

    def export_report(self, filename: str = None):
        """Export verification report to JSON file"""
        if not filename:
            filename = f"verification_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        report = {
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'total_members_checked': len(self.members_data),
                'all_checks_passed': all(r.get('pass', False) for r in self.verification_results.values())
            },
            'results': self.verification_results
        }

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        print(f"\n{Fore.GREEN}Report exported to: {filename}{Style.RESET_ALL}")
        return filename

    def run_verification(self):
        """Run complete verification process"""
        print(f"{Fore.CYAN}Starting data verification...{Style.RESET_ALL}\n")

        # Fetch data
        self.fetch_members()

        # Run all checks
        print(f"{Fore.CYAN}Running verification checks...{Style.RESET_ALL}")

        self.verify_total_count()
        self.verify_tribal_distribution()
        self.check_for_mock_data()
        self.verify_balance()
        self.check_data_integrity()

        # Print results
        self.print_results()

        # Export report
        report_file = self.export_report()

        return all(r.get('pass', False) for r in self.verification_results.values())


def main():
    """Main execution function"""
    # Load environment variables
    load_dotenv()

    # Get Supabase credentials
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_ANON_KEY')

    if not supabase_url or not supabase_key:
        print(f"{Fore.RED}Error: Supabase credentials not found in environment variables!{Style.RESET_ALL}")
        print("Please ensure SUPABASE_URL and SUPABASE_ANON_KEY are set in your .env file")
        sys.exit(1)

    # Create verifier instance
    verifier = SupabaseDataVerifier(supabase_url, supabase_key)

    # Run verification
    all_passed = verifier.run_verification()

    # Check for --fix flag
    if '--fix' in sys.argv and not all_passed:
        print(f"\n{Fore.YELLOW}Fix flag detected. Would you like to correct the data? (y/n): {Style.RESET_ALL}", end='')
        response = input().lower()
        if response == 'y':
            print(f"{Fore.YELLOW}Data correction functionality would be implemented here.{Style.RESET_ALL}")
            print(f"{Fore.YELLOW}For now, please use the SQL correction scripts provided.{Style.RESET_ALL}")

    # Exit with appropriate code
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()