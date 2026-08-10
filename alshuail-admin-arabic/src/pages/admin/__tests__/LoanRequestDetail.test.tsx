import { API_ORIGIN } from '../../../utils/apiConfig';
import { fileUrl } from '../LoanRequestDetail';

describe('LoanRequestDetail document URL handling', () => {
  test('preserves the relative signed document endpoint on the API origin', () => {
    expect(fileUrl('/api/documents/file/payload.signature?download=1')).toBe(
      `${API_ORIGIN}/api/documents/file/payload.signature?download=1`
    );
  });

  test('does not rewrite an absolute signed endpoint as a public upload path', () => {
    const signed = `${API_ORIGIN}/api/documents/file/payload.signature`;
    expect(fileUrl(signed)).toBe(signed);
  });

  test('retains legacy relative paths only as a migration fallback', () => {
    expect(fileUrl('member-1/loan-id_copy/id.pdf')).toBe(
      `${API_ORIGIN}/uploads/member-documents/member-1/loan-id_copy/id.pdf`
    );
  });

  test('rejects non-http protocols and empty values', () => {
    expect(fileUrl('ftp://files.example.test/private.pdf')).toBeNull();
    expect(fileUrl('')).toBeNull();
    expect(fileUrl(null)).toBeNull();
  });
});
