import ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function readDiyaExcel() {
  const workbook = new ExcelJS.Workbook();
  const filePath = join(__dirname, '..', 'DiyaBalance.xlsx');

  try {
    await workbook.xlsx.readFile(filePath);

    console.log('📊 Excel File Analysis:');
    console.log('========================\n');

    // Iterate through all worksheets
    workbook.eachSheet((worksheet, sheetId) => {
      console.log(`\n📄 Sheet ${sheetId}: "${worksheet.name}"`);
      console.log(`   Rows: ${worksheet.rowCount}, Columns: ${worksheet.columnCount}`);

      // Get headers from first row
      const headerRow = worksheet.getRow(1);
      const headers = [];
      headerRow.eachCell((cell, colNumber) => {
        headers.push({ col: colNumber, name: cell.value });
      });

      console.log('\n   Headers:');
      headers.forEach(h => {
        console.log(`   - Column ${h.col}: ${h.name}`);
      });

      // Show first 10 data rows
      console.log('\n   Sample Data:');
      for (let rowNum = 2; rowNum <= Math.min(11, worksheet.rowCount); rowNum++) {
        const row = worksheet.getRow(rowNum);
        const rowData = {};
        row.eachCell((cell, colNumber) => {
          const header = headers.find(h => h.col === colNumber);
          if (header) {
            rowData[header.name] = cell.value;
          }
        });
        console.log(`\n   Row ${rowNum}:`, JSON.stringify(rowData, null, 2));
      }

      console.log('\n   ------------------------');
    });

  } catch (error) {
    console.error('❌ Error reading Excel file:', error.message);
  }
}

readDiyaExcel();
