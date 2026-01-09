import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';

// Auth Screens
import '../screens/auth/login_screen.dart';
import '../screens/auth/splash_screen.dart';
import '../screens/auth/otp_verification_screen.dart';
import '../screens/auth/profile_completion_screen.dart';
import '../screens/auth/biometric_login_screen.dart';
import '../screens/auth/create_password_screen.dart';
import '../screens/auth/forgot_password_screen.dart';

// Main Screens
import '../screens/dashboard/dashboard_screen.dart';
import '../screens/dashboard/main_navigation.dart';
import '../screens/payments/payments_screen.dart';
import '../screens/payments/payment_method_screen.dart';
import '../screens/payments/bank_transfer_screen.dart';
import '../screens/payments/payment_details_screen.dart';
import '../screens/family/family_tree_screen.dart';
import '../screens/profile/profile_screen.dart';
import '../screens/events/events_screen.dart';
import '../screens/initiatives/initiatives_screen.dart';
import '../screens/notifications/notifications_screen.dart';

// Secondary Screens
import '../screens/member_card/member_card_screen.dart';
import '../screens/add_children/add_children_screen.dart';
import '../screens/statement/account_statement_screen.dart';
import '../screens/news/news_screen.dart';
import '../screens/settings/settings_screen.dart';

// Common Screens
import '../screens/common/success_screen.dart';

