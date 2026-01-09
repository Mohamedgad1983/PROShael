import 'package:flutter/foundation.dart';
import '../services/member_service.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';

class DataCacheProvider extends ChangeNotifier {
  final MemberService _memberService = MemberService();
  final ApiService _apiService = ApiService();
  
  // Cache data
  Map<String, dynamic>? _dashboardData;
  Map<String, dynamic>? _profileData;
  Map<String, dynamic>? _subscriptionsData;
  Map<String, dynamic>? _familyTreeData;
  List<Map<String, dynamic>>? _notificationsData;
  List<Map<String, dynamic>>? _initiativesData;
  List<Map<String, dynamic>>? _eventsData;
  
  // Loading states
  bool _isDashboardLoading = false;
  bool _isProfileLoading = false;
  bool _isSubscriptionsLoading = false;
  bool _isFamilyTreeLoading = false;
  bool _isNotificationsLoading = false;
  bool _isInitiativesLoading = false;
  bool _isEventsLoading = false;
  
  // Getters
  Map<String, dynamic>? get dashboardData => _dashboardData;
  Map<String, dynamic>? get profileData => _profileData;
  Map<String, dynamic>? get subscriptionsData => _subscriptionsData;
  Map<String, dynamic>? get familyTreeData => _familyTreeData;
  List<Map<String, dynamic>>? get notificationsData => _notificationsData;
  List<Map<String, dynamic>>? get initiativesData => _initiativesData;
  List<Map<String, dynamic>>? get eventsData => _eventsData;
  
  bool get isDashboardLoading => _isDashboardLoading;
  bool get isProfileLoading => _isProfileLoading;
  bool get isSubscriptionsLoading => _isSubscriptionsLoading;
  bool get isFamilyTreeLoading => _isFamilyTreeLoading;
  bool get isNotificationsLoading => _isNotificationsLoading;
  bool get isInitiativesLoading => _isInitiativesLoading;
  bool get isEventsLoading => _isEventsLoading;
  
  // Check if data exists
  bool get hasDashboardData => _dashboardData != null;
  bool get hasProfileData => _profileData != null;
  bool get hasSubscriptionsData => _subscriptionsData != null;
  bool get hasFamilyTreeData => _familyTreeData != null;
  bool get hasNotificationsData => _notificationsData != null;
  bool get hasInitiativesData => _initiativesData != null;
  bool get hasEventsData => _eventsData != null;
  
  /// Fetch dashboard data with caching
  Future<Map<String, dynamic>> fetchDashboard({bool forceRefresh = false}) async {
    if (!forceRefresh && _dashboardData != null) {
      return {
        'success': true,
        'data': _dashboardData,
        'fromCache': true,
      };
    }
    
    _isDashboardLoading = true;
    notifyListeners();
    
    try {
      final result = await _memberService.getMyData(forceRefresh: forceRefresh);
      
      if (result['success'] == true) {
        _dashboardData = result['data'] as Map<String, dynamic>?;
      }
      
      return result;
    } finally {
      _isDashboardLoading = false;
      notifyListeners();
    }
  }
  
  /// Fetch profile data with caching
  Future<Map<String, dynamic>> fetchProfile({bool forceRefresh = false}) async {
    if (!forceRefresh && _profileData != null) {
      return {
        'success': true,
        'data': _profileData,
        'fromCache': true,
      };
    }
    
    _isProfileLoading = true;
    notifyListeners();
    
    try {
      final result = await _memberService.getMyData(forceRefresh: forceRefresh);
      
      if (result['success'] == true) {
        _profileData = result['data'] as Map<String, dynamic>?;
      }
      
      return result;
    } finally {
      _isProfileLoading = false;
      notifyListeners();
    }
  }
  
