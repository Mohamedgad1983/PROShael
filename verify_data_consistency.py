import pandas as pd
import numpy as np

print("=" * 80)
print("🔬 DATA VERIFICATION: Excel vs Member Monitoring Dashboard")
print("=" * 80)

# Read the Excel file
file_path = r'D:\PROShael\alshuail-backend\AlShuail_Members_Prefilled_Import.xlsx'
df = pd.read_excel(file_path)

# Clean column names
df.columns = [col.split('\n')[0] for col in df.columns]

print("\n📊 1. EXCEL DATA ANALYSIS:")
print("-" * 80)

# Group by tribal section
excel_tribal = df.groupby('الفخذ').size().reset_index(name='count')
excel_tribal = excel_tribal.sort_values('count', ascending=False)

print(f"Total members in Excel: {len(df)}")
print(f"Unique tribal sections: {len(excel_tribal)}")
print("\nTribal Distribution from Excel:")
for _, row in excel_tribal.iterrows():
    percentage = (row['count'] / len(df)) * 100
    print(f"  {row['الفخذ']:<15} {row['count']:>4} members ({percentage:>5.1f}%)")

print("\n" + "=" * 80)
print("📊 2. MEMBER MONITORING DASHBOARD DATA:")
print("-" * 80)

# From MemberMonitoringDashboard.jsx logic:
# - Total: 288 members (line 197: for (let i = 1; i <= 288; i++))
# - Distribution: tribalSections[1 + (i % 8)].value (line 205)
# - 8 tribal sections defined (lines 57-66)

dashboard_sections = [
    'رشود', 'الدغيش', 'رشيد', 'العيد',
    'الرشيد', 'الشبيعان', 'المسعود', 'عقاب'
]

# Calculate dashboard distribution (288 members, i % 8)
dashboard_distribution = {}
for i in range(1, 289):  # 288 members
    section_index = i % 8
    section = dashboard_sections[section_index]
    dashboard_distribution[section] = dashboard_distribution.get(section, 0) + 1

print(f"Total members in Dashboard: 288")
print(f"Distribution method: i % 8 (equal distribution)")
print("\nTribal Distribution from Dashboard:")
for section in dashboard_sections:
    count = dashboard_distribution.get(section, 0)
    percentage = (count / 288) * 100
    print(f"  {section:<15} {count:>4} members ({percentage:>5.1f}%)")

print("\n" + "=" * 80)
print("🔍 3. COMPARISON ANALYSIS:")
print("-" * 80)

print(f"\n{'Tribal Section':<15} {'Excel':<12} {'Dashboard':<12} {'Difference':<12} {'Status'}")
print("-" * 80)

total_diff = 0
for section in dashboard_sections:
    excel_count = excel_tribal[excel_tribal['الفخذ'] == section]['count'].values
    excel_count = excel_count[0] if len(excel_count) > 0 else 0
    dashboard_count = dashboard_distribution.get(section, 0)
    diff = excel_count - dashboard_count
    total_diff += abs(diff)

    if abs(diff) > 20:
        status = "🔴 MAJOR MISMATCH"
    elif abs(diff) > 10:
        status = "🟡 Significant diff"
    elif abs(diff) > 5:
        status = "🟠 Minor diff"
    else:
        status = "✅ Close match"

    print(f"{section:<15} {excel_count:>8}     {dashboard_count:>8}     {diff:>+8}     {status}")

print("-" * 80)
print(f"{'TOTAL':<15} {len(df):>8}     {288:>8}     {len(df)-288:>+8}")

print("\n" + "=" * 80)
print("⚠️ KEY FINDINGS:")
print("-" * 80)

issues = []

# Check رشود discrepancy
excel_rashoud = excel_tribal[excel_tribal['الفخذ'] == 'رشود']['count'].values[0]
if excel_rashoud != 36:
    issues.append(f"1. رشود has {excel_rashoud} members in Excel but Dashboard assumes 36 (equal distribution)")
    issues.append(f"   This is a {abs(excel_rashoud-36)/36*100:.0f}% difference!")

# Check total member count
if len(df) != 288:
    issues.append(f"2. Total members: Excel has {len(df)}, Dashboard shows 288")

# Check distribution method
issues.append("3. Dashboard uses MOCK DATA with equal distribution (i % 8)")
issues.append("   Excel shows REAL DATA with highly unequal distribution")

# Check small tribes
small_tribes = excel_tribal[excel_tribal['count'] < 10]
if not small_tribes.empty:
    issues.append(f"4. Small tribes in Excel: {', '.join(small_tribes['الفخذ'].values)} have < 10 members")
    issues.append("   Dashboard assumes all tribes have 36 members")

for issue in issues:
    print(issue)

print("\n" + "=" * 80)
print("💡 RECOMMENDATIONS:")
print("-" * 80)
print("1. ❌ Dashboard is using MOCK/TEST data, not real data")
print("2. ❌ Dashboard assumes equal distribution (36 per tribe)")
print("3. ✅ Excel has the REAL member distribution")
print("4. 🔧 Dashboard needs to connect to real Supabase data")
print("5. 📊 Use Excel data for accurate reporting")

print("\n📊 ACCURACY SCORE:")
print("-" * 80)
accuracy = (1 - total_diff / (len(df) * 2)) * 100
print(f"Data Match Accuracy: {accuracy:.1f}%")
if accuracy < 50:
    print("Status: 🔴 CRITICAL - Dashboard data is completely inaccurate")
elif accuracy < 70:
    print("Status: 🟡 POOR - Significant discrepancies")
else:
    print("Status: 🟢 ACCEPTABLE - Minor differences")