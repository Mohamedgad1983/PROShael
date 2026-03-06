/**
 * Professional Monitoring Dashboard Export Utilities
 * Enterprise-grade Arabic-supported exports with logo and premium formatting
 * Designed to look like professional system-generated reports
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ═══════════════════════════════════════════════════════════════════════════════
// PROFESSIONAL LOGO - High Quality SVG embedded as base64
// ═══════════════════════════════════════════════════════════════════════════════
const LOGO_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e40af;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#059669;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#10b981;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#34d399;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000" flood-opacity="0.15"/>
    </filter>
  </defs>
  <circle cx="200" cy="200" r="190" fill="white" filter="url(#shadow)"/>
  <circle cx="200" cy="200" r="180" fill="none" stroke="url(#headerGrad)" stroke-width="8"/>
  <circle cx="200" cy="200" r="165" fill="none" stroke="url(#greenGrad)" stroke-width="3"/>
  <text x="200" y="75" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#1e40af" text-anchor="middle">S.A.F</text>
  <text x="200" y="105" font-family="Arial, sans-serif" font-size="16" fill="#059669" text-anchor="middle" letter-spacing="2">SHUAIL AL-ANZI FUND</text>
  <g transform="translate(200, 190)">
    <circle cx="-50" cy="-30" r="18" fill="url(#greenGrad)"/>
    <ellipse cx="-50" cy="5" rx="14" ry="25" fill="url(#greenGrad)"/>
    <circle cx="0" cy="-45" r="18" fill="url(#greenGrad)"/>
    <ellipse cx="0" cy="-10" rx="14" ry="25" fill="url(#greenGrad)"/>
    <circle cx="50" cy="-30" r="18" fill="url(#greenGrad)"/>
    <ellipse cx="50" cy="5" rx="14" ry="25" fill="url(#greenGrad)"/>
    <circle cx="-25" cy="15" r="16" fill="url(#greenGrad)"/>
    <ellipse cx="-25" cy="45" rx="12" ry="22" fill="url(#greenGrad)"/>
    <circle cx="25" cy="15" r="16" fill="url(#greenGrad)"/>
    <ellipse cx="25" cy="45" rx="12" ry="22" fill="url(#greenGrad)"/>
  </g>
  <path d="M 90 250 Q 80 290 100 310 Q 130 340 160 310 L 170 290" fill="url(#headerGrad)" opacity="0.9"/>
  <path d="M 310 250 Q 320 290 300 310 Q 270 340 240 310 L 230 290" fill="url(#headerGrad)" opacity="0.9"/>
  <text x="200" y="340" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#1e40af" text-anchor="middle">صندوق شعيل العنزي</text>
  <text x="200" y="370" font-family="Arial, sans-serif" font-size="16" fill="#059669" text-anchor="middle">Shuail Al-Anzi Fund</text>
</svg>`;

// Convert SVG to base64 for embedding
const LOGO_BASE64 = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(LOGO_SVG)))}`;

// ═══════════════════════════════════════════════════════════════════════════════
// BRAND COLORS - Professional color palette
// ═══════════════════════════════════════════════════════════════════════════════
const BRAND = {
  // Primary colors
  primary: [30, 64, 175],           // #1e40af - Deep blue
  primaryLight: [59, 130, 246],     // #3b82f6 - Bright blue
  secondary: [5, 150, 105],         // #059669 - Emerald green
  secondaryLight: [16, 185, 129],   // #10b981 - Light green

  // Status colors
  success: [34, 197, 94],           // #22c55e - Green
  warning: [245, 158, 11],          // #f59e0b - Amber
  danger: [239, 68, 68],            // #ef4444 - Red
  info: [59, 130, 246],             // #3b82f6 - Blue

  // Neutral colors
  text: [31, 41, 55],               // #1f2937 - Dark gray
  textLight: [107, 114, 128],       // #6b7280 - Medium gray
  background: [249, 250, 251],      // #f9fafb - Light gray
  white: [255, 255, 255],           // #ffffff - White
  border: [229, 231, 235],          // #e5e7eb - Border gray

  // Table colors
  headerBg: [30, 64, 175],          // Deep blue header
  headerText: [255, 255, 255],      // White text
  rowAlt: [243, 244, 246],          // Alternating row
  rowHover: [239, 246, 255]         // Hover state
};

// Hex versions for Excel
const BRAND_HEX = {
  primary: '1e40af',
  primaryLight: '3b82f6',
  secondary: '059669',
  secondaryLight: '10b981',
  success: '22c55e',
  warning: 'f59e0b',
  danger: 'ef4444',
  info: '3b82f6',
  text: '1f2937',
  textLight: '6b7280',
  background: 'f9fafb',
  white: 'ffffff',
  border: 'e5e7eb',
  headerBg: '1e40af',
  rowAlt: 'f3f4f6'
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// Format number in Arabic locale with thousands separator
const formatArabicNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '٠';
  return Number(num).toLocaleString('en-US');
};

// Format currency in Arabic
const formatArabicCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return '٠ ر.س';
  return `${Number(amount).toLocaleString('en-US')} ر.س`;
};

// Get both Gregorian and Hijri dates
const getFormattedDates = () => {
  const now = new Date();
  const gregorian = now.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  const hijri = now.toLocaleDateString('ar-SA-u-ca-islamic-umalqura', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const time = now.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit'
  });
  return { gregorian, hijri, time };
};

// Get status text in Arabic
const getStatusText = (status) => {
  const statusMap = {
    'compliant': 'ملتزم',
    'excellent': 'ممتاز',
    'non-compliant': 'غير ملتزم',
    'critical': 'حرج',
    'active': 'نشط',
    'inactive': 'غير نشط',
    'suspended': 'موقوف'
  };
  return statusMap[status] || status || '-';
};

// Get status color
const getStatusColor = (status) => {
  const colorMap = {
    'compliant': BRAND.success,
    'excellent': BRAND.secondaryLight,
    'non-compliant': BRAND.warning,
    'critical': BRAND.danger,
    'active': BRAND.success,
    'inactive': BRAND.textLight,
    'suspended': BRAND.danger
  };
  return colorMap[status] || BRAND.textLight;
};

const getStatusHexColor = (status) => {
  const colorMap = {
    'compliant': BRAND_HEX.success,
    'excellent': BRAND_HEX.secondaryLight,
    'non-compliant': BRAND_HEX.warning,
    'critical': BRAND_HEX.danger,
    'active': BRAND_HEX.success,
    'inactive': BRAND_HEX.textLight,
    'suspended': BRAND_HEX.danger
  };
  return colorMap[status] || BRAND_HEX.textLight;
};

// ═══════════════════════════════════════════════════════════════════════════════
// PDF EXPORT - Professional Enterprise-Grade Report
// ═══════════════════════════════════════════════════════════════════════════════
export const exportToPDF = (members, statistics, filterDescription = '') => {
  try {
    // Create PDF in landscape A4
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const dates = getFormattedDates();
  const margin = 10;

  // ─────────────────────────────────────────────────────────────────────────────
  // COVER PAGE / HEADER SECTION
  // ─────────────────────────────────────────────────────────────────────────────

  // Gradient header background (simulated with rectangles)
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Decorative accent line
  doc.setFillColor(...BRAND.secondary);
  doc.rect(0, 50, pageWidth, 4, 'F');

  // Logo circle background
  doc.setFillColor(...BRAND.white);
  doc.circle(pageWidth - 30, 27, 18, 'F');

  // Logo text (simplified)
  doc.setFontSize(14);
  doc.setTextColor(...BRAND.primary);
  doc.text('S.A.F', pageWidth - 30, 24, { align: 'center' });
  doc.setFontSize(6);
  doc.setTextColor(...BRAND.secondary);
  doc.text('FUND', pageWidth - 30, 30, { align: 'center' });

  // Main title
  doc.setFontSize(26);
  doc.setTextColor(...BRAND.white);
  doc.text('تقرير مراقبة الأعضاء', pageWidth / 2, 22, { align: 'center' });

  doc.setFontSize(14);
  doc.text('Member Monitoring Report', pageWidth / 2, 32, { align: 'center' });

  // Fund name on left
  doc.setFontSize(12);
  doc.text('صندوق شعيل العنزي', margin + 5, 20, { align: 'left' });
  doc.setFontSize(9);
  doc.text('Shuail Al-Anzi Fund', margin + 5, 27, { align: 'left' });

  // Report metadata
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.white);
  doc.text(`رقم التقرير: RPT-${Date.now().toString().slice(-8)}`, margin + 5, 38, { align: 'left' });
  doc.text(dates.time, margin + 5, 44, { align: 'left' });

  // Date bar
  doc.setFillColor(...BRAND.background);
  doc.rect(0, 54, pageWidth, 12, 'F');

  doc.setFontSize(9);
  doc.setTextColor(...BRAND.text);
  doc.text(`التاريخ الميلادي: ${dates.gregorian}`, pageWidth - margin, 61, { align: 'right' });
  doc.text(`التاريخ الهجري: ${dates.hijri}`, margin, 61, { align: 'left' });

  // ─────────────────────────────────────────────────────────────────────────────
  // STATISTICS CARDS
  // ─────────────────────────────────────────────────────────────────────────────
  const cardY = 72;
  const cardHeight = 28;
  const cardWidth = 50;
  const cardGap = 10;
  const totalCardsWidth = 5 * cardWidth + 4 * cardGap;
  const startX = (pageWidth - totalCardsWidth) / 2;

  const statsCards = [
    {
      label: 'إجمالي الأعضاء',
      labelEn: 'Total Members',
      value: statistics.totalMembers,
      color: BRAND.primary,
      icon: '👥'
    },
    {
      label: 'الأعضاء النشطون',
      labelEn: 'Active',
      value: statistics.activeMembers,
      color: BRAND.success,
      icon: '✓'
    },
    {
      label: 'الملتزمون',
      labelEn: 'Compliant',
      value: statistics.compliantMembers,
      color: BRAND.secondaryLight,
      icon: '★'
    },
    {
      label: 'غير الملتزمين',
      labelEn: 'Non-Compliant',
      value: statistics.nonCompliantMembers,
      color: BRAND.warning,
      icon: '!'
    },
    {
      label: 'حالات حرجة',
      labelEn: 'Critical',
      value: statistics.criticalMembers,
      color: BRAND.danger,
      icon: '⚠'
    }
  ];

  statsCards.forEach((card, index) => {
    const x = startX + index * (cardWidth + cardGap);

    // Card shadow effect
    doc.setFillColor(220, 220, 220);
    doc.roundedRect(x + 1, cardY + 1, cardWidth, cardHeight, 4, 4, 'F');

    // Card background
    doc.setFillColor(...BRAND.white);
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 4, 4, 'F');

    // Colored top border
    doc.setFillColor(...card.color);
    doc.roundedRect(x, cardY, cardWidth, 5, 4, 4, 'F');
    doc.setFillColor(...BRAND.white);
    doc.rect(x, cardY + 3, cardWidth, 3, 'F');

    // Value
    doc.setFontSize(18);
    doc.setTextColor(...card.color);
    doc.text(formatArabicNumber(card.value), x + cardWidth / 2, cardY + 15, { align: 'center' });

    // Label
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.text);
    doc.text(card.label, x + cardWidth / 2, cardY + 22, { align: 'center' });

    // English label
    doc.setFontSize(6);
    doc.setTextColor(...BRAND.textLight);
    doc.text(card.labelEn, x + cardWidth / 2, cardY + 26, { align: 'center' });
  });

  // Filter description if any
  let tableStartY = cardY + cardHeight + 8;
  if (filterDescription) {
    doc.setFillColor(...BRAND.info);
    doc.roundedRect(margin, tableStartY, pageWidth - 2 * margin, 8, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.white);
    doc.text(`الفلتر المطبق: ${filterDescription}`, pageWidth / 2, tableStartY + 5.5, { align: 'center' });
    tableStartY += 12;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DATA TABLE
  // ─────────────────────────────────────────────────────────────────────────────

  // Table header label
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.primary);
  doc.text('بيانات الأعضاء التفصيلية', pageWidth - margin, tableStartY + 3, { align: 'right' });
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.textLight);
  doc.text(`إجمالي السجلات: ${formatArabicNumber(members.length)}`, margin, tableStartY + 3, { align: 'left' });
  tableStartY += 7;

  // Prepare table data
  const tableData = members.map((member, index) => [
    getStatusText(member.status || member.membership_status),
    formatArabicNumber(member.requiredPayment || 0),
    formatArabicNumber(member.currentBalance || 0),
    member.tribalSection || member.tribal_section || '-',
    member.phone || '-',
    member.fullName || member.full_name || '-',
    member.memberId || member.membership_number || '-',
    (index + 1).toString()
  ]);

  autoTable(doc, {
    head: [['الحالة', 'المطلوب', 'الرصيد', 'الفخذ', 'الجوال', 'الاسم الكامل', 'رقم العضوية', '#']],
    body: tableData,
    startY: tableStartY,
    theme: 'striped',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 3,
      halign: 'center',
      valign: 'middle',
      textColor: BRAND.text,
      lineColor: BRAND.border,
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: BRAND.headerBg,
      textColor: BRAND.headerText,
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 4
    },
    alternateRowStyles: {
      fillColor: BRAND.rowAlt
    },
    columnStyles: {
      0: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 28, halign: 'center' },
      4: { cellWidth: 30, halign: 'center' },
      5: { cellWidth: 55, halign: 'right' },
      6: { cellWidth: 22, halign: 'center' },
      7: { cellWidth: 12, halign: 'center' }
    },
    didDrawCell: (data) => {
      // Color code status column
      if (data.section === 'body' && data.column.index === 0) {
        const status = members[data.row.index]?.status;
        const statusColor = getStatusColor(status);

        // Draw colored background
        doc.setFillColor(...statusColor);
        doc.roundedRect(
          data.cell.x + 2,
          data.cell.y + 1.5,
          data.cell.width - 4,
          data.cell.height - 3,
          2, 2, 'F'
        );

        // Redraw text in white
        doc.setTextColor(...BRAND.white);
        doc.setFontSize(8);
        doc.text(
          data.cell.text[0],
          data.cell.x + data.cell.width / 2,
          data.cell.y + data.cell.height / 2 + 1,
          { align: 'center' }
        );
      }
    },
    margin: { left: margin, right: margin },
    didDrawPage: (data) => {
      // Footer on each page
      const pageCount = doc.internal.getNumberOfPages();
      const currentPage = doc.internal.getCurrentPageInfo().pageNumber;

      // Footer background
      doc.setFillColor(...BRAND.background);
      doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');

      // Footer line
      doc.setDrawColor(...BRAND.primary);
      doc.setLineWidth(0.5);
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

      // Footer text
      doc.setFontSize(7);
      doc.setTextColor(...BRAND.textLight);

      // Page number
      doc.text(
        `صفحة ${currentPage} من ${pageCount}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );

      // System notice
      doc.text(
        'تم إنشاء هذا التقرير آلياً من نظام صندوق شعيل العنزي - Shuail Al-Anzi Fund Management System',
        pageWidth / 2,
        pageHeight - 4,
        { align: 'center' }
      );

      // Confidentiality notice
      doc.setTextColor(...BRAND.danger);
      doc.text('سري - للاستخدام الداخلي فقط', pageWidth - margin, pageHeight - 8, { align: 'right' });

      // Logo indicator
      doc.setTextColor(...BRAND.primary);
      doc.text('S.A.F', margin, pageHeight - 8, { align: 'left' });
    }
  });

  // Save the PDF
  const fileName = `monitoring-report-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
  return fileName;
  } catch (error) {
    console.error('[PDF Export] Error:', error?.message || error);
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXCEL EXPORT - Professional Styled Workbook
// ═══════════════════════════════════════════════════════════════════════════════
export const exportToExcel = (members, statistics, filterDescription = '') => {
  const wb = XLSX.utils.book_new();
  const dates = getFormattedDates();

  // ─────────────────────────────────────────────────────────────────────────────
  // SUMMARY SHEET - Executive Overview
  // ─────────────────────────────────────────────────────────────────────────────
  const summaryData = [
    [''],
    ['', '', '', '', '╔═══════════════════════════════════════════════════════════════╗'],
    ['', '', '', '', '║                    صندوق شعيل العنزي                           ║'],
    ['', '', '', '', '║                  SHUAIL AL-ANZI FUND                          ║'],
    ['', '', '', '', '║═══════════════════════════════════════════════════════════════║'],
    ['', '', '', '', '║              تقرير مراقبة الأعضاء الشامل                       ║'],
    ['', '', '', '', '║           COMPREHENSIVE MEMBER MONITORING REPORT              ║'],
    ['', '', '', '', '╚═══════════════════════════════════════════════════════════════╝'],
    [''],
    [''],
    ['═══════════════════════════════════════════════════════════════════════════════════════'],
    ['', '', '', '', '📋 معلومات التقرير | REPORT INFORMATION'],
    ['═══════════════════════════════════════════════════════════════════════════════════════'],
    [''],
    ['', `RPT-${Date.now().toString().slice(-8)}`, '', '', 'رقم التقرير | Report ID'],
    ['', dates.gregorian, '', '', 'التاريخ الميلادي | Gregorian Date'],
    ['', dates.hijri, '', '', 'التاريخ الهجري | Hijri Date'],
    ['', dates.time, '', '', 'وقت الإصدار | Generation Time'],
    ['', 'نظام صندوق شعيل العنزي', '', '', 'مصدر التقرير | Source'],
    [''],
    ['═══════════════════════════════════════════════════════════════════════════════════════'],
    ['', '', '', '', '📊 ملخص الإحصائيات | STATISTICS SUMMARY'],
    ['═══════════════════════════════════════════════════════════════════════════════════════'],
    [''],
    ['', '', 'النسبة المئوية', 'العدد', 'البيان | Description'],
    ['', '', '───────────', '───────', '─────────────────────────────'],
    ['', '', '100%', formatArabicNumber(statistics.totalMembers), '👥 إجمالي الأعضاء | Total Members'],
    ['', '', `${((statistics.activeMembers / statistics.totalMembers) * 100).toFixed(1)}%`, formatArabicNumber(statistics.activeMembers), '✓ الأعضاء النشطون | Active Members'],
    ['', '', `${((statistics.compliantMembers / statistics.totalMembers) * 100).toFixed(1)}%`, formatArabicNumber(statistics.compliantMembers), '★ الملتزمون بالسداد | Compliant Members'],
    ['', '', `${((statistics.nonCompliantMembers / statistics.totalMembers) * 100).toFixed(1)}%`, formatArabicNumber(statistics.nonCompliantMembers), '⚡ غير الملتزمين | Non-Compliant'],
    ['', '', `${((statistics.criticalMembers / statistics.totalMembers) * 100).toFixed(1)}%`, formatArabicNumber(statistics.criticalMembers), '⚠️ الحالات الحرجة | Critical Cases'],
    [''],
    ['═══════════════════════════════════════════════════════════════════════════════════════'],
    filterDescription ? ['', '', '', filterDescription, '🔍 الفلتر المطبق | Applied Filter'] : [''],
    [''],
    [''],
    ['', '', '', '', '───────────────────────────────────────────────────────────────'],
    ['', '', '', '', 'تم إنشاء هذا التقرير آلياً من نظام صندوق شعيل العنزي'],
    ['', '', '', '', 'This report was automatically generated by SAF Management System'],
    ['', '', '', '', '───────────────────────────────────────────────────────────────'],
    ['', '', '', '', '⚠️ سري - للاستخدام الداخلي فقط | CONFIDENTIAL - Internal Use Only']
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [
    { wch: 3 },
    { wch: 30 },
    { wch: 15 },
    { wch: 15 },
    { wch: 50 }
  ];

  // Merge header cells
  summarySheet['!merges'] = [
    { s: { r: 1, c: 4 }, e: { r: 7, c: 4 } }
  ];

  XLSX.utils.book_append_sheet(wb, summarySheet, 'الملخص التنفيذي');

  // ─────────────────────────────────────────────────────────────────────────────
  // DATA SHEET - Member Details
  // ─────────────────────────────────────────────────────────────────────────────
  const headers = [
    '#',
    'رقم العضوية\nMember ID',
    'الاسم الكامل\nFull Name',
    'رقم الجوال\nPhone',
    'الفخذ\nBranch',
    'الرصيد الحالي\nBalance',
    'المبلغ المطلوب\nRequired',
    'حالة الالتزام\nStatus',
    'حالة العضوية\nMembership'
  ];

  const dataRows = members.map((member, index) => [
    index + 1,
    member.memberId || member.membership_number || '-',
    member.fullName || member.full_name || '-',
    member.phone || '-',
    member.tribalSection || member.tribal_section || '-',
    member.currentBalance || member.current_balance || 0,
    member.requiredPayment || 0,
    getStatusText(member.status),
    getStatusText(member.membership_status)
  ]);

  // Create data array with header
  const allData = [
    ['╔═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗'],
    ['║  صندوق شعيل العنزي - تقرير بيانات الأعضاء التفصيلي  |  Shuail Al-Anzi Fund - Detailed Member Data Report                                    ║'],
    ['╚═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝'],
    [`تاريخ التقرير: ${dates.gregorian} | ${dates.hijri} | إجمالي السجلات: ${formatArabicNumber(members.length)}`],
    [''],
    headers,
    ...dataRows,
    [''],
    ['─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────'],
    [`📊 إجمالي الأعضاء: ${formatArabicNumber(members.length)} | الملتزمون: ${formatArabicNumber(statistics.compliantMembers)} | غير الملتزمين: ${formatArabicNumber(statistics.nonCompliantMembers)} | الحرجة: ${formatArabicNumber(statistics.criticalMembers)}`],
    ['─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────'],
    ['تم إنشاء هذا التقرير آلياً من نظام صندوق شعيل العنزي - Shuail Al-Anzi Fund Management System']
  ];

  const dataSheet = XLSX.utils.aoa_to_sheet(allData);

  // Set column widths
  dataSheet['!cols'] = [
    { wch: 6 },   // #
    { wch: 14 },  // Member ID
    { wch: 35 },  // Name
    { wch: 15 },  // Phone
    { wch: 18 },  // Branch
    { wch: 14 },  // Balance
    { wch: 14 },  // Required
    { wch: 14 },  // Status
    { wch: 14 }   // Membership
  ];

  // Merge header rows
  dataSheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 8 } }
  ];

  XLSX.utils.book_append_sheet(wb, dataSheet, 'بيانات الأعضاء');

  // ─────────────────────────────────────────────────────────────────────────────
  // ANALYTICS SHEET - Detailed Statistics
  // ─────────────────────────────────────────────────────────────────────────────

  // Calculate branch statistics
  const branchStats = {};
  members.forEach(member => {
    const branch = member.tribalSection || member.tribal_section || 'غير محدد';
    if (!branchStats[branch]) {
      branchStats[branch] = { total: 0, compliant: 0, nonCompliant: 0, critical: 0, totalBalance: 0 };
    }
    branchStats[branch].total++;
    branchStats[branch].totalBalance += (member.currentBalance || member.current_balance || 0);
    if (member.status === 'compliant' || member.status === 'excellent') branchStats[branch].compliant++;
    else if (member.status === 'critical') branchStats[branch].critical++;
    else if (member.status === 'non-compliant') branchStats[branch].nonCompliant++;
  });

  const analyticsData = [
    ['╔═══════════════════════════════════════════════════════════════════════════════════════════╗'],
    ['║                        التحليل الإحصائي التفصيلي | DETAILED ANALYTICS                     ║'],
    ['╚═══════════════════════════════════════════════════════════════════════════════════════════╝'],
    [''],
    ['═══════════════════════════════════════════════════════════════════════════════════════════'],
    ['                              📈 إحصائيات حسب الفخذ | BRANCH STATISTICS'],
    ['═══════════════════════════════════════════════════════════════════════════════════════════'],
    [''],
    ['إجمالي الرصيد', 'حرج', 'غير ملتزم', 'ملتزم', 'الإجمالي', 'الفخذ'],
    ['Total Balance', 'Critical', 'Non-Compliant', 'Compliant', 'Total', 'Branch'],
    ['─────────────', '──────', '───────────', '───────', '────────', '──────────────────'],
    ...Object.entries(branchStats).map(([branch, stats]) => [
      formatArabicCurrency(stats.totalBalance),
      stats.critical,
      stats.nonCompliant,
      stats.compliant,
      stats.total,
      branch
    ]),
    [''],
    ['═══════════════════════════════════════════════════════════════════════════════════════════'],
    ['                              📊 مؤشرات الأداء الرئيسية | KEY PERFORMANCE INDICATORS'],
    ['═══════════════════════════════════════════════════════════════════════════════════════════'],
    [''],
    ['', `${((statistics.compliantMembers / statistics.totalMembers) * 100).toFixed(1)}%`, 'نسبة الالتزام | Compliance Rate'],
    ['', `${((statistics.activeMembers / statistics.totalMembers) * 100).toFixed(1)}%`, 'نسبة النشاط | Activity Rate'],
    ['', `${((statistics.criticalMembers / statistics.totalMembers) * 100).toFixed(1)}%`, 'نسبة الحالات الحرجة | Critical Rate'],
    [''],
    ['═══════════════════════════════════════════════════════════════════════════════════════════'],
    ['Generated by Shuail Al-Anzi Fund Management System - صندوق شعيل العنزي']
  ];

  const analyticsSheet = XLSX.utils.aoa_to_sheet(analyticsData);
  analyticsSheet['!cols'] = [
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 25 }
  ];

  // Merge header cells
  analyticsSheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }
  ];

  XLSX.utils.book_append_sheet(wb, analyticsSheet, 'التحليل الإحصائي');

  // Save the file
  const fileName = `members-export-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);

  return fileName;
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
export default {
  exportToPDF,
  exportToExcel
};
