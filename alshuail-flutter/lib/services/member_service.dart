import 'api_service.dart';
import 'storage_service.dart';

class MemberService {
  final ApiService _api = ApiService();
  static const String _cacheKey = 'member_data';
  
  /// Get current member data
  Future<Map<String, dynamic>> getMyData({bool forceRefresh = false}) async {
    // Check cache first
    if (!forceRefresh) {
      final cached = StorageService.getCache(_cacheKey);
      if (cached != null) {
        return {
          'success': true,
          'data': cached,
          'fromCache': true,
        };
      }
    }
    
    try {
      final response = await _api.get('/members/mobile/profile');
      final data = response.data as Map<String, dynamic>;
      
      if (data['success'] == true && data['data'] != null) {
        // Cache the data for 5 minutes
        await StorageService.saveCache(_cacheKey, data['data'], expiryMinutes: 5);
      }
      
      return data;
    } catch (e) {
      // Return cached data if available
      final cached = StorageService.getCache(_cacheKey);
      if (cached != null) {
        return {
          'success': true,
          'data': cached,
          'fromCache': true,
          'stale': true,
        };
      }
      
      return {
        'success': false,
        'message': 'فشل تحميل البيانات',
        'error': e.toString(),
      };
    }
  }
  
  /// Update member profile
  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> profileData) async {
    try {
      final response = await _api.put('/members/mobile/profile', data: profileData);
      
      // Clear cache to force refresh
      await StorageService.clearCache(_cacheKey);
      
      return response.data as Map<String, dynamic>;
    } catch (e) {
      return {
        'success': false,
        'message': 'فشل تحديث البيانات',
        'error': e.toString(),
      };
    }
  }
  
  /// Upload profile photo
  Future<Map<String, dynamic>> uploadPhoto(String filePath) async {
    try {
      final response = await _api.uploadFile(
        '/members/mobile/photo',
        filePath: filePath,
        fieldName: 'photo',
      );
      
      // Clear cache to force refresh
      await StorageService.clearCache(_cacheKey);
      
      return response.data as Map<String, dynamic>;
    } catch (e) {
      return {
        'success': false,
        'message': 'فشل رفع الصورة',
        'error': e.toString(),
      };
    }
  }
  
  /// Search members by name or membership number
  Future<Map<String, dynamic>> searchMembers(String query) async {
    try {
      final response = await _api.get('/members/search', queryParameters: {
        'q': query,
      });
      return response.data as Map<String, dynamic>;
    } catch (e) {
      return {
        'success': false,
        'message': 'فشل البحث',
        'error': e.toString(),
      };
    }
  }
  
  /// Get member by ID
  Future<Map<String, dynamic>> getMemberById(String memberId) async {
    try {
      final response = await _api.get('/members/$memberId');
      return response.data as Map<String, dynamic>;
    } catch (e) {
      return {
        'success': false,
        'message': 'فشل تحميل بيانات العضو',
        'error': e.toString(),
      };
    }
  }
}
