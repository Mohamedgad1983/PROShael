import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/app_theme.dart';

class PaymentDetailsScreen extends StatefulWidget {
  final String paymentType;
  final double amount;
  final String paymentMethod;
  final String? beneficiaryId;
  final String? beneficiaryName;
  
  const PaymentDetailsScreen({
    super.key,
    required this.paymentType,
    required this.amount,
    required this.paymentMethod,
    this.beneficiaryId,
    this.beneficiaryName,
  });

  @override
  State<PaymentDetailsScreen> createState() => _PaymentDetailsScreenState();
}

class _PaymentDetailsScreenState extends State<PaymentDetailsScreen> {
  bool _isProcessing = false;
  double _progress = 0.0;
  String _statusMessage = 'جاري تجهيز عملية الدفع...';

  String get _paymentTypeLabel {
    switch (widget.paymentType) {
      case 'subscription':
        return 'اشتراك شهري';
      case 'diya':
        return 'مساهمة دية';
      case 'initiative':
        return 'مساهمة مبادرة';
      default:
        return 'دفع';
    }
  }

  String get _paymentMethodLabel {
    switch (widget.paymentMethod) {
      case 'knet':
        return 'K-Net';
      case 'visa':
        return 'Visa / Mastercard';
      case 'apple_pay':
        return 'Apple Pay';
      default:
        return widget.paymentMethod;
    }
  }

  IconData get _paymentMethodIcon {
    switch (widget.paymentMethod) {
      case 'knet':
        return Icons.credit_card;
      case 'visa':
        return Icons.payment;
      case 'apple_pay':
        return Icons.apple;
      default:
        return Icons.payment;
    }
  }

