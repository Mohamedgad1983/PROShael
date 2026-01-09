import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_cache_provider.dart';
import '../../widgets/balance_card.dart';
import '../../widgets/quick_action_button.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _refreshing = false;
  String? _error;
  
  // Data from cache/API
  double _balance = 0;
  String _lastPayment = '-';
  String _status = 'نشط';
  int _notificationCount = 0;
  List<Map<String, dynamic>> _recentActivity = [];
  Map<String, dynamic>? _recentNews;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData({bool forceRefresh = false}) async {
    if (forceRefresh) {
      setState(() => _refreshing = true);
    }
    
    final cacheProvider = context.read<DataCacheProvider>();
    final authProvider = context.read<AuthProvider>();
    
    // Use cached data if available
    if (!forceRefresh && cacheProvider.hasDashboardData) {
      _updateFromData(cacheProvider.dashboardData!);
    }
    
    // Also use auth provider user data
    if (authProvider.user != null) {
      setState(() {
        _balance = authProvider.balance;
      });
    }
    
    // Fetch fresh data
    try {
      final result = await cacheProvider.fetchDashboard(forceRefresh: forceRefresh);
      
      if (result['success'] == true && result['data'] != null) {
        _updateFromData(result['data'] as Map<String, dynamic>);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _error = 'حدث خطأ في تحميل البيانات');
      }
    } finally {
      if (mounted) {
        setState(() => _refreshing = false);
      }
    }
  }

  void _updateFromData(Map<String, dynamic> data) {
    setState(() {
      // Profile data
      if (data['profile'] != null) {
        _balance = (data['profile']['current_balance'] ?? 
                   data['profile']['balance'] ?? 0).toDouble();
        _status = data['profile']['membership_status'] == 'active' ? 'نشط' : 'غير نشط';
      }
      
      // Subscriptions/last payment
      if (data['subscriptions'] != null && (data['subscriptions'] as List).isNotEmpty) {
        final lastSub = data['subscriptions'][0];
        _lastPayment = lastSub['payment_date'] ?? 
                      lastSub['created_at']?.toString().split('T')[0] ?? '-';
        
        _recentActivity = (data['subscriptions'] as List)
            .take(3)
            .map((p) => {
              'id': p['id'],
              'title': p['description'] ?? 'دفعة اشتراك',
              'date': p['payment_date'] ?? p['created_at']?.toString().split('T')[0],
              'amount': p['amount'],
            })
            .toList();
      }
      
      // Notifications
      _notificationCount = data['notificationCount'] ?? 0;
      
      // News
      if (data['recentNews'] != null) {
        _recentNews = {
          'id': data['recentNews']['id'],
          'title': data['recentNews']['title_ar'] ?? data['recentNews']['title'],
          'body': (data['recentNews']['content_ar'] ?? '').toString().substring(
            0, 
            (data['recentNews']['content_ar'] ?? '').toString().length.clamp(0, 50)
          ),
          'date': data['recentNews']['publish_date']?.toString().split('T')[0] ?? '',
        };
      }
    });
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null || dateStr == '-') return '-';
    try {
      final date = DateTime.parse(dateStr);
      return DateFormat('yyyy/MM/dd', 'ar').format(date);
    } catch (e) {
      return dateStr;
    }
  }

  String _timeAgo(String? dateStr) {
    if (dateStr == null) return '';
    try {
      final date = DateTime.parse(dateStr);
      final now = DateTime.now();
      final diff = now.difference(date).inDays;
      
      if (diff == 0) return 'اليوم';
      if (diff == 1) return 'منذ يوم';
      if (diff < 7) return 'منذ $diff أيام';
      if (diff < 30) return 'منذ ${diff ~/ 7} أسبوع';
      return 'منذ ${diff ~/ 30} شهر';
    } catch (e) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    
    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      body: RefreshIndicator(
        onRefresh: () => _loadData(forceRefresh: true),
        child: CustomScrollView(
          slivers: [
            // Header
            SliverToBoxAdapter(
              child: Container(
                decoration: const BoxDecoration(
                  gradient: AppTheme.primaryGradient,
                  borderRadius: BorderRadius.only(
                    bottomLeft: Radius.circular(24),
                    bottomRight: Radius.circular(24),
                  ),
                ),
                padding: EdgeInsets.only(
                  top: MediaQuery.of(context).padding.top + 16,
                  left: 20,
                  right: 20,
                  bottom: 24,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'مرحباً، ${authProvider.userFirstName} 👋',
                          style: GoogleFonts.cairo(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'نتمنى لك يوماً سعيداً',
                          style: GoogleFonts.cairo(
                            fontSize: 13,
                            color: Colors.white.withOpacity(0.8),
                          ),
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        // Refresh button
                        IconButton(
                          onPressed: _refreshing ? null : () => _loadData(forceRefresh: true),
                          icon: AnimatedRotation(
                            turns: _refreshing ? 1 : 0,
                            duration: const Duration(seconds: 1),
                            child: Icon(
                              LucideIcons.refreshCw,
                              color: Colors.white.withOpacity(0.9),
                              size: 22,
                            ),
                          ),
                        ),
                        // Notifications button
                        Stack(
                          children: [
                            IconButton(
                              onPressed: () => context.push('/notifications'),
                              icon: Icon(
                                LucideIcons.bell,
                                color: Colors.white.withOpacity(0.9),
                                size: 22,
                              ),
                            ),
                            if (_notificationCount > 0)
                              Positioned(
                                right: 8,
                                top: 8,
                                child: Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: const BoxDecoration(
                                    color: Colors.red,
                                    shape: BoxShape.circle,
                                  ),
                                  constraints: const BoxConstraints(
                                    minWidth: 18,
                                    minHeight: 18,
                                  ),
                                  child: Text(
                                    _notificationCount > 9 ? '9+' : '$_notificationCount',
                                    style: GoogleFonts.cairo(
                                      fontSize: 10,
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            
            // Content
            SliverPadding(
              padding: const EdgeInsets.all(20),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  // Error message
                  if (_error != null)
                    Container(
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.red.shade200),
                      ),
                      child: Text(
                        _error!,
                        style: GoogleFonts.cairo(
                          fontSize: 13,
                          color: Colors.red.shade600,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  
                  // Balance Card
                  BalanceCard(
                    balance: _balance,
                    lastPayment: _lastPayment,
                    status: _status,
                  ),
                  
                  const SizedBox(height: 20),
                  
                  // Quick Actions - Row 1
                  Row(
                    children: [
                      Expanded(
                        child: QuickActionButton(
                          icon: LucideIcons.creditCard,
                          label: 'الاشتراكات',
                          onTap: () => context.push('/payments'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: QuickActionButton(
                          icon: LucideIcons.users,
                          label: 'شجرة العائلة',
                          onTap: () => context.push('/family-tree'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: QuickActionButton(
                          icon: LucideIcons.calendar,
                          label: 'المناسبات',
                          onTap: () => context.push('/events'),
                        ),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 12),
                  
                  // Quick Actions - Row 2
                  Row(
                    children: [
                      Expanded(
                        child: QuickActionButton(
                          icon: LucideIcons.badgeCheck,
                          label: 'بطاقة العضو',
                          onTap: () => context.push('/member-card'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: QuickActionButton(
                          icon: LucideIcons.heart,
                          label: 'المبادرات',
                          onTap: () => context.push('/initiatives'),
                        ),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Recent News Section
                  if (_recentNews != null) ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '📰 آخر الأخبار',
                          style: GoogleFonts.cairo(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                        TextButton(
                          onPressed: () => context.push('/news'),
                          child: Text(
                            'عرض الكل',
                            style: GoogleFonts.cairo(
                              fontSize: 13,
                              color: AppTheme.primaryColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    GestureDetector(
                      onTap: () => context.push('/news'),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: AppTheme.cardShadow,
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _recentNews!['title'] ?? '',
                                    style: GoogleFonts.cairo(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      color: AppTheme.textPrimary,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '${_recentNews!['body']}...',
                                    style: GoogleFonts.cairo(
                                      fontSize: 12,
                                      color: AppTheme.textSecondary,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              _formatDate(_recentNews!['date']),
                              style: GoogleFonts.cairo(
                                fontSize: 11,
                                color: AppTheme.textMuted,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                  
                  // Recent Activity Section
                  Text(
                    'آخر النشاطات',
                    style: GoogleFonts.cairo(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: AppTheme.cardShadow,
                    ),
                    child: _recentActivity.isEmpty
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Text(
                                'لا توجد نشاطات حديثة',
                                style: GoogleFonts.cairo(
                                  fontSize: 13,
                                  color: AppTheme.textMuted,
                                ),
                              ),
                            ),
                          )
                        : Column(
                            children: _recentActivity.asMap().entries.map((entry) {
                              final index = entry.key;
                              final activity = entry.value;
                              return Column(
                                children: [
                                  Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 8),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              activity['title'] ?? '',
                                              style: GoogleFonts.cairo(
                                                fontSize: 14,
                                                fontWeight: FontWeight.w500,
                                                color: AppTheme.textPrimary,
                                              ),
                                            ),
                                            Text(
                                              _timeAgo(activity['date']),
                                              style: GoogleFonts.cairo(
                                                fontSize: 11,
                                                color: AppTheme.textMuted,
                                              ),
                                            ),
                                          ],
                                        ),
                                        Text(
                                          '${activity['amount']} ر.س',
                                          style: GoogleFonts.cairo(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w600,
                                            color: AppTheme.primaryColor,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  if (index < _recentActivity.length - 1)
                                    const Divider(height: 1),
                                ],
                              );
                            }).toList(),
                          ),
                  ),
                  
                  // Bottom spacing for nav bar
                  const SizedBox(height: 100),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
