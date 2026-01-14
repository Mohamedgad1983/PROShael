import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../config/app_theme.dart';
import '../../services/storage_service.dart';

class AccountStatementScreen extends StatefulWidget {
  const AccountStatementScreen({super.key});

  @override
  State<AccountStatementScreen> createState() => _AccountStatementScreenState();
}

class _AccountStatementScreenState extends State<AccountStatementScreen> {
  final currencyFormat = NumberFormat('#,##0.00', 'ar_SA');
  bool _isLoading = true;
  String _selectedYear = '1446';
  Map<String, dynamic>? _memberData;
  List<Map<String, dynamic>> _transactions = [];
  
  final List<String> _years = ['1446', '1445', '1444', '1443'];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final user = await StorageService.getUser();
      // TODO: Replace with actual API call
      await Future.delayed(const Duration(seconds: 1));
      
      setState(() {
        _memberData = user;
        _transactions = _getMockTransactions();
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  List<Map<String, dynamic>> _getMockTransactions() {
    return [
      {
        'id': '1',
        'type': 'subscription',
        'description': 'اشتراك شهر ذي الحجة',
        'amount': 50.0,
        'date': '1446/06/15',
        'status': 'completed',
        'reference': 'SUB-2024-001',
      },
      {
        'id': '2',
        'type': 'subscription',
        'description': 'اشتراك شهر ذي القعدة',
        'amount': 50.0,
        'date': '1446/05/15',
        'status': 'completed',
        'reference': 'SUB-2024-002',
      },
      {
        'id': '3',
        'type': 'initiative',
        'description': 'مساهمة في مبادرة إفطار صائم',
        'amount': 200.0,
        'date': '1446/04/20',
        'status': 'completed',
        'reference': 'INI-2024-001',
      },
      {
        'id': '4',
        'type': 'diya',
        'description': 'مساهمة في قضية دية #3',
        'amount': 500.0,
        'date': '1446/03/10',
        'status': 'completed',
        'reference': 'DYA-2024-001',
      },
      {
        'id': '5',
        'type': 'subscription',
        'description': 'اشتراك شهر شوال',
        'amount': 50.0,
        'date': '1446/02/15',
        'status': 'completed',
        'reference': 'SUB-2024-003',
      },
      {
        'id': '6',
        'type': 'subscription',
        'description': 'اشتراك شهر رمضان',
        'amount': 50.0,
        'date': '1446/01/15',
        'status': 'completed',
        'reference': 'SUB-2024-004',
      },
    ];
  }

  double get _totalSubscriptions {
    return _transactions
        .where((t) => t['type'] == 'subscription')
        .fold(0.0, (sum, t) => sum + (t['amount'] as double));
  }

  double get _totalInitiatives {
    return _transactions
        .where((t) => t['type'] == 'initiative')
        .fold(0.0, (sum, t) => sum + (t['amount'] as double));
  }

  double get _totalDiya {
    return _transactions
        .where((t) => t['type'] == 'diya')
        .fold(0.0, (sum, t) => sum + (t['amount'] as double));
  }

  double get _totalAmount {
    return _transactions.fold(0.0, (sum, t) => sum + (t['amount'] as double));
  }

  void _downloadPDF() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: const [
            Icon(Icons.download, color: Colors.white),
            SizedBox(width: 12),
            Text('جاري تحميل كشف الحساب...'),
          ],
        ),
        backgroundColor: AppTheme.primaryColor,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: ui.TextDirection.rtl,
      child: Scaffold(
        body: CustomScrollView(
          slivers: [
            // Header
            SliverAppBar(
              expandedHeight: 120,
              pinned: true,
              flexibleSpace: FlexibleSpaceBar(
                title: const Text('كشف الحساب'),
                background: Container(
                  decoration: const BoxDecoration(
                    gradient: AppTheme.headerGradient,
                  ),
                ),
              ),
              leading: IconButton(
                icon: const Icon(Icons.arrow_back_ios),
                onPressed: () => Navigator.pop(context),
              ),
              actions: [
                IconButton(
                  icon: const Icon(Icons.picture_as_pdf),
                  onPressed: _downloadPDF,
                  tooltip: 'تحميل PDF',
                ),
              ],
            ),

            // Content
            SliverToBoxAdapter(
              child: _isLoading
                  ? const Center(
                      child: Padding(
                        padding: EdgeInsets.all(50),
                        child: CircularProgressIndicator(),
                      ),
                    )
                  : Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Year Selector
                          _buildYearSelector(),

                          const SizedBox(height: 20),

                          // Summary Cards
                          _buildSummaryCards(),

                          const SizedBox(height: 24),

                          // Member Info Card
                          _buildMemberInfoCard(),

                          const SizedBox(height: 24),

                          // Transactions List
                          _buildTransactionsList(),
                        ],
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildYearSelector() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Row(
        children: [
          Icon(Icons.calendar_month, color: AppTheme.primaryColor),
          const SizedBox(width: 12),
          const Text('السنة الهجرية:'),
          const Spacer(),
          DropdownButton<String>(
            value: _selectedYear,
            underline: const SizedBox(),
            items: _years.map((year) {
              return DropdownMenuItem(
                value: year,
                child: Text(
                  '$year هـ',
                  style: TextStyle(
                    color: AppTheme.primaryColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              );
            }).toList(),
            onChanged: (value) {
              if (value != null) {
                setState(() => _selectedYear = value);
                _loadData();
              }
            },
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCards() {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.5,
      children: [
        _SummaryCard(
          title: 'إجمالي المدفوعات',
          amount: _totalAmount,
          icon: Icons.account_balance_wallet,
          color: AppTheme.primaryColor,
        ),
        _SummaryCard(
          title: 'الاشتراكات',
          amount: _totalSubscriptions,
          icon: Icons.credit_card,
          color: AppTheme.successColor,
        ),
        _SummaryCard(
          title: 'المبادرات',
          amount: _totalInitiatives,
          icon: Icons.volunteer_activism,
          color: AppTheme.infoColor,
        ),
        _SummaryCard(
          title: 'الدية',
          amount: _totalDiya,
          icon: Icons.handshake,
          color: AppTheme.warningColor,
        ),
      ],
    );
  }

  Widget _buildMemberInfoCard() {
    final name = _memberData?['full_name_ar'] ?? 'محمد أحمد الشعيل';
    final membershipId = _memberData?['membership_id'] ?? 'SH-0001';
    final balance = _memberData?['balance'] ?? 2500.0;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: AppTheme.primaryGradient,
        borderRadius: BorderRadius.circular(16),
        boxShadow: AppTheme.elevatedShadow,
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.person, color: Colors.white, size: 28),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      'رقم العضوية: $membershipId',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.8),
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'الرصيد الحالي',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                  ),
                ),
                Text(
                  '${currencyFormat.format(balance)} ر.س',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTransactionsList() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.receipt_long, color: AppTheme.primaryColor),
            const SizedBox(width: 8),
            Text(
              'سجل المعاملات',
              style: TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const Spacer(),
            Text(
              '${_transactions.length} معاملة',
              style: TextStyle(
                color: AppTheme.textMuted,
                fontSize: 14,
              ),
            ),
          ],
        ),

        const SizedBox(height: 16),

        if (_transactions.isEmpty)
          Container(
            padding: const EdgeInsets.all(30),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: AppTheme.cardShadow,
            ),
            child: Center(
              child: Column(
                children: [
                  Icon(
                    Icons.receipt_long,
                    size: 60,
                    color: AppTheme.textMuted,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'لا توجد معاملات في هذه السنة',
                    style: TextStyle(
                      color: AppTheme.textMuted,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
            ),
          )
        else
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: AppTheme.cardShadow,
            ),
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _transactions.length,
              separatorBuilder: (_, __) => Divider(
                height: 1,
                color: AppTheme.backgroundLight,
              ),
              itemBuilder: (context, index) {
                final transaction = _transactions[index];
                return _TransactionItem(
                  type: transaction['type'],
                  description: transaction['description'],
                  amount: transaction['amount'],
                  date: transaction['date'],
                  reference: transaction['reference'],
                );
              },
            ),
          ),
      ],
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final String title;
  final double amount;
  final IconData icon;
  final Color color;

  const _SummaryCard({
    required this.title,
    required this.amount,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat('#,##0.00', 'ar_SA');
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: color, size: 18),
              ),
              const Spacer(),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  color: AppTheme.textMuted,
                  fontSize: 11,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                '${currencyFormat.format(amount)} ر.س',
                style: TextStyle(
                  color: AppTheme.textPrimary,
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TransactionItem extends StatelessWidget {
  final String type;
  final String description;
  final double amount;
  final String date;
  final String reference;

  const _TransactionItem({
    required this.type,
    required this.description,
    required this.amount,
    required this.date,
    required this.reference,
  });

  IconData get _icon {
    switch (type) {
      case 'subscription':
        return Icons.credit_card;
      case 'initiative':
        return Icons.volunteer_activism;
      case 'diya':
        return Icons.handshake;
      default:
        return Icons.payment;
    }
  }

  Color get _color {
    switch (type) {
      case 'subscription':
        return AppTheme.successColor;
      case 'initiative':
        return AppTheme.infoColor;
      case 'diya':
        return AppTheme.warningColor;
      default:
        return AppTheme.primaryColor;
    }
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat('#,##0.00', 'ar_SA');
    
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: _color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(_icon, color: _color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  description,
                  style: TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Text(
                      date,
                      style: TextStyle(
                        color: AppTheme.textMuted,
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '•',
                      style: TextStyle(color: AppTheme.textMuted),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      reference,
                      style: TextStyle(
                        color: AppTheme.textMuted,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Text(
            '${currencyFormat.format(amount)} ر.س',
            style: TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}
