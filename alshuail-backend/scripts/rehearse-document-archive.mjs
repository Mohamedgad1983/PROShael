#!/usr/bin/env node

/**
 * Safe, local rehearsal for the native-iOS document lifecycles: initiative
 * receipt, family-financing attachments, marriage contract, and bank transfer.
 *
 * Safety properties:
 * - refuses every database whose name is not an explicit `codex_*rehearsal*` DB;
 * - writes only to a freshly-created directory under the operating-system temp dir;
 * - wraps every database fixture in one transaction and always rolls it back;
 * - removes every test file and the temporary directory in `finally`;
 * - exits non-zero and prints the remaining temp path if filesystem cleanup fails.
 */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import pg from 'pg';

const database = process.env.DOCUMENT_REHEARSAL_DB || '';
const host = process.env.DOCUMENT_REHEARSAL_DB_HOST || '/tmp';
const port = Number(process.env.DOCUMENT_REHEARSAL_DB_PORT || 5432);
const user = process.env.DOCUMENT_REHEARSAL_DB_USER || process.env.USER;

if (!/^codex_[a-z0-9_]*rehearsal[a-z0-9_]*$/i.test(database)) {
  throw new Error(
    'Refusing to run: DOCUMENT_REHEARSAL_DB must name an explicit codex_*rehearsal* database.'
  );
}

const tempPrefix = path.join(os.tmpdir(), 'alshuail-document-rehearsal-');
const uploadRoot = await fs.mkdtemp(tempPrefix);
const resolvedTempRoot = path.resolve(os.tmpdir());
const resolvedUploadRoot = path.resolve(uploadRoot);

if (!resolvedUploadRoot.startsWith(`${resolvedTempRoot}${path.sep}alshuail-document-rehearsal-`)) {
  throw new Error(`Unsafe temporary upload path: ${resolvedUploadRoot}`);
}

process.env.UPLOAD_DIR = resolvedUploadRoot;

const { uploadToSupabase, deleteFromSupabase, fileExists, readFile } = await import(
  '../src/config/documentStorage.js'
);

const client = new pg.Client({ database, host, port, user });
const uploadedPaths = [];
let transactionStarted = false;
let cleanupFailure = null;

const pngBytes = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

const makeUpload = async (ownerId, category, originalname) => {
  const uploaded = await uploadToSupabase(
    {
      originalname,
      mimetype: 'image/png',
      size: pngBytes.length,
      buffer: pngBytes,
    },
    ownerId,
    category
  );
  uploadedPaths.push(uploaded.path);

  const persisted = await fileExists(uploaded.path);
  const bytes = await readFile(uploaded.path);
  if (!persisted || !bytes?.equals(pngBytes)) {
    throw new Error(`Stored file verification failed for ${category}`);
  }
  return uploaded;
};

