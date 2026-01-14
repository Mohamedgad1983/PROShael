import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';
import 'package:local_auth/error_codes.dart' as auth_error;
import 'storage_service.dart';

class BiometricService {
  static final LocalAuthentication _localAuth = LocalAuthentication();

  // Check if device supports biometrics
  static Future<bool> isDeviceSupported() async {
    // Biometrics not supported on web
    if (kIsWeb) return false;
    try {
      return await _localAuth.isDeviceSupported();
    } on PlatformException {
      return false;
    } catch (e) {
      return false;
    }
  }
  
  // Check if biometrics are available
  static Future<bool> canCheckBiometrics() async {
    if (kIsWeb) return false;
    try {
      return await _localAuth.canCheckBiometrics;
    } on PlatformException {
      return false;
    } catch (e) {
      return false;
    }
  }

  // Check if biometric authentication is available (convenience method)
  static Future<bool> isAvailable() async {
    final isSupported = await isDeviceSupported();
    final canCheck = await canCheckBiometrics();
    return isSupported && canCheck;
  }

  // Get available biometric types
  static Future<List<BiometricType>> getAvailableBiometrics() async {
    if (kIsWeb) return <BiometricType>[];
    try {
      return await _localAuth.getAvailableBiometrics();
    } on PlatformException {
      return <BiometricType>[];
    } catch (e) {
      return <BiometricType>[];
    }
  }
  
  // Check if Face ID is available
  static Future<bool> hasFaceId() async {
    final biometrics = await getAvailableBiometrics();
    return biometrics.contains(BiometricType.face);
  }
  
  // Check if Fingerprint is available
  static Future<bool> hasFingerprint() async {
    final biometrics = await getAvailableBiometrics();
    return biometrics.contains(BiometricType.fingerprint) ||
           biometrics.contains(BiometricType.strong) ||
           biometrics.contains(BiometricType.weak);
  }
  
  // Get biometric type name in Arabic
  static Future<String> getBiometricTypeName() async {
    if (await hasFaceId()) {
      return 'بصمة الوجه';
    } else if (await hasFingerprint()) {
      return 'بصمة الإصبع';
    }
    return 'المصادقة البيومترية';
  }
  
  // Authenticate with biometrics
  static Future<BiometricResult> authenticate({
    String reason = 'يرجى المصادقة للدخول إلى حسابك',
  }) async {
    // Biometrics not supported on web
    if (kIsWeb) {
      return BiometricResult(
        success: false,
        error: BiometricError.notAvailable,
        message: 'المصادقة البيومترية غير متاحة على المتصفح',
      );
    }
    try {
      // Check if biometrics are available
      final canCheck = await canCheckBiometrics();
      final isSupported = await isDeviceSupported();
      
      if (!canCheck || !isSupported) {
        return BiometricResult(
          success: false,
          error: BiometricError.notAvailable,
          message: 'المصادقة البيومترية غير متاحة على هذا الجهاز',
        );
      }
      
      // Attempt authentication
      final authenticated = await _localAuth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(
          stickyAuth: true,
          biometricOnly: true,
          useErrorDialogs: true,
        ),
      );
      
      if (authenticated) {
        return BiometricResult(
          success: true,
          message: 'تمت المصادقة بنجاح',
        );
      } else {
        return BiometricResult(
          success: false,
          error: BiometricError.failed,
          message: 'فشلت المصادقة',
        );
      }
    } on PlatformException catch (e) {
      return _handlePlatformException(e);
    } catch (e) {
      return BiometricResult(
        success: false,
        error: BiometricError.unknown,
        message: 'حدث خطأ غير متوقع',
      );
    }
  }
  
  // Handle platform exceptions
  static BiometricResult _handlePlatformException(PlatformException e) {
    switch (e.code) {
      case auth_error.notEnrolled:
        return BiometricResult(
          success: false,
          error: BiometricError.notEnrolled,
          message: 'لم يتم تسجيل أي بصمة على هذا الجهاز',
        );
      case auth_error.lockedOut:
        return BiometricResult(
          success: false,
          error: BiometricError.lockedOut,
          message: 'تم قفل المصادقة البيومترية مؤقتاً بسبب محاولات فاشلة متعددة',
        );
      case auth_error.permanentlyLockedOut:
        return BiometricResult(
          success: false,
          error: BiometricError.permanentlyLockedOut,
          message: 'تم قفل المصادقة البيومترية. يرجى استخدام كلمة المرور',
        );
      case auth_error.notAvailable:
        return BiometricResult(
          success: false,
          error: BiometricError.notAvailable,
          message: 'المصادقة البيومترية غير متاحة',
        );
      case auth_error.passcodeNotSet:
        return BiometricResult(
          success: false,
          error: BiometricError.passcodeNotSet,
          message: 'يرجى إعداد رمز قفل الشاشة أولاً',
        );
      default:
        return BiometricResult(
          success: false,
          error: BiometricError.unknown,
          message: e.message ?? 'حدث خطأ في المصادقة',
        );
    }
  }
  
  // Check if biometric login is enabled for user
  static Future<bool> isBiometricLoginEnabled() async {
    final enabled = await StorageService.getBiometricEnabled();
    if (!enabled) return false;
    
    // Also check if biometrics are still available
    return await canCheckBiometrics();
  }
  
  // Enable biometric login
  static Future<bool> enableBiometricLogin() async {
    // First verify biometrics work
    final result = await authenticate(
      reason: 'يرجى المصادقة لتفعيل الدخول بالبصمة',
    );
    
    if (result.success) {
      await StorageService.setBiometricEnabled(true);
      return true;
    }
    return false;
  }
  
  // Disable biometric login
  static Future<void> disableBiometricLogin() async {
    await StorageService.setBiometricEnabled(false);
  }
  
  // Cancel authentication
  static Future<void> cancelAuthentication() async {
    await _localAuth.stopAuthentication();
  }
}

// Biometric result model
class BiometricResult {
  final bool success;
  final BiometricError? error;
  final String message;
  
  BiometricResult({
    required this.success,
    this.error,
    required this.message,
  });
}

// Biometric error types
enum BiometricError {
  notAvailable,
  notEnrolled,
  lockedOut,
  permanentlyLockedOut,
  passcodeNotSet,
  failed,
  cancelled,
  unknown,
}
