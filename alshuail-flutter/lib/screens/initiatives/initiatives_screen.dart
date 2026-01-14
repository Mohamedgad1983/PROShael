import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../../config/app_theme.dart';
import '../../providers/data_cache_provider.dart';

class InitiativesScreen extends StatefulWidget {
  const InitiativesScreen({super.key});

  @override
  State<InitiativesScreen> createState() => _InitiativesScreenState();
}

class _InitiativesScreenState extends State<InitiativesScreen> {
  bool _loading = true;
  List<Map<String, dynamic>> _initiatives = [];
  String _filter = 'active'; // active, completed, all

  @override
  void initState() {
    super.initState();
    _loadInitiatives();
  }

  Future<void> _loadInitiatives({bool forceRefresh = false}) async {
    setState(() => _loading = true);

    try {
      final cacheProvider = context.read<DataCacheProvider>();
      final result = await cacheProvider.fetchInitiatives(forceRefresh: forceRefresh);
      
      if (result['success'] == true && result['data'] != null) {
        setState(() {
          _initiatives = List<Map<String, dynamic>>.from(result['data'] ?? []);
        });
      }
    } catch (e) {
      // Handle error silently
    } finally {
      setState(() => _loading = false);
    }
  }

  List<Map<String, dynamic>> get _filteredInitiatives {
    switch (_filter) {
      case 'active':
        return _initiatives.where((i) {
          final status = i['status'] ?? i['collection_status'];
          return status == 'active' || status == 'جارية';
        }).toList();
      case 'completed':
        return _initiatives.where((i) {
          final status = i['status'] ?? i['collection_status'];
          return status == 'completed' || status == 'منتهية';
        }).toList();
      default:
        return _initiatives;
    }
  }

  String _formatCurrency(dynamic amount) {
    final num = (amount ?? 0).toDouble();
    return NumberFormat('#,##0', 'ar').format(num);
  }

