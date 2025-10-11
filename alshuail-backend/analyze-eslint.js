import { execSync } from 'child_process';

try {
  let output;
  try {
    output = execSync('npm run lint 2>&1', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  } catch (error) {
    output = error.stdout || '';
  }
  const lines = output.split('\n');

  const fileIssues = {};
  let currentFile = '';

  for (const line of lines) {
    if (line.match(/^[A-Z]:\\/)) {
      currentFile = line.split('alshuail-backend\\').pop() || line;
      if (!fileIssues[currentFile]) {
        fileIssues[currentFile] = { console: 0, unused: 0, curly: 0, other: 0 };
      }
    } else if (line.includes('Unexpected console statement')) {
      if (currentFile) fileIssues[currentFile].console++;
    } else if (line.includes('never used')) {
      if (currentFile) fileIssues[currentFile].unused++;
    } else if (line.includes('Expected { after')) {
      if (currentFile) fileIssues[currentFile].curly++;
    } else if (line.includes('warning')) {
      if (currentFile) fileIssues[currentFile].other++;
    }
  }

  const sorted = Object.entries(fileIssues)
    .map(([file, issues]) => ({
      file,
      total: issues.console + issues.unused + issues.curly + issues.other,
      ...issues
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 30);

  console.log('\n📊 Top Files with ESLint Issues:\n');
  console.log('File'.padEnd(50) + 'Console  Unused  Curly  Other  Total');
  console.log('='.repeat(85));

  for (const item of sorted) {
    console.log(
      item.file.padEnd(50) +
      String(item.console).padEnd(9) +
      String(item.unused).padEnd(8) +
      String(item.curly).padEnd(7) +
      String(item.other).padEnd(7) +
      item.total
    );
  }

  const totals = sorted.reduce((acc, item) => ({
    console: acc.console + item.console,
    unused: acc.unused + item.unused,
    curly: acc.curly + item.curly,
    other: acc.other + item.other,
    total: acc.total + item.total
  }), { console: 0, unused: 0, curly: 0, other: 0, total: 0 });

  console.log('='.repeat(85));
  console.log(
    'TOTAL'.padEnd(50) +
    String(totals.console).padEnd(9) +
    String(totals.unused).padEnd(8) +
    String(totals.curly).padEnd(7) +
    String(totals.other).padEnd(7) +
    totals.total
  );

} catch (error) {
  console.error('Error:', error.message);
}