class AppRouter {
  static GoRouter router(AuthProvider authProvider) {
    return GoRouter(
      initialLocation: '/',
      refreshListenable: authProvider,
      
      redirect: (context, state) {
        final isAuthenticated = authProvider.isAuthenticated;
        final isLoading = authProvider.status == AuthStatus.initial || 
                         authProvider.status == AuthStatus.loading;
        final isLoginRoute = state.matchedLocation == '/login';
        final isBiometricRoute = state.matchedLocation == '/biometric-login';
        final isOtpRoute = state.matchedLocation.startsWith('/otp-verification');
        final isProfileCompletionRoute = state.matchedLocation == '/profile-completion';
        final isCreatePasswordRoute = state.matchedLocation == '/create-password';
        final isForgotPasswordRoute = state.matchedLocation == '/forgot-password';
        final isSplashRoute = state.matchedLocation == '/';

        // Show splash while checking auth
        if (isLoading && isSplashRoute) {
          return null;
        }

        // If loading finished and still on splash, redirect appropriately
        if (!isLoading && isSplashRoute) {
          return isAuthenticated ? '/dashboard' : '/login';
        }

        // Allow auth flow routes (OTP, biometric, profile completion, create/forgot password)
        if (isOtpRoute || isProfileCompletionRoute || isBiometricRoute ||
            isCreatePasswordRoute || isForgotPasswordRoute) {
          return null;
        }
        
        // If not authenticated and not on login, redirect to login
        if (!isAuthenticated && !isLoginRoute && !isSplashRoute) {
          return '/login';
        }
        
        // If authenticated and on login, redirect to dashboard
        if (isAuthenticated && (isLoginRoute || isBiometricRoute)) {
          return '/dashboard';
        }
        
        return null;
      },
      
      routes: [
        // Splash Screen
        GoRoute(
          path: '/',
          name: 'splash',
          builder: (context, state) => const SplashScreen(),
        ),
        
        // Login Screen
        GoRoute(
          path: '/login',
          name: 'login',
          builder: (context, state) => const LoginScreen(),
        ),
        
        // Biometric Login Screen
        GoRoute(
          path: '/biometric-login',
          name: 'biometric-login',
          builder: (context, state) => const BiometricLoginScreen(),
        ),
        
        // OTP Verification Screen
        GoRoute(
          path: '/otp-verification/:phone',
          name: 'otp-verification',
          builder: (context, state) {
            final phone = state.pathParameters['phone'] ?? '';
            return OtpVerificationScreen(phoneNumber: phone);
          },
        ),
        
        // Profile Completion Screen
        GoRoute(
          path: '/profile-completion',
          name: 'profile-completion',
          builder: (context, state) => const ProfileCompletionScreen(),
        ),

        // Create Password Screen (first-time users after OTP)
        GoRoute(
          path: '/create-password',
          name: 'create-password',
          builder: (context, state) => const CreatePasswordScreen(),
        ),

        // Forgot Password Screen
        GoRoute(
          path: '/forgot-password',
          name: 'forgot-password',
          builder: (context, state) => const ForgotPasswordScreen(),
        ),

        // Main Navigation Shell
        ShellRoute(
          builder: (context, state, child) => MainNavigation(child: child),
          routes: [
            // Dashboard
            GoRoute(
              path: '/dashboard',
              name: 'dashboard',
              builder: (context, state) => const DashboardScreen(),
            ),
            
            // Payments
            GoRoute(
              path: '/payments',
              name: 'payments',
              builder: (context, state) => const PaymentsScreen(),
            ),
            
            // Family Tree
            GoRoute(
              path: '/family-tree',
              name: 'family-tree',
              builder: (context, state) => const FamilyTreeScreen(),
            ),
            
            // Events
            GoRoute(
              path: '/events',
              name: 'events',
              builder: (context, state) => const EventsScreen(),
            ),
            
            // Initiatives
            GoRoute(
              path: '/initiatives',
              name: 'initiatives',
              builder: (context, state) => const InitiativesScreen(),
            ),
            
            // Profile
            GoRoute(
              path: '/profile',
              name: 'profile',
              builder: (context, state) => const ProfileScreen(),
            ),
          ],
        ),
        
        // Full Screen Routes (outside shell navigation)
        
        // Payment Method Selection
        GoRoute(
          path: '/payment-method',
          name: 'payment-method',
          builder: (context, state) {
            final extra = state.extra as Map<String, dynamic>? ?? {};
            return PaymentMethodScreen(
              paymentType: extra['paymentType'] ?? 'subscription',
              amount: extra['amount'] ?? 50.0,
              beneficiaryId: extra['beneficiaryId'],
              beneficiaryName: extra['beneficiaryName'],
            );
          },
        ),
        
        // Bank Transfer
        GoRoute(
          path: '/bank-transfer',
          name: 'bank-transfer',
          builder: (context, state) {
            final extra = state.extra as Map<String, dynamic>? ?? {};
            return BankTransferScreen(
              paymentType: extra['paymentType'] ?? 'subscription',
              amount: extra['amount'] ?? 50.0,
              beneficiaryId: extra['beneficiaryId'],
              beneficiaryName: extra['beneficiaryName'],
            );
          },
        ),
        
        // Payment Details
        GoRoute(
          path: '/payment-details',
          name: 'payment-details',
          builder: (context, state) {
            final extra = state.extra as Map<String, dynamic>? ?? {};
            return PaymentDetailsScreen(
              paymentType: extra['paymentType'] ?? 'subscription',
              amount: extra['amount'] ?? 50.0,
              paymentMethod: extra['paymentMethod'] ?? 'knet',
              beneficiaryId: extra['beneficiaryId'],
              beneficiaryName: extra['beneficiaryName'],
            );
          },
        ),
        
        // Success Screen
        GoRoute(
          path: '/success',
          name: 'success',
          builder: (context, state) {
            final extra = state.extra as Map<String, dynamic>? ?? {};
            return SuccessScreen(
              type: extra['type'] ?? 'payment',
              amount: extra['amount'] ?? 0.0,
              message: extra['message'] ?? 'تمت العملية بنجاح',
              subtitle: extra['subtitle'],
              transactionId: extra['transactionId'],
            );
          },
        ),
        
        // Notifications
        GoRoute(
          path: '/notifications',
          name: 'notifications',
          builder: (context, state) => const NotificationsScreen(),
        ),
        
        // Member Card
        GoRoute(
          path: '/member-card',
          name: 'member-card',
          builder: (context, state) => const MemberCardScreen(),
        ),
        
        // Add Children
        GoRoute(
          path: '/add-children',
          name: 'add-children',
          builder: (context, state) => const AddChildrenScreen(),
        ),
        
        // Account Statement
        GoRoute(
          path: '/account-statement',
          name: 'account-statement',
          builder: (context, state) => const AccountStatementScreen(),
        ),
        
        // News
        GoRoute(
          path: '/news',
          name: 'news',
          builder: (context, state) => const NewsScreen(),
        ),
        
        // Settings
        GoRoute(
          path: '/settings',
          name: 'settings',
          builder: (context, state) => const SettingsScreen(),
        ),
      ],
      
      errorBuilder: (context, state) => Directionality(
        textDirection: ui.TextDirection.rtl,
        child: Scaffold(
          body: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 64, color: Colors.red),
                const SizedBox(height: 16),
                Text(
                  'الصفحة غير موجودة',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 8),
                Text(
                  state.error?.message ?? 'حدث خطأ غير متوقع',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => context.go('/dashboard'),
                  child: const Text('العودة للرئيسية'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