  double _calculateProgress(Map<String, dynamic> initiative) {
    final target = (initiative['target_amount'] ?? 0).toDouble();
    final current = (initiative['current_amount'] ?? initiative['collected_amount'] ?? 0).toDouble();
    if (target <= 0) return 0;
    return (current / target).clamp(0.0, 1.0);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      body: RefreshIndicator(
        onRefresh: () => _loadInitiatives(forceRefresh: true),
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
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '❤️ المبادرات الخيرية',
                      style: GoogleFonts.cairo(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'ساهم في دعم أفراد العائلة',
                      style: GoogleFonts.cairo(
                        fontSize: 13,
                        color: Colors.white.withOpacity(0.8),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            
            // Filter Chips
            SliverToBoxAdapter(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  children: [
                    _buildFilterChip('active', 'جارية'),
                    const SizedBox(width: 8),
                    _buildFilterChip('completed', 'منتهية'),
                    const SizedBox(width: 8),
                    _buildFilterChip('all', 'الكل'),
                  ],
                ),
              ),
            ),
            
            // Initiatives List
            _loading
                ? const SliverFillRemaining(
                    child: Center(child: CircularProgressIndicator()),
                  )
                : _filteredInitiatives.isEmpty
                    ? SliverFillRemaining(child: _buildEmptyState())
                    : SliverPadding(
                        padding: const EdgeInsets.all(16),
                        sliver: SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (context, index) => _buildInitiativeCard(_filteredInitiatives[index]),
                            childCount: _filteredInitiatives.length,
                          ),
                        ),
                      ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String value, String label) {
    final isSelected = _filter == value;
    
    return GestureDetector(
      onTap: () => setState(() => _filter = value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          gradient: isSelected ? AppTheme.primaryGradient : null,
          color: isSelected ? null : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: isSelected ? null : Border.all(color: Colors.grey.shade300),
        ),
        child: Text(
          label,
          style: GoogleFonts.cairo(
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
            color: isSelected ? Colors.white : AppTheme.textSecondary,
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(LucideIcons.heart, size: 64, color: AppTheme.textMuted),
          const SizedBox(height: 16),
          Text(
            'لا توجد مبادرات',
            style: GoogleFonts.cairo(
              fontSize: 16,
              color: AppTheme.textMuted,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInitiativeCard(Map<String, dynamic> initiative) {
    final progress = _calculateProgress(initiative);
    final isActive = (initiative['status'] ?? initiative['collection_status']) == 'active' ||
                     (initiative['status'] ?? initiative['collection_status']) == 'جارية';
    final target = (initiative['target_amount'] ?? 0).toDouble();
    final current = (initiative['current_amount'] ?? initiative['collected_amount'] ?? 0).toDouble();
    
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with type badge
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: isActive
                    ? [Colors.pink.shade400, Colors.pink.shade600]
                    : [Colors.grey.shade400, Colors.grey.shade600],
              ),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    LucideIcons.heart,
                    color: Colors.white,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        initiative['title_ar'] ?? initiative['title'] ?? 'مبادرة',
                        style: GoogleFonts.cairo(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      if (initiative['beneficiary_name_ar'] != null ||
                          initiative['beneficiary_name'] != null)
                        Text(
                          'لصالح: ${initiative['beneficiary_name_ar'] ?? initiative['beneficiary_name']}',
                          style: GoogleFonts.cairo(
                            fontSize: 12,
                            color: Colors.white.withOpacity(0.9),
                          ),
                        ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    isActive ? 'جارية' : 'منتهية',
                    style: GoogleFonts.cairo(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          // Content
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Description
                if (initiative['description_ar'] != null ||
                    initiative['description'] != null) ...[
                  Text(
                    initiative['description_ar'] ?? initiative['description'],
                    style: GoogleFonts.cairo(
                      fontSize: 13,
                      color: AppTheme.textSecondary,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 16),
                ],
                
                // Progress Bar
                Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'تم جمع',
                          style: GoogleFonts.cairo(
                            fontSize: 12,
                            color: AppTheme.textMuted,
                          ),
                        ),
                        Text(
                          '${(progress * 100).toInt()}%',
                          style: GoogleFonts.cairo(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.primaryColor,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: progress,
                        backgroundColor: Colors.grey.shade200,
                        valueColor: AlwaysStoppedAnimation<Color>(
                          isActive ? Colors.pink : Colors.grey,
                        ),
                        minHeight: 8,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '${_formatCurrency(current)} ر.س',
                          style: GoogleFonts.cairo(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: isActive ? Colors.pink : Colors.grey,
                          ),
                        ),
                        Text(
                          'من ${_formatCurrency(target)} ر.س',
                          style: GoogleFonts.cairo(
                            fontSize: 12,
                            color: AppTheme.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                
                if (isActive) ...[
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () => _showContributeDialog(initiative),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.pink,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      icon: const Icon(LucideIcons.heart, size: 18),
                      label: Text(
                        'ساهم الآن',
                        style: GoogleFonts.cairo(fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showContributeDialog(Map<String, dynamic> initiative) {
    final amountController = TextEditingController();
    
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: Container(
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
                'المساهمة في المبادرة',
                style: GoogleFonts.cairo(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                initiative['title_ar'] ?? initiative['title'] ?? '',
                style: GoogleFonts.cairo(
                  fontSize: 14,
                  color: AppTheme.textSecondary,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              
              // Quick Amount Buttons
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [50, 100, 200, 500].map((amount) {
                  return GestureDetector(
                    onTap: () => amountController.text = amount.toString(),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.pink.shade200),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        '$amount ر.س',
                        style: GoogleFonts.cairo(
                          fontSize: 13,
                          color: Colors.pink,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              
              const SizedBox(height: 16),
              
              // Custom Amount Input
              TextField(
                controller: amountController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'مبلغ المساهمة',
                  suffixText: 'ر.س',
                  labelStyle: GoogleFonts.cairo(),
                ),
                style: GoogleFonts.cairo(fontSize: 16),
              ),
              
              const SizedBox(height: 24),
              
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    final amount = double.tryParse(amountController.text);
                    if (amount != null && amount > 0) {
                      Navigator.pop(context);
                      _submitContribution(initiative, amount);
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.pink,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text(
                    'تأكيد المساهمة',
                    style: GoogleFonts.cairo(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
              
              SizedBox(height: MediaQuery.of(context).padding.bottom + 16),
            ],
          ),
        ),
      ),
    );
  }

  void _submitContribution(Map<String, dynamic> initiative, double amount) {
    // TODO: Send contribution to API
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'تمت المساهمة بمبلغ ${_formatCurrency(amount)} ر.س بنجاح',
          style: GoogleFonts.cairo(),
        ),
        backgroundColor: AppTheme.successColor,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }
}
