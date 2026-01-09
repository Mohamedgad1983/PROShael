import 'api_service.dart';
import 'storage_service.dart';
import 'biometric_service.dart';

/// Authentication result class
class AuthResult {
  final bool success;
  final String message;
  final Map<String, dynamic>? user;
  final String? token;
  final bool requiresPasswordSetup;
  final bool mustChangePassword;
  final int? attemptsRemaining;
  final bool featureDisabled;
  final String? fallbackEndpoint;

  AuthResult({
    required this.success,
    required this.message,
    this.user,
    this.token,
    this.requiresPasswordSetup = false,
    this.mustChangePassword = false,
    this.attemptsRemaining,
    this.featureDisabled = false,
    this.fallbackEndpoint,
  });

  factory AuthResult.success({
    String message = 'تم بنجاح',
    Map<String, dynamic>? user,
    String? token,
    bool requiresPasswordSetup = false,
    bool mustChangePassword = false,
  }) {
    return AuthResult(
      success: true,
      message: message,
      user: user,
      token: token,
      requiresPasswordSetup: requiresPasswordSetup,
      mustChangePassword: mustChangePassword,
    );
  }

  factory AuthResult.failure({required String message, int? attemptsRemaining}) {
    return AuthResult(
      success: false,
      message: message,
      attemptsRemaining: attemptsRemaining,
    );
  }

  /// Feature is disabled (503 response) - suggest fallback
  factory AuthResult.featureDisabled({String? message, String? fallback}) {
    return AuthResult(
      success: false,
      message: message ?? 'هذه الميزة غير متاحة حالياً. استخدم رمز التحقق OTP',
      featureDisabled: true,
      fallbackEndpoint: fallback,
    );
  }
}

class AuthService {
  final ApiService _api = ApiService();

  /// Normalize phone number to international format
  /// Handles Saudi (966) and Kuwait (965) numbers
  String _normalizePhone(String phone) {
    // Remove all non-digit characters
    String clean = phone.replaceAll(RegExp(r'[\s\-\(\)\+]'), '');

    // Saudi Arabia: 05xxxxxxxx -> 966xxxxxxxx
    if (clean.startsWith('05') && clean.length == 10) {
      clean = '966${clean.substring(1)}';
    }
    // Saudi Arabia: 5xxxxxxxx -> 9665xxxxxxxx
    else if (clean.startsWith('5') && clean.length == 9) {
      clean = '966$clean';
    }
    // Kuwait: 5xxxxxxx or 6xxxxxxx or 9xxxxxxx (8 digits)
    else if (RegExp(r'^[569]\d{7}$').hasMatch(clean)) {
      clean = '965$clean';
    }
    // Already has country code - keep as is

    return clean;
  }

  // =====================================================
  // OTP AUTHENTICATION
  // =====================================================

  /// Send OTP via WhatsApp
  /// @param phone - Phone number (05xxxxxxxx or +966xxxxxxxx)
  Future<Map<String, dynamic>> sendOTP(String phone) async {
    try {
      final response = await _api.post('/otp/send', data: {'phone': phone});
      return response.data as Map<String, dynamic>;
    } catch (e) {
      return {
        'success': false,
        'message': 'فشل إرسال رمز التحقق',
        'error': e.toString(),
      };
    }
  }

  /// Verify OTP and login
  /// @param phone - Phone number
  /// @param otp - 6-digit OTP code
  Future<Map<String, dynamic>> verifyOTP(String phone, String otp) async {
    try {
      final response = await _api.post('/otp/verify', data: {
        'phone': phone,
        'otp': otp,
      });

      final data = response.data as Map<String, dynamic>;

      if (data['success'] == true && data['token'] != null) {
        // Save token
        await _api.setToken(data['token']);

        // Save user data
        if (data['user'] != null) {
          await StorageService.saveUser(data['user'] as Map<String, dynamic>);
        }
      }

      return data;
    } catch (e) {
      return {
        'success': false,
        'message': 'حدث خطأ في التحقق',
        'error': e.toString(),
      };
    }
  }

