import fetch from 'node-fetch';

async function test() {
  const response = await fetch('http://localhost:3001/api/dashboard/stats');
  const data = await response.json();

  console.log('\n✅ Dashboard Stats API Response:\n');
  console.log(`  Members Total: ${data.data.members.total}`);
  console.log(`  Tribal Sections: ${data.data.tribalSections.length} sections\n`);

  console.log('Tribal Sections Data:');
  data.data.tribalSections.forEach(s => {
    console.log(`  - ${s.section.padEnd(15)}: ${String(s.members).padStart(3)} members | ${String(s.balance).padStart(7)} SAR`);
  });

  console.log('\n✅ API is working and returning live tribal data!\n');
}

test();
