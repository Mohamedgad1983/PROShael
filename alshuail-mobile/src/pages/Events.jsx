/**
 * Events Page - صفحة المناسبات والفعاليات
 * 
 * Features:
 * - View upcoming and past events
 * - RSVP functionality (Confirm/Maybe/Decline)
 * - Event details with location and time
 * - Filter tabs (Upcoming, This Month, Confirmed, Past)
 * - Share events
 * 
 * Created: December 2025
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowRight, 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  Check, 
  X, 
  HelpCircle,
  Share2,
  ChevronLeft,
  RefreshCw,
  Filter,
  CalendarDays,
  PartyPopper,
  Heart,
  Gift,
  Cake,
  Baby,
  Sparkles
} from 'lucide-react'
import { useAuth } from '../App'
import BottomNav from '../components/BottomNav'
import eventsService from '../services/eventsService'

// Event type icons and colors
const EVENT_TYPES = {
  'wedding': { icon: Heart, label: 'زواج', color: 'from-pink-500 to-rose-500', bg: 'bg-pink-50', border: 'border-pink-200' },
  'birth': { icon: Baby, label: 'مولود', color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50', border: 'border-blue-200' },
  'graduation': { icon: Gift, label: 'تخرج', color: 'from-purple-500 to-violet-500', bg: 'bg-purple-50', border: 'border-purple-200' },
  'meeting': { icon: Users, label: 'اجتماع', color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', border: 'border-amber-200' },
  'celebration': { icon: PartyPopper, label: 'احتفال', color: 'from-emerald-500 to-green-500', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  'birthday': { icon: Cake, label: 'عيد ميلاد', color: 'from-yellow-500 to-amber-500', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  'other': { icon: Sparkles, label: 'أخرى', color: 'from-gray-500 to-slate-500', bg: 'bg-gray-50', border: 'border-gray-200' }
}

// Filter tabs
const FILTER_TABS = [
  { id: 'upcoming', label: 'القادمة', icon: Calendar },
  { id: 'thisMonth', label: 'هذا الشهر', icon: CalendarDays },
  { id: 'confirmed', label: 'مؤكد حضوري', icon: Check },
  { id: 'past', label: 'السابقة', icon: Clock }
]

const Events = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  // State
  const [events, setEvents] = useState([])
  const [filteredEvents, setFilteredEvents] = useState([])
  const [activeFilter, setActiveFilter] = useState('upcoming')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)
  const [rsvpLoading, setRsvpLoading] = useState({})
  const [myRsvps, setMyRsvps] = useState({}) // Store user's RSVP status for each event

  // Fetch events
  const fetchEvents = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      // Fetch all events
      const response = await eventsService.getAllEvents({ limit: 100 })
      
      if (response.success && response.data) {
        const eventsData = response.data
        setEvents(eventsData)
        
        // Try to get stats
        try {
          const statsResponse = await eventsService.getStats()
          if (statsResponse.success) {
            setStats(statsResponse.data)
          }
        } catch (e) {
          console.log('Could not fetch stats:', e)
        }
      } else {
        throw new Error(response.error || 'Failed to fetch events')
      }
    } catch (err) {
      console.error('Error fetching events:', err)
      setError('فشل في تحميل المناسبات')
      // Use demo data on error
      setEvents(getDemoEvents())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // Filter events based on active tab
  useEffect(() => {
    if (!events.length) {
      setFilteredEvents([])
      return
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    let filtered = []

    switch (activeFilter) {
      case 'upcoming':
        filtered = events.filter(e => {
          const eventDate = new Date(e.start_date || e.event_date)
          return eventDate >= now && e.status === 'active'
        })
        break
      case 'thisMonth':
        filtered = events.filter(e => {
          const eventDate = new Date(e.start_date || e.event_date)
          return eventDate >= startOfMonth && eventDate <= endOfMonth
        })
        break
      case 'confirmed':
        filtered = events.filter(e => myRsvps[e.id] === 'confirmed')
        break
      case 'past':
        filtered = events.filter(e => {
          const eventDate = new Date(e.start_date || e.event_date)
          return eventDate < now
        })
        break
      default:
        filtered = events
    }

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.start_date || a.event_date)
      const dateB = new Date(b.start_date || b.event_date)
      return activeFilter === 'past' ? dateB - dateA : dateA - dateB
    })

    setFilteredEvents(filtered)
  }, [events, activeFilter, myRsvps])

  // Initial fetch
  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Handle RSVP
  const handleRSVP = async (eventId, status) => {
    if (!user?.id) {
      alert('يجب تسجيل الدخول أولاً')
      return
    }

    setRsvpLoading(prev => ({ ...prev, [eventId]: status }))

    try {
      const response = await eventsService.updateRSVP(eventId, {
        member_id: user.id,
        status: status
      })

      if (response.success) {
        // Update local state
        setMyRsvps(prev => ({ ...prev, [eventId]: status }))
        
        // Update event attendees count
        setEvents(prev => prev.map(e => {
          if (e.id === eventId) {
            const oldStatus = myRsvps[eventId]
            let attendeeChange = 0
            
            if (oldStatus === 'confirmed' && status !== 'confirmed') {
              attendeeChange = -1
            } else if (oldStatus !== 'confirmed' && status === 'confirmed') {
              attendeeChange = 1
            } else if (!oldStatus && status === 'confirmed') {
              attendeeChange = 1
            }
            
            return {
              ...e,
              current_attendees: Math.max(0, (e.current_attendees || 0) + attendeeChange)
            }
          }
          return e
        }))

        // Show feedback
        const messages = {
          confirmed: 'تم تأكيد حضورك ✅',
          pending: 'تم تحديد حضورك كمحتمل ⏳',
          declined: 'تم إلغاء حضورك ❌'
        }
        // Toast or alert
      }
    } catch (err) {
      console.error('RSVP error:', err)
      alert('فشل في تحديث حالة الحضور')
    } finally {
      setRsvpLoading(prev => ({ ...prev, [eventId]: null }))
    }
  }

  // Share event
  const handleShare = async (event) => {
    const eventDate = formatDate(event.start_date || event.event_date)
    const shareText = `📅 ${event.title}\n📍 ${event.location || 'غير محدد'}\n🗓️ ${eventDate}\n\nصندوق عائلة شعيل العنزي`

    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: shareText,
          url: window.location.href
        })
      } catch (err) {
        console.log('Share cancelled')
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText)
      alert('تم نسخ تفاصيل المناسبة')
    }
  }

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'غير محدد'
    const date = new Date(dateStr)
    return date.toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Format time
  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    return timeStr.substring(0, 5) // HH:MM
  }

  // Get event type config
  const getEventType = (type) => {
    return EVENT_TYPES[type] || EVENT_TYPES.other
  }

  // Calculate days until event
  const getDaysUntil = (dateStr) => {
    if (!dateStr) return null
    const eventDate = new Date(dateStr)
    const now = new Date()
    const diffTime = eventDate - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Demo events for fallback
  const getDemoEvents = () => [
    {
      id: 'demo-1',
      title: 'حفل زواج أحمد محمد الشعيل',
      description: 'ندعوكم لحضور حفل زواج ابننا أحمد',
      event_type: 'wedding',
      start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      event_time: '20:00',
      location: 'قاعة النخيل - الرياض',
      max_attendees: 200,
      current_attendees: 85,
      status: 'active'
    },
    {
      id: 'demo-2',
      title: 'اجتماع العائلة السنوي',
      description: 'الاجتماع السنوي لأعضاء صندوق العائلة',
      event_type: 'meeting',
      start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      event_time: '18:00',
      location: 'استراحة العائلة',
      max_attendees: 100,
      current_attendees: 45,
      status: 'active'
    },
    {
      id: 'demo-3',
      title: 'مولود جديد - سعود خالد الشعيل',
      description: 'نبارك لأخينا خالد بالمولود الجديد سعود',
      event_type: 'birth',
      start_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      event_time: '16:00',
      location: 'منزل العائلة',
      max_attendees: null,
      current_attendees: 25,
      status: 'active'
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-500">جاري تحميل المناسبات...</p>
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
              <h1 className="text-xl font-bold">المناسبات والفعاليات</h1>
              <p className="text-white/70 text-sm">
                {stats ? `${stats.upcoming_occasions || 0} مناسبة قادمة` : 'أحداث العائلة'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => fetchEvents(true)}
            className={`p-2 rounded-xl bg-white/20 ${refreshing ? 'animate-spin' : ''}`}
            disabled={refreshing}
          >
            <RefreshCw size={20} className="text-white" />
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* Stats Summary */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 mb-5 animate-fadeIn">
            <div className="bg-white rounded-xl p-3 text-center shadow-sm">
              <p className="text-2xl font-bold text-primary-600">{stats.total_occasions || 0}</p>
              <p className="text-xs text-gray-500">إجمالي</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center shadow-sm">
              <p className="text-2xl font-bold text-emerald-600">{stats.upcoming_occasions || 0}</p>
              <p className="text-xs text-gray-500">قادمة</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center shadow-sm">
              <p className="text-2xl font-bold text-amber-600">{stats.rsvps_by_status?.confirmed || 0}</p>
              <p className="text-xs text-gray-500">مؤكد</p>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-5 scrollbar-hide animate-fadeIn" style={{ animationDelay: '0.1s' }}>
          {FILTER_TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeFilter === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-primary-500 to-purple-600 text-white shadow-lg'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'
                }`}
              >
                <Icon size={16} />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 text-center">
            <p className="text-red-600 text-sm">{error}</p>
            <button 
              onClick={() => fetchEvents(true)}
              className="text-red-700 underline text-sm mt-2"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Events List */}
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 animate-fadeIn">
            <Calendar size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">لا توجد مناسبات</h3>
            <p className="text-gray-400 text-sm">
              {activeFilter === 'confirmed' 
                ? 'لم تؤكد حضورك في أي مناسبة بعد'
                : 'لا توجد مناسبات في هذا التصنيف'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event, index) => {
              const eventType = getEventType(event.event_type || event.category)
              const Icon = eventType.icon
              const daysUntil = getDaysUntil(event.start_date || event.event_date)
              const isPast = daysUntil !== null && daysUntil < 0
              const isToday = daysUntil === 0
              const isTomorrow = daysUntil === 1
              const myStatus = myRsvps[event.id]
              const isLoadingRsvp = rsvpLoading[event.id]

              return (
                <div 
                  key={event.id}
                  className={`bg-white rounded-2xl overflow-hidden shadow-sm border ${eventType.border} animate-fadeIn`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {/* Event Header */}
                  <div className={`bg-gradient-to-r ${eventType.color} p-4 text-white`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                          <Icon size={24} />
                        </div>
                        <div>
                          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                            {eventType.label}
                          </span>
                          <h3 className="font-bold mt-1">{event.title}</h3>
                        </div>
                      </div>
                      
                      {/* Days Badge */}
                      {daysUntil !== null && !isPast && (
                        <div className="bg-white/20 rounded-lg px-3 py-1.5 text-center">
                          {isToday ? (
                            <span className="text-sm font-bold">اليوم!</span>
                          ) : isTomorrow ? (
                            <span className="text-sm font-bold">غداً</span>
                          ) : (
                            <>
                              <p className="text-lg font-bold leading-none">{daysUntil}</p>
                              <p className="text-[10px]">يوم</p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="p-4">
                    {event.description && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{event.description}</p>
                    )}

                    <div className="space-y-2 mb-4">
                      {/* Date */}
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar size={16} className="text-gray-400" />
                        <span className="text-sm">{formatDate(event.start_date || event.event_date)}</span>
                      </div>
                      
                      {/* Time */}
                      {(event.event_time || event.start_time) && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock size={16} className="text-gray-400" />
                          <span className="text-sm">{formatTime(event.event_time || event.start_time)}</span>
                        </div>
                      )}
                      
                      {/* Location */}
                      {event.location && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin size={16} className="text-gray-400" />
                          <span className="text-sm">{event.location}</span>
                        </div>
                      )}
                      
                      {/* Attendees */}
                      <div className="flex items-center gap-2 text-gray-600">
                        <Users size={16} className="text-gray-400" />
                        <span className="text-sm">
                          {event.current_attendees || 0} حضور مؤكد
                          {event.max_attendees && ` من ${event.max_attendees}`}
                        </span>
                        {event.is_full && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">مكتمل</span>
                        )}
                      </div>
                    </div>

                    {/* Capacity Bar */}
                    {event.max_attendees && (
                      <div className="mb-4">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              event.attendance_rate >= 90 ? 'bg-red-500' : 
                              event.attendance_rate >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, event.attendance_rate || 0)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1 text-center">
                          {event.attendance_rate || 0}% من السعة
                        </p>
                      </div>
                    )}

                    {/* RSVP Buttons - Only for upcoming events */}
                    {!isPast && (
                      <div className="flex gap-2 mb-3">
                        {/* Confirm */}
                        <button
                          onClick={() => handleRSVP(event.id, 'confirmed')}
                          disabled={isLoadingRsvp || event.is_full}
                          className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-all ${
                            myStatus === 'confirmed'
                              ? 'bg-emerald-500 text-white'
                              : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
                          } ${event.is_full && myStatus !== 'confirmed' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {isLoadingRsvp === 'confirmed' ? (
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <Check size={18} />
                              <span className="text-sm">سأحضر</span>
                            </>
                          )}
                        </button>

                        {/* Maybe */}
                        <button
                          onClick={() => handleRSVP(event.id, 'pending')}
                          disabled={isLoadingRsvp}
                          className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-all ${
                            myStatus === 'pending'
                              ? 'bg-amber-500 text-white'
                              : 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          {isLoadingRsvp === 'pending' ? (
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <HelpCircle size={18} />
                              <span className="text-sm">ربما</span>
                            </>
                          )}
                        </button>

                        {/* Decline */}
                        <button
                          onClick={() => handleRSVP(event.id, 'declined')}
                          disabled={isLoadingRsvp}
                          className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-all ${
                            myStatus === 'declined'
                              ? 'bg-red-500 text-white'
                              : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                          }`}
                        >
                          {isLoadingRsvp === 'declined' ? (
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <X size={18} />
                              <span className="text-sm">لن أحضر</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Share Button */}
                    <button
                      onClick={() => handleShare(event)}
                      className="w-full py-2.5 text-gray-500 text-sm flex items-center justify-center gap-2 hover:bg-gray-50 rounded-xl transition"
                    >
                      <Share2 size={16} />
                      مشاركة المناسبة
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Info Note */}
        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100 animate-fadeIn">
          <p className="text-blue-600 text-sm text-center">
            📅 سيتم إرسال تذكير قبل كل مناسبة بيوم
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}

export default Events
