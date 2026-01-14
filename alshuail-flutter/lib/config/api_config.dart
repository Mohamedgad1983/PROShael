class ApiConfig {
  // API Base URL - VPS Backend
  static const String baseUrl = 'https://api.alshailfund.com/api';

  // Request Timeout
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);

  // API Endpoints (Updated to match backend routes)
  static const String endpoints = '''

  === Authentication (OTP) ===
  POST /otp/send              - Send OTP via WhatsApp
  POST /otp/verify            - Verify OTP and login
  POST /otp/resend            - Resend OTP
  GET  /otp/status            - Check WhatsApp service status
  POST /auth/verify           - Verify current token
  POST /auth/logout           - Logout

  === Password Authentication ===
  POST /auth/password/login           - Login with password
  POST /auth/password/request-otp     - Request OTP for password reset
  POST /auth/password/verify-otp      - Verify OTP
  POST /auth/password/reset-password  - Reset password
  POST /auth/password/create-password - Create password (first time)
  POST /auth/password/face-id-login   - Login with Face ID token
  POST /auth/password/enable-face-id  - Enable Face ID
  POST /auth/password/disable-face-id - Disable Face ID

  === Members ===
  GET  /members/mobile/profile    - Get current member profile
  PUT  /members/mobile/profile    - Update profile
  GET  /members/mobile/balance    - Get member balance
  GET  /members/mobile/transactions - Get member transactions
  GET  /members/search            - Search members
  GET  /members/:id               - Get member by ID

  === Subscriptions ===
  GET  /subscriptions/plans                    - Get subscription plans
  GET  /subscriptions/member/subscription      - Get member subscription
  GET  /subscriptions/member/subscription/payments - Payment history

  === Family Tree ===
  GET  /family-tree/my-branch         - Get member's family branch
  GET  /family-tree/visualization/:id - Get tree visualization
  GET  /family-tree/branches          - Get all branches
  GET  /family-tree/search            - Search family tree

  === Initiatives ===
  GET  /initiatives              - List all initiatives
  GET  /initiatives/:id          - Get initiative details
  POST /initiatives/:id/contribute - Contribute to initiative

  === Events/Occasions ===
  GET  /occasions                - List events
  GET  /occasions/:id            - Get event details
  PUT  /occasions/:id/rsvp       - RSVP to event

  === Notifications ===
  GET  /notifications            - Get member notifications (uses auth token)
  GET  /notifications/summary    - Get notification summary
  PUT  /notifications/:id/read   - Mark as read
  PUT  /notifications/read-all   - Mark all as read

  === News ===
  GET  /news                     - List news
  GET  /news/:id                 - Get news details

  === Push Notifications ===
  POST /push-notifications/register  - Register device token
  POST /push-notifications/send      - Send push notification

  ''';
}