try {
  await client.connect();
  const identity = await client.query('SELECT current_database() AS database');
  if (identity.rows[0]?.database !== database) {
    throw new Error('Connected database does not match DOCUMENT_REHEARSAL_DB');
  }

  await client.query('BEGIN');
  transactionStarted = true;

  const memberId = crypto.randomUUID();
  const initiativeId = crypto.randomUUID();
  const loanId = crypto.randomUUID();
  const marriageId = crypto.randomUUID();
  let bankTransferId = null;
  const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  const sequenceInYear = Number.parseInt(crypto.randomBytes(3).toString('hex'), 16);

  await client.query(
    `INSERT INTO members
       (id, full_name, full_name_ar, membership_number, national_id, role, is_active)
     VALUES ($1, $2, $2, $3, $4, 'member', true)`,
    [memberId, 'عضو محاكاة المستندات', `DOC-${suffix}`, `10${sequenceInYear}`]
  );

  // 1) Initiative receipt: file + documents_metadata + contribution FK.
  await client.query(
    `INSERT INTO initiatives (id, title, title_ar, status, target_amount, current_amount)
     VALUES ($1, $2, $2, 'active', 1000, 0)`,
    [initiativeId, 'مبادرة محاكاة المستندات']
  );
  const initiativeReceipt = await makeUpload(memberId, 'receipts', 'initiative-receipt.png');
  const documentResult = await client.query(
    `INSERT INTO documents_metadata
       (member_id, uploaded_by, title, category, file_path, file_size,
        file_type, original_name, status)
     VALUES ($1, $1, $2, 'receipts', $3, $4, $5, $6, 'active')
     RETURNING id`,
    [
      memberId,
      'وصل مساهمة - محاكاة',
      initiativeReceipt.path,
      initiativeReceipt.size,
      initiativeReceipt.type,
      'initiative-receipt.png',
    ]
  );
  const receiptDocumentId = documentResult.rows[0].id;
  await client.query(
    `INSERT INTO initiative_donations
       (initiative_id, member_id, amount, payment_method, payment_reference,
        payment_date, status, receipt_document_id, client_request_id)
     VALUES ($1, $2, 100, 'bank_transfer', $3, CURRENT_DATE, 'pending', $4, $5)`,
    [initiativeId, memberId, `DOC-${suffix}`, receiptDocumentId, crypto.randomUUID()]
  );

  // 2) Family financing: request row + required application attachment.
  await client.query(
    `INSERT INTO loan_requests (
       id, sequence_number, sequence_year, sequence_in_year, member_id,
       applicant_name, national_id, date_of_birth, employment_type,
       monthly_salary, monthly_obligations, loan_amount, admin_fee_rate,
       requested_item_amount, item_price_multiplier, financing_fee_amount,
       total_repayment_amount, financing_terms_snapshot, terms_accepted_at, status
     ) VALUES (
       $1, $2, 2099, $3, $4,
       $5, $6, DATE '1990-01-01', 'government',
       10000, 0, 3000, 0.15,
       3000, 1, 450, 3450, $7::jsonb, NOW(), 'submitted'
     )`,
    [
      loanId,
      `L-${suffix}`,
      sequenceInYear,
      memberId,
      'عضو محاكاة المستندات',
      `10${sequenceInYear}`,
      JSON.stringify({ policy_version: 3, principal: 3000, fee: 450, total: 3450 }),
    ]
  );
  const loanAttachment = await makeUpload(memberId, 'loan-id_copy', 'id-copy.png');
  await client.query(
    `INSERT INTO loan_request_documents
       (loan_request_id, document_type, file_path, file_size, file_type,
        original_name, uploaded_by)
     VALUES ($1, 'id_copy', $2, $3, $4, $5, $6)`,
    [
      loanId,
      loanAttachment.path,
      loanAttachment.size,
      loanAttachment.type,
      'id-copy.png',
      memberId,
    ]
  );

  // 3) Marriage support: the contract is stored directly on the request row.
  const marriageContract = await makeUpload(memberId, 'marriage-contract', 'marriage-contract.png');
  await client.query(
    `INSERT INTO marriage_support_requests (
       id, sequence_number, sequence_year, sequence_in_year, member_id,
       applicant_name, national_id, spouse_name_ar, marriage_date,
       marriage_contract_url, status
     ) VALUES (
       $1, $2, 2099, $3, $4,
       $5, $6, $7, DATE '2099-01-01', $8, 'submitted'
     )`,
    [
      marriageId,
      `M-${suffix}`,
      sequenceInYear + 1,
      memberId,
      'عضو محاكاة المستندات',
      `10${sequenceInYear}`,
      'زوجة محاكاة',
      marriageContract.path,
    ]
  );

  // 4) Bank transfer: private receipt archive + request evidence linkage.
  const bankTransferReceipt = await makeUpload(memberId, 'receipts', 'bank-transfer-receipt.png');
  const bankTransferDocument = await client.query(
    `INSERT INTO documents_metadata
       (member_id, uploaded_by, title, category, file_path, file_size,
        file_type, original_name, status)
     VALUES ($1, $1, 'إيصال تحويل - محاكاة', 'receipts', $2, $3, $4, $5, 'active')
     RETURNING id`,
    [
      memberId,
      bankTransferReceipt.path,
      bankTransferReceipt.size,
      bankTransferReceipt.type,
      'bank-transfer-receipt.png',
    ]
  );
  const bankTransferResult = await client.query(
    `INSERT INTO bank_transfer_requests
       (requester_id, beneficiary_id, amount, purpose, receipt_url,
        receipt_filename, receipt_document_id, status)
     VALUES ($1, $1, 50, 'general', $2, $3, $4, 'pending')
     RETURNING id`,
    [
      memberId,
      `/api/documents/${bankTransferDocument.rows[0].id}/download`,
      'bank-transfer-receipt.png',
      bankTransferDocument.rows[0].id,
    ]
  );
  bankTransferId = bankTransferResult.rows[0].id;

  // Logical closure must not discard referenced evidence.
  await client.query("UPDATE initiatives SET status = 'archived' WHERE id = $1", [initiativeId]);
  await client.query("UPDATE loan_requests SET status = 'cancelled' WHERE id = $1", [loanId]);
  await client.query("UPDATE marriage_support_requests SET status = 'cancelled' WHERE id = $1", [marriageId]);
  await client.query("UPDATE bank_transfer_requests SET status = 'rejected' WHERE id = $1", [bankTransferId]);

  const checks = await client.query(
    `SELECT
       EXISTS (
         SELECT 1
           FROM initiative_donations d
           JOIN initiatives i ON i.id = d.initiative_id
           JOIN documents_metadata dm ON dm.id = d.receipt_document_id
          WHERE i.id = $1 AND i.status = 'archived'
            AND dm.file_path = $2 AND dm.status = 'active'
       ) AS initiative_receipt_retained,
       EXISTS (
         SELECT 1
           FROM loan_request_documents ld
           JOIN loan_requests lr ON lr.id = ld.loan_request_id
          WHERE lr.id = $3 AND lr.status = 'cancelled'
            AND ld.file_path = $4 AND ld.deleted_at IS NULL
       ) AS loan_attachment_retained,
       EXISTS (
         SELECT 1
           FROM marriage_support_requests mr
          WHERE mr.id = $5 AND mr.status = 'cancelled'
            AND mr.marriage_contract_url = $6
       ) AS marriage_contract_retained,
       EXISTS (
         SELECT 1
           FROM bank_transfer_requests btr
           JOIN documents_metadata dm ON dm.id = btr.receipt_document_id
          WHERE btr.id = $7 AND btr.status = 'rejected'
            AND dm.file_path = $8 AND dm.status = 'active'
       ) AS bank_transfer_receipt_retained`,
    [
      initiativeId,
      initiativeReceipt.path,
      loanId,
      loanAttachment.path,
      marriageId,
      marriageContract.path,
      bankTransferId,
      bankTransferReceipt.path,
    ]
  );

  const result = checks.rows[0];
  if (!Object.values(result).every(Boolean)) {
    throw new Error(`Archive-reference rehearsal failed: ${JSON.stringify(result)}`);
  }

  await client.query('ROLLBACK');
  transactionStarted = false;

  const rollbackCheck = await client.query(
    `SELECT
       (SELECT COUNT(*) FROM members WHERE id = $1) AS member_rows,
       (SELECT COUNT(*) FROM initiatives WHERE id = $2) AS initiative_rows,
       (SELECT COUNT(*) FROM loan_requests WHERE id = $3) AS loan_rows,
       (SELECT COUNT(*) FROM marriage_support_requests WHERE id = $4) AS marriage_rows,
       (SELECT COUNT(*) FROM bank_transfer_requests WHERE id = $5) AS bank_transfer_rows`,
    [memberId, initiativeId, loanId, marriageId, bankTransferId]
  );
  if (!Object.values(rollbackCheck.rows[0]).every((value) => Number(value) === 0)) {
    throw new Error(`Database rollback verification failed: ${JSON.stringify(rollbackCheck.rows[0])}`);
  }

  process.stdout.write(`${JSON.stringify({
    ok: true,
    database,
    databaseFixturesRolledBack: true,
    testedFlows: [
      'initiative_receipt',
      'family_financing_attachment',
      'marriage_contract',
      'bank_transfer_receipt',
    ],
    closedRequestReferencesRetained: true,
  })}\n`);
} finally {
  if (transactionStarted) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // The original failure remains authoritative; filesystem cleanup still runs.
    }
  }

  for (const filePath of uploadedPaths) {
    try {
      await deleteFromSupabase(filePath);
    } catch (error) {
      cleanupFailure ||= error;
    }
  }

  try {
    await client.end();
  } catch {
    // Ignore a never-connected/already-closed client during cleanup.
  }

  try {
    await fs.rm(resolvedUploadRoot, { recursive: true, force: true });
  } catch (error) {
    cleanupFailure ||= error;
  }

  try {
    await fs.access(resolvedUploadRoot);
    cleanupFailure ||= new Error(`Temporary files remain quarantined at ${resolvedUploadRoot}`);
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      cleanupFailure ||= error;
    }
  }

  if (cleanupFailure) {
    process.stderr.write(`Document rehearsal cleanup failed; inspect quarantine: ${resolvedUploadRoot}\n`);
    process.exitCode = 1;
  }
}
