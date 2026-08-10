import { createHmac } from 'crypto';
import { afterAll, beforeEach, describe, expect, test } from '@jest/globals';
import {
  getSignedUrl,
  verifySignedDocumentToken,
} from '../../../src/config/documentStorage.js';

const originalDocumentSecret = process.env.DOCUMENT_SIGNING_SECRET;
const originalJwtSecret = process.env.JWT_SECRET;

const tokenFromUrl = (signedUrl) => decodeURIComponent(signedUrl.split('/').pop());

const legacyToken = (filePath, expiresAt) => {
  const payload = Buffer.from(JSON.stringify({ p: filePath, e: expiresAt })).toString('base64url');
  const signature = createHmac('sha256', process.env.DOCUMENT_SIGNING_SECRET || process.env.JWT_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
};

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

  test('issues an opaque v2 token and verifies its storage-root-relative path', () => {
    const filePath = 'member-1/receipts/private-receipt.pdf';
    const url = getSignedUrl(filePath, 300);
    expect(url).toMatch(/^\/api\/documents\/file\/v2\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);

    const token = tokenFromUrl(url);
    expect(token).not.toContain(filePath);
    expect(token).not.toContain(Buffer.from(filePath).toString('base64url'));
    expect(token.split('.').slice(1).map((part) => Buffer.from(part, 'base64url').toString('utf8')).join(''))
      .not.toContain(filePath);

    const verified = verifySignedDocumentToken(token);
    expect(verified.filePath).toBe(filePath);
    expect(verified.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  test('rejects a v2 token after authenticated ciphertext is tampered with', () => {
    const token = tokenFromUrl(getSignedUrl('member-1/receipts/receipt.pdf', 300));
    const parts = token.split('.');
    parts[2] = `${parts[2][0] === 'A' ? 'B' : 'A'}${parts[2].slice(1)}`;

    expect(() => verifySignedDocumentToken(parts.join('.'))).toThrow(
      expect.objectContaining({ code: 'DOCUMENT_TOKEN_INVALID' })
    );
  });

  test('rejects a v2 token under a different encryption key', () => {
    const token = tokenFromUrl(getSignedUrl('member-1/receipts/receipt.pdf', 300));
    process.env.DOCUMENT_SIGNING_SECRET = 'different-document-secret';

    expect(() => verifySignedDocumentToken(token)).toThrow(
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
    const token = legacyToken('../outside/private.pdf', Math.floor(Date.now() / 1000) + 300);

    expect(() => verifySignedDocumentToken(token)).toThrow(
      expect.objectContaining({ code: 'DOCUMENT_TOKEN_INVALID' })
    );
    expect(() => getSignedUrl('../outside/private.pdf')).toThrow('storage root');
  });

  test('accepts a strict unexpired legacy v1 HMAC token without issuing one', () => {
    const filePath = 'member-1/receipts/legacy.pdf';
    const token = legacyToken(filePath, Math.floor(Date.now() / 1000) + 300);

    expect(token).not.toMatch(/^v2\./);
    expect(verifySignedDocumentToken(token).filePath).toBe(filePath);
    expect(tokenFromUrl(getSignedUrl(filePath, 300))).toMatch(/^v2\./);
  });

  test('rejects a legacy token whose remaining lifetime exceeds the 24-hour issuance ceiling', () => {
    const now = Math.floor(Date.now() / 1000);
    const token = legacyToken('member-1/receipts/overlong.pdf', now + (24 * 60 * 60) + 1);
    expect(() => verifySignedDocumentToken(token, now)).toThrow(
      expect.objectContaining({ code: 'DOCUMENT_TOKEN_INVALID' })
    );
  });

  test('uses JWT_SECRET only when the dedicated document secret is absent', () => {
    delete process.env.DOCUMENT_SIGNING_SECRET;
    const token = tokenFromUrl(getSignedUrl('member-1/receipts/fallback.pdf', 300));
    expect(verifySignedDocumentToken(token).filePath).toBe('member-1/receipts/fallback.pdf');
  });
});
