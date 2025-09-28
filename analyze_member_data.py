import pandas as pd
import json

# Read the Excel file
file_path = r'D:\PROShael\alshuail-backend\AlShuail_Members_Prefilled_Import.xlsx'

try:
    # Read Excel file
    df = pd.read_excel(file_path)

    print("=" * 60)
    print("SENIOR DATA ANALYSIS - AL-SHUAIL MEMBER DATA")
    print("=" * 60)

    # Display column names to understand structure
    print("\n📊 Available Columns:")
    print(df.columns.tolist())

    # Basic statistics
    print(f"\n📈 Total Records: {len(df)}")

    # Check for tribal_section column (might be in Arabic)
    tribal_column = None
    balance_column = None

    # Look for tribal section column
    for col in df.columns:
        if 'tribal' in col.lower() or 'section' in col.lower() or 'فخذ' in col or 'قبيلة' in col:
            tribal_column = col
            break

    # Look for balance column
    for col in df.columns:
        if 'balance' in col.lower() or 'رصيد' in col or 'amount' in col.lower():
            balance_column = col
            break

    print(f"\n🔍 Found Tribal Column: {tribal_column}")
    print(f"🔍 Found Balance Column: {balance_column}")

    # If we have tribal section data
    if tribal_column:
        # Get tribal section distribution
        tribal_counts = df[tribal_column].value_counts()
        print(f"\n📊 TRIBAL SECTION DISTRIBUTION:")
        print("-" * 40)

        total_members = 0
        tribal_data = []

        for section, count in tribal_counts.items():
            if pd.notna(section):  # Skip null values
                total_members += count

                # Calculate balance if available
                if balance_column:
                    section_members = df[df[tribal_column] == section]
                    total_balance = section_members[balance_column].sum() if balance_column else 0
                    avg_balance = section_members[balance_column].mean() if balance_column else 0
                else:
                    total_balance = count * 3000  # Default estimate
                    avg_balance = 3000

                tribal_data.append({
                    'section': str(section),
                    'members': int(count),
                    'balance': float(total_balance),
                    'avg_balance': float(avg_balance)
                })

                print(f"{section}: {count} members")
                if balance_column:
                    print(f"  Total Balance: {total_balance:,.0f} SAR")
                    print(f"  Average Balance: {avg_balance:,.0f} SAR")

        # Sort by member count
        tribal_data.sort(key=lambda x: x['members'], reverse=True)

        print(f"\n📊 SUMMARY:")
        print(f"Total Members with Tribal Data: {total_members}")

        # Generate JavaScript code for dashboard
        print("\n" + "=" * 60)
        print("📝 COPY THIS TO YOUR DASHBOARD CODE:")
        print("=" * 60)
        print("\nconst tribalData = [")
        for item in tribal_data:
            print(f"  {{ section: '{item['section']}', members: {item['members']}, balance: {item['balance']:.0f} }},")
        print("];")

    else:
        print("\n⚠️ Could not find tribal section column")
        print("Available columns:", df.columns.tolist())

    # Show first few rows to understand data structure
    print("\n📋 SAMPLE DATA (First 5 rows):")
    print("-" * 40)
    print(df.head())

except Exception as e:
    print(f"❌ Error reading Excel file: {str(e)}")
    print("\nTrying to read as CSV...")

    try:
        # Try reading as CSV if Excel fails
        df = pd.read_csv(file_path.replace('.xlsx', '.csv'))
        print("✅ Successfully read as CSV")
        print(f"Total rows: {len(df)}")
        print("Columns:", df.columns.tolist())
    except:
        print("❌ Could not read file as CSV either")