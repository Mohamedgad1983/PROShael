import { supabaseAdmin } from '../alshuail-backend/src/config/supabase.js';

async function verify() {
  console.log('\n=======================================================================');
  console.log('                    IMPORT VERIFICATION REPORT');
  console.log('=======================================================================\n');

  // Get all members
  const { data: members } = await supabaseAdmin
    .from('members')
    .select('full_name, tribal_section, total_paid, balance, payment_2021, payment_2022, payment_2023, payment_2024, payment_2025')
    .order('total_paid', { ascending: false });

  console.log(`✅ Total Members in Database: ${members.length}\n`);

  // Top 10 contributors
  console.log('📊 Top 10 Contributors:');
  members.slice(0, 10).forEach((m, i) => {
    console.log(`   ${i+1}. ${m.full_name.padEnd(30)} | ${m.tribal_section.padEnd(10)} | ${m.total_paid} SAR`);
  });

  // Statistics by year
  console.log('\n💰 Payment Collections by Year:');
  const years = [2021, 2022, 2023, 2024, 2025];
  years.forEach(year => {
    const total = members.reduce((sum, m) => sum + (m[`payment_${year}`] || 0), 0);
    const count = members.filter(m => m[`payment_${year}`] > 0).length;
    console.log(`   ${year}: ${total.toLocaleString()} SAR (${count} members paid)`);
  });

  // Total collection
  const grandTotal = members.reduce((sum, m) => sum + m.total_paid, 0);
  console.log(`\n   GRAND TOTAL: ${grandTotal.toLocaleString()} SAR\n`);

  // By Tribal Section
  console.log('🌳 Members by Tribal Section:');
  const bySection = {};
  members.forEach(m => {
    if (!bySection[m.tribal_section]) {
      bySection[m.tribal_section] = { count: 0, total: 0 };
    }
    bySection[m.tribal_section].count++;
    bySection[m.tribal_section].total += m.total_paid;
  });

  Object.entries(bySection)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([section, data]) => {
      console.log(`   ${section.padEnd(15)} : ${String(data.count).padStart(3)} members | ${data.total.toLocaleString()} SAR`);
    });

  console.log('\n=======================================================================');
  console.log('                    ✅ VERIFICATION COMPLETE');
  console.log('=======================================================================\n');
  console.log('🎉 Your data is live at: https://alshuail-admin.pages.dev\n');
}

verify();