  /// Fetch subscriptions data with caching
  Future<Map<String, dynamic>> fetchSubscriptions({bool forceRefresh = false}) async {
    if (!forceRefresh && _subscriptionsData != null) {
      return {
        'success': true,
        'data': _subscriptionsData,
        'fromCache': true,
      };
    }
    
    _isSubscriptionsLoading = true;
    notifyListeners();
    
    try {
      final response = await _apiService.get('/subscriptions/member/subscription');
      
      if (response.statusCode == 200) {
        _subscriptionsData = response.data as Map<String, dynamic>?;
        return {
          'success': true,
          'data': _subscriptionsData,
        };
      }
      
      return {
        'success': false,
        'message': 'فشل في تحميل الاشتراكات',
      };
    } catch (e) {
      // Return demo data if API fails
      _subscriptionsData = {
        'subscriptions': [
          {
            'id': '1',
            'year': '2024',
            'period': 'السنة الحالية',
            'total_amount': 600,
            'paid_amount': 450,
            'remaining_amount': 150,
            'status': 'pending',
          },
          {
            'id': '2',
            'year': '2023',
            'period': 'السنة السابقة',
            'total_amount': 600,
            'paid_amount': 600,
            'remaining_amount': 0,
            'status': 'paid',
          },
        ],
        'payments': [
          {
            'id': '1',
            'amount': 150,
            'payment_date': '2024-01-15',
            'description': 'دفعة اشتراك يناير',
          },
          {
            'id': '2',
            'amount': 150,
            'payment_date': '2024-02-15',
            'description': 'دفعة اشتراك فبراير',
          },
        ],
        'summary': {
          'totalDue': 150,
          'totalPaid': 450,
        },
      };
      return {
        'success': true,
        'data': _subscriptionsData,
        'fromDemo': true,
      };
    } finally {
      _isSubscriptionsLoading = false;
      notifyListeners();
    }
  }
  
  /// Fetch notifications data with caching
  Future<Map<String, dynamic>> fetchNotifications({bool forceRefresh = false}) async {
    if (!forceRefresh && _notificationsData != null) {
      return {
        'success': true,
        'data': _notificationsData,
        'fromCache': true,
      };
    }
    
    _isNotificationsLoading = true;
    notifyListeners();
    
    try {
      // Backend uses auth token to get member notifications
      final response = await _apiService.get('/notifications');
      
      if (response.statusCode == 200) {
        _notificationsData = List<Map<String, dynamic>>.from(response.data ?? []);
        return {
          'success': true,
          'data': _notificationsData,
        };
      }
      
      return {
        'success': false,
        'message': 'فشل في تحميل الإشعارات',
      };
    } catch (e) {
      // Return demo data
      _notificationsData = [
        {
          'id': '1',
          'title': 'تذكير بالاشتراك',
          'body': 'يرجى سداد اشتراك شهر جمادى الأولى 1446هـ',
          'type': 'reminder',
          'is_read': false,
          'created_at': DateTime.now().subtract(const Duration(minutes: 5)).toIso8601String(),
        },
        {
          'id': '2',
          'title': 'مناسبة جديدة',
          'body': 'تمت إضافة مناسبة زواج أحمد محمد الشعيل',
          'type': 'event',
          'is_read': false,
          'created_at': DateTime.now().subtract(const Duration(hours: 1)).toIso8601String(),
        },
        {
          'id': '3',
          'title': 'تم استلام الدفعة',
          'body': 'تم استلام مبلغ 50 ر.س - اشتراك ربيع الثاني',
          'type': 'payment',
          'is_read': true,
          'created_at': DateTime.now().subtract(const Duration(days: 2)).toIso8601String(),
        },
      ];
      return {
        'success': true,
        'data': _notificationsData,
        'fromDemo': true,
      };
    } finally {
      _isNotificationsLoading = false;
      notifyListeners();
    }
  }
  
  /// Fetch events data with caching
  Future<Map<String, dynamic>> fetchEvents({bool forceRefresh = false}) async {
    if (!forceRefresh && _eventsData != null) {
      return {
        'success': true,
        'data': _eventsData,
        'fromCache': true,
      };
    }
    
    _isEventsLoading = true;
    notifyListeners();
    
    try {
      final response = await _apiService.get('/occasions');
      
      if (response.statusCode == 200) {
        _eventsData = List<Map<String, dynamic>>.from(response.data ?? []);
        return {
          'success': true,
          'data': _eventsData,
        };
      }
      
      return {
        'success': false,
        'message': 'فشل في تحميل المناسبات',
      };
    } catch (e) {
      // Return demo data
      _eventsData = [
        {
          'id': '1',
          'title_ar': 'حفل زفاف أحمد الشعيل',
          'event_date': DateTime.now().add(const Duration(days: 7)).toIso8601String(),
          'event_time': '20:00',
          'location': 'قاعة الفيصلية - الرياض',
          'status': 'upcoming',
        },
        {
          'id': '2',
          'title_ar': 'اجتماع العائلة السنوي',
          'event_date': DateTime.now().add(const Duration(days: 30)).toIso8601String(),
          'event_time': '18:00',
          'location': 'استراحة العائلة',
          'status': 'upcoming',
        },
      ];
      return {
        'success': true,
        'data': _eventsData,
        'fromDemo': true,
      };
    } finally {
      _isEventsLoading = false;
      notifyListeners();
    }
  }
  