  /// Resend OTP via WhatsApp
  Future<Map<String, dynamic>> resendOTP(String phone) async {
    try {
      final response = await _api.post('/otp/resend', data: {'phone': phone});
      return response.data as Map<String, dynamic>;
    } catch (e) {
      return {
        'success': false,
        'message': 'فشل إعادة إرسال الرمز',
        'error': e.toString(),
      };
    }
  }

  /// Request OTP for specific purpose
  Future<AuthResult> requestOTP({
    required String phone,
    String purpose = 'login',
  }) async {
    try {
      final response = await _api.post('/auth/password/request-otp', data: {
        'phone': phone,
        'purpose': purpose,
      });

      final data = response.data as Map<String, dynamic>;

      if (data['success'] == true) {
        return AuthResult.success(
          message: data['message'] ?? 'تم إرسال رمز التحقق',
        );
      } else {
        return AuthResult.failure(
          message: data['message'] ?? 'فشل إرسال رمز التحقق',
        );
      }
    } catch (e) {
      return AuthResult.failure(message: 'فشل إرسال رمز التحقق');
    }
  }

  // =====================================================
  // PASSWORD AUTHENTICATION
  // =====================================================

  /// Login with phone and password
  Future<AuthResult> loginWithPassword({
    required String phone,
    required String password,
  }) async {
    try {
      // Normalize phone to international format (965/966)
      final normalizedPhone = _normalizePhone(phone);
      print('📱 [SERVICE] loginWithPassword: $phone -> $normalizedPhone');

      final response = await _api.post('/auth/password/login', data: {
        'phone': normalizedPhone,
        'password': password,
      });

      final data = response.data as Map<String, dynamic>;
      print('📱 [SERVICE] API response: success=${data['success']}, mustChangePassword=${data['mustChangePassword']}');

      if (data['success'] == true) {
        // Save token
        if (data['token'] != null) {
          print('📱 [SERVICE] Saving token...');
          await _api.setToken(data['token']);
          print('📱 [SERVICE] Token saved!');
        }

        // Save user data
        if (data['member'] != null) {
          print('📱 [SERVICE] Saving user data...');
          await StorageService.saveUser(data['member'] as Map<String, dynamic>);
          await StorageService.setLastLoginPhone(phone);
          print('📱 [SERVICE] User data saved!');
        }

        // Check if user must change password (first-time login with default password)
        final mustChangePassword = data['mustChangePassword'] == true;

        return AuthResult.success(
          message: mustChangePassword
              ? 'يجب تغيير كلمة المرور'
              : 'تم تسجيل الدخول بنجاح',
          user: data['member'],
          token: data['token'],
          mustChangePassword: mustChangePassword,
        );
      } else {
        return AuthResult.failure(
          message: data['message'] ?? 'فشل تسجيل الدخول',
          attemptsRemaining: data['attemptsRemaining'],
        );
      }
    } catch (e) {
      // Handle 503 Service Unavailable (feature disabled)
      if (e.toString().contains('503')) {
        return AuthResult.featureDisabled(
          message: 'تسجيل الدخول بكلمة المرور غير متاح حالياً. استخدم رمز التحقق OTP',
          fallback: '/api/otp/send',
        );
      }
      return AuthResult.failure(message: 'فشل تسجيل الدخول');
    }
  }

