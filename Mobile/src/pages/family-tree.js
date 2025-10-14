import userStore from '../state/user-store.js';
import apiClient from '../api/api-client.js';
import logger from '../utils/logger.js';
import modalKeyboardTrap from '../utils/modal-keyboard-trap.js';

class FamilyTreePage {
  constructor() {
    this.sections = [];
    this.members = [];
    this.currentSection = null;
    this.searchDebounceTimer = null;
    this.init();
  }

  async init() {
    if (!userStore.state.isAuthenticated) window.location.href = '/login.html';
    await this.loadFamilyData();
    this.renderStats();
    this.renderSections();
    this.attachEventListeners();
  }

  async loadFamilyData() {
    try {
      const result = await apiClient.get('/api/family-tree');
      if (result.success) {
        this.sections = result.data.sections;
        this.members = result.data.members;
      }
    } catch {
      this.sections = this.getMockSections();
      this.members = this.getMockMembers();
    }
  }

  getMockSections() {
    return [
      {id:1,name:'قسم الأول',member_count:50},
      {id:2,name:'قسم الثاني',member_count:45},
      {id:3,name:'قسم الثالث',member_count:40},
      {id:4,name:'قسم الرابع',member_count:35},
      {id:5,name:'قسم الخامس',member_count:30},
      {id:6,name:'قسم السادس',member_count:28},
      {id:7,name:'قسم السابع',member_count:25},
      {id:8,name:'قسم الثامن',member_count:22}
    ];
  }

  getMockMembers() {
    return [
      {id:1,name:'عبدالله محمد',phone:'+966501234567',section_id:1,status:'active'},
      {id:2,name:'محمد أحمد',phone:'+966502345678',section_id:1,status:'active'}
    ];
  }

  renderStats() {
    const totalMembers = this.members.length;
    const activeMembers = this.members.filter(m => m.status === 'active').length;

    document.getElementById('totalMembers').textContent = totalMembers;
    document.getElementById('totalSections').textContent = this.sections.length;
    document.getElementById('activeMembers').textContent = activeMembers;
  }

  renderSections() {
    const container = document.getElementById('sectionsList');

    container.innerHTML = this.sections.map(section => `
      <div class="section-card" data-section-id="${section.id}">
        <div class="section-header">
          <div class="section-name">${section.name}</div>
          <span class="section-count">${section.member_count} عضو</span>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.section-card').forEach(card => {
      card.addEventListener('click', () => {
        this.showSectionMembers(parseInt(card.dataset.sectionId));
      });
    });
  }

  showSectionMembers(sectionId) {
    this.currentSection = this.sections.find(s => s.id === sectionId);
    const sectionMembers = this.members.filter(m => m.section_id === sectionId);

    document.getElementById('sectionsList').parentElement.style.display = 'none';
    document.getElementById('membersSection').style.display = 'block';

    const container = document.getElementById('membersList');
    container.innerHTML = sectionMembers.map(member => `
      <div class="member-card" data-member-id="${member.id}">
        <div class="member-avatar">${member.name.charAt(0)}</div>
        <div class="member-info">
          <div class="member-name">${member.name}</div>
          <div class="member-phone">${member.phone}</div>
        </div>
        <span class="member-status ${member.status}">${member.status === 'active' ? 'نشط' : 'غير نشط'}</span>
      </div>
    `).join('');

    container.querySelectorAll('.member-card').forEach(card => {
      // Make keyboard accessible
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `عضو: ${card.querySelector('.member-name')?.textContent || 'عضو'}`);

      // Click handler
      const handleActivate = () => {
        this.showMemberDetails(parseInt(card.dataset.memberId));
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

  showMemberDetails(memberId) {
    const member = this.members.find(m => m.id === memberId);
    if (!member) return;

    document.getElementById('memberName').textContent = member.name;
    document.getElementById('detailId').textContent = member.id;
    document.getElementById('detailPhone').textContent = member.phone;
    document.getElementById('detailSection').textContent = this.sections.find(s => s.id === member.section_id)?.name || '-';

    const statusBadge = document.getElementById('detailStatus');
    statusBadge.textContent = member.status === 'active' ? 'نشط' : 'غير نشط';
    statusBadge.className = `badge badge-${member.status === 'active' ? 'success' : 'warning'}`;

    const modal = document.getElementById('memberModal');
    modal.style.display = 'flex';

    // Enable keyboard trap for accessibility
    modalKeyboardTrap.enableTrap(modal);
  }

  attachEventListeners() {
    document.getElementById('backBtn').addEventListener('click', () => window.location.href = '/dashboard.html');

    document.getElementById('searchBtn').addEventListener('click', () => {
      const searchCard = document.getElementById('searchCard');
      searchCard.style.display = searchCard.style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('backToSections').addEventListener('click', () => {
      document.getElementById('sectionsList').parentElement.style.display = 'block';
      document.getElementById('membersSection').style.display = 'none';
    });

    document.getElementById('closeModalBtn').addEventListener('click', () => {
      const modal = document.getElementById('memberModal');
      modal.style.display = 'none';

      // Disable keyboard trap
      modalKeyboardTrap.disableTrap();
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
      this.filterMembers(e.target.value);
    });
  }

  filterMembers(query) {
    // Clear previous debounce timer
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    // Debounce search with 300ms delay
    this.searchDebounceTimer = setTimeout(() => {
      logger.debug('Searching for:', { query });

      if (!query.trim()) {
        this.renderSections();
        return;
      }

      const searchQuery = query.toLowerCase().trim();
      const filteredMembers = this.members.filter(member =>
        member.name.toLowerCase().includes(searchQuery) ||
        member.phone.includes(searchQuery) ||
        member.id.toString().includes(searchQuery)
      );

      // Show search results
      const container = document.getElementById('sectionsList');
      if (filteredMembers.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p>لا توجد نتائج</p>
            <p class="empty-state-hint">جرب البحث باسم أو رقم هاتف مختلف</p>
          </div>
        `;
        return;
      }

      container.innerHTML = filteredMembers.map(member => `
        <div class="member-card" data-member-id="${member.id}">
          <div class="member-avatar">${member.name.charAt(0)}</div>
          <div class="member-info">
            <div class="member-name">${member.name}</div>
            <div class="member-phone">${member.phone}</div>
          </div>
          <span class="member-status ${member.status}">${member.status === 'active' ? 'نشط' : 'غير نشط'}</span>
        </div>
      `).join('');

      // Add click handlers and keyboard accessibility to search results
      container.querySelectorAll('.member-card').forEach(card => {
        // Make keyboard accessible
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `عضو: ${card.querySelector('.member-name')?.textContent || 'عضو'}`);

        // Click handler
        const handleActivate = () => {
          this.showMemberDetails(parseInt(card.dataset.memberId));
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
    }, 300);
  }
}

new FamilyTreePage();
