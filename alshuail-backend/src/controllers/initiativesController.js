import { query, getClient } from '../services/database.js';
import { log } from '../utils/logger.js';
import { config } from '../config/env.js';
import { initiativeProgress } from '../utils/initiativeInput.js';
import { normalizePaymentMethod } from '../constants/paymentMethodPolicy.js';
import {
  uploadToSupabase as uploadDocumentFile,
  getSignedUrl as getDocumentUrl,
  deleteFromSupabase as deleteDocumentFile
} from '../config/documentStorage.js';

/**
 * Generate reference number for contribution
 */
const generateContributionReference = () => {
  const prefix = 'CT';
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${year}-${timestamp}${random}`;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const findContributionByRequestId = async (db, memberId, clientRequestId) => {
  if (!clientRequestId) {
    return null;
  }
  const runQuery = typeof db === 'function' ? db : db.query.bind(db);

  const { rows: activityRows } = await runQuery(
    `SELECT ac.*, 'activity' AS source_type,
            COALESCE(a.name_ar, a.title_ar, a.name_en, a.title_en) AS initiative_title
       FROM activity_contributions ac
       JOIN activities a ON a.id = ac.activity_id
      WHERE ac.member_id = $1 AND ac.client_request_id = $2
      LIMIT 1`,
    [memberId, clientRequestId]
  );
  if (activityRows[0]) {
    return activityRows[0];
  }

  const { rows: initiativeRows } = await runQuery(
    `SELECT d.*, 'initiative' AS source_type,
            COALESCE(i.title_ar, i.title_en) AS initiative_title
       FROM initiative_donations d
       JOIN initiatives i ON i.id = d.initiative_id
      WHERE d.member_id = $1 AND d.client_request_id = $2
      LIMIT 1`,
    [memberId, clientRequestId]
  );
  return initiativeRows[0] || null;
};

const normalizeContributionResponse = (row, sourceType, receiptUrl = null) => ({
  id: String(row.id),
  initiative_id: String(row.activity_id || row.initiative_id),
  member_id: String(row.member_id),
  amount: Number(row.amount),
  payment_method: row.payment_method,
  status: row.status || (row.approved_by ? 'confirmed' : 'pending'),
  reference_number: row.reference_number || row.payment_reference || null,
  notes: row.notes || null,
  receipt_document_id: row.receipt_document_id || null,
  receipt_url: receiptUrl || row.receipt_url || null,
  client_request_id: row.client_request_id || null,
  source_type: sourceType || row.source_type,
  created_at: row.created_at || row.payment_date || null
});

/**
 * Get all initiatives with totals and contribution summaries
 * GET /api/initiatives
 */
export const getAllInitiatives = async (req, res) => {
  try {
    const {
      status,
      category,
      organizer_id,
      active_only = 'false',
      limit = 50,
      offset = 0
    } = req.query;

    // Build WHERE conditions and params separately for each table
    // (column names differ slightly between `initiatives` and legacy `activities`)
    const initiativesConditions = [];
    const activitiesConditions = [];
    const initiativesParams = [];
    const activitiesParams = [];
    let iIdx = 1;
    let aIdx = 1;

    // status filter — applies to both tables
    if (status) {
      initiativesConditions.push(`status = $${iIdx++}`);
      initiativesParams.push(status);
      activitiesConditions.push(`status = $${aIdx++}`);
      activitiesParams.push(status);
    }

    // category filter — only `activities` has main_category_id
    if (category) {
      activitiesConditions.push(`main_category_id = $${aIdx++}`);
      activitiesParams.push(category);
    }

    // organizer_id → created_by in both tables
    if (organizer_id) {
      initiativesConditions.push(`created_by = $${iIdx++}`);
      initiativesParams.push(organizer_id);
      activitiesConditions.push(`created_by = $${aIdx++}`);
      activitiesParams.push(organizer_id);
    }

    // active_only filter
    if (active_only === 'true') {
      initiativesConditions.push(`status = $${iIdx++}`);
      initiativesParams.push('active');
      activitiesConditions.push(`status = $${aIdx++}`);
      activitiesParams.push('active');
    }

    const initiativesWhere = initiativesConditions.length > 0 ? `WHERE ${initiativesConditions.join(' AND ')}` : '';
    const activitiesWhere = activitiesConditions.length > 0 ? `WHERE ${activitiesConditions.join(' AND ')}` : '';

    // Query both tables in parallel:
    // - `initiatives` is the source admins write to via /api/initiatives-enhanced
    // - `activities` is the legacy table that may still hold older records
    // Either query may fail if a table doesn't exist, so we tolerate failures and merge what's available.
    const [initiativesResult, activitiesResult] = await Promise.all([
      query(
        `SELECT id::text AS id,
                'initiative'::text AS source_type,
                title_ar, title_en,
                description_ar, description_en,
                target_amount, COALESCE(current_amount, collected_amount, 0) AS current_amount,
                min_contribution, max_contribution,
                start_date AS collection_start_date,
                end_date AS collection_end_date,
                start_date, end_date,
                status, created_by, created_at,
                0 AS contributor_count,
                NULL AS main_category_id,
                NULL AS reason_ar,
                NULL AS reason_en
         FROM initiatives ${initiativesWhere}
         ORDER BY created_at DESC`,
        initiativesParams
      ).catch(err => {
        log.warn('initiatives table query failed', { error: err.message });
        return { rows: [] };
      }),
      query(
        `SELECT id::text AS id,
                'activity'::text AS source_type,
                COALESCE(name_ar, title_ar) AS title_ar,
                COALESCE(name_en, title_en) AS title_en,
                description_ar, description_en,
                target_amount, current_amount,
                NULL AS min_contribution,
                NULL AS max_contribution,
                collection_start_date,
                collection_end_date,
                start_date, end_date,
                status, created_by, created_at,
                COALESCE(contributor_count, 0) AS contributor_count,
                main_category_id,
                reason_ar, reason_en
         FROM activities ${activitiesWhere}
         ORDER BY created_at DESC`,
        activitiesParams
      ).catch(err => {
        log.warn('activities table query failed', { error: err.message });
        return { rows: [] };
      })
    ]);

    // Merge, sort by created_at DESC, then paginate in JS
    const merged = [...initiativesResult.rows, ...activitiesResult.rows]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    const offsetInt = parseInt(offset) || 0;
    const limitInt = parseInt(limit) || 50;
    const initiatives = merged.slice(offsetInt, offsetInt + limitInt);

    // Calculate totals and metrics for each initiative + map columns for iOS
    const enhancedInitiatives = initiatives?.map(initiative => {
      const totalContributed = Number(initiative.current_amount) || 0;
      const contributorsCount = Number(initiative.contributor_count) || 0;

      const progressPercentage = initiativeProgress(totalContributed, initiative.target_amount);

      // Use collection_end_date if exists, otherwise fall back to end_date
      const endDate = initiative.collection_end_date || initiative.end_date;
      const startDate = initiative.collection_start_date || initiative.start_date;

      const daysRemaining = endDate ?
        Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;

      return {
        ...initiative,
        id: String(initiative.id),
        // Map DB columns to iOS Activity model keys
        title_ar: initiative.name_ar || initiative.title_ar || initiative.name_en || null,
        title_en: initiative.name_en || initiative.title_en || initiative.name_ar || null,
        description_ar: initiative.description_ar || initiative.description || initiative.reason_ar || null,
        description_en: initiative.description_en || initiative.description || initiative.reason_en || null,
        // Convert numeric fields from string to number (pg returns numeric as string)
        target_amount: Number(initiative.target_amount) || null,
        current_amount: Number(initiative.current_amount) || 0,
        min_contribution: Number(initiative.min_contribution) || null,
        max_contribution: Number(initiative.max_contribution) || null,
        collection_start_date: startDate ? String(startDate) : null,
        collection_end_date: endDate ? String(endDate) : null,
        total_contributed: totalContributed,
        contributors_count: contributorsCount,
        contributor_count: contributorsCount,
        progress_percentage: progressPercentage,
        days_remaining: daysRemaining,
        is_target_reached: initiative.target_amount ? totalContributed >= Number(initiative.target_amount) : null,
        is_expired: endDate ? new Date(endDate) < new Date() : false
      };
    }) || [];

    res.json({
      success: true,
      data: enhancedInitiatives,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: merged.length
      },
      message: 'تم جلب المبادرات بنجاح'
    });
  } catch (error) {
    log.error('Error fetching initiatives', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في جلب المبادرات',
      message: config.isDevelopment ? error.message : undefined
    });
  }
};

/**
 * Get initiative by ID with detailed contribution information
 * GET /api/initiatives/:id
 */
export const getInitiativeById = async (req, res) => {
  try {
    const { id } = req.params;

    // Try the new `initiatives` table first (where admin creates new ones),
    // then fall back to legacy `activities` table.
    let initiative = null;

    try {
      const { rows } = await query('SELECT * FROM initiatives WHERE id::text = $1', [String(id)]);
      if (rows[0]) {
        initiative = rows[0];
      }
    } catch (e) {
      log.warn('initiatives lookup failed', { error: e.message });
    }

    if (!initiative) {
      try {
        const { rows } = await query('SELECT * FROM activities WHERE id::text = $1', [String(id)]);
        if (rows[0]) {
          initiative = rows[0];
        }
      } catch (e) {
        log.warn('activities lookup failed', { error: e.message });
      }
    }

    if (!initiative) {
      return res.status(404).json({
        success: false,
        error: 'المبادرة غير موجودة'
      });
    }

    // Normalize column aliases so downstream code sees consistent fields
    initiative.title_ar = initiative.title_ar || initiative.name_ar || null;
    initiative.title_en = initiative.title_en || initiative.name_en || null;

    // Get the organizer
    if (initiative.organizer_id) {
      const { rows: organizerRows } = await query(
        'SELECT id, full_name, phone, email FROM members WHERE id = $1',
        [initiative.organizer_id]
      );
      initiative.organizer = organizerRows[0] || null;
    } else {
      initiative.organizer = null;
    }

    // Get contributions with member info
    const { rows: contributions } = await query(
      `SELECT ac.id, ac.amount, ac.status, ac.payment_method, ac.reference_number, ac.notes, ac.created_at,
              m.id AS member_id, m.full_name AS member_full_name, m.phone AS member_phone, m.email AS member_email
       FROM activity_contributions ac
       LEFT JOIN members m ON ac.member_id = m.id
       WHERE ac.activity_id = $1`,
      [id]
    );

    // Format contributions to match the previous nested structure
    const formattedContributions = contributions.map(c => ({
      id: c.id,
      amount: c.amount,
      status: c.status,
      payment_method: c.payment_method,
      reference_number: c.reference_number,
      notes: c.notes,
      created_at: c.created_at,
      member: c.member_id ? {
        id: c.member_id,
        full_name: c.member_full_name,
        phone: c.member_phone,
        email: c.member_email
      } : null
    }));

    // Calculate detailed metrics
    const allContributions = formattedContributions;
    const confirmedContributions = allContributions.filter(c => c.status === 'confirmed');
    const pendingContributions = allContributions.filter(c => c.status === 'pending');

    const totalContributed = confirmedContributions.reduce((sum, c) => sum + Number(c.amount), 0);
    const pendingAmount = pendingContributions.reduce((sum, c) => sum + Number(c.amount), 0);
    const contributorsCount = new Set(confirmedContributions.map(c => c.member?.id)).size;

    const progressPercentage = initiativeProgress(totalContributed, initiative.target_amount);

    const daysRemaining = initiative.end_date ?
      Math.ceil((new Date(initiative.end_date) - new Date()) / (1000 * 60 * 60 * 24)) : null;

    // Sort contributions by date (newest first)
    const sortedContributions = allContributions.sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    );

    const enhancedInitiative = {
      ...initiative,
      contributions: sortedContributions,
      summary: {
        total_contributed: totalContributed,
        pending_amount: pendingAmount,
        contributors_count: contributorsCount,
        total_contributions: allContributions.length,
        confirmed_contributions: confirmedContributions.length,
        pending_contributions: pendingContributions.length,
        progress_percentage: progressPercentage,
        days_remaining: daysRemaining,
        is_target_reached: initiative.target_amount ? totalContributed >= Number(initiative.target_amount) : null,
        is_expired: initiative.end_date ? new Date(initiative.end_date) < new Date() : false,
        remaining_amount: initiative.target_amount ? Math.max(0, Number(initiative.target_amount) - totalContributed) : null
      }
    };

    res.json({
      success: true,
      data: enhancedInitiative,
      message: 'تم جلب بيانات المبادرة بنجاح'
    });
  } catch (error) {
    log.error('Error fetching initiative', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في جلب بيانات المبادرة',
      message: config.isDevelopment ? error.message : undefined
    });
  }
};

/**
 * Create new initiative
 * POST /api/initiatives
 */
export const createInitiative = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      target_amount,
      start_date,
      end_date,
      organizer_id,
      status = 'active'
    } = req.body;

    // Validation
    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'عنوان المبادرة مطلوب'
      });
    }

    const hasTargetAmount = target_amount !== undefined && target_amount !== null && String(target_amount).trim() !== '';
    const normalizedTargetAmount = hasTargetAmount ? Number(target_amount) : null;

    if (hasTargetAmount && (!Number.isFinite(normalizedTargetAmount) || normalizedTargetAmount < 0)) {
      return res.status(400).json({
        success: false,
        error: 'المبلغ المستهدف يجب أن يكون رقماً موجباً أو صفراً'
      });
    }

    if (normalizedTargetAmount !== null && normalizedTargetAmount > 0 && normalizedTargetAmount < 50) {
      return res.status(400).json({
        success: false,
        error: 'الحد الأدنى للمبلغ المستهدف هو 50 ريال'
      });
    }

    // Validate dates
    if (start_date && end_date) {
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      if (endDate <= startDate) {
        return res.status(400).json({
          success: false,
          error: 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية'
        });
      }
    }

    // Validate organizer exists if provided
    if (organizer_id) {
      const { rows: organizerRows } = await query(
        'SELECT id FROM members WHERE id = $1',
        [organizer_id]
      );

      if (organizerRows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'المنظم المحدد غير موجود'
        });
      }
    }

    const { rows } = await query(
      `INSERT INTO activities (title, description, category, target_amount, start_date, end_date, organizer_id, status, current_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0)
       RETURNING *`,
      [title, description, category, normalizedTargetAmount, start_date || null, end_date || null, organizer_id || null, status]
    );

    const newInitiative = rows[0];

    // Fetch organizer info if available
    if (newInitiative.organizer_id) {
      const { rows: orgRows } = await query(
        'SELECT id, full_name, phone, email FROM members WHERE id = $1',
        [newInitiative.organizer_id]
      );
      newInitiative.organizer = orgRows[0] || null;
    } else {
      newInitiative.organizer = null;
    }

    res.status(201).json({
      success: true,
      data: newInitiative,
      message: 'تم إنشاء المبادرة بنجاح'
    });
  } catch (error) {
    log.error('Error creating initiative', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في إنشاء المبادرة',
      message: config.isDevelopment ? error.message : undefined
    });
  }
};

/**
 * Add contribution to initiative
 * POST /api/initiatives/:id/contribute
 */
export const addContribution = async (req, res) => {
  let client;
  let transactionStarted = false;
  let savedFilePath = null;

  try {
    const { id } = req.params;
    const {
      amount,
      payment_method = 'bank_transfer',
      notes,
      client_request_id
    } = req.body;

    // The member identity is authoritative from the verified JWT. Accepting a
    // body member_id allowed one member to submit a contribution for another.
    const memberId = req.user?.id || req.user?.user_id;
    const clientRequestId = client_request_id || req.get('Idempotency-Key') || null;

    if (!memberId) {
      return res.status(401).json({
        success: false,
        error: 'تعذر تحديد العضو من الجلسة. يرجى تسجيل الدخول مجدداً.'
      });
    }

    if (clientRequestId && !UUID_PATTERN.test(String(clientRequestId))) {
      return res.status(400).json({
        success: false,
        error: 'معرف عملية المساهمة غير صالح'
      });
    }

    const contributionAmount = Number(amount);
    if (!Number.isFinite(contributionAmount) || contributionAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'مبلغ المساهمة يجب أن يكون أكبر من صفر'
      });
    }

    if (notes && String(notes).length > 2000) {
      return res.status(400).json({
        success: false,
        error: 'الملاحظات طويلة جداً؛ الحد الأقصى 2000 حرف'
      });
    }

    const normalizedPaymentMethod = normalizePaymentMethod(payment_method);
    if (normalizedPaymentMethod !== 'bank_transfer') {
      return res.status(400).json({
        success: false,
        code: 'UNVERIFIED_INITIATIVE_PAYMENT_METHOD',
        error: 'مساهمات المبادرات تقبل التحويل البنكي الموثق فقط'
      });
    }

    client = await getClient();
    await client.query('BEGIN');
    transactionStarted = true;

    // A response can be lost after a successful write. A stable UUID from the
    // app lets the retry return the original contribution instead of inserting
    // a duplicate row.
    const existingContribution = await findContributionByRequestId(
      client,
      memberId,
      clientRequestId
    );
    if (existingContribution) {
      await client.query('COMMIT');
      transactionStarted = false;
      return res.status(200).json({
        success: true,
        data: normalizeContributionResponse(existingContribution),
        message: 'تم تسجيل هذه المساهمة مسبقاً'
      });
    }

    if (!req.file) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(400).json({
        success: false,
        code: 'INITIATIVE_RECEIPT_REQUIRED',
        error: 'يجب إرفاق صورة إيصال التحويل قبل إرسال المساهمة'
      });
    }

    // The feed still displays legacy activities for historical visibility,
    // but only the current initiatives programme has the audited review flow.
    // Resolve the source before writing any archived receipt and fail closed
    // for a legacy activity.
    const { rows: activityRows } = await client.query(
      `SELECT id, status, target_amount, current_amount,
              COALESCE(collection_end_date, end_date) AS end_date,
              min_contribution, max_contribution,
              COALESCE(name_ar, title_ar, name_en, title_en) AS title
         FROM activities
        WHERE id::text = $1
        FOR UPDATE`,
      [String(id)]
    );

    if (activityRows[0]) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(410).json({
        success: false,
        code: 'LEGACY_INITIATIVE_CONTRIBUTIONS_RETIRED',
        error: 'هذه مبادرة مؤرشفة ولا تستقبل مساهمات جديدة عبر التطبيق'
      });
    }

    const sourceType = 'initiative';
    let initiative = null;

    if (!initiative) {
      const { rows: initiativeRows } = await client.query(
        `SELECT id, status, target_amount, current_amount, end_date,
                min_contribution, max_contribution,
                COALESCE(title_ar, title_en) AS title
           FROM initiatives
          WHERE id::text = $1
          FOR UPDATE`,
        [String(id)]
      );
      initiative = initiativeRows[0] || null;
    }

    if (!initiative) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(404).json({
        success: false,
        error: 'المبادرة غير موجودة'
      });
    }

    if (initiative.status !== 'active') {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(400).json({
        success: false,
        error: 'لا يمكن المساهمة في مبادرة غير نشطة'
      });
    }

    // Check if initiative has expired
    if (initiative.end_date && new Date(initiative.end_date) < new Date()) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(400).json({
        success: false,
        error: 'انتهت فترة المساهمة في هذه المبادرة'
      });
    }

    const minimumAmount = Number(initiative.min_contribution) || 50;
    const maximumAmount = Number(initiative.max_contribution) || 50_000;
    if (contributionAmount < minimumAmount) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(400).json({
        success: false,
        error: `الحد الأدنى للمساهمة هو ${minimumAmount} ريال`
      });
    }
    if (contributionAmount > maximumAmount) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(400).json({
        success: false,
        error: `الحد الأقصى للمساهمة هو ${maximumAmount} ريال`
      });
    }

    // Check if member exists
    const { rows: memberRows } = await client.query(
      'SELECT id, full_name, phone, email FROM members WHERE id = $1',
      [memberId]
    );

    if (memberRows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(400).json({
        success: false,
        error: 'حساب العضو غير مرتبط بسجل أعضاء صالح'
      });
    }

    // Generate reference number
    const referenceNumber = generateContributionReference();
    let receiptDocumentId = null;
    let receiptUrl = null;

    const uploaded = await uploadDocumentFile(req.file, memberId, 'receipts');
    savedFilePath = uploaded.path;
    receiptUrl = getDocumentUrl(uploaded.path);

    const { rows: documentRows } = await client.query(
      `INSERT INTO documents_metadata (
         member_id, uploaded_by, title, description, category,
         file_path, file_size, file_type, original_name, status
       ) VALUES ($1, $1, $2, $3, 'receipts', $4, $5, $6, $7, 'active')
       RETURNING id`,
      [
        memberId,
        `وصل مساهمة - ${initiative.title || 'مبادرة عائلية'}`,
        notes || `مساهمة رقم ${referenceNumber}`,
        uploaded.path,
        uploaded.size,
        uploaded.type,
        req.file.originalname
      ]
    );
    receiptDocumentId = documentRows[0].id;

    let newContribution;
    if (sourceType === 'activity') {
      const { rows } = await client.query(
        `INSERT INTO activity_contributions (
           activity_id, member_id, amount, payment_method, status,
           reference_number, notes, receipt_document_id, client_request_id
         ) VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8)
         RETURNING *`,
        [
          id,
          memberId,
          contributionAmount,
          normalizedPaymentMethod,
          referenceNumber,
          notes || null,
          receiptDocumentId,
          clientRequestId
        ]
      );
      newContribution = rows[0];
    } else {
      const { rows } = await client.query(
        `INSERT INTO initiative_donations (
           initiative_id, member_id, amount, payment_method, status,
           payment_reference, notes, payment_date,
           receipt_document_id, client_request_id
         ) VALUES ($1, $2, $3, $4, 'pending', $5, $6, CURRENT_DATE, $7, $8)
         RETURNING *`,
        [
          id,
          memberId,
          contributionAmount,
          normalizedPaymentMethod,
          referenceNumber,
          notes || null,
          receiptDocumentId,
          clientRequestId
        ]
      );
      newContribution = rows[0];
    }

    await client.query('COMMIT');
    transactionStarted = false;

    const responseData = normalizeContributionResponse(newContribution, sourceType, receiptUrl);
    responseData.member = memberRows[0];
    responseData.initiative = { id: String(id), title: initiative.title };

    res.status(201).json({
      success: true,
      data: responseData,
      message: 'تم تسجيل المساهمة وإرسالها للمراجعة بنجاح'
    });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        log.warn('Failed to roll back initiative contribution', { error: rollbackError.message });
      }
    }

    if (savedFilePath) {
      try {
        await deleteDocumentFile(savedFilePath);
      } catch (cleanupError) {
        log.warn('Failed to clean up initiative receipt', {
          filePath: savedFilePath,
          error: cleanupError.message
        });
      }
    }

    // Concurrent retries can race before either request sees the other. The
    // unique database index is the final guard; return the existing row rather
    // than surfacing a 500 to the member.
    const memberId = req.user?.id || req.user?.user_id;
    const clientRequestId = req.body?.client_request_id || req.get('Idempotency-Key') || null;
    if (error.code === '23505' && memberId && clientRequestId) {
      try {
        const existing = await findContributionByRequestId(query, memberId, clientRequestId);
        if (existing) {
          return res.status(200).json({
            success: true,
            data: normalizeContributionResponse(existing),
            message: 'تم تسجيل هذه المساهمة مسبقاً'
          });
        }
      } catch (lookupError) {
        log.warn('Failed to load idempotent initiative contribution', { error: lookupError.message });
      }
    }

    log.error('Error adding contribution', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'تعذر تسجيل المساهمة الآن. لم يتم إنشاء عملية مكررة، يرجى المحاولة مرة أخرى.',
      message: config.isDevelopment ? error.message : undefined
    });
  } finally {
    client?.release();
  }
};

/**
 * Update contribution status
 * PUT /api/initiatives/:id/contributions/:contributionId
 */
export const updateContributionStatus = async (req, res) => {
  let client;
  let transactionStarted = false;
  try {
    const { id, contributionId } = req.params;
    const { status, notes } = req.body;

    if (!status || !['pending', 'confirmed', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'حالة المساهمة غير صحيحة'
      });
    }

    client = await getClient();
    await client.query('BEGIN');
    transactionStarted = true;

    // Keep one lock order for create/approve/reject: initiative, then
    // contribution, then receipt. This prevents double approval and amount
    // drift when two admins act on the same row concurrently.
    const { rows: initiativeRows } = await client.query(
      'SELECT id FROM activities WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (!initiativeRows[0]) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(404).json({ success: false, error: 'المبادرة غير موجودة' });
    }

    const { rows: contributionRows } = await client.query(
      `SELECT *
         FROM activity_contributions
        WHERE id = $1 AND activity_id = $2
        FOR UPDATE`,
      [contributionId, id]
    );
    const contribution = contributionRows[0];
    if (!contribution) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(404).json({ success: false, error: 'المساهمة غير موجودة' });
    }

    if (status === 'confirmed') {
      if (normalizePaymentMethod(contribution.payment_method) !== 'bank_transfer') {
        await client.query('ROLLBACK');
        transactionStarted = false;
        return res.status(409).json({
          success: false,
          code: 'UNVERIFIED_INITIATIVE_PAYMENT_METHOD',
          error: 'لا يمكن اعتماد مساهمة إلكترونية غير مرتبطة ببوابة دفع موثقة'
        });
      }

      if (!contribution.receipt_document_id) {
        await client.query('ROLLBACK');
        transactionStarted = false;
        return res.status(409).json({
          success: false,
          code: 'INITIATIVE_RECEIPT_REQUIRED',
          error: 'لا يمكن اعتماد المساهمة قبل إرفاق إيصال التحويل المؤرشف'
        });
      }

      await client.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))',
        [contribution.receipt_document_id]
      );
      const { rows: receiptRows } = await client.query(
        `SELECT id
           FROM documents_metadata
          WHERE id = $1
            AND member_id = $2
            AND category = 'receipts'
            AND status = 'active'`,
        [contribution.receipt_document_id, contribution.member_id]
      );
      if (!receiptRows[0]) {
        await client.query('ROLLBACK');
        transactionStarted = false;
        return res.status(409).json({
          success: false,
          code: 'INITIATIVE_RECEIPT_INVALID',
          error: 'إيصال المساهمة غير متاح أو لا يخص العضو صاحب المساهمة'
        });
      }
    }

    // Update contribution
    const setClauses = ['status = $1'];
    const updateParams = [status];
    let pIdx = 2;

    if (notes !== undefined) {
      setClauses.push(`notes = $${pIdx++}`);
      updateParams.push(notes);
    }

    updateParams.push(contributionId);

    setClauses.push('updated_at = NOW()');
    const { rows: updatedRows } = await client.query(
      `UPDATE activity_contributions
          SET ${setClauses.join(', ')}
        WHERE id = $${pIdx}
        RETURNING *`,
      updateParams
    );

    const updatedContribution = updatedRows[0];

    // Recalculate from ledger rows rather than adding/subtracting the request
    // amount. Replays and concurrent actions therefore cannot double count.
    await client.query(
      `UPDATE activities a
          SET current_amount = totals.amount,
              updated_at = NOW()
         FROM (
           SELECT COALESCE(SUM(amount), 0) AS amount
             FROM activity_contributions
            WHERE activity_id = $1 AND status = 'confirmed'
         ) totals
        WHERE a.id = $1`,
      [id]
    );

    // Fetch member info
    if (updatedContribution.member_id) {
      const { rows: memberInfo } = await client.query(
        'SELECT id, full_name, phone, email FROM members WHERE id = $1',
        [updatedContribution.member_id]
      );
      updatedContribution.member = memberInfo[0] || null;
    }

    await client.query('COMMIT');
    transactionStarted = false;

    res.json({
      success: true,
      data: updatedContribution,
      message: status === 'confirmed' ? 'تم تأكيد المساهمة' :
               status === 'rejected' ? 'تم رفض المساهمة' : 'تم تحديث حالة المساهمة'
    });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        log.warn('Failed to roll back initiative contribution review', {
          error: rollbackError.message
        });
      }
    }
    log.error('Error updating contribution status', { error: error.message });
    const isEvidenceConflict = error.code === '23514';
    res.status(isEvidenceConflict ? 409 : 500).json({
      success: false,
      ...(isEvidenceConflict ? { code: 'INITIATIVE_EVIDENCE_CONFLICT' } : {}),
      error: isEvidenceConflict
        ? 'تعذر اعتماد المساهمة لأن إيصال التحويل غير صالح أو تغيرت بياناته'
        : 'فشل في تحديث حالة المساهمة',
      message: config.isDevelopment ? error.message : undefined
    });
  } finally {
    client?.release();
  }
};

/**
 * Update initiative details
 * PUT /api/initiatives/:id
 */
export const updateInitiative = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      category,
      target_amount,
      start_date,
      end_date,
      status
    } = req.body;

    // Check if initiative exists
    const { rows: existingRows } = await query(
      'SELECT * FROM activities WHERE id = $1',
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'المبادرة غير موجودة'
      });
    }

    const hasTargetAmount = target_amount !== undefined && target_amount !== null && String(target_amount).trim() !== '';
    const normalizedTargetAmount = hasTargetAmount ? Number(target_amount) : null;

    if (hasTargetAmount && (!Number.isFinite(normalizedTargetAmount) || normalizedTargetAmount < 0)) {
      return res.status(400).json({
        success: false,
        error: 'المبلغ المستهدف يجب أن يكون رقماً موجباً أو صفراً'
      });
    }

    // Validate target amount if provided
    if (normalizedTargetAmount !== null && normalizedTargetAmount > 0 && normalizedTargetAmount < 50) {
      return res.status(400).json({
        success: false,
        error: 'الحد الأدنى للمبلغ المستهدف هو 50 ريال'
      });
    }

    // Validate dates if provided
    if (start_date && end_date) {
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      if (endDate <= startDate) {
        return res.status(400).json({
          success: false,
          error: 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية'
        });
      }
    }

    const setClauses = ['updated_at = $1'];
    const params = [new Date().toISOString()];
    let pIdx = 2;

    // Only update provided fields
    if (title !== undefined) { setClauses.push(`title = $${pIdx++}`); params.push(title); }
    if (description !== undefined) { setClauses.push(`description = $${pIdx++}`); params.push(description); }
    if (category !== undefined) { setClauses.push(`category = $${pIdx++}`); params.push(category); }
    if (target_amount !== undefined) { setClauses.push(`target_amount = $${pIdx++}`); params.push(normalizedTargetAmount); }
    if (start_date !== undefined) { setClauses.push(`start_date = $${pIdx++}`); params.push(start_date || null); }
    if (end_date !== undefined) { setClauses.push(`end_date = $${pIdx++}`); params.push(end_date || null); }
    if (status !== undefined) { setClauses.push(`status = $${pIdx++}`); params.push(status); }

    params.push(id);

    const { rows } = await query(
      `UPDATE activities SET ${setClauses.join(', ')} WHERE id = $${pIdx} RETURNING *`,
      params
    );

    const updatedInitiative = rows[0];

    // Fetch organizer info if available
    if (updatedInitiative.organizer_id) {
      const { rows: orgRows } = await query(
        'SELECT id, full_name, phone, email FROM members WHERE id = $1',
        [updatedInitiative.organizer_id]
      );
      updatedInitiative.organizer = orgRows[0] || null;
    } else {
      updatedInitiative.organizer = null;
    }

    res.json({
      success: true,
      data: updatedInitiative,
      message: 'تم تحديث المبادرة بنجاح'
    });
  } catch (error) {
    log.error('Error updating initiative', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في تحديث المبادرة',
      message: config.isDevelopment ? error.message : undefined
    });
  }
};

/**
 * Get initiatives statistics
 * GET /api/initiatives/stats
 */
export const getInitiativeStats = async (req, res) => {
  try {
    // Get total initiatives
    const { rows: totalRows } = await query('SELECT COUNT(*)::int AS count FROM activities');
    const totalInitiatives = totalRows[0].count;

    // Get active initiatives
    const { rows: activeRows } = await query("SELECT COUNT(*)::int AS count FROM activities WHERE status = 'active'");
    const activeInitiatives = activeRows[0].count;

    // Get total contributions
    const { rows: contribCountRows } = await query('SELECT COUNT(*)::int AS count FROM activity_contributions');
    const totalContributions = contribCountRows[0].count;

    // Get confirmed contributions and total amount
    const { rows: confirmedContributions } = await query(
      "SELECT amount FROM activity_contributions WHERE status = 'confirmed'"
    );

    const totalAmountRaised = confirmedContributions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

    // Get initiatives by status
    const { rows: statusData } = await query('SELECT status FROM activities');

    const statusStats = statusData?.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {}) || {};

    // Get unique contributors
    const { rows: contributorsData } = await query(
      "SELECT member_id FROM activity_contributions WHERE status = 'confirmed'"
    );

    const uniqueContributors = new Set(contributorsData?.map(c => c.member_id)).size;

    res.json({
      success: true,
      data: {
        total_initiatives: totalInitiatives || 0,
        active_initiatives: activeInitiatives || 0,
        total_contributions: totalContributions || 0,
        confirmed_contributions: confirmedContributions?.length || 0,
        total_amount_raised: totalAmountRaised,
        unique_contributors: uniqueContributors,
        initiatives_by_status: statusStats
      },
      message: 'تم جلب إحصائيات المبادرات بنجاح'
    });
  } catch (error) {
    log.error('Error fetching initiative stats', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في جلب إحصائيات المبادرات',
      message: config.isDevelopment ? error.message : undefined
    });
  }
};
