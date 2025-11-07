/**
 * Family Tree API Integration
 * This script handles fetching real data from the backend API
 * and updating the HTML pages with actual family branch data
 */

// API Configuration
const API_CONFIG = {
    // For local development
    LOCAL_API_URL: 'http://localhost:3001/api',
    // For production (update this with your actual backend URL)
    PROD_API_URL: 'https://proshael.onrender.com/api',

    // Determine which URL to use based on hostname
    getApiUrl() {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return this.LOCAL_API_URL;
        }
        return this.PROD_API_URL;
    }
};

// Get stored auth token from localStorage
function getAuthToken() {
    // Try multiple possible token keys (main app uses different keys)
    // Check sessionStorage first (React app uses sessionStorage)
    const token = sessionStorage.getItem('token') ||
                  sessionStorage.getItem('authToken') ||
                  sessionStorage.getItem('auth_token') ||
                  localStorage.getItem('authToken') ||
                  localStorage.getItem('auth_token') ||
                  localStorage.getItem('token');

    if (!token) {
        console.warn('No auth token found. Using demo mode.');
        return null;
    }

    console.log('✅ Auth token found, using live API');
    return token;
}

// Fetch with authentication
async function fetchWithAuth(endpoint, options = {}) {
    const apiUrl = API_CONFIG.getApiUrl();
    const token = getAuthToken();

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${apiUrl}${endpoint}`, {
            ...options,
            headers
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Fetch Error:', error);
        // Return mock data if API fails
        return getMockData(endpoint);
    }
}

// Get mock data as fallback
function getMockData(endpoint) {
    if (endpoint.includes('/tree/branches')) {
        return {
            success: true,
            data: [
                {
                    id: '1',
                    branch_code: 'RASH',
                    branch_name: 'رشود',
                    branch_name_en: 'Rashoud',
                    memberCount: 38,
                    pendingCount: 0,
                    branch_head: {
                        full_name_ar: 'رئيس فخذ رشود',
                        phone: '0555-xxx-xxx'
                    }
                },
                {
                    id: '2',
                    branch_code: 'AID',
                    branch_name: 'العيد',
                    branch_name_en: 'Al-Eid',
                    memberCount: 17,
                    pendingCount: 0,
                    branch_head: {
                        full_name_ar: 'رئيس فخذ العيد',
                        phone: '0555-xxx-xxx'
                    }
                },
                {
                    id: '3',
                    branch_code: 'AQAB',
                    branch_name: 'العقاب',
                    branch_name_en: 'Al-Aqab',
                    memberCount: 16,
                    pendingCount: 0,
                    branch_head: {
                        full_name_ar: 'رئيس فخذ العقاب',
                        phone: '0555-xxx-xxx'
                    }
                },
                {
                    id: '4',
                    branch_code: 'DUGH',
                    branch_name: 'الدغيش',
                    branch_name_en: 'Al-Dughaish',
                    memberCount: 11,
                    pendingCount: 0,
                    branch_head: {
                        full_name_ar: 'رئيس فخذ الدغيش',
                        phone: '0555-xxx-xxx'
                    }
                },
                {
                    id: '5',
                    branch_code: 'SHAM',
                    branch_name: 'الشامخ',
                    branch_name_en: 'Al-Shamikh',
                    memberCount: 9,
                    pendingCount: 0,
                    branch_head: {
                        full_name_ar: 'رئيس فخذ الشامخ',
                        phone: '0555-xxx-xxx'
                    }
                },
                {
                    id: '6',
                    branch_code: 'RSHD',
                    branch_name: 'الرشيد',
                    branch_name_en: 'Al-Rashid',
                    memberCount: 1,
                    pendingCount: 0,
                    branch_head: {
                        full_name_ar: 'رئيس فخذ الرشيد',
                        phone: '0555-xxx-xxx'
                    }
                },
                {
                    id: '7',
                    branch_code: 'RSHD2',
                    branch_name: 'رشيد',
                    branch_name_en: 'Rashid',
                    memberCount: 0,
                    pendingCount: 0,
                    branch_head: {
                        full_name_ar: 'رئيس فخذ رشيد',
                        phone: '0555-xxx-xxx'
                    }
                },
                {
                    id: '8',
                    branch_code: 'SHUB',
                    branch_name: 'الشبيعان',
                    branch_name_en: 'Al-Shubaian',
                    memberCount: 5,
                    pendingCount: 0,
                    branch_head: {
                        full_name_ar: 'رئيس فخذ الشبيعان',
                        phone: '0555-xxx-xxx'
                    }
                }
            ]
        };
    }

    if (endpoint.includes('/tree/stats')) {
        return {
            success: true,
            data: {
                total_members: 347,  // Total members in database
                active_members: 347,  // All are active
                assigned_members: 347, // Members assigned to branches
                pending_members: 0,
                branches_count: 10  // Updated to 10 branches (removed 3 English branches)
            }
        };
    }

    if (endpoint.includes('/tree/generations')) {
        return {
            success: true,
            data: []
        };
    }

    // Mock data for unassigned members
    if (endpoint.includes('/tree/unassigned-members')) {
        return {
            success: true,
            data: [],
            pagination: {
                page: 1,
                limit: 50,
                total: 0,
                totalPages: 0
            },
            message: 'Connect to backend API to see unassigned members. Backend running on http://localhost:3001'
        };
    }

    return { success: false, data: [] };
}

// Fetch family branches
async function fetchBranches() {
    return await fetchWithAuth('/tree/branches');
}

// Fetch family tree statistics
async function fetchStats() {
    return await fetchWithAuth('/tree/stats');
}

// Fetch members by generation
async function fetchGenerations(branchId = null) {
    let endpoint = '/tree/generations';
    if (branchId) {
        endpoint += `?branchId=${branchId}`;
    }
    return await fetchWithAuth(endpoint);
}

// Fetch members with filters
async function fetchMembers(filters = {}) {
    const params = new URLSearchParams();
    if (filters.branchId) params.append('branchId', filters.branchId);
    if (filters.generation) params.append('generation', filters.generation);
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);

    let endpoint = '/tree/members';
    if (params.toString()) {
        endpoint += `?${params.toString()}`;
    }

    return await fetchWithAuth(endpoint);
}

// Approve member registration
async function approveMember(memberId) {
    return await fetchWithAuth(`/tree/approve-member/${memberId}`, {
        method: 'POST'
    });
}

// Reject member registration
async function rejectMember(memberId, reason) {
    return await fetchWithAuth(`/tree/reject-member/${memberId}`, {
        method: 'POST',
        body: JSON.stringify({ reason })
    });
}

// Fetch unassigned members
async function fetchUnassignedMembers(page = 1, limit = 50, search = '') {
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);
    if (search) params.append('search', search);

    return await fetchWithAuth(`/tree/unassigned-members?${params.toString()}`);
}

// Assign single member to branch
async function assignMemberToBranch(memberId, branchId) {
    return await fetchWithAuth('/tree/assign-member', {
        method: 'POST',
        body: JSON.stringify({ memberId, branchId })
    });
}

// Bulk assign multiple members to branches
async function bulkAssignMembers(assignments) {
    return await fetchWithAuth('/tree/bulk-assign', {
        method: 'POST',
        body: JSON.stringify({ assignments })
    });
}

// Update clan cards in admin panel
async function updateClanCards() {
    const container = document.getElementById('clans-grid');
    if (!container) return;

    try {
        const response = await fetchBranches();
        if (!response.success) throw new Error('Failed to fetch branches');

        const branches = response.data;
        container.innerHTML = '';

        branches.forEach((branch, index) => {
            const card = document.createElement('div');
            card.className = 'clan-card';
            card.innerHTML = `
                <div class="clan-number">${index + 1}</div>
                <div class="clan-header">
                    <div>
                        <div class="clan-name">فخذ ${branch.branch_name}</div>
                        <div class="clan-head">👤 ${branch.branch_head?.full_name_ar || 'لم يحدد بعد'}</div>
                        <div class="clan-phone">📱 ${branch.branch_head?.phone || '---'}</div>
                    </div>
                </div>
                <div class="clan-stats">
                    <div class="clan-stat">
                        <span>👥</span>
                        <span>${branch.memberCount} عضو</span>
                    </div>
                    <div class="clan-stat">
                        <span>⏳</span>
                        <span>${branch.pendingCount} طلبات</span>
                    </div>
                </div>
                <div class="clan-actions">
                    <button class="clan-btn" onclick="viewClanMembers('${branch.id}')">عرض الأعضاء</button>
                    <button class="clan-btn" onclick="editClan('${branch.id}')">تعديل</button>
                </div>
            `;
            container.appendChild(card);
        });

        // Update total stats
        updateTotalStats(branches);

    } catch (error) {
        console.error('Error updating clan cards:', error);
        // Show error message to user
        container.innerHTML = '<div class="error-message">خطأ في تحميل البيانات. يرجى المحاولة لاحقاً.</div>';
    }
}

// Update total statistics
async function updateTotalStats(branches) {
    // Fetch total members from stats endpoint for accurate count
    try {
        const statsResponse = await fetchStats();
        const totalMembers = statsResponse.data?.total_members || 347; // Use 347 as fallback (real count)

        const totalAssigned = branches.reduce((sum, b) => sum + (b.memberCount || 0), 0);
        const totalPending = branches.reduce((sum, b) => sum + (b.pendingCount || 0), 0);

        // Update stats cards
        const totalMembersEl = document.getElementById('total-members-count');
        const approvedMembersEl = document.getElementById('approved-members-count');
        const totalBranchesEl = document.getElementById('total-branches-count');
        const pendingReqEl = document.getElementById('pending-requests-count');
        const activeRateEl = document.getElementById('active-rate');

        if (totalMembersEl) totalMembersEl.textContent = totalMembers;
        if (approvedMembersEl) approvedMembersEl.textContent = totalMembers;
        if (totalBranchesEl) totalBranchesEl.textContent = branches.length;
        if (pendingReqEl) pendingReqEl.textContent = totalPending;

        // Calculate real active rate (assigned/total)
        const activeRate = totalMembers > 0 ? Math.round((totalAssigned / totalMembers) * 100) : 0;
        if (activeRateEl) activeRateEl.textContent = activeRate + '%';

        console.log(`Total members: ${totalMembers}, Assigned to branches: ${totalAssigned}, Unassigned: ${totalMembers - totalAssigned}`);
    } catch (error) {
        console.error('Error fetching stats:', error);
        // Use fallback values
        if (document.getElementById('total-members-count')) {
            document.getElementById('total-members-count').textContent = '347';
        }
        if (document.getElementById('approved-members-count')) {
            document.getElementById('approved-members-count').textContent = '347';
        }
    }
}

// Update pending registrations table
async function updatePendingRegistrations() {
    const tableBody = document.querySelector('#pending-table-body');
    if (!tableBody) return;

    try {
        const response = await fetchMembers({ status: 'pending_approval' });
        if (!response.success) throw new Error('Failed to fetch pending members');

        const pendingMembers = response.data;

        if (pendingMembers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">لا توجد طلبات قيد الانتظار</td></tr>';
            return;
        }

        tableBody.innerHTML = pendingMembers.map(member => `
            <tr>
                <td>#REG-${member.id.substring(0, 8)}</td>
                <td>${member.full_name || 'غير محدد'}</td>
                <td>${member.phone || 'غير محدد'}</td>
                <td>${member.family_branches?.branch_name || 'غير محدد'}</td>
                <td>${new Date(member.created_at).toLocaleDateString('ar-SA')}</td>
                <td><span class="status-badge status-pending">⏳ قيد المراجعة</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn action-approve" onclick="handleApprove('${member.id}')">
                            ✅ اعتماد
                        </button>
                        <button class="action-btn action-reject" onclick="handleReject('${member.id}')">
                            ❌ رفض
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error updating pending registrations:', error);
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">خطأ في تحميل البيانات</td></tr>';
    }
}

