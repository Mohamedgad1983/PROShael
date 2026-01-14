import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/app_theme.dart';

class PaymentMethodScreen extends StatefulWidget {
  final String paymentType;
  final double amount;
  final String? beneficiaryId;
  final String? beneficiaryName;
  
  const PaymentMethodScreen({
    super.key,
    required this.paymentType,
    required this.amount,
    this.beneficiaryId,
    this.beneficiaryName,
  });

  @override
  State<PaymentMethodScreen> createState() => _PaymentMethodScreenState();
}

class _PaymentMethodScreenState extends State<PaymentMethodScreen> {
  String? _selectedMethod;

  final List<Map<String, dynamic>> _paymentMethods = [
    {
      'id': 'knet',
      'name': 'K-Net',
      'nameAr': 'كي نت',
      'description': 'الدفع عبر بطاقة الصراف',
      'icon': Icons.credit_card,
      'color': Color(0xFF00599C),
      'available': true,
    },
    {
      'id': 'visa',
      'name': 'Visa / Mastercard',
      'nameAr': 'فيزا / ماستركارد',
      'description': 'الدفع ببطاقة الائتمان',
      'icon': Icons.payment,
      'color': Color(0xFF1A1F71),
      'available': true,
    },
    {
      'id': 'apple_pay',
      'name': 'Apple Pay',
      'nameAr': 'أبل باي',
      'description': 'الدفع عبر أبل باي',
      'icon': Icons.apple,
      'color': Colors.black,
      'available': true,
    },
    {
      'id': 'bank_transfer',
      'name': 'Bank Transfer',
      'nameAr': 'تحويل بنكي',
      'description': 'تحويل إلى حساب الصندوق',
      'icon': Icons.account_balance,
      'color': Color(0xFF2E7D32),
      'available': true,
    },
  ];

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

