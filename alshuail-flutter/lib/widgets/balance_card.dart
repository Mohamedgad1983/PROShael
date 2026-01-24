import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../config/app_theme.dart';

class BalanceCard extends StatelessWidget {
  final double balance;
  final String lastPayment;
  final String status;

  const BalanceCard({
    super.key,
    required this.balance,
    required this.lastPayment,
    required this.status,
  });

  String _formatDate(String? dateStr) {
    if (dateStr == null || dateStr == '-') return '-';
    try {
      final date = DateTime.parse(dateStr);
      return DateFormat('yyyy/MM/dd', 'ar').format(date);
    } catch (e) {
      return dateStr;
    }
  }

  Color _getBalanceColor() {
    if (balance >= 3600) return AppTheme.successColor;
    if (balance >= 500) return AppTheme.warningColor;
    return AppTheme.errorColor;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'رصيدك الحالي',
            style: GoogleFonts.cairo(
              fontSize: 13,
              color: AppTheme.textSecondary,
            ),
          ),
          const SizedBox(height: 4),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                'ر.س',
                style: GoogleFonts.cairo(
                  fontSize: 16,
                  color: AppTheme.primaryColor,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(width: 4),
              Text(
                NumberFormat('#,##0.00', 'ar').format(balance),
                style: GoogleFonts.cairo(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            height: 1,
            color: AppTheme.backgroundLight,
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Text(
                    'آخر دفعة',
                    style: GoogleFonts.cairo(
                      fontSize: 11,
                      color: AppTheme.textMuted,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _formatDate(lastPayment),
                    style: GoogleFonts.cairo(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Text(
                    'الحالة',
                    style: GoogleFonts.cairo(
                      fontSize: 11,
                      color: AppTheme.textMuted,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(
                        status,
                        style: GoogleFonts.cairo(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: status == 'نشط' 
                              ? AppTheme.successColor 
                              : AppTheme.errorColor,
                        ),
                      ),
                      if (status == 'نشط') ...[
                        const SizedBox(width: 4),
                        Icon(
                          Icons.check_circle,
                          size: 14,
                          color: AppTheme.successColor,
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}
