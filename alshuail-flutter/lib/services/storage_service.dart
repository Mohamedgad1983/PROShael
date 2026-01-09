import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';

class StorageService {
  static late SharedPreferences _prefs;
  static const FlutterSecureStorage _secureStorage = FlutterSecureStorage();
  
  // Storage Keys
  static const String _tokenKey = 'alshuail_token';
  static const String _userKey = 'alshuail_user';
  static const String _cachePrefix = 'cache_';
  static const String _biometricEnabledKey = 'biometric_enabled';
  static const String _biometricUserIdKey = 'biometric_user_id';
  static const String _lastLoginPhoneKey = 'last_login_phone';
  static const String _faceIdTokenKey = 'face_id_token';
  
  /// Initialize storage service
  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }
  
  // ==================== Token Management ====================
  
  /// Save auth token securely
  static Future<void> saveToken(String token) async {
    await _secureStorage.write(key: _tokenKey, value: token);
  }
  
  /// Get auth token
  static Future<String?> getToken() async {
    return await _secureStorage.read(key: _tokenKey);
  }
  
  /// Delete auth token
  static Future<void> deleteToken() async {
    await _secureStorage.delete(key: _tokenKey);
  }
  
  /// Check if token exists
  static Future<bool> hasToken() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }
  
  // ==================== User Data Management ====================
  
  /// Save user data
  static Future<void> saveUser(Map<String, dynamic> user) async {
    await _prefs.setString(_userKey, jsonEncode(user));
  }
  
  /// Get user data
  static Map<String, dynamic>? getUser() {
    final userStr = _prefs.getString(_userKey);
    if (userStr != null) {
      return jsonDecode(userStr) as Map<String, dynamic>;
    }
    return null;
  }
  
  /// Delete user data
  static Future<void> deleteUser() async {
    await _prefs.remove(_userKey);
  }
  
  /// Get member ID from stored user
  static Future<String?> getMemberId() async {
    final user = getUser();
    return user?['id']?.toString() ?? user?['member_id']?.toString();
  }
  
  // ==================== Biometric Storage ====================
  
  /// Set biometric enabled status
  static Future<void> setBiometricEnabled(bool enabled) async {
    await _prefs.setBool(_biometricEnabledKey, enabled);
    
    // If disabling, clear the stored user ID
    if (!enabled) {
      await _secureStorage.delete(key: _biometricUserIdKey);
    }
  }
  
  /// Get biometric enabled status
  static Future<bool> getBiometricEnabled() async {
    return _prefs.getBool(_biometricEnabledKey) ?? false;
  }
  
  /// Save user ID for biometric login (stored securely)
  static Future<void> saveBiometricUserId(String userId) async {
    await _secureStorage.write(key: _biometricUserIdKey, value: userId);
  }
  
  /// Get user ID for biometric login
  static Future<String?> getBiometricUserId() async {
    return await _secureStorage.read(key: _biometricUserIdKey);
  }
  
  /// Save last login phone number
  static Future<void> saveLastLoginPhone(String phone) async {
    await _prefs.setString(_lastLoginPhoneKey, phone);
  }
  
  /// Get last login phone number
  static String? getLastLoginPhone() {
    return _prefs.getString(_lastLoginPhoneKey);
  }
  
  /// Clear biometric data
  static Future<void> clearBiometricData() async {
    await _prefs.remove(_biometricEnabledKey);
    await _secureStorage.delete(key: _biometricUserIdKey);
    await _secureStorage.delete(key: _faceIdTokenKey);
  }

  // ==================== Face ID Token Management ====================

  /// Save Face ID token securely
  static Future<void> setFaceIdToken(String token) async {
    await _secureStorage.write(key: _faceIdTokenKey, value: token);
  }

  /// Get Face ID token
  static Future<String?> getFaceIdToken() async {
    return await _secureStorage.read(key: _faceIdTokenKey);
  }

  /// Clear Face ID token
  static Future<void> clearFaceIdToken() async {
    await _secureStorage.delete(key: _faceIdTokenKey);
  }

  /// Check if biometric is enabled (alias for getBiometricEnabled)
  static Future<bool> isBiometricEnabled() async {
    return await getBiometricEnabled();
  }

  /// Set last login phone (alias for saveLastLoginPhone)
  static Future<void> setLastLoginPhone(String phone) async {
    await saveLastLoginPhone(phone);
  }
  
  // ==================== Cache Management ====================
  
  /// Save cached data with expiry
  static Future<void> saveCache(String key, dynamic data, {int expiryMinutes = 5}) async {
    final cacheData = {
      'data': data,
      'expiry': DateTime.now().add(Duration(minutes: expiryMinutes)).millisecondsSinceEpoch,
    };
    await _prefs.setString('$_cachePrefix$key', jsonEncode(cacheData));
  }
  
  /// Get cached data (returns null if expired)
  static dynamic getCache(String key) {
    final cacheStr = _prefs.getString('$_cachePrefix$key');
    if (cacheStr != null) {
      final cacheData = jsonDecode(cacheStr) as Map<String, dynamic>;
      final expiry = cacheData['expiry'] as int;
      if (DateTime.now().millisecondsSinceEpoch < expiry) {
        return cacheData['data'];
      } else {
        // Cache expired, remove it
        _prefs.remove('$_cachePrefix$key');
      }
    }
    return null;
  }
  
  /// Check if cache exists and is valid
  static bool hasValidCache(String key) {
    return getCache(key) != null;
  }
  
  /// Clear specific cache
  static Future<void> clearCache(String key) async {
    await _prefs.remove('$_cachePrefix$key');
  }
  
  /// Clear all cache
  static Future<void> clearAllCache() async {
    final keys = _prefs.getKeys();
    for (final key in keys) {
      if (key.startsWith(_cachePrefix)) {
        await _prefs.remove(key);
      }
    }
  }
  
  // ==================== General Storage ====================
  
  /// Save string
  static Future<void> setString(String key, String value) async {
    await _prefs.setString(key, value);
  }
  
  /// Get string
  static String? getString(String key) {
    return _prefs.getString(key);
  }
  
  /// Save bool
  static Future<void> setBool(String key, bool value) async {
    await _prefs.setBool(key, value);
  }
  
  /// Get bool
  static bool? getBool(String key) {
    return _prefs.getBool(key);
  }
  
  /// Remove value
  static Future<void> remove(String key) async {
    await _prefs.remove(key);
  }
  
  /// Clear all storage (logout)
  static Future<void> clearAll() async {
    await deleteToken();
    await deleteUser();
    await clearAllCache();
    // Note: We don't clear biometric data on logout
    // so user can use biometric login next time
  }
  
  /// Clear all storage including biometrics (full reset)
  static Future<void> clearEverything() async {
    await clearAll();
    await clearBiometricData();
    await _prefs.remove(_lastLoginPhoneKey);
  }
}
