/**
 * Marriage Support PDF Generator (إقرار الدين)
 *
 * Generates a PDF for the marriage-support request — currently a basic
 * record using PDFKit's built-in Helvetica. Arabic glyphs will render as
 * fallback boxes until an Arabic font (Amiri / Cairo) is bundled into
 * `assets/fonts/`. The PDF data is INCLUDED IN THE HASH only via the
 * canonical request JSON (see generateRequestHash), not via the PDF
 * bytes — so the PDF can be regenerated any time without invalidating
 * existing signatures.
 *
 * Public:
 *   • generateMarriageSupportPdfBuffer(request) → Promise<Buffer>
 *   • streamMarriageSupportPdf(request, res)    → streams to Express res
 *
 * Both helpers expect a fully-loaded marriage_support_requests row.
 */

import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── font discovery ──────────────────────────────────────────────────────────
// If an Arabic TTF is bundled in the repo at one of these paths, we'll use it;
// otherwise we fall back to Helvetica (which is built into PDFKit but has no
// Arabic glyphs — Arabic text will render as fallback boxes).
const ARABIC_FONT_CANDIDATES = [
  path.resolve(__dirname, '../../assets/fonts/Amiri-Regular.ttf'),
  path.resolve(__dirname, '../../assets/fonts/Cairo-Regular.ttf'),
  path.resolve(__dirname, '../../assets/Amiri-Regular.ttf'),
];

function findArabicFontPath() {
  for (const p of ARABIC_FONT_CANDIDATES) {
    try {
      if (fs.existsSync(p)) {return p;}
    } catch (_e) { /* ignore */ }
  }
  return null;
}

const fmtAmount = (n) => {
  if (n === null || n === undefined || n === '') {return '—';}
  const v = Number(n);
  if (!Number.isFinite(v)) {return '—';}
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(v) + ' SAR';
};

const fmtDate = (s) => {
  if (!s) {return '—';}
  try {
    return new Date(s).toISOString().slice(0, 10);
  } catch {
    return String(s).slice(0, 10);
  }
};

/**
 * Build the PDF document and return the underlying buffer once finalised.
 */
