/**
 * Marriage Support PDF Generator (إقرار الدين).
 *
 * The request hash is derived from canonical request data in
 * marriageSupportService.js. PDF bytes are deliberately not part of that hash,
 * so layout/font improvements do not invalidate existing signatures.
 */

import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Checked-in OFL font; never fall back to a font without Arabic glyphs. */
export const MARRIAGE_PDF_ARABIC_FONT_PATH = path.resolve(
  __dirname,
  '../../assets/fonts/NotoNaskhArabic-Regular.ttf'
);

const ARABIC_FONT = 'NotoNaskhArabic';
const LATIN_FONT = 'Helvetica';
const PAGE_MARGIN = 46;
const CONTENT_TOP = 92;
const CONTENT_BOTTOM = 778;

const COLORS = Object.freeze({
  navy: '#17324D',
  blue: '#2D5B86',
  gold: '#B58A3A',
  green: '#237A57',
  paleGreen: '#EEF7F2',
  paleBlue: '#F3F7FA',
  paleGold: '#FBF7EE',
  border: '#D8E0E6',
  text: '#1E2933',
  muted: '#687784',
  white: '#FFFFFF',
});

const STATUS_AR = Object.freeze({
  submitted: 'تم تقديم الطلب',
  under_committee_review: 'قيد مراجعة اللجنة',
  data_entered: 'تم إدخال البيانات',
  awaiting_signatures: 'بانتظار التوقيعات',
  signatures_complete: 'اكتملت التوقيعات',
  approved_by_chairman: 'معتمد من رئيس الصندوق',
  completed: 'مكتمل',
  rejected: 'مرفوض',
  cancelled: 'ملغي',
});

const SIGNATURE_ROLES = Object.freeze([
  { key: 'beneficiary', ar: 'المستفيد', en: 'Beneficiary' },
  { key: 'witness_1', ar: 'الشاهد الأول', en: 'Witness 1' },
  { key: 'witness_2', ar: 'الشاهد الثاني', en: 'Witness 2' },
  { key: 'committee_chair', ar: 'رئيس اللجنة', en: 'Committee Chair' },
]);

const hasArabic = (value) => /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u.test(String(value));

const display = (value) => {
  if (value === null || value === undefined || value === '') {return '-';}
  return String(value);
};

