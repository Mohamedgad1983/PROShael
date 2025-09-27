import { createClient } from '@supabase/supabase-js';
import xlsx from 'xlsx-populate';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY
);

// Simple import function
async function importMembersFromExcel() {
  console.log('🚀 Starting simple member import...\n');

  try {
    // Load the Excel file
    const filePath = path.join(__dirname, '../../../../AlShuail_Members_Prefilled_Import.xlsx');
    console.log('📂 Reading Excel file from:', filePath);

    const workbook = await xlsx.fromFileAsync(filePath);
    const sheet = workbook.sheet(0);
    const data = sheet.usedRange().value();

    // Get headers (first row)
    const headers = data[0];
    console.log('📋 Found columns:', headers.slice(0, 10).join(', '), '...\n');

    // Process each member (skip header row)
    let successCount = 0;
    let errorCount = 0;
    const members = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // Map the Excel columns to our database fields
      const member = {
        member_id: row[0], // رقم العضوية
        full_name: row[1], // الاسم الكامل (عربي)
        phone: String(row[3]).padStart(9, '0'), // رقم الجوال (ensure 9 digits)
        country: row[4] || 'SA', // البلد
        tribal_section: row[5], // الفخذ

        // Payment history
        payment_2021: parseFloat(row[9]) || 0,
        payment_2022: parseFloat(row[10]) || 0,
        payment_2023: parseFloat(row[11]) || 0,
        payment_2024: parseFloat(row[12]) || 0,
        payment_2025: parseFloat(row[13]) || 0,

        // Calculate total balance
        total_balance: 0,
        balance_status: '',

        // Subscription info
        subscription_type: row[16] || 'monthly',
        subscription_quantity: parseInt(row[17]) || 1
      };

      // Calculate total balance
      member.total_balance =
        member.payment_2021 +
        member.payment_2022 +
        member.payment_2023 +
        member.payment_2024 +
        member.payment_2025;

      // Determine balance status (3000 SAR minimum)
      member.balance_status = member.total_balance >= 3000 ? 'sufficient' : 'insufficient';

      members.push(member);
    }

    console.log(`📊 Processed ${members.length} members from Excel\n`);

    // Insert members into database
    console.log('💾 Inserting members into database...\n');

    for (const member of members) {
      try {
        // First, insert the member
        const { data: memberData, error: memberError } = await supabase
          .from('members')
          .upsert({
            member_id: member.member_id,
            full_name: member.full_name,
            phone: member.phone,
            country: member.country,
            tribal_section: member.tribal_section,
            subscription_type: member.subscription_type,
            subscription_quantity: member.subscription_quantity
          }, {
            onConflict: 'phone'
          })
          .select()
          .single();

        if (memberError) {
          console.log(`❌ Error inserting ${member.full_name}:`, memberError.message);
          errorCount++;
          continue;
        }

        // Insert payment history for each year
        const payments = [
          { year: 2021, amount: member.payment_2021 },
          { year: 2022, amount: member.payment_2022 },
          { year: 2023, amount: member.payment_2023 },
          { year: 2024, amount: member.payment_2024 },
          { year: 2025, amount: member.payment_2025 }
        ];

        for (const payment of payments) {
          if (payment.amount > 0) {
            await supabase
              .from('payments')
              .upsert({
                payer_id: memberData.id,
                amount: payment.amount,
                payment_date: `${payment.year}-12-31`,
                payment_type: 'subscription',
                status: 'completed',
                description: `اشتراك سنة ${payment.year}`
              });
          }
        }

        successCount++;
        console.log(`✅ Imported: ${member.full_name} (${member.phone}) - Total: ${member.total_balance} SAR`);

      } catch (error) {
        console.log(`❌ Error processing ${member.full_name}:`, error.message);
        errorCount++;
      }
    }

    // Summary report
    console.log('\n' + '='.repeat(80));
    console.log('📈 IMPORT SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Successfully imported: ${successCount} members`);
    console.log(`❌ Failed imports: ${errorCount} members`);

    // Balance analysis
    const insufficientMembers = members.filter(m => m.balance_status === 'insufficient');
    const sufficientMembers = members.filter(m => m.balance_status === 'sufficient');

    console.log(`\n💰 Balance Analysis:`);
    console.log(`   • Members above 3000 SAR: ${sufficientMembers.length} (${(sufficientMembers.length/members.length*100).toFixed(1)}%)`);
    console.log(`   • Members below 3000 SAR: ${insufficientMembers.length} (${(insufficientMembers.length/members.length*100).toFixed(1)}%)`);

    // Show some examples of members below minimum
    console.log(`\n⚠️ Sample Members Below Minimum (3000 SAR):`);
    insufficientMembers.slice(0, 5).forEach(member => {
      console.log(`   • ${member.full_name}: ${member.total_balance} SAR (${member.phone})`);
    });

    console.log('\n✅ Import completed successfully!');

  } catch (error) {
    console.error('❌ Fatal error during import:', error);
    process.exit(1);
  }
}

// Run the import
importMembersFromExcel().then(() => {
  console.log('\n🎉 All done! Members are now in the database.');
  process.exit(0);
}).catch(error => {
  console.error('Failed to import:', error);
  process.exit(1);
});