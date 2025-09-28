const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Read the Excel file
const filePath = path.join(__dirname, 'alshuail-backend', 'AlShuail_Members_Prefilled_Import.xlsx');
const workbook = XLSX.readFile(filePath);

// Get the first sheet
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

// Get headers (first row)
const headers = data[0];
console.log('Excel Headers:', headers);
console.log('\nTotal Columns:', headers.length);
console.log('Total Rows (including header):', data.length);

// Find payment columns
const paymentColumns = headers.filter(header =>
  header && header.toString().includes('مدفوعات') ||
  header && header.toString().includes('2021') ||
  header && header.toString().includes('2022') ||
  header && header.toString().includes('2023') ||
  header && header.toString().includes('2024') ||
  header && header.toString().includes('2025')
);

console.log('\nPayment Columns Found:', paymentColumns);

// Sample first 5 data rows
console.log('\nSample Data (First 3 rows):');
for (let i = 1; i <= Math.min(3, data.length - 1); i++) {
  const row = data[i];
  const rowData = {};
  headers.forEach((header, index) => {
    if (row[index] !== undefined && row[index] !== null && row[index] !== '') {
      rowData[header || `Column_${index}`] = row[index];
    }
  });
  console.log(`Row ${i}:`, rowData);
}

// Analyze payment data structure
console.log('\nPayment Data Analysis:');
let totalMembers = 0;
let membersWithPayments = 0;

for (let i = 1; i < data.length; i++) {
  const row = data[i];
  if (!row || row.length === 0) continue;

  totalMembers++;
  let hasPayment = false;

  // Check payment columns
  headers.forEach((header, index) => {
    if (header && (header.toString().includes('مدفوعات') || header.toString().match(/202[1-5]/))) {
      if (row[index] && row[index] !== 0 && row[index] !== '0') {
        hasPayment = true;
      }
    }
  });

  if (hasPayment) membersWithPayments++;
}

console.log('Total Members:', totalMembers);
console.log('Members with Payments:', membersWithPayments);

// Export column mapping
const columnMapping = {
  headers: headers,
  indices: {}
};

headers.forEach((header, index) => {
  if (header) {
    columnMapping.indices[header] = index;
  }
});

fs.writeFileSync('excel-structure.json', JSON.stringify(columnMapping, null, 2));
console.log('\nColumn mapping saved to excel-structure.json');