const fmtAmount = (value) => {
  if (value === null || value === undefined || value === '') {return '-';}
  const number = Number(value);
  if (!Number.isFinite(number)) {return '-';}
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(number)} SAR`;
};

const fmtDate = (value, includeTime = false) => {
  if (!value) {return '-';}
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {return display(value).slice(0, 24);}
    if (!includeTime) {return date.toISOString().slice(0, 10);}
    return `${date.toISOString().replace('T', ' ').slice(0, 16)} UTC`;
  } catch {
    return display(value).slice(0, 24);
  }
};

function setArabic(doc, size, color = COLORS.text) {
  return doc.font(ARABIC_FONT).fontSize(size).fillColor(color);
}

function setLatin(doc, size, color = COLORS.text) {
  return doc.font(LATIN_FONT).fontSize(size).fillColor(color);
}

function drawPageHeader(doc, request) {
  const width = doc.page.width - (PAGE_MARGIN * 2);
  doc.save();
  doc.rect(0, 0, doc.page.width, 74).fill(COLORS.navy);
  doc.rect(0, 74, doc.page.width, 3).fill(COLORS.gold);

  setArabic(doc, 18, COLORS.white).text(
    'صندوق عائلة شعيل العنزي',
    PAGE_MARGIN,
    20,
    { width, align: 'right', lineBreak: false, wordSpacing: 1 }
  );
  setArabic(doc, 11, '#DCE7EF').text(
    'إقرار دين - برنامج دعم المقبلين على الزواج',
    PAGE_MARGIN,
    47,
    { width, align: 'right', lineBreak: false, wordSpacing: 1 }
  );
  setLatin(doc, 8.5, '#DCE7EF').text(
    `Reference: ${display(request.sequence_number || request.id)}`,
    PAGE_MARGIN,
    50,
    { width: width * 0.48, align: 'left', lineBreak: false }
  );
  doc.restore();
}

function drawPageFooters(doc) {
  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    const pageNumber = index - range.start + 1;
    const width = doc.page.width - (PAGE_MARGIN * 2);
    const y = doc.page.height - 42;
    doc.save();
    doc.moveTo(PAGE_MARGIN, y - 9).lineTo(doc.page.width - PAGE_MARGIN, y - 9)
      .lineWidth(0.5).strokeColor(COLORS.border).stroke();
    setArabic(doc, 8, COLORS.muted).text(
      'وثيقة إلكترونية صادرة عن صندوق عائلة شعيل العنزي',
      PAGE_MARGIN,
      y,
      { width: width * 0.72, align: 'right', lineBreak: false, wordSpacing: 1 }
    );
    setLatin(doc, 8, COLORS.muted).text(
      `Page ${pageNumber} / ${range.count}`,
      PAGE_MARGIN,
      y,
      { width: width * 0.25, align: 'left', lineBreak: false }
    );
    doc.restore();
  }
}

class FlowLayout {
  constructor(doc, request) {
    this.doc = doc;
    this.request = request;
    this.y = CONTENT_TOP;
  }

  addPage() {
    this.doc.addPage();
    drawPageHeader(this.doc, this.request);
    this.y = CONTENT_TOP;
  }

  ensureSpace(height) {
    if (this.y + height > CONTENT_BOTTOM) {this.addPage();}
  }

  gap(height = 10) {
    this.y += height;
  }

  sectionTitle(title) {
    const height = 30;
    this.ensureSpace(height);
    const width = this.doc.page.width - (PAGE_MARGIN * 2);
    setArabic(this.doc, 13, COLORS.navy).text(
      title,
      PAGE_MARGIN,
      this.y + 2,
      { width, align: 'right', lineBreak: false, wordSpacing: 1 }
    );
    this.doc.moveTo(PAGE_MARGIN, this.y + 25)
      .lineTo(this.doc.page.width - PAGE_MARGIN, this.y + 25)
      .lineWidth(0.8).strokeColor(COLORS.gold).stroke();
    this.y += height;
  }
}

function valueHeight(doc, value, width) {
  const text = display(value);
  if (hasArabic(text)) {
    setArabic(doc, 11.5);
  } else {
    setLatin(doc, 10.5);
  }
  return doc.heightOfString(text, { width, align: 'right', lineGap: 1 });
}

function drawInfoGrid(flow, fields, options = {}) {
  const { doc } = flow;
  const gap = 8;
  const rowGap = options.rowGap ?? 8;
  const totalWidth = doc.page.width - (PAGE_MARGIN * 2);
  const cellWidth = (totalWidth - gap) / 2;

  for (let index = 0; index < fields.length; index += 2) {
    const row = fields.slice(index, index + 2);
    const heights = row.map((field) => valueHeight(doc, field.value, cellWidth - 20));
    const rowHeight = Math.max(options.minimumRowHeight || 50, ...heights.map((height) => height + 28));
    flow.ensureSpace(rowHeight + rowGap);

    row.forEach((field, cellIndex) => {
      // First logical field appears on the right in the RTL grid.
      const x = PAGE_MARGIN + ((1 - cellIndex) * (cellWidth + gap));
      doc.roundedRect(x, flow.y, cellWidth, rowHeight, 5)
        .fillAndStroke(options.fill || COLORS.paleBlue, COLORS.border);
      setArabic(doc, 8.5, COLORS.muted).text(
        field.label,
        x + 10,
        flow.y + 7,
        { width: cellWidth - 20, align: 'right', lineBreak: false, wordSpacing: 1 }
      );
      const text = display(field.value);
      if (hasArabic(text)) {
        setArabic(doc, 11.5, COLORS.text);
      } else {
        setLatin(doc, 10.5, COLORS.text);
      }
      doc.text(text, x + 10, flow.y + 23, {
        width: cellWidth - 20,
        align: 'right',
        lineGap: 1,
        wordSpacing: hasArabic(text) ? 1 : 0,
      });
    });
    flow.y += rowHeight + rowGap;
  }
}

function drawFinalAmount(flow, amount) {
  const { doc } = flow;
  const width = doc.page.width - (PAGE_MARGIN * 2);
  const height = 55;
  flow.ensureSpace(height);
  doc.roundedRect(PAGE_MARGIN, flow.y, width, height, 7)
    .fillAndStroke(COLORS.paleGreen, '#B8DAC8');
  setArabic(doc, 13, COLORS.green).text(
    'المبلغ النهائي المستحق للدعم',
    PAGE_MARGIN + (width * 0.46),
    flow.y + 14,
    { width: (width * 0.5) - 14, align: 'right', lineBreak: false, wordSpacing: 1 }
  );
  setLatin(doc, 16, COLORS.green).text(
    fmtAmount(amount),
    PAGE_MARGIN + 14,
    flow.y + 17,
    { width: width * 0.42, align: 'left', lineBreak: false }
  );
  flow.y += height;
}

function drawAcknowledgment(flow) {
  const { doc } = flow;
  const width = doc.page.width - (PAGE_MARGIN * 2);
  const text =
    'أقر أنا المستفيد الموقع أدناه بصحة جميع البيانات والمرفقات الواردة في هذا الإقرار، ' +
    'وبموافقتي على تفاصيل الاحتساب والمبلغ النهائي الموضح أعلاه، وعلى صرف دعم الزواج ' +
    'وفق لائحة صندوق عائلة شعيل العنزي. كما أتعهد بالالتزام بجميع الأحكام والالتزامات ' +
    'المترتبة على هذا الإقرار.';
  setArabic(doc, 11.5, COLORS.text);
  const textHeight = doc.heightOfString(text, {
    width: width - 28,
    align: 'right',
    lineGap: 4,
    wordSpacing: 1,
  });
  const height = textHeight + 28;
  flow.ensureSpace(height);
  doc.roundedRect(PAGE_MARGIN, flow.y, width, height, 6)
    .fillAndStroke(COLORS.paleGold, '#E6D7B5');
  setArabic(doc, 11.5, COLORS.text).text(text, PAGE_MARGIN + 14, flow.y + 12, {
    width: width - 28,
    align: 'right',
    lineGap: 4,
    wordSpacing: 1,
  });
  flow.y += height;
}

function signatureName(role, signature, request) {
  return signature?.signer_name || {
    beneficiary: request.applicant_name,
    witness_1: request.witness_1_name,
    witness_2: request.witness_2_name,
    committee_chair: request.committee_chair_name,
  }[role.key] || '-';
}

function signatureCardHeight(doc, width, role, signature, request) {
  const name = signatureName(role, signature, request);
  setArabic(doc, 11);
  const nameHeight = doc.heightOfString(display(name), {
    width: width - 24,
    align: 'right',
    lineGap: 1,
  });
  return Math.max(77, nameHeight + 55);
}

function drawSignatureCard(doc, x, y, width, height, role, signature, request) {
  const name = signatureName(role, signature, request);

  doc.roundedRect(x, y, width, height, 6)
    .fillAndStroke(signature ? COLORS.paleGreen : '#FAFAFA', signature ? '#B8DAC8' : COLORS.border);
  setArabic(doc, 11.5, COLORS.navy).text(
    role.ar,
    x + 12,
    y + 7,
    { width: width - 24, align: 'right', lineBreak: false, wordSpacing: 1 }
  );
  setLatin(doc, 7.5, COLORS.muted).text(
    role.en,
    x + 12,
    y + 11,
    { width: width * 0.46, align: 'left', lineBreak: false }
  );
  setArabic(doc, 11, COLORS.text).text(
    display(name),
    x + 12,
    y + 28,
    { width: width - 24, align: 'right', lineGap: 1, wordSpacing: 1 }
  );
  if (signature) {
    setArabic(doc, 8.5, COLORS.green).text(
      'تم التوقيع إلكترونيا',
      x + (width * 0.51),
      y + height - 22,
      { width: (width * 0.49) - 12, align: 'right', lineBreak: false, wordSpacing: 1 }
    );
    setLatin(doc, 7, COLORS.muted).text(
      fmtDate(signature.signed_at, true),
      x + 12,
      y + height - 18,
      { width: width * 0.48, align: 'left', lineBreak: false }
    );
  } else {
    setArabic(doc, 8.5, COLORS.muted).text(
      'بانتظار التوقيع',
      x + 12,
      y + height - 22,
      { width: width - 24, align: 'right', lineBreak: false, wordSpacing: 1 }
    );
  }
}

function drawSignatureGrid(flow, roles, signatures, request) {
  const { doc } = flow;
  const gap = 8;
  const totalWidth = doc.page.width - (PAGE_MARGIN * 2);
  const cardWidth = (totalWidth - gap) / 2;
  for (let index = 0; index < roles.length; index += 2) {
    const row = roles.slice(index, index + 2);
    const height = Math.max(...row.map((role) => (
      signatureCardHeight(doc, cardWidth, role, signatures.get(role.key), request)
    )));
    flow.ensureSpace(height + 8);
    row.forEach((role, cellIndex) => {
      const x = PAGE_MARGIN + ((1 - cellIndex) * (cardWidth + gap));
      drawSignatureCard(
        doc,
        x,
        flow.y,
        cardWidth,
        height,
        role,
        signatures.get(role.key),
        request
      );
    });
    flow.y += height + 8;
  }
}

function drawHashStamp(flow, request) {
  const { doc } = flow;
  const width = doc.page.width - (PAGE_MARGIN * 2);
  const hash = display(request.pdf_data_hash || 'not yet stamped');
  setLatin(doc, 7.5);
  const hashHeight = doc.heightOfString(hash, { width: width - 28, align: 'left' });
  const height = Math.max(65, hashHeight + 48);
  flow.ensureSpace(height);
  doc.roundedRect(PAGE_MARGIN, flow.y, width, height, 5)
    .fillAndStroke('#F8FAFB', COLORS.border);
  setArabic(doc, 9, COLORS.muted).text(
    'بصمة المستند الرقمية - ترتبط جميع التوقيعات بهذه البصمة',
    PAGE_MARGIN + 14,
    flow.y + 8,
    { width: width - 28, align: 'right', lineBreak: false, wordSpacing: 1 }
  );
  setLatin(doc, 7.5, COLORS.text).text(
    `SHA-256: ${hash}`,
    PAGE_MARGIN + 14,
    flow.y + 27,
    { width: width - 28, align: 'left' }
  );
  setLatin(doc, 7.5, COLORS.muted).text(
    `Generated: ${new Date().toISOString()}`,
    PAGE_MARGIN + 14,
    flow.y + height - 17,
    { width: width - 28, align: 'left', lineBreak: false }
  );
  flow.y += height;
}

function assertBundledFont() {
  if (!fs.existsSync(MARRIAGE_PDF_ARABIC_FONT_PATH)) {
    const error = new Error(`Bundled Arabic PDF font is missing: ${MARRIAGE_PDF_ARABIC_FONT_PATH}`);
    error.code = 'MARRIAGE_PDF_FONT_MISSING';
    throw error;
  }
}

/** Build a polished, dynamically paginated PDF and return its bytes. */
export function generateMarriageSupportPdfBuffer(request) {
  assertBundledFont();
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        autoFirstPage: false,
        bufferPages: true,
        size: 'A4',
        margin: 0,
        info: {
          Title: `Marriage Support Acknowledgment ${display(request.sequence_number || request.id)}`,
          Author: 'Al-Shuail Family Fund',
          Subject: 'إقرار الدين - دعم الزواج',
          Keywords: 'marriage support, acknowledgment, electronic signatures',
        },
      });
      const buffers = [];
      doc.on('data', (buffer) => buffers.push(buffer));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);
      doc.registerFont(ARABIC_FONT, MARRIAGE_PDF_ARABIC_FONT_PATH);

      const flow = new FlowLayout(doc, request);
      flow.addPage();

      drawInfoGrid(flow, [
        { label: 'رقم الطلب', value: request.sequence_number || request.id },
        { label: 'تاريخ التقديم', value: fmtDate(request.created_at) },
        { label: 'حالة الطلب', value: STATUS_AR[request.status] || display(request.status) },
        { label: 'تاريخ إعداد الإقرار', value: fmtDate(request.pdf_generated_at) },
      ], { minimumRowHeight: 48 });

      flow.sectionTitle('بيانات المستفيد');
      drawInfoGrid(flow, [
        { label: 'اسم المستفيد', value: request.applicant_name },
        { label: 'الرقم المدني', value: request.national_id },
        { label: 'تاريخ الميلاد', value: fmtDate(request.date_of_birth) },
      ]);

      flow.sectionTitle('بيانات الزواج');
      drawInfoGrid(flow, [
        { label: 'اسم الزوجة', value: request.spouse_name_ar },
        { label: 'الرقم المدني للزوجة', value: request.spouse_national_id },
        { label: 'تاريخ الزواج', value: fmtDate(request.marriage_date) },
      ]);

      flow.sectionTitle('تفاصيل احتساب الدعم');
      drawInfoGrid(flow, [
        { label: 'إجمالي الاشتراكات', value: fmtAmount(request.contributions_sum) },
        {
          label: 'عدد العانيات السابقة',
          value: request.previous_ananiyat_count_override ?? request.previous_ananiyat_count_auto ?? 0,
        },
        { label: 'رصيد الدعم الإضافي', value: fmtAmount(request.additional_support_balance) },
        { label: 'قيمة العانية الخاصة', value: fmtAmount(request.special_ananiya_value) },
        { label: 'الإجمالي الأولي', value: fmtAmount(request.initial_total) },
        { label: 'المبلغ بعد الخصم', value: fmtAmount(request.after_discount) },
        { label: 'الرصيد التنافسي', value: fmtAmount(request.competitive_balance) },
      ], { minimumRowHeight: 41, rowGap: 3, fill: '#F7F9FB' });
      drawFinalAmount(flow, request.final_amount);

      // Keep the legal acknowledgment and its electronic signatures together
      // on a fresh page. Oversized names still paginate card-by-card below.
      flow.addPage();
      flow.sectionTitle('الإقرار');
      drawAcknowledgment(flow);
      flow.gap(8);

      flow.sectionTitle('الشهود المعتمدون');
      drawInfoGrid(flow, [
        { label: 'الشاهد الأول', value: request.witness_1_name || '-' },
        { label: 'الشاهد الثاني', value: request.witness_2_name || '-' },
      ], { minimumRowHeight: 48 });

      flow.sectionTitle('إعدادات الاحتساب المثبتة وقت إصدار الإقرار');
      drawInfoGrid(flow, [
        {
          label: 'نسبة الخصم',
          value: request.snapshot_competition_discount_rate === null ||
            request.snapshot_competition_discount_rate === undefined
            ? '-'
            : `${(Number(request.snapshot_competition_discount_rate) * 100).toFixed(2)}%`,
        },
        { label: 'الحد الأدنى للدعم', value: fmtAmount(request.snapshot_marriage_support_minimum) },
        { label: 'قيمة العانية', value: fmtAmount(request.snapshot_ananiyat_per_unit) },
        {
          label: 'معامل الدعم الإضافي',
          value: request.snapshot_additional_support_multiplier === null ||
            request.snapshot_additional_support_multiplier === undefined
            ? '-'
            : `${Number(request.snapshot_additional_support_multiplier).toFixed(2)}x`,
        },
      ], { minimumRowHeight: 45 });

      flow.sectionTitle('التوقيعات الإلكترونية');
      const signatures = new Map(
        (request.signatures || []).map((signature) => [signature.signer_role, signature])
      );
      drawSignatureGrid(flow, SIGNATURE_ROLES, signatures, request);
      flow.gap(4);
      drawHashStamp(flow, request);

      drawPageFooters(doc);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/** Stream the generated PDF to an Express response. */
export async function streamMarriageSupportPdf(request, res) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="marriage-support-${request.sequence_number || request.id}.pdf"`
  );
  const buffer = await generateMarriageSupportPdfBuffer(request);
  res.end(buffer);
}