  void _proceedToPayment() {
    if (_selectedMethod == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('يرجى اختيار طريقة الدفع'),
          backgroundColor: AppTheme.warningColor,
        ),
      );
      return;
    }

    if (_selectedMethod == 'bank_transfer') {
      context.push('/bank-transfer', extra: {
        'paymentType': widget.paymentType,
        'amount': widget.amount,
        'beneficiaryId': widget.beneficiaryId,
        'beneficiaryName': widget.beneficiaryName,
      });
    } else {
      // For card payments, go to payment details/processing
      context.push('/payment-details', extra: {
        'paymentType': widget.paymentType,
        'amount': widget.amount,
        'paymentMethod': _selectedMethod,
        'beneficiaryId': widget.beneficiaryId,
        'beneficiaryName': widget.beneficiaryName,
      });
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
                      ),
                      const Expanded(
                        child: Text(
                          'طريقة الدفع',
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
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Payment Summary Card
                          Container(
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              gradient: AppTheme.primaryGradient,
                              borderRadius: BorderRadius.circular(16),
                              boxShadow: AppTheme.elevatedShadow,
                            ),
                            child: Column(
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          _paymentTypeLabel,
                                          style: TextStyle(
                                            color: Colors.white.withOpacity(0.8),
                                            fontSize: 14,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        if (widget.beneficiaryName != null)
                                          Text(
                                            widget.beneficiaryName!,
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 16,
                                              fontWeight: FontWeight.w500,
                                            ),
                                          ),
                                      ],
                                    ),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Text(
                                          'المبلغ',
                                          style: TextStyle(
                                            color: Colors.white.withOpacity(0.8),
                                            fontSize: 14,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Row(
                                          children: [
                                            Text(
                                              widget.amount.toStringAsFixed(0),
                                              style: const TextStyle(
                                                color: Colors.white,
                                                fontSize: 28,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                            const SizedBox(width: 4),
                                            const Text(
                                              'ر.س',
                                              style: TextStyle(
                                                color: Colors.white,
                                                fontSize: 16,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          
                          const SizedBox(height: 32),
                          
                          // Payment Methods Title
                          const Text(
                            'اختر طريقة الدفع',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          
                          const SizedBox(height: 16),
                          
                          // Payment Methods List
                          ...(_paymentMethods.map((method) {
                            final isSelected = _selectedMethod == method['id'];
                            final isAvailable = method['available'] as bool;
                            
                            return GestureDetector(
                              onTap: isAvailable
                                  ? () {
                                      setState(() {
                                        _selectedMethod = method['id'];
                                      });
                                    }
                                  : null,
                              child: Container(
                                margin: const EdgeInsets.only(bottom: 12),
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: isAvailable
                                      ? (isSelected
                                          ? AppTheme.primaryColor.withOpacity(0.1)
                                          : Colors.white)
                                      : Colors.grey.shade100,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: isSelected
                                        ? AppTheme.primaryColor
                                        : Colors.grey.shade200,
                                    width: isSelected ? 2 : 1,
                                  ),
                                  boxShadow: isSelected
                                      ? [
                                          BoxShadow(
                                            color: AppTheme.primaryColor.withOpacity(0.2),
                                            blurRadius: 10,
                                            offset: const Offset(0, 4),
                                          ),
                                        ]
                                      : null,
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 50,
                                      height: 50,
                                      decoration: BoxDecoration(
                                        color: isAvailable
                                            ? (method['color'] as Color).withOpacity(0.1)
                                            : Colors.grey.shade200,
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Icon(
                                        method['icon'] as IconData,
                                        color: isAvailable
                                            ? method['color'] as Color
                                            : Colors.grey,
                                        size: 26,
                                      ),
                                    ),
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            method['nameAr'] as String,
                                            style: TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.w600,
                                              color: isAvailable
                                                  ? AppTheme.textPrimary
                                                  : Colors.grey,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            method['description'] as String,
                                            style: TextStyle(
                                              fontSize: 13,
                                              color: isAvailable
                                                  ? AppTheme.textSecondary
                                                  : Colors.grey.shade400,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    if (!isAvailable)
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 4,
                                        ),
                                        decoration: BoxDecoration(
                                          color: Colors.grey.shade200,
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: const Text(
                                          'قريباً',
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: Colors.grey,
                                          ),
                                        ),
                                      )
                                    else
                                      Container(
                                        width: 24,
                                        height: 24,
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          color: isSelected
                                              ? AppTheme.primaryColor
                                              : Colors.transparent,
                                          border: Border.all(
                                            color: isSelected
                                                ? AppTheme.primaryColor
                                                : Colors.grey.shade300,
                                            width: 2,
                                          ),
                                        ),
                                        child: isSelected
                                            ? const Icon(
                                                Icons.check,
                                                size: 16,
                                                color: Colors.white,
                                              )
                                            : null,
                                      ),
                                  ],
                                ),
                              ),
                            );
                          }).toList()),
                          
                          const SizedBox(height: 24),
                          
                          // Security Note
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: AppTheme.infoColor.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.security,
                                  color: AppTheme.infoColor,
                                  size: 24,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'دفع آمن',
                                        style: TextStyle(
                                          color: AppTheme.infoColor,
                                          fontWeight: FontWeight.w600,
                                          fontSize: 14,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'جميع عمليات الدفع مشفرة ومحمية',
                                        style: TextStyle(
                                          color: AppTheme.infoColor.withOpacity(0.8),
                                          fontSize: 12,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                
                // Bottom Button
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 10,
                        offset: const Offset(0, -5),
                      ),
                    ],
                  ),
                  child: SafeArea(
                    top: false,
                    child: SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: ElevatedButton(
                        onPressed: _selectedMethod != null ? _proceedToPayment : null,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryColor,
                          disabledBackgroundColor: Colors.grey.shade300,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            Text(
                              'متابعة',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            SizedBox(width: 8),
                            Icon(Icons.arrow_back, size: 20),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
