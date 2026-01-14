/// =====================================================
/// AL-SHUAIL FAMILY FUND - AUTH SERVICE
/// =====================================================
/// Handles: Password, OTP, Face ID authentication
/// Date: December 20, 2024
/// =====================================================

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:local_auth/local_auth.dart';
import 'package:flutter/services.dart';

class AuthService {
  // API Base URL
  static const String baseUrl = 'https://api.alshailfund.com/api/auth';
  
  // Local Auth for Face ID / Fingerprint
  final LocalAuthentication _localAuth = LocalAuthentication();
  
  // Shared Preferences Keys
  static const String _tokenKey = 'auth_token';
  static const String _memberIdKey = 'member_id';
  static const String _memberDataKey = 'member_data';
  static const String _biometricEnabledKey = 'biometric_enabled';
  static const String _faceIdTokenKey = 'face_id_token';

  // =====================================================
  // 1. LOGIN WITH PASSWORD
  // =====================================================
  Future<AuthResult> loginWithPassword({
    required String phone,
    required String password,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'phone': phone,
          'password': password,
        }),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        // Save token and member data
        await _saveAuthData(data['token'], data['member']);
        
        return AuthResult(
          success: true,
          message: data['message'] ?? 'تم تسجيل الدخول بنجاح',
          token: data['token'],
          member: MemberData.fromJson(data['member']),
        );
      } else {
        return AuthResult(
          success: false,
          message: data['message'] ?? 'فشل تسجيل الدخول',
          requiresPasswordSetup: data['requiresPasswordSetup'] ?? false,
          attemptsRemaining: data['attemptsRemaining'],
          locked: data['locked'] ?? false,
          remainingMinutes: data['remainingMinutes'],
        );
      }
    } catch (e) {
      return AuthResult(
        success: false,
        message: 'خطأ في الاتصال بالسيرفر',
      );
    }
  }

  // =====================================================
  // 2. REQUEST OTP
  // =====================================================
  Future<AuthResult> requestOTP({
    required String phone,
    String purpose = 'login', // 'login' | 'password_reset' | 'first_login'
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/request-otp'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'phone': phone,
          'purpose': purpose,
        }),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        return AuthResult(
          success: true,
          message: data['message'] ?? 'تم إرسال رمز التحقق',
          expiresInMinutes: data['expiresInMinutes'] ?? 5,
          requiresPasswordSetup: data['requiresPasswordSetup'] ?? false,
        );
      } else if (response.statusCode == 429) {
        // Rate limited
        return AuthResult(
          success: false,
          message: data['message'] ?? 'انتظر قبل طلب رمز جديد',
          waitSeconds: data['waitSeconds'],
        );
      } else {
        return AuthResult(
          success: false,
          message: data['message'] ?? 'فشل إرسال رمز التحقق',
        );
      }
    } catch (e) {
      return AuthResult(
        success: false,
        message: 'خطأ في الاتصال بالسيرفر',
      );
    }
  }

  // =====================================================
  // 3. VERIFY OTP
  // =====================================================
  Future<AuthResult> verifyOTP({
    required String phone,
    required String otp,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/verify-otp'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'phone': phone,
          'otp': otp,
        }),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        // Save token and member data
        await _saveAuthData(data['token'], data['member']);
        
        return AuthResult(
          success: true,
          message: data['message'] ?? 'تم التحقق بنجاح',
          token: data['token'],
          member: MemberData.fromJson(data['member']),
          requiresPasswordSetup: data['requiresPasswordSetup'] ?? false,
        );
      } else {
        return AuthResult(
          success: false,
          message: data['message'] ?? 'رمز التحقق غير صحيح',
          attemptsRemaining: data['attemptsRemaining'],
        );
      }
    } catch (e) {
      return AuthResult(
        success: false,
        message: 'خطأ في الاتصال بالسيرفر',
      );
    }
  }

  // =====================================================
  // 4. CREATE PASSWORD
  // =====================================================
  Future<AuthResult> createPassword({
    required String password,
    required String confirmPassword,
  }) async {
    try {
      final token = await getToken();
      
      if (token == null) {
        return AuthResult(
          success: false,
          message: 'يرجى تسجيل الدخول أولاً',
        );
      }

      final response = await http.post(
        Uri.parse('$baseUrl/create-password'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'password': password,
          'confirmPassword': confirmPassword,
        }),
      );

      final data = jsonDecode(response.body);

      return AuthResult(
        success: data['success'] ?? false,
        message: data['message'] ?? 'حدث خطأ',
      );
    } catch (e) {
      return AuthResult(
        success: false,
        message: 'خطأ في الاتصال بالسيرفر',
      );
    }
  }

  // =====================================================
  // 5. RESET PASSWORD
  // =====================================================
  Future<AuthResult> resetPassword({
    required String phone,
    required String otp,
    required String newPassword,
    required String confirmPassword,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/reset-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'phone': phone,
          'otp': otp,
          'newPassword': newPassword,
          'confirmPassword': confirmPassword,
        }),
      );

      final data = jsonDecode(response.body);

      return AuthResult(
        success: data['success'] ?? false,
        message: data['message'] ?? 'حدث خطأ',
      );
    } catch (e) {
      return AuthResult(
        success: false,
        message: 'خطأ في الاتصال بالسيرفر',
      );
    }
  }

  // =====================================================
  // 6. BIOMETRIC AUTHENTICATION
  // =====================================================
  
  /// Check if biometric is available
  Future<BiometricStatus> checkBiometricAvailability() async {
    try {
      final bool canAuthenticateWithBiometrics = 
          await _localAuth.canCheckBiometrics;
      final bool canAuthenticate = 
          canAuthenticateWithBiometrics || await _localAuth.isDeviceSupported();

      if (!canAuthenticate) {
        return BiometricStatus(
          available: false,
          type: BiometricType.none,
          message: 'الجهاز لا يدعم المصادقة البيومترية',
        );
      }

      final List<BiometricType> availableBiometrics = 
          await _localAuth.getAvailableBiometrics();

      if (availableBiometrics.contains(BiometricType.face)) {
        return BiometricStatus(
          available: true,
          type: BiometricType.face,
          message: 'Face ID متاح',
        );
      } else if (availableBiometrics.contains(BiometricType.fingerprint)) {
        return BiometricStatus(
          available: true,
          type: BiometricType.fingerprint,
          message: 'البصمة متاحة',
        );
      } else {
        return BiometricStatus(
          available: true,
          type: BiometricType.weak,
          message: 'المصادقة البيومترية متاحة',
        );
      }
    } on PlatformException catch (e) {
      return BiometricStatus(
        available: false,
        type: BiometricType.none,
        message: 'خطأ: ${e.message}',
      );
    }
  }

  /// Authenticate with biometric
  Future<bool> authenticateWithBiometric() async {
    try {
      return await _localAuth.authenticate(
        localizedReason: 'يرجى التحقق من هويتك للدخول',
        options: const AuthenticationOptions(
          stickyAuth: true,
          biometricOnly: true,
          useErrorDialogs: true,
        ),
      );
    } on PlatformException {
      return false;
    }
  }

  /// Login with Face ID
  Future<AuthResult> loginWithFaceId() async {
    try {
      // First, authenticate locally
      final bool authenticated = await authenticateWithBiometric();
      
      if (!authenticated) {
        return AuthResult(
          success: false,
          message: 'فشل التحقق من Face ID',
        );
      }

      // Get stored Face ID token
      final prefs = await SharedPreferences.getInstance();
      final faceIdToken = prefs.getString(_faceIdTokenKey);
      final memberId = prefs.getString(_memberIdKey);

      if (faceIdToken == null || memberId == null) {
        return AuthResult(
          success: false,
          message: 'Face ID غير مفعّل. يرجى تسجيل الدخول بطريقة أخرى',
        );
      }

      // Verify with server
      final response = await http.post(
        Uri.parse('$baseUrl/face-id-login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'memberId': memberId,
          'faceIdToken': faceIdToken,
        }),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        await _saveAuthData(data['token'], data['member']);
        
        return AuthResult(
          success: true,
          message: 'تم تسجيل الدخول بنجاح',
          token: data['token'],
          member: MemberData.fromJson(data['member']),
        );
      } else {
        return AuthResult(
          success: false,
          message: data['message'] ?? 'فشل تسجيل الدخول',
        );
      }
    } catch (e) {
      return AuthResult(
        success: false,
        message: 'خطأ في الاتصال بالسيرفر',
      );
    }
  }

  /// Enable Face ID
  Future<AuthResult> enableFaceId() async {
    try {
      // Authenticate locally first
      final bool authenticated = await authenticateWithBiometric();
      
      if (!authenticated) {
        return AuthResult(
          success: false,
          message: 'فشل التحقق من Face ID',
        );
      }

      // Generate a unique token
      final faceIdToken = _generateFaceIdToken();
      
      final token = await getToken();
      if (token == null) {
        return AuthResult(
          success: false,
          message: 'يرجى تسجيل الدخول أولاً',
        );
      }

      // Save to server
      final response = await http.post(
        Uri.parse('$baseUrl/enable-face-id'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'faceIdToken': faceIdToken,
        }),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        // Save locally
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_faceIdTokenKey, faceIdToken);
        await prefs.setBool(_biometricEnabledKey, true);
        
        return AuthResult(
          success: true,
          message: 'تم تفعيل Face ID بنجاح',
        );
      } else {
        return AuthResult(
          success: false,
          message: data['message'] ?? 'فشل تفعيل Face ID',
        );
      }
    } catch (e) {
      return AuthResult(
        success: false,
        message: 'خطأ في الاتصال بالسيرفر',
      );
    }
  }

  /// Disable Face ID
  Future<AuthResult> disableFaceId() async {
    try {
      final token = await getToken();
      if (token == null) {
        return AuthResult(
          success: false,
          message: 'يرجى تسجيل الدخول أولاً',
        );
      }

      final response = await http.post(
        Uri.parse('$baseUrl/disable-face-id'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        // Remove locally
        final prefs = await SharedPreferences.getInstance();
        await prefs.remove(_faceIdTokenKey);
        await prefs.setBool(_biometricEnabledKey, false);
        
        return AuthResult(
          success: true,
          message: 'تم إلغاء Face ID بنجاح',
        );
      } else {
        return AuthResult(
          success: false,
          message: data['message'] ?? 'فشل إلغاء Face ID',
        );
      }
    } catch (e) {
      return AuthResult(
        success: false,
        message: 'خطأ في الاتصال بالسيرفر',
      );
    }
  }

  /// Check if Face ID is enabled
  Future<bool> isFaceIdEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_biometricEnabledKey) ?? false;
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  /// Save auth data to local storage
  Future<void> _saveAuthData(String token, Map<String, dynamic> member) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    await prefs.setString(_memberIdKey, member['id']);
    await prefs.setString(_memberDataKey, jsonEncode(member));
  }

  /// Get stored token
  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  /// Get stored member data
  Future<MemberData?> getMemberData() async {
    final prefs = await SharedPreferences.getInstance();
    final memberJson = prefs.getString(_memberDataKey);
    if (memberJson != null) {
      return MemberData.fromJson(jsonDecode(memberJson));
    }
    return null;
  }

  /// Check if user is logged in
  Future<bool> isLoggedIn() async {
    final token = await getToken();
    return token != null;
  }

  /// Logout
  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_memberIdKey);
    await prefs.remove(_memberDataKey);
    // Keep biometric settings
  }

  /// Generate unique Face ID token
  String _generateFaceIdToken() {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final random = timestamp.hashCode.toString();
    return 'FID_${timestamp}_$random';
  }
}

