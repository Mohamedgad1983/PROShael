import { afterAll, beforeAll, describe, expect, jest, test } from '@jest/globals';
import express from 'express';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import {
  asUpload,
  forgedPdfBytes,
  forgedWebpBytes,
  jpegBytes,
  makeIsoBmffImage,
  makeValidPdf,
  pngBytes,
  webpBytes,
} from '../../helpers/documentFixtures.js';

const uploadRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'loan-document-authenticity-'));
process.env.UPLOAD_DIR = uploadRoot;

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: jest.fn(),
}));
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const {
  BUCKET_NAME,
  LOAN_DOCUMENT_ALLOWED_MIME_TYPES,
  loanUpload,
  uploadToSupabase,
  validateStoredFile,
  validateUploadedFile,
} = await import('../../../src/config/documentStorage.js');
const {
  LOAN_DOCUMENT_EVIDENCE_ERROR_CODE,
  requireValidLoanDocumentEvidence,
} = await import('../../../src/services/loanDocumentEvidenceService.js');

const pdfBytes = makeValidPdf();

const absoluteStoredPath = (filePath) => path.join(uploadRoot, BUCKET_NAME, filePath);

async function createEvidenceRows() {
  const fixtures = [
    ['id_copy', asUpload('identity.jpg', 'image/jpeg', jpegBytes)],
    ['salary_certificate', asUpload('salary.png', 'image/png', pngBytes)],
    ['financial_statement', asUpload('statement.jpg', 'image/jpeg', jpegBytes)],
  ];
  const rows = [];
  for (const [documentType, file] of fixtures) {
    const stored = await uploadToSupabase(file, 'member-1', `loan-${documentType}`);
    rows.push({
      id: `doc-${documentType}`,
      document_type: documentType,
      file_path: stored.path,
      file_size: stored.size,
      file_type: stored.type,
      original_name: file.originalname,
    });
  }
  return rows;
}

async function appendEvidenceRow(rows, documentType, file, memberId = 'member-stage-evidence') {
  const stored = await uploadToSupabase(file, memberId, `loan-${documentType}`);
  const row = {
    id: `doc-${documentType}`,
    document_type: documentType,
    file_path: stored.path,
    file_size: stored.size,
    file_type: stored.type,
    original_name: file.originalname,
  };
  rows.push(row);
  return row;
}

beforeAll(async () => {
  await fs.mkdir(path.join(uploadRoot, BUCKET_NAME), { recursive: true });
});

afterAll(async () => {
  await fs.rm(uploadRoot, { recursive: true, force: true });
});

