#!/bin/bash

# Coverage Report Generator for Al-Shuail Backend
# Generates comprehensive test coverage reports

echo "======================================"
echo "📊 Running Tests with Coverage"
echo "======================================"
echo ""

# Run tests with coverage
npm run test:coverage

# Check if coverage was generated
if [ ! -f "coverage/coverage-summary.json" ]; then
    echo "❌ Coverage report not generated"
    exit 1
fi

echo ""
echo "======================================"
echo "📈 Coverage Summary"
echo "======================================"
echo ""

# Display coverage summary
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf-8'));
const total = data.total;

console.log('📊 Overall Coverage:');
console.log('');
console.log('  Lines:      ' + total.lines.pct + '% (' + total.lines.covered + '/' + total.lines.total + ')');
console.log('  Statements: ' + total.statements.pct + '% (' + total.statements.covered + '/' + total.statements.total + ')');
console.log('  Functions:  ' + total.functions.pct + '% (' + total.functions.covered + '/' + total.functions.total + ')');
console.log('  Branches:   ' + total.branches.pct + '% (' + total.branches.covered + '/' + total.branches.total + ')');
console.log('');

// Show status
const avgCoverage = (total.lines.pct + total.statements.pct + total.functions.pct + total.branches.pct) / 4;
if (avgCoverage >= 80) {
    console.log('✅ Excellent coverage! Keep it up!');
} else if (avgCoverage >= 60) {
    console.log('✓ Good coverage. Room for improvement.');
} else if (avgCoverage >= 40) {
    console.log('⚠️  Moderate coverage. Consider adding more tests.');
} else {
    console.log('⚠️  Low coverage. Please add more tests.');
}
"

echo ""
echo "======================================"
echo "📁 Reports Generated"
echo "======================================"
echo ""
echo "  - HTML Report:  coverage/lcov-report/index.html"
echo "  - LCOV Report:  coverage/lcov.info"
echo "  - JSON Report:  coverage/coverage-final.json"
echo ""
echo "To view HTML report:"
echo "  open coverage/lcov-report/index.html"
echo ""
