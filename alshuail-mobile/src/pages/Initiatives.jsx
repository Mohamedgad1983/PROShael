import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Heart, Users, Calendar, Target, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import BottomNav from '../components/BottomNav'
import { initiativeService } from '../services'

const Initiatives = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('active')
  const [initiatives, setInitiatives] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, totalRaised: 0 })

  useEffect(() => {
    fetchInitiatives()
  }, [])

  const fetchInitiatives = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Fetch all initiatives
      const response = await initiativeService.getAllInitiatives()
      const data = response.data || response.initiatives || response || []
      
      // Process initiatives
      const processedInitiatives = Array.isArray(data) ? data.map(init => ({
        id: init.id,
        title: init.title_ar || init.title,
        description: init.description_ar || init.description,
        target: init.target_amount || 0,
        raised: init.current_amount || init.collected_amount || 0,
        contributors: init.contributors_count || init.contribution_count || 0,
        deadline: init.end_date || init.collection_end_date,
        status: init.status || 'active',
        type: init.category || init.type || 'عام',
        beneficiary: init.beneficiary_name_ar || init.beneficiary_name
      })) : []
      
      setInitiatives(processedInitiatives)
      
      // Calculate stats
      const activeCount = processedInitiatives.filter(i => i.status === 'active').length
      const completedCount = processedInitiatives.filter(i => i.status === 'completed' || i.status === 'closed').length
      const totalRaised = processedInitiatives.reduce((sum, i) => sum + (i.raised || 0), 0)
      
      setStats({
        total: processedInitiatives.length,
        active: activeCount,
        completed: completedCount,
        totalRaised
      })
      
    } catch (err) {
      console.error('Error fetching initiatives:', err)
      setError('حدث خطأ في تحميل المبادرات')
      
      // Fallback to demo data
      setInitiatives([
        {
          id: 1,
          title: 'مبادرة زواج أحمد الشعيل',
          description: 'دعم زواج أحد أبناء العائلة',
          target: 50000,
          raised: 35000,
          contributors: 45,
          deadline: '2024-12-30',
          status: 'active',
          type: 'زواج',
          beneficiary: 'أحمد محمد الشعيل'
        },
        {
          id: 2,
          title: 'مبادرة علاج خالد',
          description: 'المساهمة في تكاليف العلاج',
          target: 30000,
          raised: 30000,
          contributors: 62,
          deadline: '2024-10-15',
          status: 'completed',
          type: 'علاج',
          beneficiary: 'خالد سعود الشعيل'
        }
      ])
      setStats({ total: 2, active: 1, completed: 1, totalRaised: 65000 })
    } finally {
      setLoading(false)
    }
  }

  const getFilteredInitiatives = () => {
    if (activeTab === 'active') {
      return initiatives.filter(i => i.status === 'active' || i.status === 'open')
    }
    return initiatives.filter(i => i.status === 'completed' || i.status === 'closed')
  }

  const getProgress = (raised, target) => {
    if (!target) return 0
    return Math.min(100, Math.round((raised / target) * 100))
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    try {
      return new Date(dateStr).toLocaleDateString('ar-SA')
    } catch {
      return dateStr
    }
  }

  const getStatusIcon = (status) => {
    if (status === 'completed' || status === 'closed') {
      return <CheckCircle size={16} className="text-green-500" />
    }
    return <Clock size={16} className="text-primary-500" />
  }

  const getTypeColor = (type) => {
    const colors = {
      'زواج': 'bg-pink-100 text-pink-600',
      'علاج': 'bg-red-100 text-red-600',
      'تعليم': 'bg-blue-100 text-blue-600',
      'عام': 'bg-gray-100 text-gray-600',
      'دية': 'bg-orange-100 text-orange-600'
    }
    return colors[type] || colors['عام']
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="page-header">
          <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="back-button ml-3">
              <ArrowRight size={20} />
            </button>
            <h1 className="text-xl font-bold">المبادرات</h1>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="spinner"></div>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="back-button ml-3">
            <ArrowRight size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold">المبادرات</h1>
            <p className="text-white/70 text-xs mt-1">ساهم في دعم أبناء العائلة</p>
          </div>
        </div>
      </div>

      <div className="page-content">
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm p-3 rounded-lg mb-4 flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="card-sm text-center">
            <div className="text-2xl font-bold text-primary-500">{stats.active}</div>
            <div className="text-gray-500 text-xs">نشطة</div>
          </div>
          <div className="card-sm text-center">
            <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
            <div className="text-gray-500 text-xs">مكتملة</div>
          </div>
          <div className="card-sm text-center">
            <div className="text-lg font-bold text-gray-800">{((stats.totalRaised || 0) / 1000).toFixed(0)}K</div>
            <div className="text-gray-500 text-xs">إجمالي المجموع</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-3 rounded-xl font-medium text-sm transition ${
              activeTab === 'active' 
                ? 'bg-primary-500 text-white' 
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            المبادرات النشطة ({stats.active})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 py-3 rounded-xl font-medium text-sm transition ${
              activeTab === 'completed' 
                ? 'bg-primary-500 text-white' 
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            المكتملة ({stats.completed})
          </button>
        </div>

        {/* Initiatives List */}
        <div className="space-y-4">
          {getFilteredInitiatives().length > 0 ? (
            getFilteredInitiatives().map((initiative) => {
              const progress = getProgress(initiative.raised, initiative.target)
              
              return (
                <div key={initiative.id} className="card animate-fadeIn">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(initiative.type)}`}>
                          {initiative.type}
                        </span>
                        {getStatusIcon(initiative.status)}
                      </div>
                      <h3 className="text-gray-800 font-semibold">{initiative.title}</h3>
                      {initiative.beneficiary && (
                        <p className="text-gray-500 text-xs mt-1">المستفيد: {initiative.beneficiary}</p>
                      )}
                    </div>
                    <div className="action-icon w-10 h-10">
                      <Heart size={18} className="text-white" />
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">المجموع</span>
                      <span className="font-semibold text-primary-500">{progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          progress >= 100 ? 'bg-green-500' : 'bg-gradient-to-l from-primary-500 to-purple-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{initiative.raised.toLocaleString('ar-SA')} ر.س</span>
                      <span>{initiative.target.toLocaleString('ar-SA')} ر.س</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users size={14} />
                        {initiative.contributors} مساهم
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {formatDate(initiative.deadline)}
                      </span>
                    </div>
                    
                    {initiative.status === 'active' && (
                      <button className="bg-primary-500 text-white text-xs px-4 py-2 rounded-lg font-medium">
                        ساهم الآن
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-10">
              <Heart size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">
                {activeTab === 'active' ? 'لا توجد مبادرات نشطة حالياً' : 'لا توجد مبادرات مكتملة'}
              </p>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}

export default Initiatives
