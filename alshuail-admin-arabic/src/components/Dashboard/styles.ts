const styles = {
  container: {
    height: '100vh',
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    fontFamily: 'Tajawal, Cairo, sans-serif',
    direction: 'rtl' as const,
    color: 'white',
    position: 'relative' as const,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const
  },
  header: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    padding: '1rem 2rem',
    height: '80px',
    flexShrink: 0,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100
  },
  mobileMenuButton: {
    display: 'none',
    padding: '8px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  breadcrumbs: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: '1rem'
  },
  mainLayout: {
    display: 'flex',
    height: 'calc(100vh - 80px)',
    flex: 1,
    overflow: 'hidden'
  },
  sidebar: {
    width: '280px',
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    padding: '2rem 1rem',
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative' as const,
    height: '100%',
    overflowY: 'auto' as const
  },
  sidebarOverlay: {
    display: 'none',
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(5px)',
    zIndex: 199,
    opacity: 0,
    transition: 'opacity 0.3s'
  },
  sidebarMobile: {
    position: 'fixed' as const,
    top: 0,
    right: '-100%',
    bottom: 0,
    width: '80%',
    maxWidth: '320px',
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(25px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    boxShadow: '-5px 0 25px rgba(0, 0, 0, 0.3)',
    padding: '2rem 1rem',
    transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 200,
    overflowY: 'auto' as const
  },
  sidebarMobileOpen: {
    right: 0
  },
  closeButton: {
    position: 'absolute' as const,
    top: '1rem',
    left: '1rem',
    padding: '8px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 20px',
    marginBottom: '8px',
    borderRadius: '12px',
    background: 'transparent',
    border: '2px solid transparent',
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    width: '100%',
    textAlign: 'right' as const,
    position: 'relative' as const,
    overflow: 'hidden',
    minHeight: '48px'
  },
  menuItemActive: {
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(139, 92, 246, 0.25))',
    color: 'white',
    border: '2px solid rgba(59, 130, 246, 0.4)',
    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
    transform: 'translateX(-4px)'
  },
  menuItemHover: {
    background: 'rgba(255, 255, 255, 0.08)',
    transform: 'translateX(-2px)'
  },
  activeIndicator: {
    position: 'absolute' as const,
    right: 0,
    width: '4px',
    height: '70%',
    background: 'linear-gradient(180deg, #3b82f6, #8b5cf6)',
    borderRadius: '4px 0 0 4px',
    opacity: 0,
    transition: 'opacity 0.3s'
  },
  activeIndicatorVisible: {
    opacity: 1
  },
  menuIcon: {
    width: '22px',
    height: '22px',
    transition: 'transform 0.3s'
  },
  menuIconActive: {
    transform: 'scale(1.15) rotate(5deg)'
  },
  content: {
    flex: 1,
    padding: '2rem',
    overflowY: 'auto' as const,
    position: 'relative' as const,
    height: 'calc(100vh - 80px)',
    maxHeight: 'calc(100vh - 80px)'
  },
  contentTransition: {
    opacity: 0,
    transform: 'translateX(20px)',
    animation: 'contentEnter 300ms cubic-bezier(0.4, 0, 0.2, 1) forwards'
  },
  sectionHeader: {
    marginBottom: '2rem',
    opacity: 0,
    animation: 'fadeInUp 400ms ease-out forwards'
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px'
  },
  loadingSpinner: {
    width: '50px',
    height: '50px',
    border: '3px solid rgba(255, 255, 255, 0.1)',
    borderTop: '3px solid rgba(59, 130, 246, 0.8)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    padding: '3rem',
    textAlign: 'center' as const
  },
  emptyStateIcon: {
    width: '80px',
    height: '80px',
    opacity: 0.3,
    marginBottom: '1.5rem'
  },
  skeletonCard: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '1rem',
    animation: 'pulse 2s ease-in-out infinite'
  },
  skeletonLine: {
    height: '12px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
    marginBottom: '8px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
    flexShrink: 0
  },
  statCard: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    padding: '1.5rem',
    textAlign: 'center' as const,
    transition: 'transform 0.3s',
    cursor: 'pointer'
  },
  iconBox: {
    width: '60px',
    height: '60px',
    margin: '0 auto 1rem',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '1.5rem',
    flexShrink: 0
  },
  chartCard: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    padding: '1.5rem',
    height: '300px'
  },
  activitiesCard: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    padding: '1.5rem'
  },
  activityItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    marginBottom: '0.5rem',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  }
}

export default styles;