export async function generateMarriageSupportPdfBuffer(request) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Marriage Support Request ${request.sequence_number || ''}`,
          Author: 'Al-Shuail Family Fund',
          Subject: 'إقرار الدين - دعم الزواج',
        },
      });

      const buffers = [];
      doc.on('data', (b) => buffers.push(b));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Use bundled Arabic font if available, otherwise Helvetica.
      const arabicFont = findArabicFontPath();
      if (arabicFont) {
        doc.registerFont('Arabic', arabicFont);
        doc.font('Arabic');
      } else {
        doc.font('Helvetica');
      }

      // ─── Header ───────────────────────────────────────────────────────
      doc.fontSize(18).text('AL-SHUAIL FAMILY FUND', { align: 'center' });
      doc.moveDown(0.2);
      doc.fontSize(14).text('Marriage Support Request — Acknowledgment of Debt', { align: 'center' });
      doc.fontSize(11).text('صندوق عائلة شعيل العنزي — إقرار دعم زواج', { align: 'center' });
      doc.moveDown(1);

      // ─── Request meta ──────────────────────────────────────────────────
      doc.fontSize(11).fillColor('#000');
      const seqDir = `Request #: ${request.sequence_number || '—'}`;
      doc.text(seqDir, { align: 'left' });
      doc.text(`Submitted: ${fmtDate(request.created_at)}`, { align: 'left' });
      doc.text(`Status: ${request.status || '—'}`, { align: 'left' });
      doc.moveDown(0.6);

      // ─── Beneficiary ──────────────────────────────────────────────────
      sectionTitle(doc, 'Beneficiary / المستفيد');
      kv(doc, 'Name', request.applicant_name || '—');
      kv(doc, 'National ID', request.national_id || '—');
      kv(doc, 'Date of Birth', fmtDate(request.date_of_birth));
      doc.moveDown(0.4);

      // ─── Marriage details ──────────────────────────────────────────────
      sectionTitle(doc, 'Marriage Details / بيانات الزواج');
      kv(doc, 'Spouse Name', request.spouse_name_ar || '—');
      kv(doc, 'Spouse National ID', request.spouse_national_id || '—');
      kv(doc, 'Marriage Date', fmtDate(request.marriage_date));
      doc.moveDown(0.4);

      // ─── Calculation breakdown ────────────────────────────────────────
      sectionTitle(doc, 'Calculation / تفاصيل الحساب');
      kv(doc, 'Contributions Sum', fmtAmount(request.contributions_sum));
      kv(doc, 'Previous Ananiyat Count',
        String(request.previous_ananiyat_count_override ?? request.previous_ananiyat_count_auto ?? 0));
      kv(doc, 'Additional Support Balance', fmtAmount(request.additional_support_balance));
      kv(doc, 'Special Ananiya Value', fmtAmount(request.special_ananiya_value));
      kv(doc, 'Initial Total', fmtAmount(request.initial_total));
      kv(doc, 'After Discount', fmtAmount(request.after_discount));
      kv(doc, 'Competitive Balance', fmtAmount(request.competitive_balance));
      doc.moveDown(0.2);
      doc.fontSize(13).fillColor('#0a7d3a').text(`FINAL AMOUNT: ${fmtAmount(request.final_amount)}`, { align: 'left' });
      doc.fontSize(11).fillColor('#000');
      doc.moveDown(0.6);

      // ─── Witnesses ────────────────────────────────────────────────────
      sectionTitle(doc, 'Witnesses / الشهود');
      kv(doc, 'Witness 1', request.witness_1_name || '— (not selected) —');
      kv(doc, 'Witness 2', request.witness_2_name || '— (not selected) —');
      doc.moveDown(0.4);

      // ─── Settings used ────────────────────────────────────────────────
      sectionTitle(doc, 'Settings Snapshot');
      kv(doc, 'Discount Rate',
        request.snapshot_competition_discount_rate != null
          ? `${(Number(request.snapshot_competition_discount_rate) * 100).toFixed(2)}%`
          : '—');
      kv(doc, 'Minimum Floor', fmtAmount(request.snapshot_marriage_support_minimum));
      kv(doc, 'Ananiya Per Unit', fmtAmount(request.snapshot_ananiyat_per_unit));
      kv(doc, 'Add-Support Multiplier',
        request.snapshot_additional_support_multiplier != null
          ? `${Number(request.snapshot_additional_support_multiplier).toFixed(2)}x`
          : '—');
      doc.moveDown(0.6);

      // ─── Acknowledgment text ──────────────────────────────────────────
      sectionTitle(doc, 'Acknowledgment / إقرار');
      doc.fontSize(10).fillColor('#333').text(
        'I, the undersigned beneficiary, acknowledge the accuracy of the data and ' +
        'attachments provided. I agree to the calculation and final amount above ' +
        'and consent to the disbursement of marriage support per Al-Shuail Family ' +
        'Fund regulations. I commit to the obligations stated in this acknowledgment.',
        { align: 'left' }
      );
      doc.moveDown(0.3);
      doc.text(
        'أقر أنا الموقع أدناه (المستفيد) بصحة البيانات والمرفقات المزودة، ' +
        'وأوافق على الحساب والمبلغ النهائي أعلاه، وأقبل صرف دعم الزواج وفق ' +
        'لائحة صندوق عائلة شعيل العنزي، وألتزم بالتعهدات المذكورة في هذا الإقرار.',
        { align: 'left' }
      );
      doc.moveDown(0.6);

      // ─── Signature placeholders ───────────────────────────────────────
      sectionTitle(doc, 'Signatures (electronic) / التوقيعات الإلكترونية');
      const sigOrder = ['beneficiary', 'witness_1', 'witness_2', 'committee_chair'];
      const sigLabels = {
        beneficiary: 'Beneficiary / المستفيد',
        witness_1: 'Witness 1 / الشاهد الأول',
        witness_2: 'Witness 2 / الشاهد الثاني',
        committee_chair: 'Committee Chair / رئيس اللجنة',
      };
      const have = (request.signatures || []).reduce((acc, s) => {
        acc[s.signer_role] = s;
        return acc;
      }, {});
      for (const r of sigOrder) {
        const s = have[r];
        const status = s
          ? `✓ Signed ${fmtDate(s.signed_at)} — ${s.signer_name || s.signer_member_id}`
          : '— pending —';
        kv(doc, sigLabels[r], status);
      }
      doc.moveDown(0.6);

      // ─── Hash stamp footer ────────────────────────────────────────────
      doc.fontSize(8).fillColor('#666').text(
        `Document hash (SHA-256): ${request.pdf_data_hash || 'not yet stamped'}`,
        { align: 'left' }
      );
      doc.text(`Generated at: ${new Date().toISOString()}`, { align: 'left' });
      doc.text(
        'This document is auto-generated by the Al-Shuail Family Fund system. ' +
        'Each electronic signature binds to the SHA-256 hash above.',
        { align: 'left' }
      );

      // If Arabic font is missing, leave a TODO note for the operator.
      if (!arabicFont) {
        doc.moveDown(0.4);
        doc.fontSize(8).fillColor('#aa5500').text(
          'NOTE: Arabic glyphs may render as fallback boxes — bundle Amiri-Regular.ttf ' +
          'into assets/fonts/ to fix. The hash and data are unaffected.',
          { align: 'left' }
        );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function sectionTitle(doc, title) {
  doc.fontSize(12).fillColor('#1e3a8a').text(title, { underline: true });
  doc.fontSize(11).fillColor('#000');
  doc.moveDown(0.2);
}

function kv(doc, k, v) {
  doc.fontSize(11).fillColor('#444').text(`${k}: `, { continued: true });
  doc.fillColor('#000').text(String(v));
}

/**
 * Stream the PDF directly to an Express response — preferred over building
 * the buffer + sending if the caller is the HTTP layer.
 */
export async function streamMarriageSupportPdf(request, res) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="marriage-support-${request.sequence_number || request.id}.pdf"`
  );
  const buffer = await generateMarriageSupportPdfBuffer(request);
  res.end(buffer);
}
