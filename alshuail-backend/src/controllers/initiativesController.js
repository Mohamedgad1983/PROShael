import { supabase } from '../config/database.js';
import { log } from '../utils/logger.js';

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

    let query = supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (category) {
      query = query.eq('main_category_id', category);
    }

    if (organizer_id) {
      query = query.eq('organizer_id', organizer_id);
    }

    // Filter for active initiatives only
    if (active_only === 'true') {
      query = query.eq('status', 'active');
    }

    const { data: initiatives, error, count } = await query;

    if (error) {throw error;}

    // Calculate totals and metrics for each initiative
    const enhancedInitiatives = initiatives?.map(initiative => {
      const totalContributed = Number(initiative.current_amount) || 0;
      const contributorsCount = Number(initiative.contributor_count) || 0;

      const progressPercentage = initiative.target_amount ?
        Math.round((totalContributed / Number(initiative.target_amount)) * 100) : 0;

      const daysRemaining = initiative.collection_end_date ?
        Math.ceil((new Date(initiative.collection_end_date) - new Date()) / (1000 * 60 * 60 * 24)) : null;

      return {
        ...initiative,
        total_contributed: totalContributed,
        contributors_count: contributorsCount,
        progress_percentage: progressPercentage,
        days_remaining: daysRemaining,
        is_target_reached: initiative.target_amount ? totalContributed >= Number(initiative.target_amount) : false,
        is_expired: initiative.collection_end_date ? new Date(initiative.collection_end_date) < new Date() : false
      };
    }) || [];

    res.json({
      success: true,
      data: enhancedInitiatives,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: count || enhancedInitiatives.length
      },
      message: 'تم جلب المبادرات بنجاح'
    });
  } catch (error) {
    log.error('Error fetching initiatives', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في جلب المبادرات',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
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

    const { data: initiative, error } = await supabase
      .from('activities')
      .select(`
        *,
        organizer:members(id, full_name, phone, email),
        contributions:activity_contributions(
          id,
          amount,
          status,
          payment_method,
          reference_number,
          notes,
          created_at,
          member:members(id, full_name, phone, email)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'المبادرة غير موجودة'
        });
      }
      throw error;
    }

    // Calculate detailed metrics
    const allContributions = initiative.contributions || [];
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
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      const { data: organizer, error: _organizerError } = await supabase
        .from('members')
        .select('id')
        .eq('id', organizer_id)
        .single();

      if (_organizerError || !organizer) {
        return res.status(400).json({
          success: false,
          error: 'المنظم المحدد غير موجود'
        });
      }
    }

    const initiativeData = {
      title,
      description,
      category,
      target_amount: target_amount ? Number(target_amount) : null,
      start_date,
      end_date,
      organizer_id,
      status,
      current_amount: 0
    };

    const { data: newInitiative, error } = await supabase
      .from('activities')
      .insert([initiativeData])
      .select(`
        *,
        organizer:members(id, full_name, phone, email)
      `)
      .single();

    if (error) {throw error;}

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
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
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
    const { data: initiative, error: _initiativeError } = await supabase
      .from('activities')
      .select('id, status, target_amount, current_amount, end_date')
      .eq('id', id)
      .single();

    if (_initiativeError || !initiative) {
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
    const { data: member, error: _memberError } = await supabase
      .from('members')
      .select('id')
      .eq('id', member_id)
      .single();

    if (_memberError || !member) {
      return res.status(400).json({
        success: false,
        error: 'العضو المحدد غير موجود'
      });
    }

    // Generate reference number
    const referenceNumber = generateContributionReference();

    const contributionData = {
      activity_id: id,
      member_id,
      amount: contributionAmount,
      payment_method,
      status,
      reference_number: referenceNumber,
      notes
    };

    const { data: newContribution, error } = await supabase
      .from('activity_contributions')
      .insert([contributionData])
      .select(`
        *,
        member:members(id, full_name, phone, email),
        activity:activities(id, title)
      `)
      .single();

    if (error) {throw error;}

    // Update initiative current amount if contribution is confirmed
    if (status === 'confirmed') {
      const { error: _updateError } = await supabase
        .from('activities')
        .update({
          current_amount: Number(initiative.current_amount) + contributionAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (_updateError) {throw _updateError;}
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
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
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
    const { data: contribution, error: _contributionError } = await supabase
      .from('activity_contributions')
      .select('*')
      .eq('id', contributionId)
      .eq('activity_id', id)
      .single();

    if (_contributionError || !contribution) {
      return res.status(404).json({
        success: false,
        error: 'المساهمة غير موجودة'
      });
    }

    // Get initiative data
    const { data: initiative, error: _initiativeError } = await supabase
      .from('activities')
      .select('current_amount')
      .eq('id', id)
      .single();

    if (_initiativeError || !initiative) {
      return res.status(404).json({
        success: false,
        error: 'المبادرة غير موجودة'
      });
    }

    // Update contribution
    const updateData = { status };
    if (notes !== undefined) {updateData.notes = notes;}

    const { data: updatedContribution, error: _updateError } = await supabase
      .from('activity_contributions')
      .update(updateData)
      .eq('id', contributionId)
      .select(`
        *,
        member:members(id, full_name, phone, email)
      `)
      .single();

    if (_updateError) {throw _updateError;}

    // Update initiative current amount based on status change
    let amountChange = 0;
    if (contribution.status === 'confirmed' && status !== 'confirmed') {
      amountChange = -Number(contribution.amount);
    } else if (contribution.status !== 'confirmed' && status === 'confirmed') {
      amountChange = Number(contribution.amount);
    }

    if (amountChange !== 0) {
      const { error: _updateInitiativeError } = await supabase
        .from('activities')
        .update({
          current_amount: Math.max(0, Number(initiative.current_amount) + amountChange),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (_updateInitiativeError) {throw _updateInitiativeError;}
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
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
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
    const { data: existingInitiative, error: _checkError } = await supabase
      .from('activities')
      .select('*')
      .eq('id', id)
      .single();

    if (_checkError || !existingInitiative) {
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

    const updateData = {
      updated_at: new Date().toISOString()
    };

    // Only update provided fields
    if (title !== undefined) {updateData.title = title;}
    if (description !== undefined) {updateData.description = description;}
    if (category !== undefined) {updateData.category = category;}
    if (target_amount !== undefined) {updateData.target_amount = target_amount ? Number(target_amount) : null;}
    if (start_date !== undefined) {updateData.start_date = start_date;}
    if (end_date !== undefined) {updateData.end_date = end_date;}
    if (status !== undefined) {updateData.status = status;}

    const { data: updatedInitiative, error } = await supabase
      .from('activities')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        organizer:members(id, full_name, phone, email)
      `)
      .single();

    if (error) {throw error;}

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
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
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
    const { count: totalInitiatives, error: _totalError } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true });

    if (_totalError) {throw _totalError;}

    // Get active initiatives
    const { count: activeInitiatives, error: _activeError } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    if (_activeError) {throw _activeError;}

    // Get total contributions
    const { count: totalContributions, error: _contributionsError } = await supabase
      .from('activity_contributions')
      .select('*', { count: 'exact', head: true });

    if (_contributionsError) {throw _contributionsError;}

    // Get confirmed contributions and total amount
    const { data: confirmedContributions, error: _confirmedError } = await supabase
      .from('activity_contributions')
      .select('amount')
      .eq('status', 'confirmed');

    if (_confirmedError) {throw _confirmedError;}

    const totalAmountRaised = confirmedContributions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

    // Get initiatives by status
    const { data: statusData, error: _statusError } = await supabase
      .from('activities')
      .select('status');

    if (_statusError) {throw _statusError;}

    const statusStats = statusData?.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {}) || {};

    // Get unique contributors
    const { data: contributorsData, error: _contributorsError } = await supabase
      .from('activity_contributions')
      .select('member_id')
      .eq('status', 'confirmed');

    if (_contributorsError) {throw _contributorsError;}

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
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};