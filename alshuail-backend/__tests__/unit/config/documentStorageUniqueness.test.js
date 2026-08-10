import { afterAll, describe, expect, jest, test } from '@jest/globals';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { makeValidPdf } from '../../helpers/documentFixtures.js';

const uploadRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-document-uniqueness-'));
process.env.UPLOAD_DIR = uploadRoot;

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: jest.fn(),
}));
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const { uploadToSupabase, readFile } = await import(
  '../../../src/config/documentStorage.js'
);

afterAll(async () => {
  await fs.rm(uploadRoot, { recursive: true, force: true });
});

describe('document storage evidence uniqueness', () => {
  test('concurrent same-millisecond uploads never share or overwrite a path', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_786_300_000_000);
    const firstBytes = makeValidPdf('first financial evidence');
    const secondBytes = makeValidPdf('second financial evidence');
    const baseFile = {
      originalname: 'receipt.pdf',
      mimetype: 'application/pdf',
    };

    try {
      const [first, second] = await Promise.all([
        uploadToSupabase({ ...baseFile, size: firstBytes.length, buffer: firstBytes }, 'member-1', 'receipts'),
        uploadToSupabase({ ...baseFile, size: secondBytes.length, buffer: secondBytes }, 'member-1', 'receipts'),
      ]);

      expect(first.path).not.toBe(second.path);
      await expect(readFile(first.path)).resolves.toEqual(firstBytes);
      await expect(readFile(second.path)).resolves.toEqual(secondBytes);
    } finally {
      now.mockRestore();
    }
  });
});