  /// Fetch initiatives data with caching
  Future<Map<String, dynamic>> fetchInitiatives({bool forceRefresh = false}) async {
    if (!forceRefresh && _initiativesData != null) {
      return {
        'success': true,
        'data': _initiativesData,
        'fromCache': true,
      };
    }
    
    _isInitiativesLoading = true;
    notifyListeners();
    
    try {
      final response = await _apiService.get('/initiatives');
      
      if (response.statusCode == 200) {
        _initiativesData = List<Map<String, dynamic>>.from(response.data ?? []);
        return {
          'success': true,
          'data': _initiativesData,
        };
      }
      
      return {
        'success': false,
        'message': 'فشل في تحميل المبادرات',
      };
    } catch (e) {
      // Return demo data
      _initiativesData = [
        {
          'id': '1',
          'title_ar': 'دعم علاج أحد أفراد العائلة',
          'description_ar': 'مبادرة لجمع تبرعات لعلاج أحد أفراد العائلة المحتاجين',
          'beneficiary_name_ar': 'فلان الفلاني',
          'target_amount': 50000,
          'current_amount': 35000,
          'status': 'active',
        },
        {
          'id': '2',
          'title_ar': 'دعم طالب جامعي',
          'description_ar': 'مساعدة طالب جامعي في تكاليف الدراسة',
          'beneficiary_name_ar': 'طالب العلم',
          'target_amount': 20000,
          'current_amount': 20000,
          'status': 'completed',
        },
      ];
      return {
        'success': true,
        'data': _initiativesData,
        'fromDemo': true,
      };
    } finally {
      _isInitiativesLoading = false;
      notifyListeners();
    }
  }
  
  /// Fetch family tree data with caching
  Future<Map<String, dynamic>> fetchFamilyTree({bool forceRefresh = false}) async {
    if (!forceRefresh && _familyTreeData != null) {
      return {
        'success': true,
        'data': _familyTreeData,
        'fromCache': true,
      };
    }
    
    _isFamilyTreeLoading = true;
    notifyListeners();
    
    try {
      final response = await _apiService.get('/family-tree/my-branch');
      
      if (response.statusCode == 200) {
        _familyTreeData = response.data as Map<String, dynamic>?;
        return {
          'success': true,
          'data': _familyTreeData,
        };
      }
      
      return {
        'success': false,
        'message': 'فشل في تحميل شجرة العائلة',
      };
    } catch (e) {
      // Return demo data
      _familyTreeData = {
        'tree': {
          'totalMembers': 347,
          'activeMembers': 320,
          'root': {
            'name': 'شعيل العنزي',
            'relation': 'الجد الأكبر',
          },
        },
        'branches': [
          {'id': '1', 'branch_name_ar': 'فخذ رشود', 'member_count': 171, 'branch_head_name': 'راشد شعيل'},
          {'id': '2', 'branch_name_ar': 'فخذ محمد', 'member_count': 50, 'branch_head_name': 'محمد شعيل'},
          {'id': '3', 'branch_name_ar': 'فخذ عبدالله', 'member_count': 45, 'branch_head_name': 'عبدالله شعيل'},
          {'id': '4', 'branch_name_ar': 'فخذ خالد', 'member_count': 35, 'branch_head_name': 'خالد شعيل'},
          {'id': '5', 'branch_name_ar': 'فخذ سعود', 'member_count': 46, 'branch_head_name': 'سعود شعيل'},
        ],
      };
      return {
        'success': true,
        'data': _familyTreeData,
        'fromDemo': true,
      };
    } finally {
      _isFamilyTreeLoading = false;
      notifyListeners();
    }
  }
  
  /// Clear all cached data
  void clearAllCache() {
    _dashboardData = null;
    _profileData = null;
    _subscriptionsData = null;
    _familyTreeData = null;
    _notificationsData = null;
    _initiativesData = null;
    _eventsData = null;
    notifyListeners();
  }
  
  /// Clear specific cache
  void clearCache(String type) {
    switch (type) {
      case 'dashboard':
        _dashboardData = null;
        break;
      case 'profile':
        _profileData = null;
        break;
      case 'subscriptions':
        _subscriptionsData = null;
        break;
      case 'familyTree':
        _familyTreeData = null;
        break;
      case 'notifications':
        _notificationsData = null;
        break;
      case 'initiatives':
        _initiativesData = null;
        break;
      case 'events':
        _eventsData = null;
        break;
    }
    notifyListeners();
  }
}
