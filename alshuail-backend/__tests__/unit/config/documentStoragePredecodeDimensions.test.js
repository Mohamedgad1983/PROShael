import { afterAll, describe, expect, jest, test } from '@jest/globals';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { deflateSync } from 'node:zlib';

const uploadRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'document-predecode-limit-'));
process.env.UPLOAD_DIR = uploadRoot;

const mockLoadImage = jest.fn();

jest.unstable_mockModule('canvas', () => ({
  loadImage: mockLoadImage,
}));
jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: jest.fn(),
}));
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const { validateUploadedFile } = await import('../../../src/config/documentStorage.js');

const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const pngChunk = (type, data) => {
  const typeBytes = Buffer.from(type, 'ascii');
  const output = Buffer.alloc(12 + data.length);
  output.writeUInt32BE(data.length, 0);
  typeBytes.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.length);
  return output;
};

const makeCompressedOneBitPng = (width, height) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 1; // one-bit grayscale
  ihdr[9] = 0;

  const scanlineBytes = Math.ceil(width / 8);
  const raw = Buffer.alloc((scanlineBytes + 1) * height); // filter byte + black pixels
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
};

afterAll(async () => {
  await fs.rm(uploadRoot, { recursive: true, force: true });
});

describe('raster pre-decode resource bounds', () => {
  test('rejects a compressed 16,004,000-pixel PNG before calling loadImage', async () => {
    const buffer = makeCompressedOneBitPng(4000, 4001);
    expect(buffer.length).toBeLessThan(10_000);

    await expect(validateUploadedFile({
      originalname: 'oversized.png',
      mimetype: 'image/png',
      size: buffer.length,
      buffer,
    })).rejects.toMatchObject({ code: 'DOCUMENT_FILE_INVALID' });

    expect(mockLoadImage).not.toHaveBeenCalled();
  });
});
