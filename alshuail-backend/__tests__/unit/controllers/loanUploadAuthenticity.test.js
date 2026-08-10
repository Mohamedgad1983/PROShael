import { afterAll, beforeEach, describe, expect, jest, test } from '@jest/globals';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  forgedPdfBytes,
  forgedWebpBytes,
  jpegBytes,
  makeValidPdf,
  pngBytes,
  webpBytes,
} from '../../helpers/documentFixtures.js';

const uploadRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'loan-upload-controller-'));
process.env.UPLOAD_DIR = uploadRoot;

const mockQuery = jest.fn();
const mockCreateLoanRequest = jest.fn();
const mockCheckLoanEligibility = jest.fn();
const mockValidateRequestPayload = jest.fn();

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: mockQuery,
  getClient: jest.fn(),
}));
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.unstable_mockModule('../../../src/services/loanService.js', () => ({
  LOAN_STATUS: { SUBMITTED: 'submitted', UNDER_FUND_REVIEW: 'under_fund_review', CANCELLED: 'cancelled' },
  checkLoanEligibility: mockCheckLoanEligibility,
  validateRequestPayload: mockValidateRequestPayload,
  createLoanRequest: mockCreateLoanRequest,
  transitionStatus: jest.fn(),
}));
jest.unstable_mockModule('../../../src/services/statusHistoryService.js', () => ({
  getStatusHistory: jest.fn(),
}));
jest.unstable_mockModule('../../../src/services/financingRepaymentService.js', () => ({
  FINANCING_PROGRAM: { FAMILY: 'family_financing' },
  getRepaymentPlanByRequest: jest.fn(),
}));

const { createLoan } = await import('../../../src/controllers/loansController.js');

afterAll(async () => {
  await fs.rm(uploadRoot, { recursive: true, force: true });
});

const pdfBytes = makeValidPdf();

const file = (originalname, mimetype, buffer) => ({
  originalname,
  mimetype,
  size: buffer.length,
  buffer,
});

const responseRecorder = () => {
  const res = {
    statusCode: 200,
    body: null,
    status: jest.fn((statusCode) => {
      res.statusCode = statusCode;
      return res;
    }),
    json: jest.fn((body) => {
      res.body = body;
      return res;
    }),
  };
  return res;
};

describe('loan creation upload authenticity boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckLoanEligibility.mockResolvedValue({ ok: true });
    mockValidateRequestPayload.mockResolvedValue(null);
  });

  test('a text payload spoofed as JPG is rejected before loan/document DB inserts', async () => {
    const spoof = Buffer.from('not actually an identity image');
    const req = {
      user: { id: 'member-1' },
      body: {},
      files: {
        id_copy: [file('identity.jpg', 'image/jpeg', spoof)],
        salary_certificate: [file('salary.png', 'image/png', pngBytes)],
        financial_statement: [file('statement.jpg', 'image/jpeg', jpegBytes)],
      },
    };
    const res = responseRecorder();

    await createLoan(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      code: 'INVALID_DOCUMENT_FILE',
    });
    expect(JSON.stringify(res.body)).not.toContain('identity.jpg');
    expect(mockCreateLoanRequest).not.toHaveBeenCalled();
    expect(mockQuery).not.toHaveBeenCalled();
    await expect(fs.access(path.join(uploadRoot, 'member-documents', 'member-1')))
      .rejects.toMatchObject({ code: 'ENOENT' });
  });

  test.each([
    ['genuine PDF', file('identity.pdf', 'application/pdf', pdfBytes)],
    ['genuine WebP', file('identity.webp', 'image/webp', webpBytes)],
    ['forged 169-byte PDF', file('identity.pdf', 'application/pdf', forgedPdfBytes)],
    ['forged 30-byte WebP', file('identity.webp', 'image/webp', forgedWebpBytes)],
  ])('%s is rejected by loan policy before file or DB writes', async (_label, prohibitedFile) => {
    const req = {
      user: { id: 'member-1' },
      body: {},
      files: {
        id_copy: [prohibitedFile],
        salary_certificate: [file('salary.png', 'image/png', pngBytes)],
        financial_statement: [file('statement.jpg', 'image/jpeg', jpegBytes)],
      },
    };
    const res = responseRecorder();

    await createLoan(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ success: false, code: 'INVALID_DOCUMENT_FILE' });
    expect(mockCreateLoanRequest).not.toHaveBeenCalled();
    expect(mockQuery).not.toHaveBeenCalled();
    await expect(fs.access(path.join(uploadRoot, 'member-documents', 'member-1')))
      .rejects.toMatchObject({ code: 'ENOENT' });
  });
});
