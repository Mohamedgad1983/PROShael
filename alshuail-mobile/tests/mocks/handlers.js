import { http, HttpResponse } from 'msw'
import membersData from './data/members.json'
import paymentsData from './data/payments.json'
import subscriptionsData from './data/subscriptions.json'
import notificationsData from './data/notifications.json'
import familyTreeData from './data/familyTree.json'
import initiativesData from './data/initiatives.json'
import newsData from './data/news.json'
import eventsData from './data/events.json'

// Base API URL matching the application configuration
const API_URL = 'https://api.alshailfund.com/api'

// Export all request handlers
export const handlers = [
  // =============================================================================
  // AUTH ENDPOINTS (T019)
  // =============================================================================

  // POST /otp/send - Send OTP
  http.post(`${API_URL}/otp/send`, async ({ request }) => {
    const body = await request.json()
    if (!body.phone || body.phone.length < 10) {
      return HttpResponse.json(
        { success: false, message: 'Invalid phone number format' },
        { status: 400 }
      )
    }
    return HttpResponse.json({ success: true, message: 'OTP sent successfully' })
  }),

  // POST /otp/verify - Verify OTP
  http.post(`${API_URL}/otp/verify`, async ({ request }) => {
    const body = await request.json()
    if (body.otp === '123456') {
      return HttpResponse.json({
        success: true,
        token: 'mock-jwt-token',
        user: membersData[0]
      })
    }
    return HttpResponse.json(
      { success: false, message: 'Invalid OTP' },
      { status: 401 }
    )
  }),

  // POST /auth/mobile-login - Password login
  http.post(`${API_URL}/auth/mobile-login`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      success: true,
      token: 'mock-jwt-token',
      user: membersData[0]
    })
  }),

  // POST /auth/logout - Logout
  http.post(`${API_URL}/auth/logout`, () => {
    return HttpResponse.json({ success: true, message: 'Logged out successfully' })
  }),

  // POST /auth/change-password - Change password
  http.post(`${API_URL}/auth/change-password`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({ success: true, message: 'Password changed successfully' })
  }),

  // POST /otp/resend - Resend OTP
  http.post(`${API_URL}/otp/resend`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({ success: true, message: 'OTP resent successfully', expiresIn: 300 })
  }),

  // GET /otp/status - Check OTP service status
  http.get(`${API_URL}/otp/status`, () => {
    return HttpResponse.json({
      success: true,
      whatsapp: { connected: true },
      testMode: false
    })
  }),

  // =============================================================================
  // MEMBER ENDPOINTS (T020)
  // =============================================================================

  // GET /user/profile - Get current user profile
  http.get(`${API_URL}/user/profile`, () => {
    return HttpResponse.json(membersData[0])
  }),

  // PUT /user/profile - Update profile
  http.put(`${API_URL}/user/profile`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: { ...membersData[0], ...body }
    })
  }),

  // GET /members/mobile/profile - Get member data
  http.get(`${API_URL}/members/mobile/profile`, () => {
    return HttpResponse.json(membersData[0])
  }),

  // GET /members/mobile/balance - Get balance
  http.get(`${API_URL}/members/mobile/balance`, () => {
    return HttpResponse.json({
      balance: '1500.00',
      as_of: '2026-01-09T00:00:00Z'
    })
  }),

  // GET /members/search - Search members (must come before /members/:id)
  http.get(`${API_URL}/members/search`, ({ request }) => {
    const url = new URL(request.url)
    const query = url.searchParams.get('q') || ''
    const results = membersData.filter(m =>
      m.full_name_ar.includes(query) ||
      m.membership_number.includes(query) ||
      m.phone.includes(query)
    )
    return HttpResponse.json({ members: results })
  }),

  // GET /members/mobile/subscriptions - Get member subscription status
  http.get(`${API_URL}/members/mobile/subscriptions`, () => {
    return HttpResponse.json({
      active: true,
      plan: 'monthly',
      next_payment: '2026-02-01'
    })
  }),

  // GET /members/mobile/payments - Get member payment history
  http.get(`${API_URL}/members/mobile/payments`, () => {
    return HttpResponse.json({ payments: paymentsData })
  }),

  // GET /members/:id - Get member by ID
  http.get(`${API_URL}/members/:id`, ({ params }) => {
    const member = membersData.find(m => m.id === parseInt(params.id))
    return HttpResponse.json(member || membersData[0])
  }),

  // DELETE /user/profile/avatar - Delete avatar
  http.delete(`${API_URL}/user/profile/avatar`, () => {
    return HttpResponse.json({
      success: true,
      message: 'Avatar deleted successfully'
    })
  }),

  // GET /user/profile/notification-settings - Get notification settings
  http.get(`${API_URL}/user/profile/notification-settings`, () => {
    return HttpResponse.json({
      email_notifications: true,
      push_notifications: true,
      sms_notifications: false
    })
  }),

  // PUT /user/profile/notification-settings - Update notification settings
  http.put(`${API_URL}/user/profile/notification-settings`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      success: true,
      message: 'Notification settings updated'
    })
  }),

  // GET /user/profile/appearance-settings - Get appearance settings
  http.get(`${API_URL}/user/profile/appearance-settings`, () => {
    return HttpResponse.json({
      theme: 'light',
      language: 'ar'
    })
  }),

  // PUT /user/profile/appearance-settings - Update appearance settings
  http.put(`${API_URL}/user/profile/appearance-settings`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      success: true,
      message: 'Appearance settings updated'
    })
  }),

  // GET /user/profile/language-settings - Get language settings
  http.get(`${API_URL}/user/profile/language-settings`, () => {
    return HttpResponse.json({
      preferred_language: 'ar',
      fallback_language: 'en'
    })
  }),

  // PUT /user/profile/language-settings - Update language settings
  http.put(`${API_URL}/user/profile/language-settings`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      success: true,
      message: 'Language settings updated'
    })
  }),

  // GET /documents/member - Get member documents
  http.get(`${API_URL}/documents/member`, ({ request }) => {
    const url = new URL(request.url)
    const category = url.searchParams.get('category')
    const docs = [
      { id: 'doc-1', title: 'National ID', category: 'id', url: '/docs/id.pdf' },
      { id: 'doc-2', title: 'Contract', category: 'contract', url: '/docs/contract.pdf' }
    ]
    const filtered = category ? docs.filter(d => d.category === category) : docs
    return HttpResponse.json({ documents: filtered })
  }),

  // GET /documents/categories - Get document categories (must come before /documents/:id)
  http.get(`${API_URL}/documents/categories`, () => {
    return HttpResponse.json({
      categories: ['id', 'contract', 'invoice', 'receipt']
    })
  }),

  // GET /documents/:id - Get single document
  http.get(`${API_URL}/documents/:id`, ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      title: 'Document',
      url: '/docs/doc.pdf'
    })
  }),

  // DELETE /documents/:id - Delete document
  http.delete(`${API_URL}/documents/:id`, () => {
    return HttpResponse.json({
      success: true,
      message: 'Document deleted'
    })
  }),

  // =============================================================================
  // PAYMENT ENDPOINTS (T021)
  // =============================================================================

  // POST /payments/subscription - Pay subscription
  http.post(`${API_URL}/payments/subscription`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      success: true,
      payment_id: 123,
      reference_number: 'PAY-2026-001',
      amount: '75.00',
      message: 'Payment successful'
    })
  }),

  // POST /payments/diya - Contribute to diya
  http.post(`${API_URL}/payments/diya`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      success: true,
      payment_id: 124,
      message: 'Diya contribution successful'
    })
  }),

  // POST /payments/initiative - Contribute to initiative
  http.post(`${API_URL}/payments/initiative`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      success: true,
      payment_id: 125,
      message: 'Initiative contribution successful'
    })
  }),

  // POST /payments/bank-transfer - Submit bank transfer
  http.post(`${API_URL}/payments/bank-transfer`, async ({ request }) => {
    return HttpResponse.json({
      success: true,
      payment_id: 126,
      status: 'pending_verification',
      message: 'Bank transfer submitted for verification'
    })
  }),

  // POST /bank-transfers - Submit bank transfer with receipt
  http.post(`${API_URL}/bank-transfers`, async ({ request }) => {
    return HttpResponse.json({
      success: true,
      id: 126,
      status: 'pending_verification',
      message: 'Bank transfer submitted for verification'
    })
  }),

  // GET /payments/history - Get payment history
  http.get(`${API_URL}/payments/history`, ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    return HttpResponse.json({
      payments: paymentsData,
      total: 50,
      page,
      pages: 3
    })
  }),

  // GET /bank-transfers/my-requests - Get my bank transfers
  http.get(`${API_URL}/bank-transfers/my-requests`, () => {
    return HttpResponse.json({
      transfers: [
        { id: 1, amount: '100.00', status: 'pending', date: '2026-01-08' }
      ]
    })
  }),

  // GET /diya-cases - Get active diya cases
  http.get(`${API_URL}/diya-cases`, ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    return HttpResponse.json({
      cases: [
        { id: 'case-1', title: 'حالة دية 1', status: 'active', target_amount: '50000.00' }
      ]
    })
  }),

  // GET /subscriptions/available-months/:memberId - Get available months
  http.get(`${API_URL}/subscriptions/available-months/:memberId`, ({ params }) => {
    return HttpResponse.json({
      available_months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    })
  }),

  // =============================================================================
  // SUBSCRIPTION ENDPOINTS (T022)
  // =============================================================================

  // GET /subscriptions/plans - Get subscription plans
  http.get(`${API_URL}/subscriptions/plans`, () => {
    return HttpResponse.json({
      plans: [
        {
          id: 1,
          name_ar: 'الاشتراك الشهري',
          amount: '25.00',
          period: 'monthly'
        }
      ]
    })
  }),

  // GET /subscriptions/member/subscription - Get user subscriptions
  http.get(`${API_URL}/subscriptions/member/subscription`, () => {
    return HttpResponse.json({ subscriptions: subscriptionsData })
  }),

  // GET /member-statement - Get financial statement
  http.get(`${API_URL}/member-statement`, () => {
    return HttpResponse.json({
      member: membersData[0],
      balance: '1500.00',
      transactions: [
        {
          date: '2026-01-09',
          type: 'payment',
          description: 'اشتراك يناير 2026',
          amount: '-25.00',
          balance: '1475.00'
        }
      ]
    })
  }),

  // GET /subscriptions/year/:year - Get yearly status
  http.get(`${API_URL}/subscriptions/year/:year`, ({ params }) => {
    return HttpResponse.json({
      year: parseInt(params.year),
      months_paid: 6,
      subscriptions: subscriptionsData
    })
  }),

  // =============================================================================
  // FAMILY TREE ENDPOINTS (T023)
  // =============================================================================

  // GET /tree - Get full family tree
  http.get(`${API_URL}/tree`, () => {
    return HttpResponse.json(familyTreeData)
  }),

  // GET /tree/branches - Get all branches
  http.get(`${API_URL}/tree/branches`, () => {
    return HttpResponse.json({ branches: familyTreeData.branches })
  }),

  // GET /tree/members - Get all members (supports branch_id filter)
  http.get(`${API_URL}/tree/members`, ({ request }) => {
    const url = new URL(request.url)
    const branchId = url.searchParams.get('branch_id')

    if (branchId) {
      // Filter members by branch
      const filtered = membersData.filter(m => m.branch_id === parseInt(branchId))
      return HttpResponse.json({
        branch: { id: parseInt(branchId), name_ar: 'فرع الأول' },
        members: filtered
      })
    }

    return HttpResponse.json({ members: membersData })
  }),

  // GET /tree/search - Search family tree members
  http.get(`${API_URL}/tree/search`, ({ request }) => {
    const url = new URL(request.url)
    const query = url.searchParams.get('q') || ''
    const results = membersData.filter(m =>
      m.full_name_ar.includes(query) ||
      m.membership_number.includes(query)
    )
    return HttpResponse.json({ members: results })
  }),

  // GET /tree/stats - Get tree statistics
  http.get(`${API_URL}/tree/stats`, () => {
    return HttpResponse.json({
      total_members: 347,
      total_branches: 10,
      total_generations: 5
    })
  }),

  // GET /tree/generations - Get all generations
  http.get(`${API_URL}/tree/generations`, () => {
    return HttpResponse.json({
      generations: [
        { level: 1, count: 1 },
        { level: 2, count: 10 },
        { level: 3, count: 50 }
      ]
    })
  }),

  // GET /tree/relationships - Get all relationships
  http.get(`${API_URL}/tree/relationships`, () => {
    return HttpResponse.json({
      relationships: [
        { from: 1, to: 2, type: 'father' },
        { from: 1, to: 3, type: 'father' }
      ]
    })
  }),

  // GET /tree/visualization/:id - Get visualization data
  http.get(`${API_URL}/tree/visualization/:id`, ({ params }) => {
    return HttpResponse.json({
      member: membersData[0],
      ancestors: [],
      descendants: []
    })
  }),

  // GET /tree/:id/relationships - Get member relationships
  http.get(`${API_URL}/tree/:id/relationships`, ({ params }) => {
    return HttpResponse.json({
      relationships: [
        { type: 'father', member: membersData[0] }
      ]
    })
  }),

  // =============================================================================
  // NOTIFICATION ENDPOINTS (T024)
  // =============================================================================

  // GET /notifications - Get all notifications
  http.get(`${API_URL}/notifications`, () => {
    return HttpResponse.json({ notifications: notificationsData })
  }),

  // GET /notifications/member/:memberId - Get member notifications
  http.get(`${API_URL}/notifications/member/:memberId`, ({ params, request }) => {
    const url = new URL(request.url)
    const unreadOnly = url.searchParams.get('unread_only') === 'true'
    const filtered = unreadOnly
      ? notificationsData.filter(n => !n.read)
      : notificationsData
    return HttpResponse.json({ notifications: filtered })
  }),

  // PUT /notifications/:id/read - Mark as read
  http.put(`${API_URL}/notifications/:id/read`, () => {
    return HttpResponse.json({
      success: true,
      message: 'Notification marked as read'
    })
  }),

  // PUT /notifications/read-all - Mark all as read
  http.put(`${API_URL}/notifications/read-all`, () => {
    return HttpResponse.json({
      success: true,
      message: 'All notifications marked as read',
      count: 5
    })
  }),

  // GET /notifications/unread-count - Get unread count
  http.get(`${API_URL}/notifications/unread-count`, () => {
    const unread = notificationsData.filter(n => !n.read).length
    return HttpResponse.json({ count: unread })
  }),

  // POST /notifications/register-device - Register device for push
  http.post(`${API_URL}/notifications/register-device`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      success: true,
      message: 'Device registered successfully'
    })
  }),

  // POST /device-tokens/register - Register device token
  http.post(`${API_URL}/device-tokens/register`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      success: true,
      message: 'Device token registered successfully'
    })
  }),

  // =============================================================================
  // INITIATIVE ENDPOINTS (T025)
  // =============================================================================

  // GET /initiatives - Get all initiatives
  http.get(`${API_URL}/initiatives`, () => {
    return HttpResponse.json({ initiatives: initiativesData })
  }),

  // GET /initiatives/:id - Get initiative details
  http.get(`${API_URL}/initiatives/:id`, ({ params }) => {
    const initiative = initiativesData.find(i => i.id === parseInt(params.id))
    return HttpResponse.json(initiative || {})
  }),

  // POST /initiatives/:id/contribute - Contribute to initiative
  http.post(`${API_URL}/initiatives/:id/contribute`, async ({ request, params }) => {
    const body = await request.json()
    return HttpResponse.json({
      success: true,
      payment_id: 201,
      message: 'Contribution successful'
    })
  }),

  // =============================================================================
  // NEWS ENDPOINTS (T026)
  // =============================================================================

  // GET /news - Get all news
  http.get(`${API_URL}/news`, () => {
    return HttpResponse.json({ news: newsData })
  }),

  // GET /news/:id - Get news by ID
  http.get(`${API_URL}/news/:id`, ({ params }) => {
    const article = newsData.find(n => n.id === parseInt(params.id))
    return HttpResponse.json(article || {})
  }),

  // POST /news/:id/react - React to news
  http.post(`${API_URL}/news/:id/react`, async ({ request, params }) => {
    const body = await request.json()
    return HttpResponse.json({
      success: true,
      message: 'Reaction recorded'
    })
  }),

  // =============================================================================
  // EVENTS ENDPOINTS (T027)
  // =============================================================================

  // GET /occasions - Get all events
  http.get(`${API_URL}/occasions`, () => {
    return HttpResponse.json({ events: eventsData })
  }),

  // GET /occasions/:id - Get event by ID
  http.get(`${API_URL}/occasions/:id`, ({ params }) => {
    const event = eventsData.find(e => e.id === parseInt(params.id))
    return HttpResponse.json(event || eventsData[0])
  }),

  // PUT /occasions/:id/rsvp - Update RSVP
  http.put(`${API_URL}/occasions/:id/rsvp`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      success: true,
      message: 'RSVP updated successfully'
    })
  }),

  // GET /occasions/:id/attendees - Get event attendees
  http.get(`${API_URL}/occasions/:id/attendees`, ({ request, params }) => {
    const url = new URL(request.url)
    const memberId = url.searchParams.get('member_id')
    const statusFilter = url.searchParams.get('status_filter')

    if (memberId) {
      // Return RSVP status for specific member
      return HttpResponse.json({
        member_id: memberId,
        status: 'confirmed',
        guests: 2
      })
    }

    // Return list of attendees
    const attendees = [
      { member_id: 1, full_name_ar: 'محمد أحمد الشعيل', status: 'confirmed', guests: 2 },
      { member_id: 2, full_name_ar: 'أحمد محمد الشعيل', status: 'pending', guests: 1 }
    ]

    const filtered = statusFilter
      ? attendees.filter(a => a.status === statusFilter)
      : attendees

    return HttpResponse.json({ attendees: filtered })
  })
]
