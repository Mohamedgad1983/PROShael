import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';
import '../../config/app_theme.dart';

class SuccessScreen extends StatefulWidget {
  final String type;
  final double amount;
  final String message;
  final String? subtitle;
  final String? transactionId;
  
  const SuccessScreen({
    super.key,
    required this.type,
    required this.amount,
    required this.message,
    this.subtitle,
    this.transactionId,
  });

  @override
  State<SuccessScreen> createState() => _SuccessScreenState();
}

class _SuccessScreenState extends State<SuccessScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;
  late Animation<double> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );

    _scaleAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.0, 0.5, curve: Curves.elasticOut),
      ),
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.3, 0.8, curve: Curves.easeIn),
      ),
    );

    _slideAnimation = Tween<double>(begin: 50.0, end: 0.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.3, 0.8, curve: Curves.easeOut),
      ),
    );

    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  String get _typeLabel {
    switch (widget.type) {
      case 'payment':
        return 'عملية دفع';
      case 'bank_transfer':
        return 'طلب تحويل بنكي';
      case 'profile':
        return 'تحديث الملف';
      case 'registration':
        return 'تسجيل جديد';
      default:
        return 'عملية';
    }
  }

  IconData get _typeIcon {
    switch (widget.type) {
      case 'payment':
        return Icons.payment;
      case 'bank_transfer':
        return Icons.account_balance;
      case 'profile':
        return Icons.person;
      case 'registration':
        return Icons.how_to_reg;
      default:
        return Icons.check_circle;
    }
  }

  Color get _iconBackgroundColor {
    switch (widget.type) {
      case 'bank_transfer':
        return AppTheme.warningColor;
      default:
        return AppTheme.successColor;
    }
  }

  void _copyTransactionId() {
    if (widget.transactionId != null) {
      Clipboard.setData(ClipboardData(text: widget.transactionId!));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('تم نسخ رقم المرجع'),
          backgroundColor: AppTheme.successColor,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
      );
    }
  }

  void _shareReceipt() {
    final text = '''
إيصال ${_typeLabel}
━━━━━━━━━━━━━
المبلغ: ${widget.amount.toStringAsFixed(0)} ر.س
${widget.transactionId != null ? 'رقم المرجع: ${widget.transactionId}' : ''}
التاريخ: ${DateTime.now().toString().substring(0, 16)}
━━━━━━━━━━━━━
صندوق عائلة الشعيل العنزي
''';
    
    Share.share(text, subject: 'إيصال ${_typeLabel}');
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: ui.TextDirection.rtl,
      child: Scaffold(
        body: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                _iconBackgroundColor.withOpacity(0.1),
                Colors.white,
              ],
            ),
          ),
          child: SafeArea(
            child: AnimatedBuilder(
              animation: _animationController,
              builder: (context, child) {
                return SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      const SizedBox(height: 40),
                      
                      // Success Icon
                      Transform.scale(
                        scale: _scaleAnimation.value,
                        child: Container(
                          width: 120,
                          height: 120,
                          decoration: BoxDecoration(
                            color: _iconBackgroundColor,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: _iconBackgroundColor.withOpacity(0.4),
                                blurRadius: 30,
                                offset: const Offset(0, 10),
                              ),
                            ],
                          ),
                          child: Icon(
                            widget.type == 'bank_transfer'
                                ? Icons.hourglass_top
                                : Icons.check,
                            size: 60,
                            color: Colors.white,
                          ),
                        ),
                      ),
                      
                      const SizedBox(height: 32),
                      
                      // Success Message
                      Opacity(
                        opacity: _fadeAnimation.value,
                        child: Transform.translate(
                          offset: Offset(0, _slideAnimation.value),
                          child: Column(
                            children: [
                              Text(
                                widget.type == 'bank_transfer'
                                    ? 'تم الإرسال!'
                                    : 'تم بنجاح!',
                                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: _iconBackgroundColor,
                                ),
                              ),
                              
                              const SizedBox(height: 12),
                              
                              Text(
                                widget.message,
                                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  color: AppTheme.textPrimary,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              
                              if (widget.subtitle != null) ...[
                                const SizedBox(height: 8),
                                Text(
                                  widget.subtitle!,
                                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: AppTheme.textSecondary,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                      
                      const SizedBox(height: 40),
                      
                      // Receipt Card
                      Opacity(
                        opacity: _fadeAnimation.value,
                        child: Container(
                          padding: const EdgeInsets.all(24),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(20),
                            boxShadow: AppTheme.cardShadow,
                          ),
                          child: Column(
                            children: [
                              // Amount
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    widget.amount.toStringAsFixed(0),
                                    style: const TextStyle(
                                      fontSize: 48,
                                      fontWeight: FontWeight.bold,
                                      color: AppTheme.primaryColor,
                                    ),
                                  ),
                                  const Padding(
                                    padding: EdgeInsets.only(top: 8),
                                    child: Text(
                                      ' ر.س',
                                      style: TextStyle(
                                        fontSize: 20,
                                        color: AppTheme.primaryColor,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              
                              const SizedBox(height: 8),
                              
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 8,
                                ),
                                decoration: BoxDecoration(
                                  color: _iconBackgroundColor.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  _typeLabel,
                                  style: TextStyle(
                                    color: _iconBackgroundColor,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                              
                              const SizedBox(height: 24),
                              
                              const Divider(),
                              
                              const SizedBox(height: 16),
                              
                              // Transaction Details
                              _buildDetailRow(
                                'التاريخ',
                                _formatDate(DateTime.now()),
                              ),
                              _buildDetailRow(
                                'الوقت',
                                _formatTime(DateTime.now()),
                              ),
                              if (widget.transactionId != null)
                                _buildDetailRow(
                                  'رقم المرجع',
                                  widget.transactionId!,
                                  canCopy: true,
                                ),
                              _buildDetailRow(
                                'الحالة',
                                widget.type == 'bank_transfer'
                                    ? 'قيد المراجعة'
                                    : 'مكتمل',
                                isStatus: true,
                                statusColor: widget.type == 'bank_transfer'
                                    ? AppTheme.warningColor
                                    : AppTheme.successColor,
                              ),
                            ],
                          ),
                        ),
                      ),
                      
                      const SizedBox(height: 24),
                      
                      // Action Buttons
                      Opacity(
                        opacity: _fadeAnimation.value,
                        child: Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: _shareReceipt,
                                icon: const Icon(Icons.share),
                                label: const Text('مشاركة'),
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(vertical: 16),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  side: const BorderSide(
                                    color: AppTheme.primaryColor,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: () {
                                  // TODO: Download PDF receipt
                                },
                                icon: const Icon(Icons.download),
                                label: const Text('تحميل'),
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(vertical: 16),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  side: const BorderSide(
                                    color: AppTheme.primaryColor,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      
                      const SizedBox(height: 32),
                      
                      // Return to Home Button
                      Opacity(
                        opacity: _fadeAnimation.value,
                        child: SizedBox(
                          width: double.infinity,
                          height: 56,
                          child: ElevatedButton(
                            onPressed: () => context.go('/dashboard'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primaryColor,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                            ),
                            child: const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.home, size: 22),
                                SizedBox(width: 8),
                                Text(
                                  'العودة للرئيسية',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      
                      const SizedBox(height: 16),
                      
                      // Additional Action
                      Opacity(
                        opacity: _fadeAnimation.value,
                        child: TextButton(
                          onPressed: () => context.push('/payments'),
                          child: const Text(
                            'إجراء عملية دفع جديدة',
                            style: TextStyle(
                              color: AppTheme.primaryColor,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(
    String label,
    String value, {
    bool canCopy = false,
    bool isStatus = false,
    Color? statusColor,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: AppTheme.textSecondary,
              fontSize: 14,
            ),
          ),
          if (isStatus)
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 4,
              ),
              decoration: BoxDecoration(
                color: statusColor?.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: statusColor,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    value,
                    style: TextStyle(
                      color: statusColor,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            )
          else if (canCopy)
            GestureDetector(
              onTap: _copyTransactionId,
              child: Row(
                children: [
                  Text(
                    value,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                    textDirection: ui.TextDirection.ltr,
                  ),
                  const SizedBox(width: 8),
                  const Icon(
                    Icons.copy,
                    size: 16,
                    color: AppTheme.primaryColor,
                  ),
                ],
              ),
            )
          else
            Text(
              value,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 14,
              ),
            ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    final months = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    return '${date.day} ${months[date.month - 1]} ${date.year}';
  }

  String _formatTime(DateTime time) {
    final hour = time.hour > 12 ? time.hour - 12 : time.hour;
    final period = time.hour >= 12 ? 'م' : 'ص';
    final minute = time.minute.toString().padLeft(2, '0');
    return '$hour:$minute $period';
  }
}