// Handle member approval
async function handleApprove(memberId) {
    if (!confirm('هل أنت متأكد من اعتماد هذا العضو؟')) return;

    try {
        const response = await approveMember(memberId);
        if (response.success) {
            alert('تم اعتماد العضو بنجاح');
            updatePendingRegistrations();
            updateClanCards();
        } else {
            alert('خطأ في اعتماد العضو');
        }
    } catch (error) {
        console.error('Error approving member:', error);
        alert('خطأ في الاتصال بالخادم');
    }
}

// Handle member rejection
async function handleReject(memberId) {
    const reason = prompt('سبب الرفض:');
    if (!reason) return;

    try {
        const response = await rejectMember(memberId, reason);
        if (response.success) {
            alert('تم رفض الطلب');
            updatePendingRegistrations();
        } else {
            alert('خطأ في رفض الطلب');
        }
    } catch (error) {
        console.error('Error rejecting member:', error);
        alert('خطأ في الاتصال بالخادم');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check which page we're on and initialize accordingly
    const pageTitle = document.title;

    if (pageTitle.includes('لوحة تحكم الفخوذ')) {
        // Admin clan management page
        updateClanCards();
        updatePendingRegistrations();

        // Refresh data every 30 seconds
        setInterval(() => {
            updateClanCards();
            updatePendingRegistrations();
        }, 30000);
    }

    // Functions are now implemented directly in admin_clan_management.html
    // These are just exports for backward compatibility
    if (!window.viewClanMembers) {
        window.viewClanMembers = async (branchId) => {
            const members = await fetchMembers({ branchId });
            console.log('Branch members:', members);
            alert(`عرض ${members.data?.length || 0} عضو من الفخذ ${branchId}`);
        };
    }

    if (!window.editClan) {
        window.editClan = (branchId) => {
            console.log('Edit clan:', branchId);
            alert(`تعديل الفخذ ${branchId}`);
        };
    }

    window.handleApprove = handleApprove;
    window.handleReject = handleReject;
});

// Export functions for use in other scripts
window.FamilyTreeAPI = {
    fetchBranches,
    fetchStats,
    fetchGenerations,
    fetchMembers,
    approveMember,
    rejectMember,
    fetchUnassignedMembers,
    assignMemberToBranch,
    bulkAssignMembers,
    updateClanCards,
    updatePendingRegistrations
};