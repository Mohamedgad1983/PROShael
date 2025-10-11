import { execSync } from 'child_process';
import { readFileSync } from 'fs';

try {
  // Run ESLint on src/ and save output
  let output;
  try {
    execSync('npx eslint src/ 2>&1 > eslint-src.txt');
    output = readFileSync('eslint-src.txt', 'utf8');
  } catch (error) {
    output = readFileSync('eslint-src.txt', 'utf8');
  }

  const lines = output.split('\n');
  const fileIssues = {};
  let currentFile = '';

  for (const line of lines) {
    if (line.match(/^D:\\/)) {
      currentFile = line.split('alshuail-backend\\').pop() || line;
      if (!fileIssues[currentFile]) {
        fileIssues[currentFile] = { unused: 0, requireAwait: 0, other: 0 };
      }
    } else if (line.includes('never used')) {
      if (currentFile) fileIssues[currentFile].unused++;
    } else if (line.includes('require-await') || line.includes('no \'await\' expression')) {
      if (currentFile) fileIssues[currentFile].requireAwait++;
    } else if (line.includes('warning')) {
      if (currentFile) fileIssues[currentFile].other++;
    }
  }

  const sorted = Object.entries(fileIssues)
    .map(([file, issues]) => ({
      file,
      total: issues.unused + issues.requireAwait + issues.other,
      ...issues
    }))
    .filter(item => item.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 30);

  console.log('\n📊 Top src/ Files with ESLint Issues:\n');
  console.log('File'.padEnd(60) + 'Unused  Await  Other  Total');
  console.log('='.repeat(95));

  for (const item of sorted) {
    console.log(
      item.file.padEnd(60) +
      String(item.unused).padEnd(8) +
      String(item.requireAwait).padEnd(7) +
      String(item.other).padEnd(7) +
      item.total
    );
  }

  const totals = sorted.reduce((acc, item) => ({
    unused: acc.unused + item.unused,
    requireAwait: acc.requireAwait + item.requireAwait,
    other: acc.other + item.other,
    total: acc.total + item.total
  }), { unused: 0, requireAwait: 0, other: 0, total: 0 });

  console.log('='.repeat(95));
  console.log(
    'TOTAL'.padEnd(60) +
    String(totals.unused).padEnd(8) +
    String(totals.requireAwait).padEnd(7) +
    String(totals.other).padEnd(7) +
    totals.total
  );

} catch (error) {
  console.error('Error:', error.message);
}
