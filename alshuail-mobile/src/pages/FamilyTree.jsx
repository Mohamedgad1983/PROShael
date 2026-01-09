import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ZoomIn, ZoomOut, RotateCcw, User, Plus, Phone, X, ChevronDown, ChevronUp, AlertCircle, RefreshCw } from 'lucide-react'
import { useAuth } from '../App'
import { useDataCache } from '../contexts/DataCacheContext'
import BottomNav from '../components/BottomNav'
import { familyTreeService } from '../services'

const FamilyTree = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { fetchFamilyTree, fetchBranches, cache, getCacheStatus } = useDataCache()
  const containerRef = useRef(null)
  
  // Use cached data for initial state
  const [loading, setLoading] = useState(!cache.familyTree?.data)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [treeData, setTreeData] = useState(cache.familyTree?.data || null)
  const [selectedMember, setSelectedMember] = useState(null)
  const [showAddChild, setShowAddChild] = useState(false)
  const [expandedNodes, setExpandedNodes] = useState(new Set())
  const [branches, setBranches] = useState(cache.branches?.data || [])
  
  // New child form
  const [newChild, setNewChild] = useState({ name: '', gender: 'male', birthDate: '' })
  const [addingChild, setAddingChild] = useState(false)
  
  // Stats
  const [stats, setStats] = useState({
    totalMembers: 347,
    totalBranches: 10,
    activeMembers: 320
  })

  useEffect(() => {
    loadFamilyTreeData()
  }, [])

  const loadFamilyTreeData = async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true)
    }
    setError(null)
    
    try {
      // Fetch tree data with caching
      const treeResult = await fetchFamilyTree(forceRefresh)
      
      if (treeResult.data) {
        setTreeData(treeResult.data.tree || treeResult.data)
        if (treeResult.fromCache) {
          console.log('📦 Family tree loaded from cache')
        }
      } else if (!treeResult.fromCache) {
        // Build demo tree if no data
        setTreeData(buildDemoTree())
      }
      
      // Fetch branches with caching
      const branchesResult = await fetchBranches(forceRefresh)
      if (branchesResult.data) {
        setBranches(branchesResult.data)
      }
      
      // Fetch stats (not cached, quick call)
      try {
        const statsResponse = await familyTreeService.getStats()
        setStats({
          totalMembers: statsResponse.total_members || statsResponse.totalMembers || 347,
          totalBranches: statsResponse.total_branches || statsResponse.totalBranches || 10,
          activeMembers: statsResponse.active_members || statsResponse.activeMembers || 320
        })
      } catch {
        console.log('Using default stats')
      }
      
    } catch (err) {
      console.error('Error fetching family tree:', err)
      setError('حدث خطأ في تحميل شجرة العائلة')
      
      // Use demo data
      if (!treeData) {
        setTreeData(buildDemoTree())
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const buildDemoTree = () => {
    // Build a sample tree based on current user
    const currentUserName = user?.name || user?.full_name_ar || user?.fullName || 'محمد أحمد الشعيل'
    const nameParts = currentUserName.split(' ')
    
    return {
      id: 'g4',
      name: nameParts[3] || 'الشعيل',
      relation: 'الجد الرابع',
      generation: 1,
      children: [
        {
          id: 'g3',
          name: nameParts[2] || 'سعد',
          relation: 'الجد الثالث',
          generation: 2,
          children: [
            {
              id: 'g2',
              name: nameParts[1] || 'أحمد',
              relation: 'الجد',
              generation: 3,
              children: [
                {
                  id: 'father',
                  name: nameParts[0] ? `${nameParts[0]} ${nameParts[1] || ''}` : 'عبدالله أحمد',
                  relation: 'الأب',
                  generation: 4,
                  children: [
                    {
                      id: 'me',
                      name: currentUserName,
                      relation: 'أنت',
                      generation: 5,
                      isCurrentUser: true,
                      children: [
                        { id: 'child1', name: 'عبدالرحمن', relation: 'ابن', generation: 6 },
                        { id: 'child2', name: 'سارة', relation: 'ابنة', generation: 6 },
                      ]
                    },
                    {
                      id: 'brother1',
                      name: 'خالد ' + (nameParts[1] || 'أحمد'),
                      relation: 'أخ',
                      generation: 5,
                      children: []
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  }

  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5))
  const handleResetZoom = () => setZoom(1)

  const handleMemberClick = (member) => {
    setSelectedMember(member)
  }

  const handleAddChild = () => {
    setNewChild({ name: '', gender: 'male', birthDate: '' })
    setShowAddChild(true)
  }

  const handleSubmitChild = async () => {
    if (!newChild.name.trim()) {
      alert('يرجى إدخال اسم الابن/الابنة')
      return
    }
    
    setAddingChild(true)
    try {
      await familyTreeService.addChild({
        full_name: newChild.name,
        gender: newChild.gender,
        birth_date: newChild.birthDate,
        relation_type: newChild.gender === 'male' ? 'son' : 'daughter'
      })
      
      // Refresh tree (force refresh to get new data)
      await loadFamilyTreeData(true)
      setShowAddChild(false)
      setNewChild({ name: '', gender: 'male', birthDate: '' })
    } catch (err) {
      console.error('Error adding child:', err)
      alert('حدث خطأ في إضافة الابن/الابنة')
    } finally {
      setAddingChild(false)
    }
  }

  const renderTreeNode = (node, level = 0) => {
    if (!node) return null
    
    const hasChildren = node.children && node.children.length > 0
    const isExpanded = expandedNodes.has(node.id) || level < 3 // Auto-expand first 3 levels
    
    return (
      <div key={node.id} className="flex flex-col items-center">
        {/* Node */}
        <div 
          className={`relative cursor-pointer transition-all duration-200 ${
            node.isCurrentUser ? 'transform scale-110' : ''
          }`}
          onClick={() => handleMemberClick(node)}
        >
          {/* Avatar */}
          <div className={`w-16 h-16 rounded-full flex items-center justify-center border-3 shadow-lg ${
            node.isCurrentUser 
              ? 'bg-gradient-to-br from-primary-500 to-purple-500 border-yellow-400' 
              : 'bg-white border-primary-200'
          }`}>
            <User size={28} className={node.isCurrentUser ? 'text-white' : 'text-primary-500'} />
          </div>
          
          {/* Current user indicator */}
          {node.isCurrentUser && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
              <span className="text-xs">⭐</span>
            </div>
          )}
          
          {/* Name */}
          <div className="text-center mt-2 max-w-24">
            <p className={`text-xs font-bold truncate ${
              node.isCurrentUser ? 'text-primary-600' : 'text-gray-800'
            }`}>
              {node.name || node.full_name}
            </p>
            <p className="text-[10px] text-gray-500">{node.relation || node.relationship_type}</p>
          </div>
          
          {/* Expand/Collapse button */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleNode(node.id)
              }}
              className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center shadow"
            >
              {isExpanded ? (
                <ChevronUp size={12} className="text-white" />
              ) : (
                <ChevronDown size={12} className="text-white" />
              )}
            </button>
          )}
          
          {/* Add child button for current user */}
          {node.isCurrentUser && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleAddChild()
              }}
              className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg"
            >
              <Plus size={14} className="text-white" />
            </button>
          )}
        </div>
        
        {/* Connection line to children */}
        {hasChildren && isExpanded && (
          <>
            <div className="w-0.5 h-6 bg-primary-300"></div>
            
            {/* Horizontal line for multiple children */}
            {node.children.length > 1 && (
              <div className="relative w-full flex justify-center">
                <div 
                  className="h-0.5 bg-primary-300" 
                  style={{ 
                    width: `${Math.min(node.children.length * 100, 280)}px` 
                  }}
                ></div>
              </div>
            )}
            
            {/* Children */}
            <div className="flex gap-4 mt-2">
              {node.children.map(child => renderTreeNode(child, level + 1))}
            </div>
          </>
        )}
      </div>
    )
  }

  // Only show loading on first load without cache
  if (loading && !cache.familyTree?.data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-500">جاري تحميل شجرة العائلة...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="back-button ml-3">
              <ArrowRight size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold">شجرة العائلة</h1>
              <p className="text-white/70 text-xs mt-1">من الجد الرابع للأبناء</p>
            </div>
          </div>
          <button 
            onClick={() => loadFamilyTreeData(true)}
            className={`p-2 bg-white/20 rounded-full ${refreshing ? 'animate-spin' : ''}`}
            disabled={refreshing}
          >
            <RefreshCw size={20} className="text-white" />
          </button>
        </div>
      </div>

      <div className="page-content">
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm p-3 rounded-lg mb-4 flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="card-sm text-center animate-fadeIn">
            <div className="text-2xl font-bold text-primary-500">{stats.totalMembers}</div>
            <div className="text-gray-500 text-xs">إجمالي الأعضاء</div>
          </div>
          <div className="card-sm text-center animate-fadeIn" style={{ animationDelay: '0.1s' }}>
            <div className="text-2xl font-bold text-primary-500">{stats.totalBranches}</div>
            <div className="text-gray-500 text-xs">الفخوذ</div>
          </div>
          <div className="card-sm text-center animate-fadeIn" style={{ animationDelay: '0.2s' }}>
            <div className="text-2xl font-bold text-green-500">{stats.activeMembers}</div>
            <div className="text-gray-500 text-xs">نشط</div>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex justify-center gap-2 mb-4">
          <button
            onClick={handleZoomOut}
            className="w-10 h-10 bg-white rounded-xl shadow flex items-center justify-center touch-feedback"
          >
            <ZoomOut size={20} className="text-gray-600" />
          </button>
          <button
            onClick={handleResetZoom}
            className="w-10 h-10 bg-white rounded-xl shadow flex items-center justify-center touch-feedback"
          >
            <RotateCcw size={18} className="text-gray-600" />
          </button>
          <button
            onClick={handleZoomIn}
            className="w-10 h-10 bg-white rounded-xl shadow flex items-center justify-center touch-feedback"
          >
            <ZoomIn size={20} className="text-gray-600" />
          </button>
          <span className="flex items-center text-gray-500 text-sm mr-2">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        {/* Tree Container */}
        <div 
          ref={containerRef}
          className="card overflow-auto min-h-[400px] max-h-[60vh]"
          style={{ touchAction: 'pan-x pan-y' }}
        >
          <div 
            className="flex justify-center py-6 transition-transform duration-200"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
          >
            {treeData ? renderTreeNode(treeData) : (
              <div className="text-center text-gray-400">
                <User size={48} className="mx-auto mb-3 opacity-50" />
                <p>لا توجد بيانات شجرة العائلة</p>
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 p-3 bg-white rounded-xl shadow-sm">
          <p className="text-xs text-gray-500 text-center mb-2">دليل الرموز</p>
          <div className="flex justify-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary-500 to-purple-500"></div>
              <span className="text-gray-600">أنت</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-white border-2 border-primary-200"></div>
              <span className="text-gray-600">قريب</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span className="text-gray-600">إضافة</span>
            </div>
          </div>
        </div>

        {/* Info Note */}
        <p className="text-center text-gray-400 text-xs mt-4">
          اضغط على ⭐ لإضافة أبنائك
        </p>
      </div>

      {/* Member Detail Modal */}
      {selectedMember && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
          onClick={() => setSelectedMember(null)}
        >
          <div 
            className="bg-white rounded-t-3xl w-full max-w-md p-6 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  selectedMember.isCurrentUser 
                    ? 'bg-gradient-to-br from-primary-500 to-purple-500' 
                    : 'bg-primary-100'
                }`}>
                  <User size={28} className={selectedMember.isCurrentUser ? 'text-white' : 'text-primary-500'} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{selectedMember.name || selectedMember.full_name}</h3>
                  <p className="text-gray-500 text-sm">{selectedMember.relation || selectedMember.relationship_type}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedMember(null)}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-3">
              {(selectedMember.membership_id || selectedMember.membership_number) && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">رقم العضوية</span>
                  <span className="text-gray-800 font-medium">{selectedMember.membership_id || selectedMember.membership_number}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500 text-sm">الجيل</span>
                <span className="text-gray-800 font-medium">الجيل {selectedMember.generation || '-'}</span>
              </div>
              {selectedMember.phone && (
                <a
                  href={`tel:${selectedMember.phone}`}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-green-500 text-white rounded-xl font-medium mt-4"
                >
                  <Phone size={18} />
                  اتصال
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Child Modal */}
      {showAddChild && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
          onClick={() => setShowAddChild(false)}
        >
          <div 
            className="bg-white rounded-t-3xl w-full max-w-md p-6 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-800 text-lg">إضافة ابن/ابنة</h3>
              <button 
                onClick={() => setShowAddChild(false)}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-600 text-sm mb-2">الاسم الكامل</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="أدخل اسم الابن/الابنة"
                  value={newChild.name}
                  onChange={(e) => setNewChild({ ...newChild, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-gray-600 text-sm mb-2">النوع</label>
                <div className="flex gap-3">
                  <button 
                    className={`flex-1 py-3 border-2 rounded-xl font-medium transition ${
                      newChild.gender === 'male' 
                        ? 'border-primary-500 text-primary-500 bg-primary-50' 
                        : 'border-gray-200 text-gray-500'
                    }`}
                    onClick={() => setNewChild({ ...newChild, gender: 'male' })}
                  >
                    ذكر
                  </button>
                  <button 
                    className={`flex-1 py-3 border-2 rounded-xl font-medium transition ${
                      newChild.gender === 'female' 
                        ? 'border-primary-500 text-primary-500 bg-primary-50' 
                        : 'border-gray-200 text-gray-500'
                    }`}
                    onClick={() => setNewChild({ ...newChild, gender: 'female' })}
                  >
                    أنثى
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-gray-600 text-sm mb-2">تاريخ الميلاد (هجري)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="1445/01/01"
                  value={newChild.birthDate}
                  onChange={(e) => setNewChild({ ...newChild, birthDate: e.target.value })}
                />
              </div>
              
              <button 
                className="btn-primary mt-4"
                onClick={handleSubmitChild}
                disabled={addingChild}
              >
                {addingChild ? (
                  <div className="spinner w-5 h-5"></div>
                ) : (
                  <>
                    <Plus size={20} />
                    إضافة
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
      
      {/* Custom styles for animations */}
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default FamilyTree
