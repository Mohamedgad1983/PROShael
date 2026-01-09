import { useNavigate, useLocation } from 'react-router-dom'
import { Home, CreditCard, Bell, User } from 'lucide-react'

const BottomNav = ({ notificationCount = 0 }) => {
  const navigate = useNavigate()
  const location = useLocation()
  
  const navItems = [
    { path: '/dashboard', icon: Home, label: 'الرئيسية' },
    { path: '/payment-center', icon: CreditCard, label: 'المدفوعات' },
    { path: '/notifications', icon: Bell, label: 'الإشعارات', badge: notificationCount },
    { path: '/profile', icon: User, label: 'حسابي' },
  ]

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = location.pathname === item.path || 
                        (item.path === '/dashboard' && location.pathname === '/')
        
        return (
          <div
            key={item.path}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <div className="nav-icon relative">
              <Icon size={18} strokeWidth={2} />
              {item.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </div>
            <span className="nav-label">{item.label}</span>
          </div>
        )
      })}
    </nav>
  )
}

export default BottomNav
