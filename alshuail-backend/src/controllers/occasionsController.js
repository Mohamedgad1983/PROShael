import { supabase } from '../config/database.js';
import { log } from '../utils/logger.js';

/**
 * Get all occasions with optional filters
 * GET /api/occasions
 */
export const getAllOccasions = async (req, res) => {
  try {
    const {
      status,
      category,
      organizer_id,
      upcoming = 'false',
      limit = 50,
      offset = 0
    } = req.query;

    let query = supabase
      .from('events')
      .select('*')
      .order('start_date', { ascending: true })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (category) {
      query = query.eq('event_type', category);
    }

    if (organizer_id) {
      query = query.eq('organizer', organizer_id);
    }

    // Filter for upcoming events only
    if (upcoming === 'true') {
      const today = new Date().toISOString().split('T')[0];
      query = query.gte('start_date', today);
    }

    const { data: occasions, error, count } = await query;

    if (error) throw error;

    // Calculate additional metrics for each occasion
    const enhancedOccasions = occasions?.map(occasion => ({
      ...occasion,
      days_until_event: occasion.start_date ?
        Math.ceil((new Date(occasion.start_date) - new Date()) / (1000 * 60 * 60 * 24)) : null,
      attendance_rate: occasion.max_attendees && occasion.current_attendees ?
        Math.round((occasion.current_attendees / occasion.max_attendees) * 100) : 0,
      is_full: occasion.max_attendees ? (occasion.current_attendees || 0) >= occasion.max_attendees : false
    })) || [];

    res.json({
      success: true,
      data: enhancedOccasions,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: count || enhancedOccasions.length
      },
      message: 'تم جلب المناسبات بنجاح'
    });
  } catch (error) {
    log.error('Error fetching occasions', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في جلب المناسبات',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get occasion by ID
 * GET /api/occasions/:id
 */
export const getOccasionById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: occasion, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'المناسبة غير موجودة'
        });
      }
      throw error;
    }

    // Calculate additional metrics
    const enhancedOccasion = {
      ...occasion,
      days_until_event: occasion.start_date ?
        Math.ceil((new Date(occasion.start_date) - new Date()) / (1000 * 60 * 60 * 24)) : null,
      attendance_rate: occasion.max_attendees && occasion.current_attendees ?
        Math.round((occasion.current_attendees / occasion.max_attendees) * 100) : 0,
      is_full: occasion.max_attendees ? (occasion.current_attendees || 0) >= occasion.max_attendees : false
    };

    res.json({
      success: true,
      data: enhancedOccasion,
      message: 'تم جلب بيانات المناسبة بنجاح'
    });
  } catch (error) {
    log.error('Error fetching occasion', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في جلب بيانات المناسبة',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create new occasion
 * POST /api/occasions
 */
export const createOccasion = async (req, res) => {
  try {
    const {
      title,
      description,
      start_date,
      end_date,
      location,
      event_type,
      max_attendees,
      organizer,
      status = 'active'
    } = req.body;

    // Validation
    if (!title || !start_date) {
      return res.status(400).json({
        success: false,
        error: 'العنوان وتاريخ بداية المناسبة مطلوبان'
      });
    }

    // Validate start date is not in the past
    const startDate = new Date(start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      return res.status(400).json({
        success: false,
        error: 'لا يمكن إنشاء مناسبة في تاريخ سابق'
      });
    }

    // Validate organizer exists if provided
    if (organizer) {
      const { data: organizerData, error: organizerError } = await supabase
        .from('members')
        .select('id')
        .eq('id', organizer)
        .single();

      if (organizerError || !organizerData) {
        return res.status(400).json({
          success: false,
          error: 'المنظم المحدد غير موجود'
        });
      }
    }

    const occasionData = {
      title,
      description,
      start_date,
      end_date,
      location,
      event_type,
      max_attendees: max_attendees ? parseInt(max_attendees) : null,
      organizer,
      status,
      current_attendees: 0
    };

    const { data: newOccasion, error } = await supabase
      .from('events')
      .insert([occasionData])
      .select('*')
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data: newOccasion,
      message: 'تم إنشاء المناسبة بنجاح'
    });
  } catch (error) {
    log.error('Error creating occasion', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في إنشاء المناسبة',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update occasion RSVP status
 * PUT /api/occasions/:id/rsvp
 */
export const updateRSVP = async (req, res) => {
  try {
    const { id } = req.params;
    const { member_id, status, notes } = req.body;

    // Validation
    if (!member_id || !status) {
      return res.status(400).json({
        success: false,
        error: 'معرف العضو وحالة الحضور مطلوبان'
      });
    }

    if (!['pending', 'confirmed', 'declined'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'حالة الحضور غير صحيحة'
      });
    }

    // Check if occasion exists
    const { data: occasion, error: occasionError } = await supabase
      .from('events')
      .select('id, max_attendees, current_attendees, status')
      .eq('id', id)
      .single();

    if (occasionError || !occasion) {
      return res.status(404).json({
        success: false,
        error: 'المناسبة غير موجودة'
      });
    }

    if (occasion.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'لا يمكن التسجيل في مناسبة غير نشطة'
      });
    }

    // Check if member exists
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id')
      .eq('id', member_id)
      .single();

    if (memberError || !member) {
      return res.status(400).json({
        success: false,
        error: 'العضو المحدد غير موجود'
      });
    }

    // Check if occasion is full (only for confirmed status)
    if (status === 'confirmed' && occasion.max_attendees &&
        occasion.current_attendees >= occasion.max_attendees) {
      return res.status(400).json({
        success: false,
        error: 'المناسبة مكتملة العدد'
      });
    }

    // Get existing RSVP if any
    const { data: existingRsvp } = await supabase
      .from('event_rsvps')
      .select('*')
      .eq('event_id', id)
      .eq('member_id', member_id)
      .single();

    let rsvpResult;
    let attendeeChange = 0;

    if (existingRsvp) {
      // Update existing RSVP
      const { data: updatedRsvp, error: updateError } = await supabase
        .from('event_rsvps')
        .update({
          status,
          notes,
          response_date: new Date().toISOString()
        })
        .eq('id', existingRsvp.id)
        .select('*')
        .single();

      if (updateError) throw updateError;
      rsvpResult = updatedRsvp;

      // Calculate attendee change
      if (existingRsvp.status === 'confirmed' && status !== 'confirmed') {
        attendeeChange = -1;
      } else if (existingRsvp.status !== 'confirmed' && status === 'confirmed') {
        attendeeChange = 1;
      }
    } else {
      // Create new RSVP
      const { data: newRsvp, error: createError } = await supabase
        .from('event_rsvps')
        .insert([{
          event_id: id,
          member_id,
          status,
          notes,
          response_date: new Date().toISOString()
        }])
        .select('*')
        .single();

      if (createError) throw createError;
      rsvpResult = newRsvp;

      // Calculate attendee change
      if (status === 'confirmed') {
        attendeeChange = 1;
      }
    }

    // Update current attendees count if needed
    if (attendeeChange !== 0) {
      const { error: updateAttendeeError } = await supabase
        .from('events')
        .update({
          current_attendees: Math.max(0, occasion.current_attendees + attendeeChange),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateAttendeeError) throw updateAttendeeError;
    }

    res.json({
      success: true,
      data: rsvpResult,
      message: status === 'confirmed' ? 'تم تأكيد الحضور بنجاح' :
               status === 'declined' ? 'تم رفض الحضور' : 'تم تحديث حالة الحضور'
    });
  } catch (error) {
    log.error('Error updating RSVP', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في تحديث حالة الحضور',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update occasion details
 * PUT /api/occasions/:id
 */
export const updateOccasion = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      event_date,
      event_time,
      location,
      category,
      max_attendees,
      status
    } = req.body;

    // Check if occasion exists
    const { data: existingOccasion, error: checkError } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !existingOccasion) {
      return res.status(404).json({
        success: false,
        error: 'المناسبة غير موجودة'
      });
    }

    // Validate event date if provided
    if (event_date) {
      const eventDate = new Date(event_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (eventDate < today) {
        return res.status(400).json({
          success: false,
          error: 'لا يمكن تحديد تاريخ سابق للمناسبة'
        });
      }
    }

    const updateData = {
      updated_at: new Date().toISOString()
    };

    // Only update provided fields
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (event_date !== undefined) updateData.event_date = event_date;
    if (event_time !== undefined) updateData.event_time = event_time;
    if (location !== undefined) updateData.location = location;
    if (category !== undefined) updateData.category = category;
    if (max_attendees !== undefined) updateData.max_attendees = max_attendees ? parseInt(max_attendees) : null;
    if (status !== undefined) updateData.status = status;

    const { data: updatedOccasion, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: updatedOccasion,
      message: 'تم تحديث المناسبة بنجاح'
    });
  } catch (error) {
    log.error('Error updating occasion', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في تحديث المناسبة',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete occasion
 * DELETE /api/occasions/:id
 */
export const deleteOccasion = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if occasion exists
    const { data: existingOccasion, error: checkError } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !existingOccasion) {
      return res.status(404).json({
        success: false,
        error: 'المناسبة غير موجودة'
      });
    }

    // Delete the occasion (RSVPs will be deleted automatically due to CASCADE)
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'تم حذف المناسبة بنجاح'
    });
  } catch (error) {
    log.error('Error deleting occasion', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في حذف المناسبة',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get occasion statistics
 * GET /api/occasions/stats
 */
export const getOccasionStats = async (req, res) => {
  try {
    // Get total occasions
    const { count: totalOccasions, error: totalError } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true });

    if (totalError) throw totalError;

    // Get upcoming occasions
    const today = new Date().toISOString().split('T')[0];
    const { count: upcomingOccasions, error: upcomingError } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('event_date', today);

    if (upcomingError) throw upcomingError;

    // Get occasions by status
    const { data: statusData, error: statusError } = await supabase
      .from('events')
      .select('status')
      .not('status', 'is', null);

    if (statusError) throw statusError;

    const statusStats = statusData?.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {}) || {};

    // Get total RSVPs
    const { count: totalRsvps, error: rsvpError } = await supabase
      .from('event_rsvps')
      .select('*', { count: 'exact', head: true });

    if (rsvpError) throw rsvpError;

    // Get RSVPs by status
    const { data: rsvpStatusData, error: rsvpStatusError } = await supabase
      .from('event_rsvps')
      .select('status');

    if (rsvpStatusError) throw rsvpStatusError;

    const rsvpStatusStats = rsvpStatusData?.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {}) || {};

    res.json({
      success: true,
      data: {
        total_occasions: totalOccasions || 0,
        upcoming_occasions: upcomingOccasions || 0,
        occasions_by_status: statusStats,
        total_rsvps: totalRsvps || 0,
        rsvps_by_status: rsvpStatusStats,
        attendance_rate: totalRsvps > 0 ?
          Math.round(((rsvpStatusStats.confirmed || 0) / totalRsvps) * 100) : 0
      },
      message: 'تم جلب إحصائيات المناسبات بنجاح'
    });
  } catch (error) {
    log.error('Error fetching occasion stats', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في جلب إحصائيات المناسبات',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};