// =====================================================
// DATA MODELS
// =====================================================

class AuthResult {
  final bool success;
  final String message;
  final String? token;
  final MemberData? member;
  final bool requiresPasswordSetup;
  final int? attemptsRemaining;
  final bool locked;
  final int? remainingMinutes;
  final int? expiresInMinutes;
  final int? waitSeconds;

  AuthResult({
    required this.success,
    required this.message,
    this.token,
    this.member,
    this.requiresPasswordSetup = false,
    this.attemptsRemaining,
    this.locked = false,
    this.remainingMinutes,
    this.expiresInMinutes,
    this.waitSeconds,
  });
}

class MemberData {
  final String id;
  final String phone;
  final String fullNameAr;
  final String? fullNameEn;
  final String role;

  MemberData({
    required this.id,
    required this.phone,
    required this.fullNameAr,
    this.fullNameEn,
    required this.role,
  });

  factory MemberData.fromJson(Map<String, dynamic> json) {
    return MemberData(
      id: json['id'] ?? '',
      phone: json['phone'] ?? '',
      fullNameAr: json['fullNameAr'] ?? json['full_name_ar'] ?? '',
      fullNameEn: json['fullNameEn'] ?? json['full_name_en'],
      role: json['role'] ?? 'member',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'phone': phone,
      'fullNameAr': fullNameAr,
      'fullNameEn': fullNameEn,
      'role': role,
    };
  }
}

class BiometricStatus {
  final bool available;
  final BiometricType type;
  final String message;

  BiometricStatus({
    required this.available,
    required this.type,
    required this.message,
  });
}
