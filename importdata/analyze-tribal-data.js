import { supabaseAdmin } from '../alshuail-backend/src/config/supabase.js';

async function analyzeTribalData() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('      TRIBAL SECTION DATA ANALYSIS - DATABASE VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Get all members with tribal sections
  const { data: members, error } = await supabaseAdmin
    .from('members')
    .select('tribal_section, total_paid, balance');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total Members in Database: ${members.length}\n`);

  // Analyze by tribal section
  const sections = {};
  members.forEach(member => {
    const section = member.tribal_section || 'Unknown';
    if (!sections[section]) {
      sections[section] = {
        count: 0,
        totalPaid: 0,
        totalBalance: 0
      };
    }
    sections[section].count++;
    sections[section].totalPaid += parseFloat(member.total_paid || 0);
    sections[section].totalBalance += parseFloat(member.balance || 0);
  });

  // Sort by count (descending)
  const sorted = Object.entries(sections).sort((a, b) => b[1].count - a[1].count);

  console.log('TRIBAL SECTION DISTRIBUTION:');
  console.log('─'.repeat(95));
  console.log('Section         | Members | %     | Total Paid  | Avg Paid | Total Balance | Avg Balance');
  console.log('─'.repeat(95));

  sorted.forEach(([section, data]) => {
    const percentage = ((data.count / members.length) * 100).toFixed(1);
    const avgPaid = (data.totalPaid / data.count).toFixed(0);
    const avgBalance = (data.totalBalance / data.count).toFixed(0);

    console.log(
      `${section.padEnd(15)} | ${String(data.count).padStart(7)} | ${String(percentage).padStart(5)}% | ${String(data.totalPaid.toLocaleString()).padStart(11)} | ${String(avgPaid).padStart(8)} | ${String(data.totalBalance.toLocaleString()).padStart(13)} | ${String(avgBalance).padStart(11)}`
    );
  });

  console.log('─'.repeat(95));

  // Summary statistics
  const totalPaid = members.reduce((sum, m) => sum + parseFloat(m.total_paid || 0), 0);
  const totalBalance = members.reduce((sum, m) => sum + parseFloat(m.balance || 0), 0);

  console.log(`\nTOTAL           | ${String(members.length).padStart(7)} | 100.0% | ${String(totalPaid.toLocaleString()).padStart(11)} | ${String((totalPaid/members.length).toFixed(0)).padStart(8)} | ${String(totalBalance.toLocaleString()).padStart(13)} | ${String((totalBalance/members.length).toFixed(0)).padStart(11)}`);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                    PIE CHART DATA (JSON FORMAT)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Generate pie chart data format
  const pieChartData = sorted.map(([section, data]) => ({
    name: section,
    value: data.count,
    percentage: ((data.count / members.length) * 100).toFixed(1)
  }));

  console.log(JSON.stringify(pieChartData, null, 2));

  console.log('\n═══════════════════════════════════════════════════════════════\n');

  // Verification
  console.log('✅ DATA VERIFICATION COMPLETE');
  console.log(`   Total members counted: ${sorted.reduce((sum, [, data]) => sum + data.count, 0)}`);
  console.log(`   Expected: ${members.length}`);
  console.log(`   Match: ${sorted.reduce((sum, [, data]) => sum + data.count, 0) === members.length ? 'YES ✅' : 'NO ❌'}\n`);
}

analyzeTribalData();