  Future<void> _processPayment() async {
    setState(() {
      _isProcessing = true;
      _progress = 0.0;
      _statusMessage = 'جاري الاتصال ببوابة الدفع...';
    });

    try {
      // Simulate payment processing steps
      await Future.delayed(const Duration(milliseconds: 800));
      setState(() {
        _progress = 0.25;
        _statusMessage = 'جاري التحقق من البيانات...';
      });

      await Future.delayed(const Duration(milliseconds: 800));
      setState(() {
        _progress = 0.5;
        _statusMessage = 'جاري معالجة الدفع...';
      });

      await Future.delayed(const Duration(milliseconds: 800));
      setState(() {
        _progress = 0.75;
        _statusMessage = 'جاري تأكيد العملية...';
      });

      await Future.delayed(const Duration(milliseconds: 800));
      setState(() {
        _progress = 1.0;
        _statusMessage = 'تمت العملية بنجاح!';
      });

      await Future.delayed(const Duration(milliseconds: 500));

      if (mounted) {
        context.go('/success', extra: {
          'type': 'payment',
          'amount': widget.amount,
          'message': 'تمت عملية الدفع بنجاح',
          'subtitle': 'شكراً لمساهمتك في صندوق العائلة',
          'transactionId': 'TXN-${DateTime.now().millisecondsSinceEpoch}',
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isProcessing = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('فشلت عملية الدفع: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: ui.TextDirection.rtl,
      child: Scaffold(
        body: Container(
          decoration: const BoxDecoration(
            gradient: AppTheme.primaryGradient,
          ),
          child: SafeArea(
            child: Column(
              children: [
                // Header
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Row(
                    children: [
                      if (!_isProcessing)
                        GestureDetector(
                          onTap: () => context.pop(),
                          child: Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(
                              Icons.arrow_forward_ios,
                              color: Colors.white,
                              size: 20,
                            ),
                          ),
                        )
                      else
                        const SizedBox(width: 40),
                      const Expanded(
                        child: Text(
                          'تأكيد الدفع',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(width: 40),
                    ],
                  ),
                ),
                
                // Content
                Expanded(
                  child: Container(
                    width: double.infinity,
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.only(
                        topLeft: Radius.circular(30),
                        topRight: Radius.circular(30),
                      ),
                    ),
                    child: _isProcessing
                        ? _buildProcessingView()
                        : _buildConfirmationView(),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildConfirmationView() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const SizedBox(height: 20),
          
          // Payment Icon
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              gradient: AppTheme.primaryGradient,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: AppTheme.primaryColor.withOpacity(0.3),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Icon(
              _paymentMethodIcon,
              size: 50,
              color: Colors.white,
            ),
          ),
          
          const SizedBox(height: 24),
          
          Text(
            'مراجعة تفاصيل الدفع',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          
          const SizedBox(height: 8),
          
          Text(
            'تأكد من صحة البيانات قبل إتمام العملية',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: AppTheme.textSecondary,
            ),
          ),
          
          const SizedBox(height: 32),
          
          // Payment Details Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppTheme.backgroundLight,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              children: [
                _buildDetailRow('نوع الدفع', _paymentTypeLabel),
                if (widget.beneficiaryName != null)
                  _buildDetailRow('المستفيد', widget.beneficiaryName!),
                _buildDetailRow('طريقة الدفع', _paymentMethodLabel),
                const Divider(height: 24),
                _buildAmountRow(),
              ],
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Breakdown (if applicable)
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey.shade200),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                _buildBreakdownRow('المبلغ الأساسي', widget.amount),
                _buildBreakdownRow('رسوم الخدمة', 0.0),
                const Divider(height: 20),
                _buildBreakdownRow(
                  'الإجمالي',
                  widget.amount,
                  isTotal: true,
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Security Badge
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.successColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppTheme.successColor.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.verified_user,
                    color: AppTheme.successColor,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'معاملة آمنة',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: AppTheme.successColor,
                        ),
                      ),
                      Text(
                        'محمية بتشفير SSL 256-bit',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppTheme.successColor.withOpacity(0.8),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 32),
          
          // Confirm Button
          SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton(
              onPressed: _processPayment,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.lock, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'تأكيد ودفع ${widget.amount.toStringAsFixed(0)} ر.س',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Cancel Button
          TextButton(
            onPressed: () => context.pop(),
            child: const Text(
              'إلغاء',
              style: TextStyle(
                color: AppTheme.textSecondary,
                fontSize: 16,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProcessingView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Animated Progress Circle
            SizedBox(
              width: 150,
              height: 150,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  SizedBox(
                    width: 150,
                    height: 150,
                    child: CircularProgressIndicator(
                      value: _progress,
                      strokeWidth: 8,
                      backgroundColor: Colors.grey.shade200,
                      valueColor: const AlwaysStoppedAnimation<Color>(
                        AppTheme.primaryColor,
                      ),
                    ),
                  ),
                  Container(
                    width: 120,
                    height: 120,
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          '${(_progress * 100).toInt()}%',
                          style: const TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.primaryColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 40),
            
            // Status Message
            Text(
              _statusMessage,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w600,
              ),
              textAlign: TextAlign.center,
            ),
            
            const SizedBox(height: 16),
            
            Text(
              'يرجى الانتظار وعدم إغلاق التطبيق',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppTheme.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            
            const SizedBox(height: 40),
            
            // Payment Info
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppTheme.backgroundLight,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    _paymentMethodIcon,
                    color: AppTheme.primaryColor,
                  ),
                  const SizedBox(width: 12),
                  Text(
                    '${widget.amount.toStringAsFixed(0)} ر.س',
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primaryColor,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
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

  Widget _buildAmountRow() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        const Text(
          'المبلغ',
          style: TextStyle(
            color: AppTheme.textSecondary,
            fontSize: 14,
          ),
        ),
        Row(
          children: [
            Text(
              widget.amount.toStringAsFixed(0),
              style: const TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: AppTheme.primaryColor,
              ),
            ),
            const SizedBox(width: 4),
            const Text(
              'ر.س',
              style: TextStyle(
                fontSize: 16,
                color: AppTheme.primaryColor,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildBreakdownRow(String label, double amount, {bool isTotal = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: isTotal ? AppTheme.textPrimary : AppTheme.textSecondary,
              fontSize: isTotal ? 16 : 14,
              fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
            ),
          ),
          Text(
            '${amount.toStringAsFixed(0)} ر.س',
            style: TextStyle(
              color: isTotal ? AppTheme.primaryColor : AppTheme.textPrimary,
              fontSize: isTotal ? 18 : 14,
              fontWeight: isTotal ? FontWeight.bold : FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
