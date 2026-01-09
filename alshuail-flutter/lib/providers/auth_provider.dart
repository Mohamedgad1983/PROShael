import 'package:flutter/foundation.dart';
import '../services/auth_service.dart';
import '../services/storage_service.dart';
import '../services/api_service.dart';
import '../services/biometric_service.dart';

enum AuthStatus {
  initial,
  authenticated,
  unauthenticated,
  loading,
}

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();
  
  AuthStatus _status = AuthStatus.initial;
  Map<String, dynamic>? _user;
  String? _error;
  bool _biometricAvailable = false;
  bool _biometricEnabled = false;
  
  AuthStatus get status => _status;
  Map<String, dynamic>? get user => _user;
  String? get error => _error;
  bool get isAuthenticated => _status == AuthStatus.authenticated;
  bool get isLoading => _status == AuthStatus.loading;
  bool get biometricAvailable => _biometricAvailable;
  bool get biometricEnabled => _biometricEnabled;
  
  // User getters
  String get userName => _user?['full_name_ar'] ?? _user?['name'] ?? 'عضو';
  String get userFirstName => userName.split(' ').first;
  String get userPhone => _user?['phone'] ?? '';
  String get membershipId => _user?['membership_id'] ?? _user?['membershipNumber'] ?? '';
  String get branchName => _user?['branch_name'] ?? _user?['branchName'] ?? '';
  double get balance => (_user?['balance'] ?? _user?['current_balance'] ?? 0).toDouble();
  String get userId => _user?['id'] ?? _user?['member_id'] ?? '';
  
  AuthProvider() {
    _checkAuthStatus();
  }
  
  /// Initialize and check authentication status
  Future<void> _checkAuthStatus() async {
    _status = AuthStatus.loading;
    notifyListeners();
    
    try {
      // Initialize API service
      ApiService().init();
      
      // Check biometric availability
      await _checkBiometricStatus();
      
      // Check if we have a saved token
      final hasToken = await StorageService.hasToken();
      
      if (hasToken) {
        // Try to get saved user data
        final savedUser = _authService.getSavedUser();
        
        if (savedUser != null) {
          _user = savedUser;
          _status = AuthStatus.authenticated;
          
          // Verify token in background
          _verifyTokenInBackground();
        } else {
          // Token exists but no user data, verify token
          final result = await _authService.verifyToken();
          
          if (result['success'] == true) {
            _user = result['user'] as Map<String, dynamic>?;
            _status = AuthStatus.authenticated;
          } else {
            await _authService.logout();
            _status = AuthStatus.unauthenticated;
          }
        }
      } else {
        _status = AuthStatus.unauthenticated;
      }
    } catch (e) {
      _error = e.toString();
      _status = AuthStatus.unauthenticated;
    }
    
    notifyListeners();
  }
  
  /// Check biometric availability and status
  Future<void> _checkBiometricStatus() async {
    _biometricAvailable = await BiometricService.canCheckBiometrics();
    _biometricEnabled = await BiometricService.isBiometricLoginEnabled();
  }
  
  /// Verify token in background
  Future<void> _verifyTokenInBackground() async {
    try {
      final result = await _authService.verifyToken();
      
      if (result['success'] != true) {
        // Token invalid, logout
        await logout();
      }
    } catch (e) {
      // Ignore background verification errors
    }
  }
  
  /// Send OTP to phone number
  Future<Map<String, dynamic>> sendOtp(String phone) async {
    _error = null;
    notifyListeners();
    
    try {
      // Save last login phone
      await StorageService.saveLastLoginPhone(phone);
      return await _authService.sendOTP(phone);
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return {
        'success': false,
        'message': 'فشل إرسال رمز التحقق',
      };
    }
  }
  
  /// Verify OTP and login
  Future<bool> verifyOtp(String phone, String otp) async {
    _status = AuthStatus.loading;
    _error = null;
    notifyListeners();
    
    try {
      final result = await _authService.verifyOTP(phone, otp);
      
      if (result['success'] == true) {
        _user = result['user'] as Map<String, dynamic>?;
        _status = AuthStatus.authenticated;
        
        // Save user ID for biometric login if enabled
        if (_biometricEnabled && userId.isNotEmpty) {
          await StorageService.saveBiometricUserId(userId);
        }
        
        notifyListeners();
        return true;
      } else {
        _error = result['message'] as String?;
        _status = AuthStatus.unauthenticated;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = e.toString();
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return false;
    }
  }
  
  /// Login with biometric
  Future<bool> loginWithBiometric(String savedUserId) async {
    _status = AuthStatus.loading;
    _error = null;
    notifyListeners();
    
    try {
      // Use the saved user ID to fetch user data
      final result = await _authService.loginWithUserId(savedUserId);
      
      if (result['success'] == true) {
        _user = result['user'] as Map<String, dynamic>?;
        _status = AuthStatus.authenticated;
        notifyListeners();
        return true;
      } else {
        _error = result['message'] as String?;
        _status = AuthStatus.unauthenticated;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = e.toString();
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return false;
    }
  }
  
  /// Enable biometric login
  Future<bool> enableBiometric() async {
    try {
      final success = await BiometricService.enableBiometricLogin();
      
      if (success && userId.isNotEmpty) {
        await StorageService.saveBiometricUserId(userId);
        _biometricEnabled = true;
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
  
  /// Disable biometric login
  Future<void> disableBiometric() async {
    await BiometricService.disableBiometricLogin();
    _biometricEnabled = false;
    notifyListeners();
  }
  
  /// Check if should show biometric login
  Future<bool> shouldShowBiometricLogin() async {
    if (!_biometricAvailable) return false;
    if (!_biometricEnabled) return false;
    
    final savedUserId = await StorageService.getBiometricUserId();
    return savedUserId != null && savedUserId.isNotEmpty;
  }
  
  /// Resend OTP
  Future<Map<String, dynamic>> resendOTP(String phone) async {
    try {
      return await _authService.resendOTP(phone);
    } catch (e) {
      return {
        'success': false,
        'message': 'فشل إعادة إرسال الرمز',
      };
    }
  }
  
  /// Update profile
  Future<bool> updateProfile(Map<String, dynamic> profileData) async {
    try {
      final result = await _authService.updateProfile(profileData);
      
      if (result['success'] == true) {
        _user = {...?_user, ...profileData};
        await StorageService.saveUser(_user!);
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
  
  /// Login (set user data from external source)
  void login(Map<String, dynamic> userData) {
    _user = userData;
    _status = AuthStatus.authenticated;
    StorageService.saveUser(userData);
    notifyListeners();
  }
  
  /// Logout
  Future<void> logout() async {
    _status = AuthStatus.loading;
    notifyListeners();
    
    try {
      await _authService.logout();
    } catch (e) {
      // Ignore logout errors
    }
    
    _user = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }
  
  /// Update user data
  void updateUser(Map<String, dynamic> userData) {
    _user = {...?_user, ...userData};
    StorageService.saveUser(_user!);
    notifyListeners();
  }
  
  /// Clear error
  void clearError() {
    _error = null;
    notifyListeners();
  }
}
