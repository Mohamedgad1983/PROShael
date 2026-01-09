import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Calendar, Eye, Heart, MessageCircle, Share2, AlertCircle } from 'lucide-react'
import BottomNav from '../components/BottomNav'
import { newsService } from '../services'

const News = () => {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('all')
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const categories = [
    { id: 'all', label: 'الكل', icon: '📰' },
    { id: 'announcement', label: 'إعلانات', icon: '📢' },
    { id: 'event', label: 'فعاليات', icon: '🎉' },
    { id: 'wedding', label: 'أفراح', icon: '💒' },
    { id: 'condolence', label: 'تعازي', icon: '🕊️' },
    { id: 'general', label: 'عام', icon: '📋' }
  ]

  useEffect(() => {
    fetchNews()
  }, [activeCategory])

  const fetchNews = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = activeCategory !== 'all' ? { category: activeCategory } : {}
      const response = await newsService.getNews(params)
      const newsData = response.news || response.data || response || []
      
      const processedNews = Array.isArray(newsData) ? newsData.map(item => ({
        id: item.id,
        title: item.title_ar || item.title,
        content: item.content_ar || item.content,
        category: item.category || 'general',
        date: item.publish_date || item.published_at || item.created_at,
        views: item.views_count || 0,
        likes: item.likes_count || 0,
        comments: item.comments_count || 0,
        image: item.media_urls?.[0]?.url || item.image_url,
        priority: item.priority || 'normal'
      })) : []

      setNews(processedNews)
    } catch (err) {
      console.error('Error fetching news:', err)
      setError('حدث خطأ في تحميل الأخبار')
      
      // Fallback demo data
      setNews([
        {
          id: 1,
          title: 'اجتماع العائلة السنوي',
          content: 'ندعوكم لحضور الاجتماع السنوي لعائلة الشعيل يوم الجمعة القادم في استراحة الفيصلية. سيتم مناقشة أمور الصندوق والخطط المستقبلية.',
          category: 'announcement',
          date: '2024-11-25',
          views: 156,
          likes: 45,
          comments: 12,
          priority: 'high'
        },
        {
          id: 2,
          title: 'تهنئة بمناسبة زواج محمد الشعيل',
          content: 'يسرنا أن نتقدم بأحر التهاني والتبريكات لابننا محمد بن سعود الشعيل بمناسبة زفافه السعيد.',
          category: 'wedding',
          date: '2024-11-20',
          views: 234,
          likes: 89,
          comments: 25
        },
        {
          id: 3,
          title: 'فعالية رحلة برية للعائلة',
          content: 'نعلن عن تنظيم رحلة برية للعائلة يوم السبت القادم. للتسجيل يرجى التواصل مع منظم الفعاليات.',
          category: 'event',
          date: '2024-11-18',
          views: 89,
          likes: 34,
          comments: 8
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const getCategoryIcon = (category) => {
    const cat = categories.find(c => c.id === category)
    return cat?.icon || '📰'
  }

  const getCategoryLabel = (category) => {
    const cat = categories.find(c => c.id === category)
    return cat?.label || 'عام'
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      const now = new Date()
      const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
      
      if (diffDays === 0) return 'اليوم'
      if (diffDays === 1) return 'أمس'
      if (diffDays < 7) return `منذ ${diffDays} أيام`
      
      return date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })
    } catch {
      return dateStr
    }
  }

  const handleReact = async (newsId) => {
    try {
      await newsService.reactToNews(newsId, 'like')
      // Update local state
      setNews(prev => prev.map(n => 
        n.id === newsId ? { ...n, likes: (n.likes || 0) + 1 } : n
      ))
    } catch (err) {
      console.log('Could not react to news')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="page-header">
          <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="back-button ml-3">
              <ArrowRight size={20} />
            </button>
            <h1 className="text-xl font-bold">الأخبار والمناسبات</h1>
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
            <h1 className="text-xl font-bold">الأخبار والمناسبات</h1>
            <p className="text-white/70 text-xs mt-1">آخر أخبار العائلة</p>
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

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 hide-scrollbar">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
                activeCategory === category.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {category.icon} {category.label}
            </button>
          ))}
        </div>

        {/* News List */}
        <div className="space-y-4">
          {news.length > 0 ? (
            news.map((item, index) => (
              <div 
                key={item.id} 
                className="card animate-fadeIn cursor-pointer"
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => navigate(`/news/${item.id}`)}
              >
                {/* Category & Date */}
                <div className="flex items-center justify-between mb-3">
                  <span className="bg-primary-100 text-primary-600 text-xs px-2 py-1 rounded-full">
                    {getCategoryIcon(item.category)} {getCategoryLabel(item.category)}
                  </span>
                  <span className="text-gray-400 text-xs flex items-center gap-1">
                    <Calendar size={12} />
                    {formatDate(item.date)}
                  </span>
                </div>

                {/* Image (if exists) */}
                {item.image && (
                  <div className="w-full h-40 bg-gray-200 rounded-lg mb-3 overflow-hidden">
                    <img 
                      src={item.image} 
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  </div>
                )}

                {/* Title & Content */}
                <h3 className="text-gray-800 font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm line-clamp-2">{item.content}</p>

                {/* Stats */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-4 text-gray-400">
                    <button 
                      className="flex items-center gap-1 text-xs hover:text-red-500 transition"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleReact(item.id)
                      }}
                    >
                      <Heart size={14} />
                      {item.likes}
                    </button>
                    <span className="flex items-center gap-1 text-xs">
                      <MessageCircle size={14} />
                      {item.comments}
                    </span>
                    <span className="flex items-center gap-1 text-xs">
                      <Eye size={14} />
                      {item.views}
                    </span>
                  </div>
                  <button 
                    className="text-gray-400 hover:text-primary-500"
                    onClick={(e) => {
                      e.stopPropagation()
                      // Share functionality
                      if (navigator.share) {
                        navigator.share({
                          title: item.title,
                          text: item.content,
                          url: window.location.href
                        })
                      }
                    }}
                  >
                    <Share2 size={16} />
                  </button>
                </div>

                {/* Priority indicator */}
                {item.priority === 'high' && (
                  <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded">
                    مهم
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">📰</div>
              <p className="text-gray-500">لا توجد أخبار في هذا القسم</p>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}

export default News
