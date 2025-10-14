/**
 * Events Page
 */

import userStore from '../state/user-store.js';
import eventStore from '../state/event-store.js';
import customModal from '../components/custom-modal.js';
import logger from '../utils/logger.js';
import modalKeyboardTrap from '../utils/modal-keyboard-trap.js';

class EventsPage {
  constructor() {
    this.currentTab = 'upcoming';
    this.selectedEvent = null;
    this.init();
  }

  async init() {
    if (!userStore.state.isAuthenticated) {
      window.location.href = '/login.html';
      return;
    }

    this.showLoading(true);

    try {
      await eventStore.actions.fetchEvents(eventStore.state);
      this.renderEventsList();
      this.updateTabCounts();
      this.attachEventListeners();
    } catch (error) {
      logger.error('Events page error:', { error });
    } finally {
      this.showLoading(false);
    }
  }

  renderEventsList() {
    const container = document.getElementById('eventsList');
    const events = this.currentTab === 'upcoming'
      ? eventStore.state.upcomingEvents
      : eventStore.state.pastEvents;

    if (events.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <p>لا توجد فعاليات ${this.currentTab === 'upcoming' ? 'قادمة' : 'سابقة'}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = events.map(event => this.renderEventCard(event)).join('');

    container.querySelectorAll('.event-card').forEach(card => {
      // Make keyboard accessible
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `فعالية: ${card.querySelector('.event-card-title')?.textContent || 'فعالية'}`);

      // Click handler
      const handleActivate = () => {
        const eventId = parseInt(card.dataset.eventId);
        this.showEventDetails(eventId);
      };

      card.addEventListener('click', handleActivate);

      // Keyboard handler
      card.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleActivate();
        }
      });
    });
  }

  renderEventCard(event) {
    const eventDate = new Date(event.date);
    const day = eventDate.getDate();
    const month = eventDate.toLocaleDateString('ar-SA', { month: 'short' });
    const time = eventDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

    const rsvpStatus = event.userRsvp
      ? event.userRsvp.response
      : 'pending';

    const statusLabels = {
      'yes': 'مؤكد',
      'maybe': 'ربما',
      'no': 'معتذر',
      'pending': 'لم يتم الرد'
    };

    return `
      <div class="event-card" data-event-id="${event.id}">
        <div class="event-card-image">
          ${event.image_url
            ? `<img src="${event.image_url}" alt="${event.title}">`
            : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>`
          }
          <div class="event-date-badge">
            <span class="event-day">${day}</span>
            <span class="event-month">${month}</span>
          </div>
        </div>
        <div class="event-card-content">
          <h3 class="event-card-title">${event.title}</h3>
          <div class="event-card-meta">
            <div class="event-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              ${time}
            </div>
            <div class="event-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              ${event.location || 'لم يحدد'}
            </div>
          </div>
          <div class="event-card-footer">
            <div class="event-attendees">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
              ${event.confirmed_count || 0} مؤكد
            </div>
            <span class="event-rsvp-status ${rsvpStatus}">
              ${statusLabels[rsvpStatus]}
            </span>
          </div>
        </div>
      </div>
    `;
  }

  async showEventDetails(eventId) {
    this.selectedEvent = eventStore.state.events.find(e => e.id === eventId);
    if (!this.selectedEvent) return;

    const modal = document.getElementById('eventModal');
    const eventDate = new Date(this.selectedEvent.date);

    document.getElementById('eventTitle').textContent = this.selectedEvent.title;

    const eventImage = document.getElementById('eventImage');
    if (this.selectedEvent.image_url) {
      eventImage.innerHTML = `<img src="${this.selectedEvent.image_url}" alt="${this.selectedEvent.title}">`;
    } else {
      eventImage.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      `;
    }

    document.getElementById('eventDate').textContent = eventDate.toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    document.getElementById('eventTime').textContent = eventDate.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit'
    });

    document.getElementById('eventLocation').textContent = this.selectedEvent.location || 'لم يحدد';
    document.getElementById('eventDescription').textContent = this.selectedEvent.description || 'لا يوجد وصف';

    document.getElementById('confirmedCount').textContent = this.selectedEvent.confirmed_count || 0;
    document.getElementById('maybeCount').textContent = this.selectedEvent.maybe_count || 0;
    document.getElementById('declinedCount').textContent = this.selectedEvent.declined_count || 0;

    if (this.selectedEvent.userRsvp) {
      const response = this.selectedEvent.userRsvp.response;
      document.querySelector(`input[name="rsvpResponse"][value="${response}"]`).checked = true;

      if (response === 'yes' && this.selectedEvent.userRsvp.guest_count) {
        document.getElementById('guestCountGroup').style.display = 'block';
        document.getElementById('guestCount').value = this.selectedEvent.userRsvp.guest_count;
      }

      if (this.selectedEvent.userRsvp.notes) {
        document.getElementById('rsvpNotes').value = this.selectedEvent.userRsvp.notes;
      }
    }

    modal.style.display = 'flex';

    // Enable keyboard trap for accessibility
    modalKeyboardTrap.enableTrap(modal);

    if (this.selectedEvent.confirmed_count > 0) {
      await this.loadAttendees();
    }
  }

  async loadAttendees() {
    try {
      const result = await eventStore.actions.fetchAttendees(
        eventStore.state,
        this.selectedEvent.id
      );

      if (result.success && result.data.length > 0) {
        const attendeesSection = document.getElementById('attendeesSection');
        const attendeesList = document.getElementById('attendeesList');

        attendeesList.innerHTML = result.data.map(attendee => `
          <div class="attendee-item">
            <div class="attendee-avatar">
              ${attendee.member_name ? attendee.member_name.charAt(0) : '؟'}
            </div>
            <div class="attendee-info">
              <div class="attendee-name">${attendee.member_name || 'عضو'}</div>
              ${attendee.guest_count > 0
                ? `<div class="attendee-guests">+ ${attendee.guest_count} مرافق</div>`
                : ''
              }
            </div>
          </div>
        `).join('');

        attendeesSection.style.display = 'block';
      }
    } catch (error) {
      logger.error('Error loading attendees:', { error });
    }
  }

  attachEventListeners() {
    document.getElementById('backBtn').addEventListener('click', () => {
      window.location.href = '/dashboard.html';
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTab = btn.dataset.tab;
        this.renderEventsList();
      });
    });

    document.getElementById('closeModalBtn').addEventListener('click', () => {
      this.hideEventModal();
    });

    document.querySelectorAll('input[name="rsvpResponse"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const guestCountGroup = document.getElementById('guestCountGroup');
        if (e.target.value === 'yes') {
          guestCountGroup.style.display = 'block';
        } else {
          guestCountGroup.style.display = 'none';
          document.getElementById('guestCount').value = 0;
        }
      });
    });

    document.getElementById('submitRsvpBtn').addEventListener('click', () => {
      this.submitRsvp();
    });
  }

  async submitRsvp() {
    const response = document.querySelector('input[name="rsvpResponse"]:checked');
    if (!response) {
      await customModal.alert('يرجى اختيار ردك على الدعوة', 'رد مطلوب');
      return;
    }

    const guestCount = response.value === 'yes'
      ? parseInt(document.getElementById('guestCount').value) || 0
      : 0;

    const notes = document.getElementById('rsvpNotes').value;

    this.showLoading(true);

    try {
      const result = await eventStore.actions.submitRsvp(eventStore.state, {
        eventId: this.selectedEvent.id,
        response: response.value,
        guestCount: guestCount,
        notes: notes
      });

      if (result.success) {
        await customModal.alert('تم إرسال ردك بنجاح', 'نجح الإرسال');
        this.hideEventModal();
        await eventStore.actions.fetchEvents(eventStore.state);
        this.renderEventsList();
      } else {
        await customModal.alert(result.error || 'فشل إرسال الرد', 'خطأ');
      }
    } catch (error) {
      logger.error('RSVP error:', { error });
      await customModal.alert('حدث خطأ أثناء إرسال الرد', 'خطأ');
    } finally {
      this.showLoading(false);
    }
  }

  hideEventModal() {
    const modal = document.getElementById('eventModal');
    modal.style.display = 'none';

    // Disable keyboard trap
    modalKeyboardTrap.disableTrap();

    this.selectedEvent = null;
    document.querySelectorAll('input[name="rsvpResponse"]').forEach(r => r.checked = false);
    document.getElementById('guestCount').value = 0;
    document.getElementById('rsvpNotes').value = '';
    document.getElementById('guestCountGroup').style.display = 'none';
    document.getElementById('attendeesSection').style.display = 'none';
  }

  updateTabCounts() {
    document.getElementById('upcomingCount').textContent = eventStore.state.upcomingEvents.length;
    document.getElementById('pastCount').textContent = eventStore.state.pastEvents.length;
  }

  showLoading(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
  }
}

new EventsPage();
