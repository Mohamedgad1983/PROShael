import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import BottomNav from '../../../src/components/BottomNav'

// Mock react-router-dom
const mockNavigate = vi.fn()
const mockLocation = { pathname: '/dashboard' }

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  }
})

// Wrapper component with Router
const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('BottomNav', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocation.pathname = '/dashboard'
  })

  describe('rendering', () => {
    it('should render all navigation items', () => {
      renderWithRouter(<BottomNav />)

      expect(screen.getByText('الرئيسية')).toBeDefined()
      expect(screen.getByText('المدفوعات')).toBeDefined()
      expect(screen.getByText('الإشعارات')).toBeDefined()
      expect(screen.getByText('حسابي')).toBeDefined()
    })

    it('should render with correct Arabic labels in RTL', () => {
      renderWithRouter(<BottomNav />)

      const labels = ['الرئيسية', 'المدفوعات', 'الإشعارات', 'حسابي']
      labels.forEach(label => {
        expect(screen.getByText(label)).toBeDefined()
      })
    })

    it('should render correct icons', () => {
      const { container } = renderWithRouter(<BottomNav />)

      // Check that nav-icon elements exist (one for each nav item)
      const navIcons = container.querySelectorAll('.nav-icon')
      expect(navIcons.length).toBe(4)
    })
  })

  describe('active state', () => {
    it('should mark dashboard as active when on /dashboard', () => {
      mockLocation.pathname = '/dashboard'
      const { container } = renderWithRouter(<BottomNav />)

      const navItems = container.querySelectorAll('.nav-item')
      expect(navItems[0].className).toContain('active')
    })

    it('should mark dashboard as active when on root /', () => {
      mockLocation.pathname = '/'
      const { container } = renderWithRouter(<BottomNav />)

      const navItems = container.querySelectorAll('.nav-item')
      expect(navItems[0].className).toContain('active')
    })

    it('should mark payment center as active when on /payment-center', () => {
      mockLocation.pathname = '/payment-center'
      const { container } = renderWithRouter(<BottomNav />)

      const navItems = container.querySelectorAll('.nav-item')
      expect(navItems[1].className).toContain('active')
    })

    it('should mark notifications as active when on /notifications', () => {
      mockLocation.pathname = '/notifications'
      const { container } = renderWithRouter(<BottomNav />)

      const navItems = container.querySelectorAll('.nav-item')
      expect(navItems[2].className).toContain('active')
    })

    it('should mark profile as active when on /profile', () => {
      mockLocation.pathname = '/profile'
      const { container } = renderWithRouter(<BottomNav />)

      const navItems = container.querySelectorAll('.nav-item')
      expect(navItems[3].className).toContain('active')
    })
  })

  describe('navigation', () => {
    it('should navigate to dashboard when dashboard item clicked', () => {
      renderWithRouter(<BottomNav />)

      const dashboardItem = screen.getByText('الرئيسية').closest('.nav-item')
      fireEvent.click(dashboardItem)

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })

    it('should navigate to payment center when payment item clicked', () => {
      renderWithRouter(<BottomNav />)

      const paymentItem = screen.getByText('المدفوعات').closest('.nav-item')
      fireEvent.click(paymentItem)

      expect(mockNavigate).toHaveBeenCalledWith('/payment-center')
    })

    it('should navigate to notifications when notifications item clicked', () => {
      renderWithRouter(<BottomNav />)

      const notifItem = screen.getByText('الإشعارات').closest('.nav-item')
      fireEvent.click(notifItem)

      expect(mockNavigate).toHaveBeenCalledWith('/notifications')
    })

    it('should navigate to profile when profile item clicked', () => {
      renderWithRouter(<BottomNav />)

      const profileItem = screen.getByText('حسابي').closest('.nav-item')
      fireEvent.click(profileItem)

      expect(mockNavigate).toHaveBeenCalledWith('/profile')
    })
  })

  describe('notification badge', () => {
    it('should not show badge when notificationCount is 0', () => {
      const { container } = renderWithRouter(<BottomNav notificationCount={0} />)

      const badges = container.querySelectorAll('.bg-red-500')
      expect(badges.length).toBe(0)
    })

    it('should show badge with count when notificationCount > 0', () => {
      renderWithRouter(<BottomNav notificationCount={3} />)

      expect(screen.getByText('3')).toBeDefined()
    })

    it('should show "9+" when notificationCount > 9', () => {
      renderWithRouter(<BottomNav notificationCount={15} />)

      expect(screen.getByText('9+')).toBeDefined()
    })

    it('should show exact count when notificationCount <= 9', () => {
      renderWithRouter(<BottomNav notificationCount={9} />)

      expect(screen.getByText('9')).toBeDefined()
    })

    it('should show badge only on notifications icon', () => {
      const { container } = renderWithRouter(<BottomNav notificationCount={5} />)

      const badges = container.querySelectorAll('.bg-red-500')
      expect(badges.length).toBe(1)

      // Badge should be inside the notifications nav item (3rd item, index 2)
      const notifIcon = container.querySelectorAll('.nav-icon')[2]
      expect(notifIcon.querySelector('.bg-red-500')).toBeDefined()
    })
  })

  describe('edge cases', () => {
    it('should handle undefined notificationCount gracefully', () => {
      const { container } = renderWithRouter(<BottomNav notificationCount={undefined} />)

      const badges = container.querySelectorAll('.bg-red-500')
      expect(badges.length).toBe(0)
    })

    it('should handle negative notificationCount gracefully', () => {
      const { container } = renderWithRouter(<BottomNav notificationCount={-5} />)

      const badges = container.querySelectorAll('.bg-red-500')
      expect(badges.length).toBe(0)
    })

    it('should render without crashing when on unknown route', () => {
      mockLocation.pathname = '/unknown-route'

      const { container } = renderWithRouter(<BottomNav />)

      // No item should be active
      const activeItems = container.querySelectorAll('.nav-item.active')
      expect(activeItems.length).toBe(0)
    })
  })
})