  /// Create password for first-time user
  Future<AuthResult> createPassword({
    required String password,
    required String confirmPassword,
  }) async {
    if (password != confirmPassword) {
      return AuthResult.failure(message: 'كلمة المرور غير متطابقة');
    }

    if (password.length < 6) {
      return AuthResult.failure(message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    }

    try {
      final response = await _api.post('/auth/password/create-password', data: {
        'password': password,
        'confirmPassword': confirmPassword,
      });

      final data = response.data as Map<String, dynamic>;

      if (data['success'] == true) {
        return AuthResult.success(
          message: data['message'] ?? 'تم إنشاء كلمة المرور بنجاح',
        );
      } else {
        return AuthResult.failure(
          message: data['message'] ?? 'فشل إنشاء كلمة المرور',
        );
      }
    } catch (e) {
      return AuthResult.failure(message: 'فشل إنشاء كلمة المرور');
    }
  }

  /// Reset password with OTP verification
  Future<AuthResult> resetPassword({
    required String phone,
    required String otp,
    required String newPassword,
    required String confirmPassword,
  }) async {
    if (newPassword != confirmPassword) {
      return AuthResult.failure(message: 'كلمة المرور غير متطابقة');
    }

    if (newPassword.length < 6) {
      return AuthResult.failure(message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    }

    try {
      final response = await _api.post('/auth/password/reset-password', data: {
        'phone': phone,
        'otp': otp,
        'newPassword': newPassword,
        'confirmPassword': confirmPassword,
      });

      final data = response.data as Map<String, dynamic>;

      if (data['success'] == true) {
        return AuthResult.success(
          message: data['message'] ?? 'تم تغيير كلمة المرور بنجاح',
        );
      } else {
        return AuthResult.failure(
          message: data['message'] ?? 'فشل تغيير كلمة المرور',
        );
      }
    } catch (e) {
      return AuthResult.failure(message: 'فشل تغيير كلمة المرور');
    }
  }

  /// Check if user has password set up
  Future<bool> hasPasswordSetup(String phone) async {
    try {
      final response = await _api.post('/auth/password/check-password', data: {'phone': phone});
      final data = response.data as Map<String, dynamic>;
      return data['hasPassword'] == true;
    } catch (e) {
      return false;
    }
  }

  // =====================================================
  // BIOMETRIC AUTHENTICATION
  // =====================================================

  /// Login with user ID (for biometric login)
  /// @param userId - The stored user ID
  Future<Map<String, dynamic>> loginWithUserId(String userId) async {
    try {
      final response = await _api.post('/auth/biometric-login', data: {
        'user_id': userId,
      });

      final data = response.data as Map<String, dynamic>;

      if (data['success'] == true && data['token'] != null) {
        // Save token
        await _api.setToken(data['token']);

        // Save user data
        if (data['user'] != null) {
          await StorageService.saveUser(data['user'] as Map<String, dynamic>);
        }
      }

      return data;
    } catch (e) {
      // If API fails, try to use cached user data
      final savedUser = getSavedUser();
      if (savedUser != null && savedUser['id'] == userId) {
        return {
          'success': true,
          'user': savedUser,
          'message': 'تم الدخول باستخدام البيانات المحفوظة',
        };
      }

      return {
        'success': false,
        'message': 'فشل تسجيل الدخول',
        'error': e.toString(),
      };
    }
  }

  /// Login with Face ID / Touch ID
  Future<AuthResult> loginWithFaceId() async {
    try {
      // Check if biometric is available and enabled
      final isAvailable = await BiometricService.isAvailable();
      if (!isAvailable) {
        return AuthResult.failure(message: 'المصادقة البيومترية غير متاحة');
      }

      final isEnabled = await StorageService.isBiometricEnabled();
      if (!isEnabled) {
        return AuthResult.failure(message: 'المصادقة البيومترية غير مفعلة');
      }

      // Authenticate with biometric
      final biometricResult = await BiometricService.authenticate(
        reason: 'استخدم البصمة أو Face ID للدخول',
      );

      if (!biometricResult.success) {
        return AuthResult.failure(message: biometricResult.message);
      }

      // Get stored face ID token
      final faceIdToken = await StorageService.getFaceIdToken();
      if (faceIdToken == null) {
        return AuthResult.failure(message: 'يرجى تسجيل الدخول أولاً ثم تفعيل البصمة');
      }

      // Login with face ID token
      final response = await _api.post('/auth/password/face-id-login', data: {
        'faceIdToken': faceIdToken,
      });

      final data = response.data as Map<String, dynamic>;

      if (data['success'] == true) {
        if (data['token'] != null) {
          await _api.setToken(data['token']);
        }

        if (data['user'] != null) {
          await StorageService.saveUser(data['user'] as Map<String, dynamic>);
        }

        return AuthResult.success(
          message: 'تم تسجيل الدخول بنجاح',
          user: data['user'],
          token: data['token'],
        );
      } else {
        return AuthResult.failure(
          message: data['message'] ?? 'فشل تسجيل الدخول',
        );
      }
    } catch (e) {
      return AuthResult.failure(message: 'فشل تسجيل الدخول بالبصمة');
    }
  }

  /// Enable Face ID / Touch ID
  Future<AuthResult> enableFaceId() async {
    try {
      // Check if biometric is available
      final isAvailable = await BiometricService.isAvailable();
      if (!isAvailable) {
        return AuthResult.failure(message: 'المصادقة البيومترية غير متاحة على هذا الجهاز');
      }

      // Authenticate first
      final biometricResult = await BiometricService.authenticate(
        reason: 'قم بتأكيد هويتك لتفعيل البصمة',
      );

      if (!biometricResult.success) {
        return AuthResult.failure(message: biometricResult.message);
      }

      // Enable on server
      final response = await _api.post('/auth/password/enable-face-id', data: {});

      final data = response.data as Map<String, dynamic>;

      if (data['success'] == true && data['faceIdToken'] != null) {
        // Save token locally
        await StorageService.setFaceIdToken(data['faceIdToken']);
        await StorageService.setBiometricEnabled(true);

        return AuthResult.success(message: 'تم تفعيل البصمة بنجاح');
      } else {
        return AuthResult.failure(
          message: data['message'] ?? 'فشل تفعيل البصمة',
        );
      }
    } catch (e) {
      return AuthResult.failure(message: 'فشل تفعيل البصمة');
    }
  }

  /// Disable Face ID / Touch ID
  Future<AuthResult> disableFaceId() async {
    try {
      final response = await _api.post('/auth/password/disable-face-id', data: {});

      final data = response.data as Map<String, dynamic>;

      if (data['success'] == true) {
        // Clear local storage
        await StorageService.clearFaceIdToken();
        await StorageService.setBiometricEnabled(false);

        return AuthResult.success(message: 'تم إلغاء تفعيل البصمة');
      } else {
        return AuthResult.failure(
          message: data['message'] ?? 'فشل إلغاء البصمة',
        );
      }
    } catch (e) {
      return AuthResult.failure(message: 'فشل إلغاء البصمة');
    }
  }

  /// Check if Face ID is enabled
  Future<bool> isFaceIdEnabled() async {
    return await StorageService.isBiometricEnabled();
  }

  // =====================================================
  // PROFILE & SESSION
  // =====================================================

  /// Update user profile
  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> profileData) async {
    try {
      final response = await _api.put('/members/mobile/profile', data: profileData);

      final data = response.data as Map<String, dynamic>;

      if (data['success'] == true && data['user'] != null) {
        await StorageService.saveUser(data['user'] as Map<String, dynamic>);
      }

      return data;
    } catch (e) {
      return {
        'success': false,
        'message': 'فشل تحديث الملف الشخصي',
        'error': e.toString(),
      };
    }
  }

  /// Check WhatsApp service status
  Future<Map<String, dynamic>> checkOTPStatus() async {
    try {
      final response = await _api.get('/otp/status');
      return response.data as Map<String, dynamic>;
    } catch (e) {
      return {
        'success': false,
        'error': e.toString(),
      };
    }
  }

  /// Verify current token
  Future<Map<String, dynamic>> verifyToken() async {
    try {
      final response = await _api.post('/auth/verify');
      return response.data as Map<String, dynamic>;
    } catch (e) {
      return {
        'success': false,
        'error': e.toString(),
      };
    }
  }

  /// Logout
  Future<void> logout() async {
    try {
      await _api.post('/auth/logout');
    } catch (e) {
      // Ignore logout errors
    }
    await _api.setToken(null);
    await StorageService.clearAll();
  }

  /// Check if user is logged in
  Future<bool> isLoggedIn() async {
    return await StorageService.hasToken();
  }

  /// Get saved user data
  Map<String, dynamic>? getSavedUser() {
    return StorageService.getUser();
  }
}
