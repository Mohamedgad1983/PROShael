import {
  LOAN_DOCUMENT_ALLOWED_MIME_TYPES,
  validateStoredFile,
} from '../config/documentStorage.js';

export const REQUIRED_LOAN_DOCUMENT_TYPES = Object.freeze([
  'id_copy',
  'salary_certificate',
  'financial_statement',
]);

export const LOAN_DOCUMENT_EVIDENCE_ERROR_CODE = 'LOAN_DOCUMENT_EVIDENCE_INVALID';
const invalidLoanEvidenceError = () => {
  const error = new Error('Loan document evidence is invalid');
  error.code = LOAN_DOCUMENT_EVIDENCE_ERROR_CODE;
  return error;
};

/**
 * Require authentic, internally consistent active evidence while the caller's
 * loan transaction is holding its row lock. Document rows are share-locked so
 * metadata or soft deletion cannot race the status transition.
 */
export async function requireValidLoanDocumentEvidence({
  client,
  loanId,
  requiredDocumentTypes = [],
}) {
  if (
    !Array.isArray(requiredDocumentTypes)
    || requiredDocumentTypes.some((type) => typeof type !== 'string' || type.length === 0)
  ) {
    throw invalidLoanEvidenceError();
  }
  const requiredTypes = [...new Set([
    ...REQUIRED_LOAN_DOCUMENT_TYPES,
    ...requiredDocumentTypes,
  ])];
  const { rows } = await client.query(
    `SELECT id, document_type, file_path, file_size, file_type, original_name
     FROM loan_request_documents
     WHERE loan_request_id = $1
       AND document_type = ANY($2::text[])
       AND deleted_at IS NULL
     ORDER BY document_type, uploaded_at, id
     FOR SHARE`,
    [loanId, requiredTypes]
  );

  const presentTypes = new Set(rows.map((row) => row.document_type));
  if (requiredTypes.some((type) => !presentTypes.has(type))) {
    throw invalidLoanEvidenceError();
  }

  try {
    // Validate every active required row. A stale duplicate must not silently
    // become trusted merely because another row of the same type is healthy.
    for (const document of rows) {
      await validateStoredFile({
        filePath: document.file_path,
        expectedSize: document.file_size,
        expectedMimeType: document.file_type,
        expectedOriginalName: document.original_name,
        allowedMimeTypes: LOAN_DOCUMENT_ALLOWED_MIME_TYPES,
      });
    }
  } catch (_error) {
    throw invalidLoanEvidenceError();
  }

  return true;
}

export default {
  REQUIRED_LOAN_DOCUMENT_TYPES,
  LOAN_DOCUMENT_EVIDENCE_ERROR_CODE,
  requireValidLoanDocumentEvidence,
};
