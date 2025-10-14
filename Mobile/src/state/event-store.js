/**
 * Event Store - Manages events and RSVPs
 * @module event-store
 */

import stateManager from './state-manager.js';
import apiClient from '../api/api-client.js';

// Initial state
const initialState = {
  events: [],
  upcomingEvents: [],
  pastEvents: [],
  currentEvent: null,
  myRsvps: [],
  isLoading: false,
  error: null,
  filters: {
    status: 'upcoming', // upcoming, past, all
    rsvpStatus: 'all' // all, yes, no, maybe, pending
  }
};

// Actions
const actions = {
  /**
   * Fetch all events
   * @param {Object} state - Current state
   */
  async fetchEvents(state) {
    state.isLoading = true;

    try {
      const result = await apiClient.get('/api/events');

      if (result.success) {
        state.events = result.data;

        // Separate upcoming and past events
        const now = new Date();
        state.upcomingEvents = result.data.filter(e =>
          new Date(e.date) >= now
        ).sort((a, b) => new Date(a.date) - new Date(b.date));

        state.pastEvents = result.data.filter(e =>
          new Date(e.date) < now
        ).sort((a, b) => new Date(b.date) - new Date(a.date));

        return { success: true };
      } else {
        state.error = result.error;
        return { success: false, error: result.error };
      }
    } catch (error) {
      state.error = 'فشل في تحميل الفعاليات';
      return { success: false, error: 'فشل في تحميل الفعاليات' };
    } finally {
      state.isLoading = false;
    }
  },

  /**
   * Fetch event details
   * @param {Object} state - Current state
   * @param {string} eventId - Event ID
   */
  async fetchEventDetails(state, eventId) {
    state.isLoading = true;

    try {
      const result = await apiClient.get(`/api/events/${eventId}`);

      if (result.success) {
        state.currentEvent = result.data;
        return { success: true, data: result.data };
      } else {
        state.error = result.error;
        return { success: false, error: result.error };
      }
    } catch (error) {
      state.error = 'فشل في تحميل تفاصيل الفعالية';
      return { success: false, error: 'فشل في تحميل تفاصيل الفعالية' };
    } finally {
      state.isLoading = false;
    }
  },

  /**
   * Submit RSVP
   * @param {Object} state - Current state
   * @param {Object} rsvpData - RSVP data
   */
  async submitRsvp(state, rsvpData) {
    state.isLoading = true;

    try {
      const { eventId, response, guestCount, notes } = rsvpData;

      const result = await apiClient.post(`/api/events/${eventId}/rsvp`, {
        response, // 'yes', 'no', 'maybe'
        guestCount,
        notes
      });

      if (result.success) {
        // Update RSVP in event
        if (state.currentEvent && state.currentEvent.id === eventId) {
          state.currentEvent.userRsvp = result.data;
        }

        // Update in events list
        const eventIndex = state.events.findIndex(e => e.id === eventId);
        if (eventIndex > -1) {
          state.events[eventIndex].userRsvp = result.data;
        }

        // Add to my RSVPs
        const rsvpIndex = state.myRsvps.findIndex(r => r.event_id === eventId);
        if (rsvpIndex > -1) {
          state.myRsvps[rsvpIndex] = result.data;
        } else {
          state.myRsvps.push(result.data);
        }

        return { success: true, data: result.data };
      } else {
        state.error = result.error;
        return { success: false, error: result.error };
      }
    } catch (error) {
      state.error = 'فشل في إرسال التأكيد';
      return { success: false, error: 'فشل في إرسال التأكيد' };
    } finally {
      state.isLoading = false;
    }
  },

  /**
   * Fetch attendees for event
   * @param {Object} state - Current state
   * @param {string} eventId - Event ID
   */
  async fetchAttendees(state, eventId) {
    try {
      const result = await apiClient.get(`/api/events/${eventId}/attendees`);

      if (result.success) {
        return { success: true, data: result.data };
      } else {
        state.error = result.error;
        return { success: false, error: result.error };
      }
    } catch (error) {
      state.error = 'فشل في تحميل قائمة الحضور';
      return { success: false, error: 'فشل في تحميل قائمة الحضور' };
    }
  },

  /**
   * Fetch my RSVPs
   * @param {Object} state - Current state
   */
  async fetchMyRsvps(state) {
    try {
      const result = await apiClient.get('/api/events/my-rsvps');

      if (result.success) {
        state.myRsvps = result.data;
        return { success: true };
      } else {
        state.error = result.error;
        return { success: false, error: result.error };
      }
    } catch (error) {
      state.error = 'فشل في تحميل تأكيداتك';
      return { success: false, error: 'فشل في تحميل تأكيداتك' };
    }
  },

  /**
   * Add event to calendar (generate iCal)
   * @param {Object} state - Current state
   * @param {string} eventId - Event ID
   */
  async addToCalendar(state, eventId) {
    try {
      const result = await apiClient.get(`/api/events/${eventId}/ical`);

      if (result.success) {
        // Download iCal file
        const blob = new Blob([result.data.ical], { type: 'text/calendar' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `event-${eventId}.ics`;
        a.click();
        window.URL.revokeObjectURL(url);

        return { success: true };
      } else {
        state.error = result.error;
        return { success: false, error: result.error };
      }
    } catch (error) {
      state.error = 'فشل في إضافة الفعالية إلى التقويم';
      return { success: false, error: 'فشل في إضافة الفعالية إلى التقويم' };
    }
  },

  /**
   * Update filters
   * @param {Object} state - Current state
   * @param {Object} filters - New filters
   */
  updateFilters(state, filters) {
    state.filters = { ...state.filters, ...filters };
  },

  /**
   * Clear current event
   * @param {Object} state - Current state
   */
  clearCurrentEvent(state) {
    state.currentEvent = null;
  },

  /**
   * Clear error
   * @param {Object} state - Current state
   */
  clearError(state) {
    state.error = null;
  }
};

// Computed properties
const computed = {
  /**
   * Get filtered events
   * @param {Object} state - Current state
   * @returns {Array} Filtered events
   */
  filteredEvents(state) {
    let events = [];

    // Filter by status
    if (state.filters.status === 'upcoming') {
      events = state.upcomingEvents;
    } else if (state.filters.status === 'past') {
      events = state.pastEvents;
    } else {
      events = state.events;
    }

    // Filter by RSVP status
    if (state.filters.rsvpStatus !== 'all') {
      events = events.filter(e =>
        e.userRsvp && e.userRsvp.response === state.filters.rsvpStatus
      );
    }

    return events;
  },

  /**
   * Get next upcoming event
   * @param {Object} state - Current state
   * @returns {Object|null} Next event or null
   */
  nextEvent(state) {
    return state.upcomingEvents.length > 0 ? state.upcomingEvents[0] : null;
  },

  /**
   * Get event statistics
   * @param {Object} state - Current state
   * @returns {Object} Event statistics
   */
  statistics(state) {
    const totalRsvps = state.myRsvps.length;
    const yes = state.myRsvps.filter(r => r.response === 'yes').length;
    const no = state.myRsvps.filter(r => r.response === 'no').length;
    const maybe = state.myRsvps.filter(r => r.response === 'maybe').length;

    return {
      totalEvents: state.events.length,
      upcomingEvents: state.upcomingEvents.length,
      pastEvents: state.pastEvents.length,
      totalRsvps,
      yes,
      no,
      maybe,
      responseRate: state.events.length > 0
        ? (totalRsvps / state.events.length * 100).toFixed(1)
        : 0
    };
  }
};

// Create store
const eventStore = stateManager.createStore('event', initialState, {
  persist: true,
  actions,
  computed
});

export default eventStore;
