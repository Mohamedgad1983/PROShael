import { query } from '../services/database.js';
import { log } from '../utils/logger.js';
import { config } from '../config/env.js';

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
                title_ar, title_en,
                description_ar, description_en,
                target_amount, current_amount,
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

      const progressPercentage = initiative.target_amount ?
        Math.round((totalContributed / Number(initiative.target_amount)) * 100) : 0;

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
        is_target_reached: initiative.target_amount ? totalContributed >= Number(initiative.target_amount) : false,
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

    const progressPercentage = initiative.target_amount ?
      Math.round((totalContributed / Number(initiative.target_amount)) * 100) : 0;

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
        is_target_reached: initiative.target_amount ? totalContributed >= Number(initiative.target_amount) : false,
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

    if (target_amount && Number(target_amount) < 50) {
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
      [title, description, category, target_amount ? Number(target_amount) : null, start_date, end_date, organizer_id, status]
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
  try {
    const { id } = req.params;
    const {
      member_id,
      amount,
      payment_method = 'cash',
      notes,
      status = 'pending'
    } = req.body;

    // Validation
    if (!member_id || !amount) {
      return res.status(400).json({
        success: false,
        error: 'معرف العضو والمبلغ مطلوبان'
      });
    }

    const contributionAmount = Number(amount);
    if (contributionAmount < 50) {
      return res.status(400).json({
        success: false,
        error: 'الحد الأدنى للمساهمة هو 50 ريال'
      });
    }

    // Check if initiative exists and is active
    const { rows: initiativeRows } = await query(
      'SELECT id, status, target_amount, current_amount, end_date FROM activities WHERE id = $1',
      [id]
    );

    const initiative = initiativeRows[0];
    if (!initiative) {
      return res.status(404).json({
        success: false,
        error: 'المبادرة غير موجودة'
      });
    }

    if (initiative.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'لا يمكن المساهمة في مبادرة غير نشطة'
      });
    }

    // Check if initiative has expired
    if (initiative.end_date && new Date(initiative.end_date) < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'انتهت فترة المساهمة في هذه المبادرة'
      });
    }

    // Check if member exists
    const { rows: memberRows } = await query(
      'SELECT id FROM members WHERE id = $1',
      [member_id]
    );

    if (memberRows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'العضو المحدد غير موجود'
      });
    }

    // Generate reference number
    const referenceNumber = generateContributionReference();

    // Insert contribution
    const { rows: contribRows } = await query(
      `INSERT INTO activity_contributions (activity_id, member_id, amount, payment_method, status, reference_number, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, member_id, contributionAmount, payment_method, status, referenceNumber, notes]
    );

    const newContribution = contribRows[0];

    // Fetch member info
    const { rows: memberInfo } = await query(
      'SELECT id, full_name, phone, email FROM members WHERE id = $1',
      [member_id]
    );
    newContribution.member = memberInfo[0] || null;

    // Fetch activity info
    const { rows: activityInfo } = await query(
      'SELECT id, title FROM activities WHERE id = $1',
      [id]
    );
    newContribution.activity = activityInfo[0] || null;

    // Update initiative current amount if contribution is confirmed
    if (status === 'confirmed') {
      await query(
        'UPDATE activities SET current_amount = $1, updated_at = $2 WHERE id = $3',
        [Number(initiative.current_amount) + contributionAmount, new Date().toISOString(), id]
      );
    }

    res.status(201).json({
      success: true,
      data: newContribution,
      message: status === 'confirmed' ? 'تم تأكيد المساهمة بنجاح' : 'تم إضافة المساهمة بنجاح'
    });
  } catch (error) {
    log.error('Error adding contribution', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في إضافة المساهمة',
      message: config.isDevelopment ? error.message : undefined
    });
  }
};

/**
 * Update contribution status
 * PUT /api/initiatives/:id/contributions/:contributionId
 */
export const updateContributionStatus = async (req, res) => {
  try {
    const { id, contributionId } = req.params;
    const { status, notes } = req.body;

    if (!status || !['pending', 'confirmed', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'حالة المساهمة غير صحيحة'
      });
    }

    // Get current contribution
    const { rows: contributionRows } = await query(
      'SELECT * FROM activity_contributions WHERE id = $1 AND activity_id = $2',
      [contributionId, id]
    );

    const contribution = contributionRows[0];
    if (!contribution) {
      return res.status(404).json({
        success: false,
        error: 'المساهمة غير موجودة'
      });
    }

    // Get initiative data
    const { rows: initiativeRows } = await query(
      'SELECT current_amount FROM activities WHERE id = $1',
      [id]
    );

    const initiative = initiativeRows[0];
    if (!initiative) {
      return res.status(404).json({
        success: false,
        error: 'المبادرة غير موجودة'
      });
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

    const { rows: updatedRows } = await query(
      `UPDATE activity_contributions SET ${setClauses.join(', ')} WHERE id = $${pIdx} RETURNING *`,
      updateParams
    );

    const updatedContribution = updatedRows[0];

    // Fetch member info
    if (updatedContribution.member_id) {
      const { rows: memberInfo } = await query(
        'SELECT id, full_name, phone, email FROM members WHERE id = $1',
        [updatedContribution.member_id]
      );
      updatedContribution.member = memberInfo[0] || null;
    }

    // Update initiative current amount based on status change
    let amountChange = 0;
    if (contribution.status === 'confirmed' && status !== 'confirmed') {
      amountChange = -Number(contribution.amount);
    } else if (contribution.status !== 'confirmed' && status === 'confirmed') {
      amountChange = Number(contribution.amount);
    }

    if (amountChange !== 0) {
      await query(
        'UPDATE activities SET current_amount = $1, updated_at = $2 WHERE id = $3',
        [Math.max(0, Number(initiative.current_amount) + amountChange), new Date().toISOString(), id]
      );
    }

    res.json({
      success: true,
      data: updatedContribution,
      message: status === 'confirmed' ? 'تم تأكيد المساهمة' :
               status === 'rejected' ? 'تم رفض المساهمة' : 'تم تحديث حالة المساهمة'
    });
  } catch (error) {
    log.error('Error updating contribution status', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في تحديث حالة المساهمة',
      message: config.isDevelopment ? error.message : undefined
    });
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

    // Validate target amount if provided
    if (target_amount && Number(target_amount) < 50) {
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
    if (target_amount !== undefined) { setClauses.push(`target_amount = $${pIdx++}`); params.push(target_amount ? Number(target_amount) : null); }
    if (start_date !== undefined) { setClauses.push(`start_date = $${pIdx++}`); params.push(start_date); }
    if (end_date !== undefined) { setClauses.push(`end_date = $${pIdx++}`); params.push(end_date); }
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
