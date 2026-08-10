import { createCanvas } from 'canvas';

const jpegCanvas = createCanvas(2, 2);
const jpegContext = jpegCanvas.getContext('2d');
jpegContext.fillStyle = '#c53030';
jpegContext.fillRect(0, 0, 2, 2);
export const jpegBytes = jpegCanvas.toBuffer('image/jpeg');

export const pngBytes = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

export const webpBytes = Buffer.from(
  'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA',
  'base64'
);

const forgedPdfPrefix = `%PDF-1.4
1 0 obj
<< /Type /Catalog >>
2 0 obj
<< /Type /Pages >>
3 0 obj
<< /Type /Page >>
%${'A'.repeat(51)}
`;
const forgedPdfXrefOffset = Buffer.byteLength(forgedPdfPrefix, 'latin1');
export const forgedPdfBytes = Buffer.from(
  `${forgedPdfPrefix}xref\nstartxref\n${forgedPdfXrefOffset}\n%%EOF\n`,
  'latin1'
);

export const forgedWebpBytes = Buffer.from(
  '524946461600000057454250565038200a0000000000009d012a01000100',
  'hex'
);

export const asUpload = (originalname, mimetype, buffer) => ({
  originalname,
  mimetype,
  size: buffer.length,
  buffer,
});

export function makeValidPdf(label = 'loan evidence') {
  const escapedLabel = String(label).replace(/[()\\]/g, '');
  const stream = `BT /F1 12 Tf (${escapedLabel}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`,
  ];
  let source = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(source, 'latin1'));
    source += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(source, 'latin1');
  source += `xref\n0 ${objects.length + 1}\n`;
  source += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    source += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  source += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  source += `startxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(source, 'latin1');
}

const isoBox = (type, payload) => {
  const body = Buffer.from(payload);
  const box = Buffer.alloc(8 + body.length);
  box.writeUInt32BE(box.length, 0);
  box.write(type, 4, 4, 'ascii');
  body.copy(box, 8);
  return box;
};

export function makeIsoBmffImage(mimeType) {
  const brand = mimeType === 'image/heic' ? 'heic' : 'mif1';
  const compatibleBrand = mimeType === 'image/heic' ? 'mif1' : 'msf1';
  const ftypPayload = Buffer.alloc(16);
  ftypPayload.write(brand, 0, 4, 'ascii');
  ftypPayload.writeUInt32BE(0, 4);
  ftypPayload.write(brand, 8, 4, 'ascii');
  ftypPayload.write(compatibleBrand, 12, 4, 'ascii');
  return Buffer.concat([
    isoBox('ftyp', ftypPayload),
    isoBox('meta', Buffer.from([0, 0, 0, 0])),
    isoBox('mdat', Buffer.from('structural-image-payload')),
  ]);
}
