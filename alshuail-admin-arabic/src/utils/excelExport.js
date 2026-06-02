import XlsxPopulate from 'xlsx-populate/browser/xlsx-populate-no-encryption';

const sanitizeSheetName = (name) => {
  const safeName = String(name || 'Sheet1')
    .replace(/[\\/?*[\]:]/g, ' ')
    .trim();
  return (safeName || 'Sheet1').slice(0, 31);
};

const normalizeColumnWidth = (width) => {
  if (typeof width === 'number') return width;
  if (width && typeof width.wch === 'number') return width.wch;
  return null;
};

const jsonRowsToAoA = (rows) => {
  if (!rows || rows.length === 0) return [[]];

  const headers = Object.keys(rows[0]);
  return [
    headers,
    ...rows.map(row => headers.map(header => row[header]))
  ];
};

const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
};

export const exportWorkbook = async (sheets, fileName) => {
  const workbook = await XlsxPopulate.fromBlankAsync();

  sheets.forEach((sheetConfig, index) => {
    const sheet = index === 0
      ? workbook.sheet(0)
      : workbook.addSheet(sanitizeSheetName(sheetConfig.name));

    sheet.name(sanitizeSheetName(sheetConfig.name));

    const data = sheetConfig.data || [[]];
    if (data.length > 0) {
      sheet.cell(1, 1).value(data);
    }

    (sheetConfig.columns || []).forEach((column, columnIndex) => {
      const width = normalizeColumnWidth(column);
      if (width) {
        sheet.column(columnIndex + 1).width(width);
      }
    });

    (sheetConfig.merges || []).forEach((merge) => {
      if (merge?.s && merge?.e) {
        sheet
          .range(merge.s.r + 1, merge.s.c + 1, merge.e.r + 1, merge.e.c + 1)
          .merged(true);
      }
    });
  });

  const blob = await workbook.outputAsync({ type: 'blob' });
  downloadBlob(blob, fileName);
  return fileName;
};

export const exportJsonToExcel = (rows, sheetName, fileName, columns = []) => {
  return exportWorkbook([
    {
      name: sheetName,
      data: jsonRowsToAoA(rows),
      columns
    }
  ], fileName);
};

export const exportAoAToExcel = (data, sheetName, fileName, columns = [], merges = []) => {
  return exportWorkbook([
    {
      name: sheetName,
      data,
      columns,
      merges
    }
  ], fileName);
};
