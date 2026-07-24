import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import '../../utils/num_utils.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_cache_provider.dart';

class PaymentsScreen extends StatefulWidget {
  const PaymentsScreen({super.key});

  @override
  State<PaymentsScreen> createState() => _PaymentsScreenState();
}

class _PaymentsScreenState extends State<PaymentsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _loading = true;
  String? _error;
  
  // Subscriptions data
  List<Map<String, dynamic>> _subscriptions = [];
  List<Map<String, dynamic>> _paymentHistory = [];
  Map<String, dynamic>? _summary;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData({bool forceRefresh = false}) async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final cacheProvider = context.read<DataCacheProvider>();
      final result = await cacheProvider.fetchSubscriptions(forceRefresh: forceRefresh);
      
      if (result['success'] == true && result['data'] != null) {
        final data = result['data'] as Map<String, dynamic>;
        setState(() {
          _subscriptions = List<Map<String, dynamic>>.from(data['subscriptions'] ?? []);
          _paymentHistory = List<Map<String, dynamic>>.from(data['payments'] ?? []);
          _summary = data['summary'] as Map<String, dynamic>?;
        });
      }
    } catch (e) {
      setState(() => _error = 'حدث خطأ في تحميل البيانات');
    } finally {
      setState(() => _loading = false);
    }
  }

  String _formatCurrency(dynamic amount) {
    final num = asDouble(amount);
    return NumberFormat('#,##0', 'ar').format(num);
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return '-';
    try {
      final date = DateTime.parse(dateStr);
      return DateFormat('yyyy/MM/dd', 'ar').format(date);
    } catch (e) {
      return dateStr;
    }
  }

  Color _getStatusColor(String? status) {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'مدفوع':
        return AppTheme.successColor;
      case 'pending':
      case 'معلق':
        return AppTheme.warningColor;
      case 'overdue':
      case 'متأخر':
        return AppTheme.errorColor;
      default:
        return AppTheme.textMuted;
    }
  }

  String _getStatusText(String? status) {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'مدفوع';
      case 'pending':
        return 'معلق';
      case 'overdue':
        return 'متأخر';
      default:
        return status ?? '-';
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
                ),
                padding: EdgeInsets.only(
                  top: MediaQuery.of(context).padding.top + 16,
                  left: 20,
                  right: 20,
                  bottom: 20,
                ),
                child: Column(
                  children: [
                    // Title
                    Row(
                      children: [
                        Text(
                          '💳 الاشتراكات والمدفوعات',
                          style: GoogleFonts.cairo(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                    
                    const SizedBox(height: 20),
                    
                    // Summary Cards
                    Row(
                      children: [
                        Expanded(
                          child: _buildSummaryCard(
                            'الرصيد الحالي',
                            '${_formatCurrency(authProvider.balance)} ر.س',
                            Icons.account_balance_wallet,
                            authProvider.balance >= 3600
                                ? Colors.green
                                : authProvider.balance >= 500 
                                    ? Colors.orange 
                                    : Colors.red,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildSummaryCard(
                            'المستحق',
                            '${_formatCurrency(_summary?['totalDue'] ?? 0)} ر.س',
                            Icons.receipt_long,
                            Colors.orange,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            
            // Tab Bar
            SliverToBoxAdapter(
              child: Container(
                color: Colors.white,
                child: TabBar(
                  controller: _tabController,
                  labelColor: AppTheme.primaryColor,
                  unselectedLabelColor: AppTheme.textMuted,
                  indicatorColor: AppTheme.primaryColor,
                  labelStyle: GoogleFonts.cairo(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                  tabs: const [
                    Tab(text: 'الاشتراكات'),
                    Tab(text: 'سجل المدفوعات'),
                  ],
                ),
              ),
            ),
            
            // Content
            SliverFillRemaining(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? _buildErrorWidget()
                      : TabBarView(
                          controller: _tabController,
                          children: [
                            _buildSubscriptionsTab(),
                            _buildPaymentHistoryTab(),
                          ],
                        ),
            ),
          ],
        ),
      ),
      
      // FAB for payment
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showPaymentOptions(),
        backgroundColor: AppTheme.primaryColor,
        icon: const Icon(LucideIcons.plus),
        label: Text(
          'دفع الاشتراك',
          style: GoogleFonts.cairo(fontWeight: FontWeight.w600),
        ),
      ),
    );
  }

  Widget _buildSummaryCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: Colors.white.withOpacity(0.8), size: 20),
          const SizedBox(height: 8),
          Text(
            label,
            style: GoogleFonts.cairo(
              fontSize: 11,
              color: Colors.white.withOpacity(0.8),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: GoogleFonts.cairo(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorWidget() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(LucideIcons.alertCircle, size: 48, color: Colors.red.shade300),
          const SizedBox(height: 16),
          Text(
            _error!,
            style: GoogleFonts.cairo(color: AppTheme.textSecondary),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => _loadData(forceRefresh: true),
            child: const Text('إعادة المحاولة'),
          ),
        ],
      ),
    );
  }

  Widget _buildSubscriptionsTab() {
    if (_subscriptions.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(LucideIcons.creditCard, size: 64, color: AppTheme.textMuted),
            const SizedBox(height: 16),
            Text(
              'لا توجد اشتراكات',
              style: GoogleFonts.cairo(
                fontSize: 16,
                color: AppTheme.textMuted,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _subscriptions.length,
      itemBuilder: (context, index) {
        final sub = _subscriptions[index];
        return _buildSubscriptionCard(sub);
      },
    );
  }

  Widget _buildSubscriptionCard(Map<String, dynamic> sub) {
    final status = sub['status'] ?? sub['payment_status'];
    final statusColor = _getStatusColor(status);
    final statusText = _getStatusText(status);
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                sub['year']?.toString() ?? sub['period'] ?? 'اشتراك',
                style: GoogleFonts.cairo(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textPrimary,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  statusText,
                  style: GoogleFonts.cairo(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: statusColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'المبلغ المطلوب',
                    style: GoogleFonts.cairo(
                      fontSize: 11,
                      color: AppTheme.textMuted,
                    ),
                  ),
                  Text(
                    '${_formatCurrency(sub['total_amount'] ?? sub['amount'])} ر.س',
                    style: GoogleFonts.cairo(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    'المدفوع',
                    style: GoogleFonts.cairo(
                      fontSize: 11,
                      color: AppTheme.textMuted,
                    ),
                  ),
                  Text(
                    '${_formatCurrency(sub['paid_amount'] ?? 0)} ر.س',
                    style: GoogleFonts.cairo(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.successColor,
                    ),
                  ),
                ],
              ),
            ],
          ),
          if ((sub['remaining_amount'] ?? 0) > 0) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => _showPaymentOptions(subscription: sub),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppTheme.primaryColor,
                  side: const BorderSide(color: AppTheme.primaryColor),
                ),
                child: Text(
                  'دفع المتبقي: ${_formatCurrency(sub['remaining_amount'])} ر.س',
                  style: GoogleFonts.cairo(fontWeight: FontWeight.w600),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPaymentHistoryTab() {
    if (_paymentHistory.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(LucideIcons.history, size: 64, color: AppTheme.textMuted),
            const SizedBox(height: 16),
            Text(
              'لا توجد مدفوعات سابقة',
              style: GoogleFonts.cairo(
                fontSize: 16,
                color: AppTheme.textMuted,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _paymentHistory.length,
      itemBuilder: (context, index) {
        final payment = _paymentHistory[index];
        return _buildPaymentCard(payment);
      },
    );
  }

  Widget _buildPaymentCard(Map<String, dynamic> payment) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: AppTheme.successColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              LucideIcons.checkCircle,
              color: AppTheme.successColor,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  payment['description'] ?? 'دفعة اشتراك',
                  style: GoogleFonts.cairo(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                  ),
                ),
                Text(
                  _formatDate(payment['payment_date'] ?? payment['created_at']),
                  style: GoogleFonts.cairo(
                    fontSize: 12,
                    color: AppTheme.textMuted,
                  ),
                ),
              ],
            ),
          ),
          Text(
            '${_formatCurrency(payment['amount'])} ر.س',
            style: GoogleFonts.cairo(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: AppTheme.successColor,
            ),
          ),
        ],
      ),
    );
  }

  void _showPaymentOptions({Map<String, dynamic>? subscription}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'اختر طريقة الدفع',
              style: GoogleFonts.cairo(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 24),
            _buildPaymentOption(
              icon: LucideIcons.user,
              title: 'دفع لنفسي',
              subtitle: 'سداد اشتراكي الشخصي',
              onTap: () {
                Navigator.pop(context);
                // Navigate to self payment
              },
            ),
            const SizedBox(height: 12),
            _buildPaymentOption(
              icon: LucideIcons.users,
              title: 'دفع نيابة عن عضو',
              subtitle: 'سداد اشتراك عضو آخر',
              onTap: () {
                Navigator.pop(context);
                // Navigate to behalf payment
              },
            ),
            const SizedBox(height: 12),
            _buildPaymentOption(
              icon: LucideIcons.building,
              title: 'تحويل بنكي',
              subtitle: 'رفع إيصال التحويل',
              onTap: () {
                Navigator.pop(context);
                // Navigate to bank transfer
              },
            ),
            SizedBox(height: MediaQuery.of(context).padding.bottom + 16),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentOption({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey.shade200),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                gradient: AppTheme.primaryGradient,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: Colors.white),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.cairo(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: GoogleFonts.cairo(
                      fontSize: 12,
                      color: AppTheme.textMuted,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(LucideIcons.chevronLeft, color: AppTheme.textMuted),
          ],
        ),
      ),
    );
  }
}
