import { createHmac } from 'crypto';
import { afterAll, beforeEach, describe, expect, test } from '@jest/globals';
import {
  getSignedUrl,
  verifySignedDocumentToken,
} from '../../../src/config/documentStorage.js';

const originalDocumentSecret = process.env.DOCUMENT_SIGNING_SECRET;
const originalJwtSecret = process.env.JWT_SECRET;

const tokenFromUrl = (signedUrl) => decodeURIComponent(signedUrl.split('/').pop());

describe('signed document storage URLs', () => {
  beforeEach(() => {
    process.env.DOCUMENT_SIGNING_SECRET = 'document-test-secret';
    process.env.JWT_SECRET = 'jwt-fallback-test-secret';
  });

  afterAll(() => {
    if (originalDocumentSecret === undefined) {
      delete process.env.DOCUMENT_SIGNING_SECRET;
    } else {
      process.env.DOCUMENT_SIGNING_SECRET = originalDocumentSecret;
    }
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
  });

  test('signs a storage-root-relative path and verifies it', () => {
    const url = getSignedUrl('member-1/receipts/receipt.pdf', 300);
    expect(url).toMatch(/^\/api\/documents\/file\/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);

    const verified = verifySignedDocumentToken(tokenFromUrl(url));
    expect(verified.filePath).toBe('member-1/receipts/receipt.pdf');
    expect(verified.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  test('rejects a token after either signed segment is tampered with', () => {
    const token = tokenFromUrl(getSignedUrl('member-1/receipts/receipt.pdf', 300));
    const [payload, signature] = token.split('.');
    const changedSignature = `${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`;

    expect(() => verifySignedDocumentToken(`${payload}.${changedSignature}`)).toThrow(
      expect.objectContaining({ code: 'DOCUMENT_TOKEN_INVALID' })
    );
  });

  test('rejects an expired token at the exact expiry boundary', () => {
    const issuedAt = Math.floor(Date.now() / 1000);
    const token = tokenFromUrl(getSignedUrl('member-1/receipts/receipt.pdf', 1));

    expect(() => verifySignedDocumentToken(token, issuedAt + 1)).toThrow(
      expect.objectContaining({ code: 'DOCUMENT_TOKEN_EXPIRED' })
    );
  });

  test('rejects traversal even when the payload has a valid signature', () => {
    const payload = Buffer.from(JSON.stringify({
      p: '../outside/private.pdf',
      e: Math.floor(Date.now() / 1000) + 300,
    })).toString('base64url');
    const signature = createHmac('sha256', process.env.DOCUMENT_SIGNING_SECRET)
      .update(payload)
      .digest('base64url');

    expect(() => verifySignedDocumentToken(`${payload}.${signature}`)).toThrow(
      expect.objectContaining({ code: 'DOCUMENT_TOKEN_INVALID' })
    );
    expect(() => getSignedUrl('../outside/private.pdf')).toThrow('storage root');
  });

  test('uses JWT_SECRET only when the dedicated document secret is absent', () => {
    delete process.env.DOCUMENT_SIGNING_SECRET;
    const token = tokenFromUrl(getSignedUrl('member-1/receipts/fallback.pdf', 300));
    expect(verifySignedDocumentToken(token).filePath).toBe('member-1/receipts/fallback.pdf');
  });
});
