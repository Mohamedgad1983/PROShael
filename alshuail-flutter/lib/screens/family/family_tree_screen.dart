import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_cache_provider.dart';

class FamilyTreeScreen extends StatefulWidget {
  const FamilyTreeScreen({super.key});

  @override
  State<FamilyTreeScreen> createState() => _FamilyTreeScreenState();
}

class _FamilyTreeScreenState extends State<FamilyTreeScreen> {
  bool _loading = true;
  Map<String, dynamic>? _treeData;
  List<Map<String, dynamic>> _branches = [];
  String? _selectedBranchId;
  double _scale = 1.0;

  @override
  void initState() {
    super.initState();
    _loadFamilyTree();
  }

  Future<void> _loadFamilyTree({bool forceRefresh = false}) async {
    setState(() => _loading = true);

    try {
      final cacheProvider = context.read<DataCacheProvider>();
      final result = await cacheProvider.fetchFamilyTree(forceRefresh: forceRefresh);
      
      if (result['success'] == true && result['data'] != null) {
        final data = result['data'] as Map<String, dynamic>;
        setState(() {
          _treeData = data['tree'];
          _branches = List<Map<String, dynamic>>.from(data['branches'] ?? []);
          if (_branches.isNotEmpty && _selectedBranchId == null) {
            _selectedBranchId = _branches.first['id']?.toString();
          }
        });
      }
    } catch (e) {
      debugPrint('Error loading family tree: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    
    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      body: CustomScrollView(
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
                    '🌳 شجرة العائلة',
                    style: GoogleFonts.cairo(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'عائلة شعيل العنزي',
                    style: GoogleFonts.cairo(
                      fontSize: 13,
                      color: Colors.white.withOpacity(0.8),
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          // Stats Cards
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: _buildStatCard(
                      '👥',
                      'إجمالي الأعضاء',
                      '${_treeData?['totalMembers'] ?? 347}',
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildStatCard(
                      '🏠',
                      'الفخوذ',
                      '${_branches.length > 0 ? _branches.length : 10}',
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildStatCard(
                      '✅',
                      'نشط',
                      '${_treeData?['activeMembers'] ?? 320}',
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          // Branch Selector
          if (_branches.isNotEmpty)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'اختر الفخذ',
                      style: GoogleFonts.cairo(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      height: 40,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: _branches.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 8),
                        itemBuilder: (context, index) {
                          final branch = _branches[index];
                          final isSelected = branch['id']?.toString() == _selectedBranchId;
                          
                          return GestureDetector(
                            onTap: () => setState(() {
                              _selectedBranchId = branch['id']?.toString();
                            }),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              decoration: BoxDecoration(
                                gradient: isSelected ? AppTheme.primaryGradient : null,
                                color: isSelected ? null : Colors.white,
                                borderRadius: BorderRadius.circular(20),
                                border: isSelected 
                                    ? null 
                                    : Border.all(color: Colors.grey.shade300),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                branch['branch_name_ar'] ?? branch['name'] ?? 'فخذ',
                                style: GoogleFonts.cairo(
                                  fontSize: 13,
                                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                                  color: isSelected ? Colors.white : AppTheme.textSecondary,
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
          
          const SliverToBoxAdapter(child: SizedBox(height: 16)),
          
          // Tree View or Branches List
          _loading
              ? const SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator()),
                )
              : SliverPadding(
                  padding: const EdgeInsets.all(16),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      // Interactive Tree View
                      _buildTreeView(),
                      
                      const SizedBox(height: 24),
                      
                      // Branches List
                      Text(
                        '📋 قائمة الفخوذ',
                        style: GoogleFonts.cairo(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 12),
                      
                      ..._buildBranchesList(),
                      
                      const SizedBox(height: 100),
                    ]),
                  ),
                ),
        ],
      ),
      
      // FAB for Add Children
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/add-children'),
        backgroundColor: AppTheme.primaryColor,
        icon: const Icon(LucideIcons.userPlus),
        label: Text(
          'إضافة أبناء',
          style: GoogleFonts.cairo(fontWeight: FontWeight.w600),
        ),
      ),
    );
  }

  Widget _buildStatCard(String emoji, String label, String value) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Column(
        children: [
          Text(emoji, style: const TextStyle(fontSize: 24)),
          const SizedBox(height: 8),
          Text(
            value,
            style: GoogleFonts.cairo(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: AppTheme.primaryColor,
            ),
          ),
          Text(
            label,
            style: GoogleFonts.cairo(
              fontSize: 10,
              color: AppTheme.textMuted,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildTreeView() {
    return Container(
      height: 300,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: AppTheme.cardShadow,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: InteractiveViewer(
          minScale: 0.5,
          maxScale: 3.0,
          boundaryMargin: const EdgeInsets.all(100),
          onInteractionUpdate: (details) {
            setState(() => _scale = details.scale);
          },
          child: Center(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: SingleChildScrollView(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: _buildTreeNodes(),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTreeNodes() {
    // Build a simple tree structure
    // In real app, this would be built from _treeData
    
    return Column(
      children: [
        // Root (Great Grandfather)
        _buildMemberNode(
          name: 'شعيل العنزي',
          relation: 'الجد الأكبر',
          isRoot: true,
        ),
        
        const SizedBox(height: 8),
        
        // Connector line
        Container(
          width: 2,
          height: 30,
          color: AppTheme.primaryColor.withOpacity(0.5),
        ),
        
        // Children Row
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildBranchNode('فخذ رشود', 171),
            const SizedBox(width: 16),
            _buildBranchNode('فخذ محمد', 50),
            const SizedBox(width: 16),
            _buildBranchNode('فخذ عبدالله', 45),
          ],
        ),
        
        const SizedBox(height: 16),
        
        // Zoom info
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: AppTheme.primaryColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(LucideIcons.zoomIn, size: 14, color: AppTheme.primaryColor),
              const SizedBox(width: 4),
              Text(
                'اسحب للتكبير والتنقل',
                style: GoogleFonts.cairo(
                  fontSize: 11,
                  color: AppTheme.primaryColor,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildMemberNode({
    required String name,
    required String relation,
    bool isRoot = false,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        gradient: isRoot ? AppTheme.primaryGradient : null,
        color: isRoot ? null : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: isRoot ? null : Border.all(color: AppTheme.primaryColor.withOpacity(0.3)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: isRoot ? Colors.white.withOpacity(0.2) : AppTheme.primaryColor.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              LucideIcons.user,
              size: 20,
              color: isRoot ? Colors.white : AppTheme.primaryColor,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            name,
            style: GoogleFonts.cairo(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: isRoot ? Colors.white : AppTheme.textPrimary,
            ),
          ),
          Text(
            relation,
            style: GoogleFonts.cairo(
              fontSize: 10,
              color: isRoot ? Colors.white.withOpacity(0.8) : AppTheme.textMuted,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBranchNode(String name, int count) {
    return Column(
      children: [
        Container(
          width: 2,
          height: 20,
          color: AppTheme.primaryColor.withOpacity(0.5),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: AppTheme.primaryColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AppTheme.primaryColor.withOpacity(0.2)),
          ),
          child: Column(
            children: [
              Text(
                name,
                style: GoogleFonts.cairo(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimary,
                ),
              ),
              Text(
                '$count عضو',
                style: GoogleFonts.cairo(
                  fontSize: 10,
                  color: AppTheme.primaryColor,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  List<Widget> _buildBranchesList() {
    // Use demo data if no branches loaded
    final branches = _branches.isNotEmpty ? _branches : [
      {'name': 'فخذ رشود', 'count': 171, 'head': 'راشد شعيل'},
      {'name': 'فخذ محمد', 'count': 50, 'head': 'محمد شعيل'},
      {'name': 'فخذ عبدالله', 'count': 45, 'head': 'عبدالله شعيل'},
      {'name': 'فخذ خالد', 'count': 35, 'head': 'خالد شعيل'},
      {'name': 'فخذ سعود', 'count': 46, 'head': 'سعود شعيل'},
    ];
    
    return branches.map((branch) {
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
                gradient: AppTheme.primaryGradient,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                LucideIcons.home,
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
                    branch['branch_name_ar'] ?? branch['name'] ?? 'فخذ',
                    style: GoogleFonts.cairo(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  if (branch['branch_head_name'] != null || branch['head'] != null)
                    Text(
                      'رئيس الفخذ: ${branch['branch_head_name'] ?? branch['head']}',
                      style: GoogleFonts.cairo(
                        fontSize: 12,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                '${branch['member_count'] ?? branch['count'] ?? 0} عضو',
                style: GoogleFonts.cairo(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.primaryColor,
                ),
              ),
            ),
          ],
        ),
      );
    }).toList();
  }
}