describe('document storage content authenticity', () => {
  test.each([
    ['JPEG', asUpload('identity.jpeg', 'image/jpeg', jpegBytes), 'image/jpeg'],
    ['PNG', asUpload('salary.PNG', 'image/png', pngBytes), 'image/png'],
    ['PDF', asUpload('statement.pdf', 'application/pdf', pdfBytes), 'application/pdf'],
    ['WebP', asUpload('statement.webp', 'image/webp', webpBytes), 'image/webp'],
  ])('accepts genuine %s bytes with matching MIME and extension', async (_label, file, mimeType) => {
    await expect(validateUploadedFile(file)).resolves.toEqual(expect.objectContaining({
      mimeType,
      size: file.buffer.length,
    }));
  });

  test.each([
    ['literal text', Buffer.from('this is not a jpeg image')],
    ['tiny magic prefix', Buffer.from([0xff, 0xd8, 0xff, 0xd9])],
  ])('rejects %s before any filesystem write', async (_label, buffer) => {
    const memberDirectory = path.join(uploadRoot, BUCKET_NAME, 'spoof-member');
    const file = asUpload('evidence.jpg', 'image/jpeg', buffer);

    await expect(uploadToSupabase(file, 'spoof-member', 'loan-id_copy'))
      .rejects.toMatchObject({ code: 'DOCUMENT_FILE_INVALID' });
    await expect(fs.access(memberDirectory)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('rejects actual content that disagrees with declared MIME or extension without leaking a name', async () => {
    for (const file of [
      asUpload('identity.png', 'image/png', jpegBytes),
      asUpload('identity.pdf', 'image/jpeg', jpegBytes),
    ]) {
      try {
        await validateUploadedFile(file);
        throw new Error('expected validation failure');
      } catch (error) {
        expect(error).toMatchObject({ code: 'DOCUMENT_FILE_INVALID' });
        expect(error.message).not.toContain(file.originalname);
      }
    }
  });

  test.each([
    ['JPEG sandwich', asUpload(
      'sandwich.jpg',
      'image/jpeg',
      Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(44, 0x41), Buffer.from([0xff, 0xd9])])
    )],
    ['PDF sandwich', asUpload(
      'sandwich.pdf',
      'application/pdf',
      Buffer.from('%PDF-1.7\nthis is not a PDF object graph\nstartxref\n9\n%%EOF\n')
    )],
  ])('rejects a superficial %s despite matching outer markers', async (_label, file) => {
    await expect(validateUploadedFile(file)).rejects.toMatchObject({ code: 'DOCUMENT_FILE_INVALID' });
  });

  test('rejects the forged 169-byte PDF in generic validation before filesystem mutation', async () => {
    expect(forgedPdfBytes).toHaveLength(169);
    const file = asUpload('forged.pdf', 'application/pdf', forgedPdfBytes);

    await expect(validateUploadedFile(file))
      .rejects.toMatchObject({ code: 'DOCUMENT_FILE_INVALID' });
    await expect(uploadToSupabase(file, 'forged-pdf-member', 'other'))
      .rejects.toMatchObject({ code: 'DOCUMENT_FILE_INVALID' });
    await expect(fs.access(path.join(uploadRoot, BUCKET_NAME, 'forged-pdf-member')))
      .rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('rejects the forged 30-byte WebP in generic validation before filesystem mutation', async () => {
    expect(forgedWebpBytes).toHaveLength(30);
    const file = asUpload('forged.webp', 'image/webp', forgedWebpBytes);

    await expect(validateUploadedFile(file))
      .rejects.toMatchObject({ code: 'DOCUMENT_FILE_INVALID' });
    await expect(uploadToSupabase(file, 'forged-webp-member', 'other'))
      .rejects.toMatchObject({ code: 'DOCUMENT_FILE_INVALID' });
    await expect(fs.access(path.join(uploadRoot, BUCKET_NAME, 'forged-webp-member')))
      .rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('decodes and stores the known-good WebP through the shared uploader', async () => {
    const file = asUpload('valid.webp', 'image/webp', webpBytes);
    const stored = await uploadToSupabase(file, 'valid-webp-member', 'other');

    expect(stored).toMatchObject({ size: webpBytes.length, type: 'image/webp' });
    await expect(validateStoredFile({
      filePath: stored.path,
      expectedSize: stored.size,
      expectedMimeType: stored.type,
      expectedOriginalName: file.originalname,
    })).resolves.toEqual({ size: webpBytes.length, mimeType: 'image/webp' });
  });

  test.each([
    ['image/jpg alias', asUpload('photo.jpg', 'image/jpg', jpegBytes), 'image/jpeg'],
    ['HEIC', asUpload('photo.heic', 'image/heic', makeIsoBmffImage('image/heic')), 'image/heic'],
    ['HEIF', asUpload('photo.heif', 'image/heif', makeIsoBmffImage('image/heif')), 'image/heif'],
  ])('preserves shared uploader compatibility for %s', async (_label, file, mimeType) => {
    await expect(validateUploadedFile(file)).resolves.toEqual(expect.objectContaining({ mimeType }));
  });

  test('loan-specific validation rejects HEIC even when the shared format is structurally valid', async () => {
    const file = asUpload('photo.heic', 'image/heic', makeIsoBmffImage('image/heic'));
    await expect(validateUploadedFile(file, {
      allowedMimeTypes: LOAN_DOCUMENT_ALLOWED_MIME_TYPES,
    })).rejects.toMatchObject({ code: 'DOCUMENT_FILE_INVALID' });
  });

  test.each([
    ['genuine PDF', asUpload('document.pdf', 'application/pdf', pdfBytes)],
    ['genuine WebP', asUpload('document.webp', 'image/webp', webpBytes)],
    ['forged 169-byte PDF', asUpload('forged.pdf', 'application/pdf', forgedPdfBytes)],
    ['forged 30-byte WebP', asUpload('forged.webp', 'image/webp', forgedWebpBytes)],
  ])('loan-specific byte validation rejects %s', async (_label, file) => {
    if (_label.includes('169-byte')) {expect(file.buffer).toHaveLength(169);}
    if (_label.includes('30-byte')) {expect(file.buffer).toHaveLength(30);}
    await expect(validateUploadedFile(file, {
      allowedMimeTypes: LOAN_DOCUMENT_ALLOWED_MIME_TYPES,
    })).rejects.toMatchObject({ code: 'DOCUMENT_FILE_INVALID' });
  });

  test.each([
    ['genuine PDF', 'document.pdf', 'application/pdf', pdfBytes],
    ['genuine WebP', 'document.webp', 'image/webp', webpBytes],
    ['forged 169-byte PDF', 'forged.pdf', 'application/pdf', forgedPdfBytes],
    ['forged 30-byte WebP', 'forged.webp', 'image/webp', forgedWebpBytes],
  ])('loan Multer rejects %s before its route handler', async (_label, filename, mimeType, buffer) => {
    const routeHandler = jest.fn((_req, res) => res.sendStatus(204));
    const app = express();
    app.post('/loan-document', loanUpload.single('document'), routeHandler);
    app.use((error, _req, res, _next) => res.status(400).json({ code: error.code }));

    const response = await request(app)
      .post('/loan-document')
      .attach('document', buffer, { filename, contentType: mimeType });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 'DOCUMENT_FILE_INVALID' });
    expect(routeHandler).not.toHaveBeenCalled();
  });

  test('validates a confined stored file against exact size, type, and extension metadata', async () => {
    const file = asUpload('statement.pdf', 'application/pdf', pdfBytes);
    const stored = await uploadToSupabase(file, 'member-stored', 'loan-financial_statement');

    await expect(validateStoredFile({
      filePath: stored.path,
      expectedSize: stored.size,
      expectedMimeType: stored.type,
      expectedOriginalName: file.originalname,
    })).resolves.toEqual({ size: stored.size, mimeType: 'application/pdf' });

    await expect(validateStoredFile({
      filePath: stored.path,
      expectedSize: stored.size + 1,
      expectedMimeType: stored.type,
      expectedOriginalName: file.originalname,
    })).rejects.toMatchObject({ code: 'DOCUMENT_FILE_INVALID' });
  });

  test('uses an opaque stored filename and rejects a symlinked upload parent', async () => {
    const file = asUpload('sensitive salary statement.pdf', 'application/pdf', pdfBytes);
    const stored = await uploadToSupabase(file, 'opaque-member', 'loan-financial_statement');
    expect(path.basename(stored.path)).not.toContain('sensitive');
    expect(path.basename(stored.path)).toMatch(/^\d+_[0-9a-f-]+\.pdf$/);

    const outsideDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'loan-upload-outside-'));
    const symlinkMemberPath = path.join(uploadRoot, BUCKET_NAME, 'symlink-member');
    await fs.symlink(outsideDirectory, symlinkMemberPath, 'dir');
    try {
      await expect(uploadToSupabase(file, 'symlink-member', 'loan-financial_statement'))
        .rejects.toMatchObject({ code: 'DOCUMENT_FILE_INVALID' });
      await expect(fs.readdir(outsideDirectory)).resolves.toEqual([]);
    } finally {
      await fs.rm(outsideDirectory, { recursive: true, force: true });
    }
  });
});

describe('required loan evidence validation', () => {
  test('accepts active JPEG and PNG evidence with consistent DB metadata', async () => {
    const rows = await createEvidenceRows();
    const client = { query: jest.fn().mockResolvedValue({ rows }) };

    await expect(requireValidLoanDocumentEvidence({ client, loanId: 'loan-1' }))
      .resolves.toBe(true);
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('FOR SHARE'),
      ['loan-1', ['id_copy', 'salary_certificate', 'financial_statement']]
    );
  });

  test.each([
    ['genuine PDF', asUpload('statement.pdf', 'application/pdf', pdfBytes)],
    ['genuine WebP', asUpload('statement.webp', 'image/webp', webpBytes)],
  ])('fails closed when stored required evidence is a %s', async (_label, prohibitedFile) => {
    const rows = await createEvidenceRows();
    const stored = await uploadToSupabase(
      prohibitedFile,
      'member-prohibited-evidence',
      'loan-financial_statement'
    );
    const financialStatement = rows.find((row) => row.document_type === 'financial_statement');
    Object.assign(financialStatement, {
      file_path: stored.path,
      file_size: stored.size,
      file_type: stored.type,
      original_name: prohibitedFile.originalname,
    });
    const client = { query: jest.fn().mockResolvedValue({ rows }) };

    await expect(requireValidLoanDocumentEvidence({ client, loanId: 'loan-prohibited-type' }))
      .rejects.toMatchObject({ code: LOAN_DOCUMENT_EVIDENCE_ERROR_CODE });
  });

  test('stage-aware validation blocks missing Najiz evidence', async () => {
    const rows = await createEvidenceRows();
    const client = { query: jest.fn().mockResolvedValue({ rows }) };

    await expect(requireValidLoanDocumentEvidence({
      client,
      loanId: 'loan-missing-najiz',
      requiredDocumentTypes: ['najiz_acknowledgment'],
    })).rejects.toMatchObject({ code: LOAN_DOCUMENT_EVIDENCE_ERROR_CODE });
  });

  test('stage-aware validation blocks corrupt Najiz evidence', async () => {
    const rows = await createEvidenceRows();
    const najiz = await appendEvidenceRow(
      rows,
      'najiz_acknowledgment',
      asUpload('najiz.jpg', 'image/jpeg', jpegBytes),
      'member-corrupt-najiz'
    );
    const corrupt = Buffer.from('corrupt Najiz evidence');
    await fs.writeFile(absoluteStoredPath(najiz.file_path), corrupt);
    najiz.file_size = corrupt.length;
    const client = { query: jest.fn().mockResolvedValue({ rows }) };

    await expect(requireValidLoanDocumentEvidence({
      client,
      loanId: 'loan-corrupt-najiz',
      requiredDocumentTypes: ['najiz_acknowledgment'],
    })).rejects.toMatchObject({ code: LOAN_DOCUMENT_EVIDENCE_ERROR_CODE });
  });

  test('new no-fee path accepts authentic base and Najiz evidence', async () => {
    const rows = await createEvidenceRows();
    await appendEvidenceRow(
      rows,
      'najiz_acknowledgment',
      asUpload('najiz.png', 'image/png', pngBytes),
      'member-valid-najiz'
    );
    const client = { query: jest.fn().mockResolvedValue({ rows }) };

    await expect(requireValidLoanDocumentEvidence({
      client,
      loanId: 'loan-no-fee-path',
      requiredDocumentTypes: ['najiz_acknowledgment'],
    })).resolves.toBe(true);
  });

  test('legacy fee-collected path blocks a missing fee receipt', async () => {
    const rows = await createEvidenceRows();
    await appendEvidenceRow(
      rows,
      'najiz_acknowledgment',
      asUpload('najiz.jpg', 'image/jpeg', jpegBytes),
      'member-legacy-fee'
    );
    const client = { query: jest.fn().mockResolvedValue({ rows }) };

    await expect(requireValidLoanDocumentEvidence({
      client,
      loanId: 'loan-missing-fee',
      requiredDocumentTypes: ['najiz_acknowledgment', 'fee_receipt'],
    })).rejects.toMatchObject({ code: LOAN_DOCUMENT_EVIDENCE_ERROR_CODE });
  });

  test('fails closed when a required active document row is missing', async () => {
    const rows = (await createEvidenceRows()).filter((row) => row.document_type !== 'financial_statement');
    const client = { query: jest.fn().mockResolvedValue({ rows }) };

    await expect(requireValidLoanDocumentEvidence({ client, loanId: 'loan-missing-row' }))
      .rejects.toMatchObject({ code: LOAN_DOCUMENT_EVIDENCE_ERROR_CODE });
  });

  test.each([
    ['missing file', null],
    ['tiny file', Buffer.from([0xff, 0xd8, 0xff, 0xd9])],
    ['text file', Buffer.from('forwarded document spoof')],
  ])('fails closed for a %s without exposing its stored location', async (_label, replacement) => {
    const rows = await createEvidenceRows();
    const target = rows.find((row) => row.document_type === 'id_copy');
    if (replacement === null) {
      await fs.unlink(absoluteStoredPath(target.file_path));
    } else {
      await fs.writeFile(absoluteStoredPath(target.file_path), replacement);
      target.file_size = replacement.length;
    }
    const client = { query: jest.fn().mockResolvedValue({ rows }) };

    try {
      await requireValidLoanDocumentEvidence({ client, loanId: 'loan-invalid-file' });
      throw new Error('expected validation failure');
    } catch (error) {
      expect(error).toMatchObject({ code: LOAN_DOCUMENT_EVIDENCE_ERROR_CODE });
      expect(error.message).not.toContain(target.file_path);
      expect(error.message).not.toContain(target.original_name);
    }
  });

  test.each([
    ['size', (row) => { row.file_size += 1; }],
    ['type', (row) => { row.file_type = 'image/png'; }],
  ])('fails closed for DB/file %s mismatch', async (_label, corruptMetadata) => {
    const rows = await createEvidenceRows();
    corruptMetadata(rows[0]);
    const client = { query: jest.fn().mockResolvedValue({ rows }) };

    await expect(requireValidLoanDocumentEvidence({ client, loanId: 'loan-metadata-mismatch' }))
      .rejects.toMatchObject({ code: LOAN_DOCUMENT_EVIDENCE_ERROR_CODE });
  });
});
