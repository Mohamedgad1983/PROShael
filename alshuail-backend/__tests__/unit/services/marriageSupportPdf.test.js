import { afterEach, describe, expect, test } from '@jest/globals';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  MARRIAGE_PDF_ARABIC_FONT_PATH,
  generateMarriageSupportPdfBuffer,
} from '../../../src/services/marriageSupportPdf.js';

const tempDirectories = [];

function commandAvailable(command) {
  if (!command) {return false;}
  const result = spawnSync(command, ['-v'], { encoding: 'utf8' });
  return !result.error;
}

function fullySignedArabicRequest() {
  const dataHash = '62b27fc6f5f7eaf36d82c6845e34ad057d38b57aeaf45db22783bd88c3a14f21';
  return {
    id: '11111111-1111-4111-8111-111111111111',
    sequence_number: '2026-0042',
    status: 'signatures_complete',
    created_at: '2026-08-08T10:30:00.000Z',
    pdf_generated_at: '2026-08-08T11:00:00.000Z',
    applicant_name: 'محمد عبدالله شعيل العنزي',
    national_id: '123456789012',
    date_of_birth: '1990-04-12',
    spouse_name_ar: 'نورة أحمد مبارك العنزي',
    spouse_national_id: '298765432109',
    marriage_date: '2026-08-01',
    contributions_sum: '12500.00',
    previous_ananiyat_count_auto: 2,
    additional_support_balance: '3500.00',
    special_ananiya_value: '1000.00',
    initial_total: '17000.00',
    after_discount: '12750.00',
    competitive_balance: '11250.00',
    final_amount: '12750.00',
    witness_1_name: 'خالد فالح شعيل العنزي',
    witness_2_name: 'سعود مبارك شعيل العنزي',
    committee_chair_name: 'عبدالعزيز محمد شعيل العنزي',
    snapshot_competition_discount_rate: '0.25',
    snapshot_marriage_support_minimum: '10000.00',
    snapshot_ananiyat_per_unit: '500.00',
    snapshot_additional_support_multiplier: '1.50',
    pdf_data_hash: dataHash,
    signatures: [
      {
        signer_role: 'beneficiary',
        signer_name: 'محمد عبدالله شعيل العنزي',
        signed_at: '2026-08-08T12:00:00.000Z',
        data_hash: dataHash,
      },
      {
        signer_role: 'witness_1',
        signer_name: 'خالد فالح شعيل العنزي',
        signed_at: '2026-08-08T12:05:00.000Z',
        data_hash: dataHash,
      },
      {
        signer_role: 'witness_2',
        signer_name: 'سعود مبارك شعيل العنزي',
        signed_at: '2026-08-08T12:10:00.000Z',
        data_hash: dataHash,
      },
      {
        signer_role: 'committee_chair',
        signer_name: 'عبدالعزيز محمد شعيل العنزي',
        signed_at: '2026-08-08T12:15:00.000Z',
        data_hash: dataHash,
      },
    ],
  };
}

afterEach(() => {
  tempDirectories.splice(0).forEach((directory) => {
    fs.rmSync(directory, { recursive: true, force: true });
  });
});

describe('marriage support PDF rendering', () => {
  test('renders a fully signed Arabic acknowledgment as a parseable two-page A4 PDF', async () => {
    const font = fs.readFileSync(MARRIAGE_PDF_ARABIC_FONT_PATH);
    expect(font.length).toBeGreaterThan(200_000);
    expect(crypto.createHash('sha256').update(font).digest('hex')).toBe(
      'c9a039ce48a477243c1eb7d561b13de115cfd651d8a83fa42e2f4d63c2e11b00'
    );

    const request = fullySignedArabicRequest();
    const pdf = await generateMarriageSupportPdfBuffer(request);
    const source = pdf.toString('latin1');

    expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(source.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(pdf.length).toBeGreaterThan(20_000);
    expect(pdf.length).toBeLessThan(1_000_000);
    expect(source.match(/\/Type \/Page\b/g)).toHaveLength(2);
    expect(source).toContain('Marriage Support Acknowledgment 2026-0042');
    expect(source).toContain('Al-Shuail Family Fund');
    expect(source).toContain('NotoNaskhArabic');

    const startXref = source.match(/startxref\s+(\d+)\s+%%EOF\s*$/);
    expect(startXref).not.toBeNull();
    const xrefOffset = Number(startXref[1]);
    expect(xrefOffset).toBeGreaterThan(0);
    expect(source.slice(xrefOffset, xrefOffset + 4)).toBe('xref');

    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'marriage-pdf-'));
    tempDirectories.push(directory);
    const pdfPath = path.join(directory, 'fully-signed-arabic.pdf');
    fs.writeFileSync(pdfPath, pdf);

    const pdfInfoBin = process.env.PDFINFO_BIN || 'pdfinfo';
    if (commandAvailable(pdfInfoBin)) {
      const info = spawnSync(pdfInfoBin, [pdfPath], { encoding: 'utf8' });
      expect(info.status).toBe(0);
      expect(info.stdout).toMatch(/^Pages:\s+2$/m);
      expect(info.stdout).toMatch(/^Page size:\s+595\.28 x 841\.89 pts \(A4\)$/m);
    }

    const pdfToTextBin = process.env.PDFTOTEXT_BIN || 'pdftotext';
    if (commandAvailable(pdfToTextBin)) {
      const extracted = spawnSync(pdfToTextBin, ['-layout', pdfPath, '-'], { encoding: 'utf8' });
      expect(extracted.status).toBe(0);
      expect(extracted.stdout).toContain(request.sequence_number);
      expect(extracted.stdout).toContain(`SHA-256: ${request.pdf_data_hash}`);
      expect(extracted.stdout).toContain('Beneficiary');
      expect(extracted.stdout).toContain('Witness 1');
      expect(extracted.stdout).toContain('Witness 2');
      expect(extracted.stdout).toContain('Committee Chair');
      expect(extracted.stdout).toContain('Page 2 / 2');
    }

    const pdfToPpmBin = process.env.PDFTOPPM_BIN || 'pdftoppm';
    if (commandAvailable(pdfToPpmBin)) {
      const prefix = path.join(directory, 'render');
      const render = spawnSync(
        pdfToPpmBin,
        ['-f', '1', '-l', '2', '-r', '40', '-png', pdfPath, prefix],
        { encoding: 'utf8' }
      );
      expect(render.status).toBe(0);
      expect(fs.statSync(`${prefix}-1.png`).size).toBeGreaterThan(1_000);
      expect(fs.statSync(`${prefix}-2.png`).size).toBeGreaterThan(1_000);
    }
  });

  test('paginates unusually long Arabic signer names instead of overlapping signature rows', async () => {
    const request = fullySignedArabicRequest();
    const longName = Array(14).fill('عبدالله محمد شعيل العنزي').join(' ');
    request.signatures = request.signatures.map((signature) => ({
      ...signature,
      signer_name: longName,
    }));

    const pdf = await generateMarriageSupportPdfBuffer(request);
    const source = pdf.toString('latin1');
    const pages = source.match(/\/Type \/Page\b/g) || [];

    expect(pages.length).toBeGreaterThan(2);
    expect(source.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(pdf.length).toBeGreaterThan(20_000);
  });
});
