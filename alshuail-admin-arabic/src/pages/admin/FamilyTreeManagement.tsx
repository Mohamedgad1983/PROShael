import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, GitBranch, Search, RefreshCw, ChevronDown, ChevronRight,
  User, Phone, CreditCard, Calendar, Home, Eye, UserPlus, Settings,
  TreeDeciduous, Crown, Users2, TrendingUp, Filter, Download
} from 'lucide-react';
import './FamilyTreeManagement.css';

interface Branch {
  id: string;
  branch_name: string;
  branch_name_ar?: string;
  branch_name_en?: string;
  memberCount: number;
  pendingCount: number;
  branch_head?: {
    full_name_ar?: string;
    phone?: string;
  };
}

interface Member {
  id: string;
  membership_number: string;
  full_name_ar: string;
  full_name_en?: string;
  phone: string;
  current_balance: number;
  status: string;
  family_branch_id?: string;
  generation_level?: number;
  gender?: string;
  photo_url?: string;
}

interface Stats {
  totalMembers: number;
  activeMembers: number;
  totalBranches: number;
  pendingApprovals: number;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.alshailfund.com/api';

const FamilyTreeManagement: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalMembers: 0,
    activeMembers: 0,
    totalBranches: 0,
    pendingApprovals: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());
  
  // View mode
  const [viewMode, setViewMode] = useState<'tree' | 'list' | 'grid'>('tree');
  
  // Selected member for details
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Get auth token
  const getAuthToken = () => {
    return sessionStorage.getItem('token') || 
           localStorage.getItem('token') || 
           localStorage.getItem('authToken');
  };

  // Fetch data from API
  const fetchWithAuth = async (endpoint: string) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  };

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch branches
      const branchesRes = await fetchWithAuth('/tree/branches');
      if (branchesRes.success && branchesRes.data) {
        setBranches(branchesRes.data);
      }
      
      // Fetch stats
      const statsRes = await fetchWithAuth('/tree/stats');
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      
      // Fetch all members
      const membersRes = await fetchWithAuth('/tree/members');
      if (membersRes.success && membersRes.data) {
        setMembers(membersRes.data);
      }
      
    } catch (err) {
      console.error('Error loading data:', err);
      setError('فشل في تحميل البيانات. تأكد من تسجيل الدخول.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toggle branch expansion
  const toggleBranch = (branchId: string) => {
    const newExpanded = new Set(expandedBranches);
    if (newExpanded.has(branchId)) {
      newExpanded.delete(branchId);
    } else {
      newExpanded.add(branchId);
    }
    setExpandedBranches(newExpanded);
  };

  // Filter members by branch
  const getMembersByBranch = (branchId: string) => {
    return members.filter(m => m.family_branch_id === branchId);
  };

  // Search members
  const filteredMembers = members.filter(member => {
    const matchesSearch = !searchQuery || 
      member.full_name_ar?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.membership_number?.includes(searchQuery) ||
      member.phone?.includes(searchQuery);
    
    const matchesBranch = !selectedBranch || member.family_branch_id === selectedBranch;
    
    return matchesSearch && matchesBranch;
  });

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' ر.س';
  };

  if (loading) {
    return (
      <div className="family-tree-loading">
        <div className="loading-spinner"></div>
        <p>جاري تحميل شجرة العائلة...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="family-tree-error">
        <p>{error}</p>
        <button onClick={loadData} className="btn-retry">
          <RefreshCw size={18} />
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="family-tree-management">
      {/* Header */}
      <div className="ftm-header">
        <div className="ftm-header-content">
          <div className="ftm-title">
            <TreeDeciduous size={32} />
            <div>
              <h1>شجرة عائلة الشعيل</h1>
              <p style={{ color: "#000" }}>إدارة الفخوذ وأعضاء العائلة</p>
            </div>
          </div>
          
          <div className="ftm-actions">
            <button onClick={loadData} className="btn-icon" title="تحديث">
              <RefreshCw size={20} />
            </button>
            <button className="btn-icon" title="تصدير">
              <Download size={20} />
            </button>
            <button className="btn-icon" title="إعدادات">
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="ftm-stats">
        <div className="stat-card stat-total">
          <div className="stat-icon">
            <Users size={28} />
          </div>
          <div className="stat-info">
            <span className="stat-number">{stats.totalMembers || members.length}</span>
            <span className="stat-label">إجمالي الأعضاء</span>
          </div>
        </div>
        
        <div className="stat-card stat-branches">
          <div className="stat-icon">
            <GitBranch size={28} />
          </div>
          <div className="stat-info">
            <span className="stat-number">{stats.totalBranches || branches.length}</span>
            <span className="stat-label">الفخوذ</span>
          </div>
        </div>
        
        <div className="stat-card stat-active">
          <div className="stat-icon">
            <TrendingUp size={28} />
          </div>
          <div className="stat-info">
            <span className="stat-number">{stats.activeMembers || members.filter(m => m.status === 'active').length}</span>
            <span className="stat-label">الأعضاء النشطين</span>
          </div>
        </div>
        
        <div className="stat-card stat-pending">
          <div className="stat-icon">
            <UserPlus size={28} />
          </div>
          <div className="stat-info">
            <span className="stat-number">{stats.pendingApprovals || 0}</span>
            <span className="stat-label">طلبات معلقة</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="ftm-controls">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="ابحث بالاسم أو رقم العضوية أو الجوال..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="filter-box">
          <Filter size={18} />
          <select 
            value={selectedBranch || ''} 
            onChange={(e) => setSelectedBranch(e.target.value || null)}
          >
            <option value="">كل الفخوذ</option>
            {branches.map(branch => (
              <option key={branch.id} value={branch.id}>
                {branch.branch_name_ar || branch.branch_name} ({branch.memberCount})
              </option>
            ))}
          </select>
        </div>
        
        <div className="view-toggle">
          <button 
            className={viewMode === 'tree' ? 'active' : ''} 
            onClick={() => setViewMode('tree')}
            title="عرض شجري"
          >
            <GitBranch size={18} />
          </button>
          <button 
            className={viewMode === 'grid' ? 'active' : ''} 
            onClick={() => setViewMode('grid')}
            title="عرض شبكي"
          >
            <Users2 size={18} />
          </button>
          <button 
            className={viewMode === 'list' ? 'active' : ''} 
            onClick={() => setViewMode('list')}
            title="عرض قائمة"
          >
            <Users size={18} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ftm-content">
        {viewMode === 'tree' && (
          <div className="tree-view">
            {/* Root */}
            <div className="tree-root">
              <div className="root-card">
                <Crown size={32} />
                <h2>عائلة شعيل العنزي</h2>
                <p>{members.length} عضو • {branches.length} فخوذ</p>
              </div>
            </div>
            
            {/* Branches */}
            <div className="tree-branches">
              {branches.map(branch => (
                <div key={branch.id} className="branch-container">
                  <div 
                    className={`branch-card ${expandedBranches.has(branch.id) ? 'expanded' : ''}`}
                    onClick={() => toggleBranch(branch.id)}
                  >
                    <div className="branch-header">
                      <div className="branch-icon">
                        <Home size={24} />
                      </div>
                      <div className="branch-info">
                        <h3>{branch.branch_name_ar || branch.branch_name}</h3>
                        {branch.branch_head?.full_name_ar && (
                          <span className="branch-head">
                            رئيس الفخذ: {branch.branch_head.full_name_ar}
                          </span>
                        )}
                      </div>
                      <div className="branch-stats">
                        <span className="member-count">{branch.memberCount} عضو</span>
                        {branch.pendingCount > 0 && (
                          <span className="pending-count">{branch.pendingCount} معلق</span>
                        )}
                      </div>
                      <div className="expand-icon">
                        {expandedBranches.has(branch.id) ? 
                          <ChevronDown size={20} /> : 
                          <ChevronRight size={20} />
                        }
                      </div>
                    </div>
                  </div>
                  
                  {/* Branch Members */}
                  {expandedBranches.has(branch.id) && (
                    <div className="branch-members">
                      {getMembersByBranch(branch.id).length > 0 ? (
                        getMembersByBranch(branch.id).map(member => (
                          <div 
                            key={member.id} 
                            className="member-card"
                            onClick={() => setSelectedMember(member)}
                          >
                            <div className="member-avatar">
                              {member.photo_url ? (
                                <img src={member.photo_url} alt={member.full_name_ar} />
                              ) : (
                                <User size={24} />
                              )}
                            </div>
                            <div className="member-info">
                              <h4>{member.full_name_ar}</h4>
                              <span className="member-id">{member.membership_number}</span>
                            </div>
                            <div className="member-balance">
                              {formatCurrency(member.current_balance || 0)}
                            </div>
                            <div className={`member-status status-${member.status}`}>
                              {member.status === 'active' ? 'نشط' : 'غير نشط'}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="no-members">
                          لا يوجد أعضاء مسجلين في هذا الفخذ
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'grid' && (
          <div className="grid-view">
            {filteredMembers.map(member => (
              <div 
                key={member.id} 
                className="member-grid-card"
                onClick={() => setSelectedMember(member)}
              >
                <div className="grid-card-header">
                  <div className="member-avatar large">
                    {member.photo_url ? (
                      <img src={member.photo_url} alt={member.full_name_ar} />
                    ) : (
                      <User size={40} />
                    )}
                  </div>
                  <div className={`status-badge status-${member.status}`}>
                    {member.status === 'active' ? '✓' : '○'}
                  </div>
                </div>
                <div className="grid-card-body">
                  <h4>{member.full_name_ar}</h4>
                  <p className="member-id">{member.membership_number}</p>
                  <div className="member-details">
                    <span><Phone size={14} /> {member.phone}</span>
                    <span><CreditCard size={14} /> {formatCurrency(member.current_balance || 0)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMode === 'list' && (
          <div className="list-view">
            <table className="members-table">
              <thead>
                <tr>
                  <th>العضو</th>
                  <th>رقم العضوية</th>
                  <th>الجوال</th>
                  <th>الفخذ</th>
                  <th>الرصيد</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map(member => {
                  const memberBranch = branches.find(b => b.id === member.family_branch_id);
                  return (
                    <tr key={member.id}>
                      <td>
                        <div className="member-cell">
                          <div className="member-avatar small">
                            {member.photo_url ? (
                              <img src={member.photo_url} alt={member.full_name_ar} />
                            ) : (
                              <User size={18} />
                            )}
                          </div>
                          <span>{member.full_name_ar}</span>
                        </div>
                      </td>
                      <td>{member.membership_number}</td>
                      <td dir="ltr">{member.phone}</td>
                      <td>{memberBranch?.branch_name_ar || memberBranch?.branch_name || '-'}</td>
                      <td>{formatCurrency(member.current_balance || 0)}</td>
                      <td>
                        <span className={`status-pill status-${member.status}`}>
                          {member.status === 'active' ? 'نشط' : 'غير نشط'}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn-view"
                          onClick={() => setSelectedMember(member)}
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Member Details Modal */}
      {selectedMember && (
        <div className="modal-overlay" onClick={() => setSelectedMember(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>تفاصيل العضو</h2>
              <button className="modal-close" onClick={() => setSelectedMember(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="member-profile">
                <div className="profile-avatar">
                  {selectedMember.photo_url ? (
                    <img src={selectedMember.photo_url} alt={selectedMember.full_name_ar} />
                  ) : (
                    <User size={60} />
                  )}
                </div>
                <h3>{selectedMember.full_name_ar}</h3>
                <p>{selectedMember.membership_number}</p>
              </div>
              
              <div className="member-details-grid">
                <div className="detail-item">
                  <label>رقم الجوال</label>
                  <span dir="ltr">{selectedMember.phone}</span>
                </div>
                <div className="detail-item">
                  <label>الرصيد الحالي</label>
                  <span className="balance">{formatCurrency(selectedMember.current_balance || 0)}</span>
                </div>
                <div className="detail-item">
                  <label>الفخذ</label>
                  <span>
                    {branches.find(b => b.id === selectedMember.family_branch_id)?.branch_name_ar || 'غير محدد'}
                  </span>
                </div>
                <div className="detail-item">
                  <label>الحالة</label>
                  <span className={`status-pill status-${selectedMember.status}`}>
                    {selectedMember.status === 'active' ? 'نشط' : 'غير نشط'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyTreeManagement;
