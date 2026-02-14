import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Users, Search, RefreshCw, ChevronDown, ChevronRight,
  User, Phone, CreditCard, ZoomIn, ZoomOut, Maximize2,
  TreeDeciduous, Crown, Download, Filter, X, Info
} from 'lucide-react';
import { API_BASE_URL } from '../../utils/apiConfig';
import './FullFamilyTree.css';

interface Member {
  id: string;
  membership_number: string;
  full_name_ar: string;
  full_name_en?: string;
  phone: string;
  current_balance: number;
  status: string;
  family_branch_id?: string;
  tribal_section?: string;
  parent_member_id?: string;
  generation_level?: number;
  gender?: string;
  photo_url?: string;
  children?: Member[];
}

interface Branch {
  id: string;
  branch_name: string;
  branch_name_ar?: string;
  memberCount: number;
}

// API_BASE_URL imported from utils/apiConfig

const FullFamilyTree: React.FC = () => {
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [zoom, setZoom] = useState(1);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showAllExpanded, setShowAllExpanded] = useState(false);

  // Get auth token
  const getAuthToken = () => {
    return sessionStorage.getItem('token') || 
           localStorage.getItem('token') || 
           localStorage.getItem('authToken');
  };

  // Fetch data
  const fetchData = async (endpoint: string) => {
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

  // Load all members
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch all members
      const membersRes = await fetchData('/members?limit=1000');
      if (membersRes.success && membersRes.data) {
        setAllMembers(membersRes.data);
      } else if (Array.isArray(membersRes)) {
        setAllMembers(membersRes);
      }
      
      // Fetch branches
      try {
        const branchesRes = await fetchData('/tree/branches');
        if (branchesRes.success && branchesRes.data) {
          setBranches(branchesRes.data);
        }
      } catch (e) {
        console.log('Branches endpoint not available');
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

  // Build tree structure from flat list
  const treeData = useMemo(() => {
    if (!allMembers.length) return [];

    // Create a map for quick lookup
    const memberMap = new Map<string, Member>();
    allMembers.forEach(m => {
      memberMap.set(m.id, { ...m, children: [] });
    });

    // Build tree by assigning children to parents
    const roots: Member[] = [];
    
    memberMap.forEach(member => {
      if (member.parent_member_id && memberMap.has(member.parent_member_id)) {
        const parent = memberMap.get(member.parent_member_id)!;
        if (!parent.children) parent.children = [];
        parent.children.push(member);
      } else {
        // This is a root node (no parent or parent not in system)
        roots.push(member);
      }
    });

    // Sort roots by tribal section
    roots.sort((a, b) => {
      const sectionA = a.tribal_section || 'zzz';
      const sectionB = b.tribal_section || 'zzz';
      return sectionA.localeCompare(sectionB, 'ar');
    });

    return roots;
  }, [allMembers]);

  // Group members by tribal section
  const membersBySection = useMemo(() => {
    const sections = new Map<string, Member[]>();
    
    allMembers.forEach(member => {
      const section = member.tribal_section || 'غير محدد';
      if (!sections.has(section)) {
        sections.set(section, []);
      }
      sections.get(section)!.push(member);
    });

    // Sort sections
    return Array.from(sections.entries()).sort((a, b) => {
      if (a[0] === 'غير محدد') return 1;
      if (b[0] === 'غير محدد') return -1;
      return a[0].localeCompare(b[0], 'ar');
    });
  }, [allMembers]);

  // Filter members
  const filteredMembers = useMemo(() => {
    let filtered = allMembers;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.full_name_ar?.toLowerCase().includes(query) ||
        m.membership_number?.includes(query) ||
        m.phone?.includes(query)
      );
    }

    if (selectedBranch !== 'all') {
      filtered = filtered.filter(m => m.tribal_section === selectedBranch);
    }

    return filtered;
  }, [allMembers, searchQuery, selectedBranch]);

  // Toggle node expansion
  const toggleNode = (memberId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(memberId)) {
      newExpanded.delete(memberId);
    } else {
      newExpanded.add(memberId);
    }
    setExpandedNodes(newExpanded);
  };

  // Expand/Collapse all
  const toggleAllExpanded = () => {
    if (showAllExpanded) {
      setExpandedNodes(new Set());
    } else {
      const allIds = new Set(allMembers.map(m => m.id));
      setExpandedNodes(allIds);
    }
    setShowAllExpanded(!showAllExpanded);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA').format(amount || 0) + ' ر.س';
  };

  // Render tree node recursively
  const renderTreeNode = (member: Member, level: number = 0) => {
    const hasChildren = member.children && member.children.length > 0;
    const isExpanded = expandedNodes.has(member.id);
    
    // Check if this member matches search
    const matchesSearch = !searchQuery || 
      member.full_name_ar?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.membership_number?.includes(searchQuery);

    if (searchQuery && !matchesSearch && !hasChildren) {
      return null;
    }

    return (
      <div key={member.id} className="tree-node" style={{ marginRight: level * 24 }}>
        <div 
          className={`node-card ${selectedMember?.id === member.id ? 'selected' : ''} ${matchesSearch && searchQuery ? 'highlighted' : ''}`}
          onClick={() => setSelectedMember(member)}
        >
          {hasChildren && (
            <button 
              className="expand-btn"
              onClick={(e) => { e.stopPropagation(); toggleNode(member.id); }}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          )}
          
          <div className="node-avatar">
            {member.photo_url ? (
              <img src={member.photo_url} alt={member.full_name_ar} />
            ) : (
              <User size={20} />
            )}
          </div>
          
          <div className="node-info">
            <span className="node-name">{member.full_name_ar}</span>
            <span className="node-id">{member.membership_number}</span>
          </div>
          
          <div className="node-balance">
            {formatCurrency(member.current_balance)}
          </div>
          
          <span className={`node-status status-${member.status}`}>
            {member.status === 'active' ? '●' : '○'}
          </span>
          
          {hasChildren && (
            <span className="children-count">{member.children!.length}</span>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div className="node-children">
            {member.children!.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Render section view
  const renderSectionView = () => {
    const sections = selectedBranch === 'all' 
      ? membersBySection 
      : membersBySection.filter(([section]) => section === selectedBranch);

    return (
      <div className="sections-container">
        {sections.map(([sectionName, members]) => (
          <div key={sectionName} className="section-block">
            <div 
              className="section-header"
              onClick={() => toggleNode(sectionName)}
            >
              <div className="section-title">
                <Crown size={20} />
                <h3>{sectionName}</h3>
                <span className="section-count">{members.length} عضو</span>
              </div>
              {expandedNodes.has(sectionName) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </div>
            
            {expandedNodes.has(sectionName) && (
              <div className="section-members">
                {members
                  .filter(m => !searchQuery || 
                    m.full_name_ar?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    m.membership_number?.includes(searchQuery)
                  )
                  .map(member => (
                  <div 
                    key={member.id} 
                    className={`member-row ${selectedMember?.id === member.id ? 'selected' : ''}`}
                    onClick={() => setSelectedMember(member)}
                  >
                    <div className="member-avatar">
                      {member.photo_url ? (
                        <img src={member.photo_url} alt={member.full_name_ar} />
                      ) : (
                        <User size={18} />
                      )}
                    </div>
                    <div className="member-details">
                      <span className="member-name">{member.full_name_ar}</span>
                      <span className="member-id">{member.membership_number}</span>
                    </div>
                    <div className="member-phone" dir="ltr">{member.phone}</div>
                    <div className="member-balance">{formatCurrency(member.current_balance)}</div>
                    <span className={`member-status status-${member.status}`}>
                      {member.status === 'active' ? 'نشط' : 'غير نشط'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="fft-loading">
        <div className="loading-spinner"></div>
        <p>جاري تحميل شجرة العائلة الكاملة...</p>
        <p className="loading-hint">يتم تحميل جميع الأعضاء</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fft-error">
        <p>{error}</p>
        <button onClick={loadData} className="btn-retry">
          <RefreshCw size={18} />
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="full-family-tree">
      {/* Header */}
      <div className="fft-header">
        <div className="fft-title">
          <TreeDeciduous size={36} className="title-icon" />
          <div>
            <h1>شجرة عائلة شعيل العنزي</h1>
            <p>عرض جميع أعضاء العائلة ({allMembers.length} عضو)</p>
          </div>
        </div>
        
        <div className="fft-stats">
          <div className="stat-item">
            <Users size={20} />
            <span>{allMembers.length}</span>
            <label>إجمالي</label>
          </div>
          <div className="stat-item active">
            <User size={20} />
            <span>{allMembers.filter(m => m.status === 'active').length}</span>
            <label>نشط</label>
          </div>
          <div className="stat-item">
            <Crown size={20} />
            <span>{membersBySection.length}</span>
            <label>فخوذ</label>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="fft-controls">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="ابحث بالاسم أو رقم العضوية..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery('')}>
              <X size={16} />
            </button>
          )}
        </div>
        
        <div className="filter-section">
          <Filter size={18} />
          <select 
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            <option value="all">كل الفخوذ ({allMembers.length})</option>
            {membersBySection.map(([section, members]) => (
              <option key={section} value={section}>
                {section} ({members.length})
              </option>
            ))}
          </select>
        </div>

        <div className="view-actions">
          <button onClick={toggleAllExpanded} className="btn-action">
            {showAllExpanded ? 'طي الكل' : 'توسيع الكل'}
          </button>
          <button onClick={loadData} className="btn-action" title="تحديث">
            <RefreshCw size={18} />
          </button>
        </div>

        <div className="zoom-controls">
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} title="تصغير">
            <ZoomOut size={18} />
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} title="تكبير">
            <ZoomIn size={18} />
          </button>
          <button onClick={() => setZoom(1)} title="إعادة تعيين">
            <Maximize2 size={18} />
          </button>
        </div>
      </div>

      {/* Search Results Info */}
      {searchQuery && (
        <div className="search-info">
          <Info size={16} />
          <span>نتائج البحث: {filteredMembers.length} عضو</span>
        </div>
      )}

      {/* Main Content */}
      <div className="fft-content" style={{ transform: `scale(${zoom})`, transformOrigin: 'top right' }}>
        {renderSectionView()}
      </div>

      {/* Member Details Panel */}
      {selectedMember && (
        <div className="member-panel">
          <div className="panel-header">
            <h3>تفاصيل العضو</h3>
            <button onClick={() => setSelectedMember(null)}>
              <X size={20} />
            </button>
          </div>
          
          <div className="panel-body">
            <div className="panel-avatar">
              {selectedMember.photo_url ? (
                <img src={selectedMember.photo_url} alt={selectedMember.full_name_ar} />
              ) : (
                <User size={60} />
              )}
            </div>
            
            <h2>{selectedMember.full_name_ar}</h2>
            <p className="panel-id">{selectedMember.membership_number}</p>
            
            <div className="panel-details">
              <div className="detail-row">
                <Phone size={16} />
                <span>الجوال</span>
                <span dir="ltr">{selectedMember.phone}</span>
              </div>
              
              <div className="detail-row">
                <CreditCard size={16} />
                <span>الرصيد</span>
                <span className="balance">{formatCurrency(selectedMember.current_balance)}</span>
              </div>
              
              <div className="detail-row">
                <Crown size={16} />
                <span>الفخذ</span>
                <span>{selectedMember.tribal_section || 'غير محدد'}</span>
              </div>
              
              <div className="detail-row">
                <User size={16} />
                <span>الحالة</span>
                <span className={`status-badge status-${selectedMember.status}`}>
                  {selectedMember.status === 'active' ? 'نشط' : 'غير نشط'}
                </span>
              </div>
              
              {selectedMember.generation_level && (
                <div className="detail-row">
                  <TreeDeciduous size={16} />
                  <span>الجيل</span>
                  <span>{selectedMember.generation_level}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FullFamilyTree;
