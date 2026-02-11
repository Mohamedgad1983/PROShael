import { query } from '../services/database.js';
import { log } from '../utils/logger.js';
import { config } from '../config/env.js';

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

    // Build dynamic WHERE conditions
    const conditions = [];
    const params = [];
    let paramCount = 1;

    if (status) {
      conditions.push(`status = $${paramCount++}`);
      params.push(status);
    }

    if (category) {
      conditions.push(`event_type = $${paramCount++}`);
      params.push(category);
    }

    if (organizer_id) {
      conditions.push(`organizer = $${paramCount++}`);
      params.push(organizer_id);
    }

    // Filter for upcoming events only
    if (upcoming === 'true') {
      const today = new Date().toISOString().split('T')[0];
      conditions.push(`start_date >= $${paramCount++}`);
      params.push(today);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countQuery = `SELECT COUNT(*) as count FROM events ${whereClause}`;
    const { rows: countRows } = await query(countQuery, params);
    const totalCount = parseInt(countRows[0].count);

    // Data query with pagination
    params.push(parseInt(limit));
    params.push(parseInt(offset));
    const dataQuery = `
      SELECT * FROM events
      ${whereClause}
      ORDER BY start_date ASC
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;

    const { rows: occasions } = await query(dataQuery, params);

    // Calculate additional metrics for each occasion
    const enhancedOccasions = occasions.map(occasion => ({
      ...occasion,
      days_until_event: occasion.start_date ?
        Math.ceil((new Date(occasion.start_date) - new Date()) / (1000 * 60 * 60 * 24)) : null,
      attendance_rate: occasion.max_attendees && occasion.current_attendees ?
        Math.round((occasion.current_attendees / occasion.max_attendees) * 100) : 0,
      is_full: occasion.max_attendees ? (occasion.current_attendees || 0) >= occasion.max_attendees : false
    }));

    res.json({
      success: true,
      data: enhancedOccasions,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: totalCount
      },
      message: 'تم جلب المناسبات بنجاح'
    });
  } catch (error) {
    log.error('Error fetching occasions', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في جلب المناسبات',
      message: config.isDevelopment ? error.message : undefined
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

    const selectQuery = 'SELECT * FROM events WHERE id = $1';
    const { rows } = await query(selectQuery, [id]);
    const occasion = rows[0];

    if (!occasion) {
      return res.status(404).json({
        success: false,
        error: 'المناسبة غير موجودة'
      });
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
      message: config.isDevelopment ? error.message : undefined
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
      const checkOrganizerQuery = 'SELECT id FROM members WHERE id = $1';
      const { rows: organizerRows } = await query(checkOrganizerQuery, [organizer]);

      if (organizerRows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'المنظم المحدد غير موجود'
        });
      }
    }

    const insertQuery = `
      INSERT INTO events (
        title, description, start_date, end_date, location,
        event_type, max_attendees, organizer, status, current_attendees
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const { rows } = await query(insertQuery, [
      title,
      description,
      start_date,
      end_date,
      location,
      event_type,
      max_attendees ? parseInt(max_attendees) : null,
      organizer,
      status,
      0
    ]);

    const newOccasion = rows[0];

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
      message: config.isDevelopment ? error.message : undefined
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
    const occasionQuery = 'SELECT id, max_attendees, current_attendees, status FROM events WHERE id = $1';
    const { rows: occasionRows } = await query(occasionQuery, [id]);

    if (occasionRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'المناسبة غير موجودة'
      });
    }

    const occasion = occasionRows[0];

    if (occasion.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'لا يمكن التسجيل في مناسبة غير نشطة'
      });
    }

    // Check if member exists
    const memberQuery = 'SELECT id FROM members WHERE id = $1';
    const { rows: memberRows } = await query(memberQuery, [member_id]);

    if (memberRows.length === 0) {
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
    const existingRsvpQuery = 'SELECT * FROM event_rsvps WHERE event_id = $1 AND member_id = $2';
    const { rows: existingRsvpRows } = await query(existingRsvpQuery, [id, member_id]);
    const existingRsvp = existingRsvpRows[0];

    let rsvpResult;
    let attendeeChange = 0;
    const now = new Date().toISOString();

    if (existingRsvp) {
      // Update existing RSVP
      const updateRsvpQuery = `
        UPDATE event_rsvps
        SET status = $1, notes = $2, response_date = $3
        WHERE id = $4
        RETURNING *
      `;
      const { rows: updatedRows } = await query(updateRsvpQuery, [status, notes, now, existingRsvp.id]);
      rsvpResult = updatedRows[0];

      // Calculate attendee change
      if (existingRsvp.status === 'confirmed' && status !== 'confirmed') {
        attendeeChange = -1;
      } else if (existingRsvp.status !== 'confirmed' && status === 'confirmed') {
        attendeeChange = 1;
      }
    } else {
      // Create new RSVP
      const insertRsvpQuery = `
        INSERT INTO event_rsvps (event_id, member_id, status, notes, response_date)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const { rows: newRsvpRows } = await query(insertRsvpQuery, [id, member_id, status, notes, now]);
      rsvpResult = newRsvpRows[0];

      // Calculate attendee change
      if (status === 'confirmed') {
        attendeeChange = 1;
      }
    }

    // Update current attendees count if needed
    if (attendeeChange !== 0) {
      const updateAttendeesQuery = `
        UPDATE events
        SET current_attendees = GREATEST(0, current_attendees + $1), updated_at = $2
        WHERE id = $3
      `;
      await query(updateAttendeesQuery, [attendeeChange, now, id]);
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
      message: config.isDevelopment ? error.message : undefined
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
    const checkQuery = 'SELECT * FROM events WHERE id = $1';
    const { rows: existingRows } = await query(checkQuery, [id]);

    if (existingRows.length === 0) {
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

    // Build dynamic update query
    const updates = [];
    const params = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      params.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      params.push(description);
    }
    if (event_date !== undefined) {
      updates.push(`event_date = $${paramCount++}`);
      params.push(event_date);
    }
    if (event_time !== undefined) {
      updates.push(`event_time = $${paramCount++}`);
      params.push(event_time);
    }
    if (location !== undefined) {
      updates.push(`location = $${paramCount++}`);
      params.push(location);
    }
    if (category !== undefined) {
      updates.push(`category = $${paramCount++}`);
      params.push(category);
    }
    if (max_attendees !== undefined) {
      updates.push(`max_attendees = $${paramCount++}`);
      params.push(max_attendees ? parseInt(max_attendees) : null);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      params.push(status);
    }

    updates.push(`updated_at = $${paramCount++}`);
    params.push(new Date().toISOString());

    params.push(id);

    const updateQuery = `
      UPDATE events
      SET ${updates.join(', ')}
      WHERE id = $${paramCount++}
      RETURNING *
    `;

    const { rows } = await query(updateQuery, params);
    const updatedOccasion = rows[0];

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
      message: config.isDevelopment ? error.message : undefined
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
    const checkQuery = 'SELECT * FROM events WHERE id = $1';
    const { rows: existingRows } = await query(checkQuery, [id]);

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'المناسبة غير موجودة'
      });
    }

    // Delete the occasion (RSVPs will be deleted automatically due to CASCADE)
    const deleteQuery = 'DELETE FROM events WHERE id = $1';
    await query(deleteQuery, [id]);

    res.json({
      success: true,
      message: 'تم حذف المناسبة بنجاح'
    });
  } catch (error) {
    log.error('Error deleting occasion', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في حذف المناسبة',
      message: config.isDevelopment ? error.message : undefined
    });
  }
};

/**
 * Get occasion attendees
 * GET /api/occasions/:id/attendees
 */
export const getOccasionAttendees = async (req, res) => {
  try {
    const { id } = req.params;
    const { status_filter } = req.query;

    // Check if occasion exists
    const occasionQuery = 'SELECT id, title, max_attendees, current_attendees FROM events WHERE id = $1';
    const { rows: occasionRows } = await query(occasionQuery, [id]);

    if (occasionRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'المناسبة غير موجودة'
      });
    }

    const occasion = occasionRows[0];

    // Build query for attendees with member join
    let attendeesQuery = `
      SELECT
        er.id, er.status, er.notes, er.response_date,
        m.id as member_id, m.full_name, m.full_name_en, m.phone,
        m.email, m.photo_url, m.membership_status
      FROM event_rsvps er
      JOIN members m ON er.member_id = m.id
      WHERE er.event_id = $1
    `;

    const params = [id];

    // Apply status filter if provided
    if (status_filter && ['confirmed', 'pending', 'declined'].includes(status_filter)) {
      attendeesQuery += ' AND er.status = $2';
      params.push(status_filter);
    }

    attendeesQuery += ' ORDER BY er.response_date DESC';

    const { rows: rsvps } = await query(attendeesQuery, params);

    // Format attendees data
    const attendees = rsvps.map(rsvp => ({
      rsvp_id: rsvp.id,
      status: rsvp.status,
      notes: rsvp.notes,
      response_date: rsvp.response_date,
      member: {
        id: rsvp.member_id,
        full_name: rsvp.full_name,
        full_name_en: rsvp.full_name_en,
        phone: rsvp.phone,
        email: rsvp.email,
        photo_url: rsvp.photo_url,
        membership_status: rsvp.membership_status
      }
    }));

    // Calculate statistics
    const stats = {
      total_responses: attendees.length,
      confirmed: attendees.filter(a => a.status === 'confirmed').length,
      pending: attendees.filter(a => a.status === 'pending').length,
      declined: attendees.filter(a => a.status === 'declined').length,
      attendance_rate: attendees.length > 0 ?
        Math.round((attendees.filter(a => a.status === 'confirmed').length / attendees.length) * 100) : 0,
      capacity_used: occasion.max_attendees ?
        Math.round((occasion.current_attendees / occasion.max_attendees) * 100) : null,
      spots_remaining: occasion.max_attendees ?
        Math.max(0, occasion.max_attendees - occasion.current_attendees) : null
    };

    res.json({
      success: true,
      data: {
        occasion: {
          id: occasion.id,
          title: occasion.title,
          max_attendees: occasion.max_attendees,
          current_attendees: occasion.current_attendees
        },
        attendees,
        stats
      },
      message: 'تم جلب قائمة الحضور بنجاح'
    });
  } catch (error) {
    log.error('Error fetching occasion attendees', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في جلب قائمة الحضور',
      message: config.isDevelopment ? error.message : undefined
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
    const totalQuery = 'SELECT COUNT(*) as count FROM events';
    const { rows: totalRows } = await query(totalQuery);
    const totalOccasions = parseInt(totalRows[0].count);

    // Get upcoming occasions
    const today = new Date().toISOString().split('T')[0];
    const upcomingQuery = 'SELECT COUNT(*) as count FROM events WHERE status = $1 AND event_date >= $2';
    const { rows: upcomingRows } = await query(upcomingQuery, ['active', today]);
    const upcomingOccasions = parseInt(upcomingRows[0].count);

    // Get occasions by status
    const statusQuery = 'SELECT status, COUNT(*) as count FROM events WHERE status IS NOT NULL GROUP BY status';
    const { rows: statusData } = await query(statusQuery);

    const statusStats = statusData.reduce((acc, item) => {
      acc[item.status] = parseInt(item.count);
      return acc;
    }, {});

    // Get total RSVPs
    const totalRsvpsQuery = 'SELECT COUNT(*) as count FROM event_rsvps';
    const { rows: totalRsvpsRows } = await query(totalRsvpsQuery);
    const totalRsvps = parseInt(totalRsvpsRows[0].count);

    // Get RSVPs by status
    const rsvpStatusQuery = 'SELECT status, COUNT(*) as count FROM event_rsvps GROUP BY status';
    const { rows: rsvpStatusData } = await query(rsvpStatusQuery);

    const rsvpStatusStats = rsvpStatusData.reduce((acc, item) => {
      acc[item.status] = parseInt(item.count);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        total_occasions: totalOccasions,
        upcoming_occasions: upcomingOccasions,
        occasions_by_status: statusStats,
        total_rsvps: totalRsvps,
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
      message: config.isDevelopment ? error.message : undefined
    });
  }
};
