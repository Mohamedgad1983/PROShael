import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../config/app_theme.dart';

class NewsScreen extends StatefulWidget {
  const NewsScreen({super.key});

  @override
  State<NewsScreen> createState() => _NewsScreenState();
}

class _NewsScreenState extends State<NewsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = true;
  List<Map<String, dynamic>> _allNews = [];
  List<Map<String, dynamic>> _announcements = [];
  List<Map<String, dynamic>> _achievements = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadNews();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadNews() async {
    try {
      // TODO: Replace with actual API call
      await Future.delayed(const Duration(seconds: 1));
      
      setState(() {
        _allNews = _getMockNews();
        _announcements = _allNews.where((n) => n['category'] == 'announcement').toList();
        _achievements = _allNews.where((n) => n['category'] == 'achievement').toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  List<Map<String, dynamic>> _getMockNews() {
    return [
      {
        'id': '1',
        'title': 'اجتماع العائلة السنوي',
        'content': 'يسرنا دعوتكم لحضور اجتماع العائلة السنوي يوم الجمعة القادم في استراحة الشعيل. سيتم مناقشة خطط العام القادم وتكريم المتميزين.',
        'category': 'announcement',
        'date': '1446/06/20',
        'image': null,
        'isImportant': true,
      },
      {
        'id': '2',
        'title': 'تهنئة بمناسبة تخرج أحمد محمد الشعيل',
        'content': 'نبارك لابننا أحمد محمد الشعيل تخرجه من جامعة الملك سعود بتقدير ممتاز مع مرتبة الشرف في تخصص الهندسة الميكانيكية.',
        'category': 'achievement',
        'date': '1446/06/15',
        'image': null,
        'isImportant': false,
      },
      {
        'id': '3',
        'title': 'إطلاق مبادرة إفطار صائم',
        'content': 'تم إطلاق مبادرة إفطار صائم لهذا العام بهدف جمع مبلغ 50,000 ريال لتوزيع وجبات الإفطار على المحتاجين.',
        'category': 'announcement',
        'date': '1446/06/01',
        'image': null,
        'isImportant': true,
      },
      {
        'id': '4',
        'title': 'تهنئة بمولود جديد',
        'content': 'نبارك لأخينا خالد عبدالله الشعيل وزوجته الكريمة بمناسبة قدوم المولود الجديد "عبدالرحمن". جعله الله من مواليد السعادة.',
        'category': 'achievement',
        'date': '1446/05/25',
        'image': null,
        'isImportant': false,
      },
      {
        'id': '5',
        'title': 'تحديث بيانات الأعضاء',
        'content': 'نرجو من جميع أعضاء الصندوق تحديث بياناتهم الشخصية من خلال التطبيق لضمان التواصل الفعال.',
        'category': 'announcement',
        'date': '1446/05/10',
        'image': null,
        'isImportant': false,
      },
      {
        'id': '6',
        'title': 'إنجاز جديد - فوز في مسابقة القرآن الكريم',
        'content': 'نبارك للابن سلطان فهد الشعيل فوزه بالمركز الأول في مسابقة حفظ القرآن الكريم على مستوى المملكة.',
        'category': 'achievement',
        'date': '1446/04/20',
        'image': null,
        'isImportant': true,
      },
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: ui.TextDirection.rtl,
      child: Scaffold(
        body: NestedScrollView(
          headerSliverBuilder: (context, innerBoxIsScrolled) {
            return [
              SliverAppBar(
                expandedHeight: 120,
                pinned: true,
                floating: true,
                flexibleSpace: FlexibleSpaceBar(
                  title: const Text('الأخبار والإعلانات'),
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
                bottom: TabBar(
                  controller: _tabController,
                  labelColor: Colors.white,
                  unselectedLabelColor: Colors.white60,
                  indicatorColor: Colors.white,
                  indicatorWeight: 3,
                  tabs: const [
                    Tab(text: 'الكل'),
                    Tab(text: 'الإعلانات'),
                    Tab(text: 'الإنجازات'),
                  ],
                ),
              ),
            ];
          },
          body: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildNewsList(_allNews),
                    _buildNewsList(_announcements),
                    _buildNewsList(_achievements),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _buildNewsList(List<Map<String, dynamic>> news) {
    if (news.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.newspaper,
              size: 60,
              color: AppTheme.textMuted,
            ),
            const SizedBox(height: 16),
            Text(
              'لا توجد أخبار',
              style: TextStyle(
                color: AppTheme.textMuted,
                fontSize: 16,
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadNews,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: news.length,
        itemBuilder: (context, index) {
          final item = news[index];
          return _NewsCard(
            title: item['title'],
            content: item['content'],
            category: item['category'],
            date: item['date'],
            image: item['image'],
            isImportant: item['isImportant'] ?? false,
            onTap: () => _showNewsDetail(item),
          );
        },
      ),
    );
  }

  void _showNewsDetail(Map<String, dynamic> news) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _NewsDetailSheet(news: news),
    );
  }
}

class _NewsCard extends StatelessWidget {
  final String title;
  final String content;
  final String category;
  final String date;
  final String? image;
  final bool isImportant;
  final VoidCallback onTap;

  const _NewsCard({
    required this.title,
    required this.content,
    required this.category,
    required this.date,
    this.image,
    required this.isImportant,
    required this.onTap,
  });

  IconData get _categoryIcon {
    switch (category) {
      case 'announcement':
        return Icons.campaign;
      case 'achievement':
        return Icons.emoji_events;
      default:
        return Icons.article;
    }
  }

  Color get _categoryColor {
    switch (category) {
      case 'announcement':
        return AppTheme.infoColor;
      case 'achievement':
        return AppTheme.warningColor;
      default:
        return AppTheme.primaryColor;
    }
  }

  String get _categoryLabel {
    switch (category) {
      case 'announcement':
        return 'إعلان';
      case 'achievement':
        return 'إنجاز';
      default:
        return 'خبر';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: AppTheme.cardShadow,
        border: isImportant
            ? Border.all(color: AppTheme.warningColor.withOpacity(0.5), width: 2)
            : null,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header Row
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: _categoryColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(_categoryIcon, size: 14, color: _categoryColor),
                          const SizedBox(width: 4),
                          Text(
                            _categoryLabel,
                            style: TextStyle(
                              color: _categoryColor,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (isImportant) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: AppTheme.errorColor,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Text(
                          'مهم',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                    const Spacer(),
                    Text(
                      date,
                      style: TextStyle(
                        color: AppTheme.textMuted,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                // Title
                Text(
                  title,
                  style: TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),

                const SizedBox(height: 8),

                // Content Preview
                Text(
                  content,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: AppTheme.textSecondary,
                    fontSize: 14,
                    height: 1.5,
                  ),
                ),

                const SizedBox(height: 12),

                // Read More
                Row(
                  children: [
                    Text(
                      'قراءة المزيد',
                      style: TextStyle(
                        color: AppTheme.primaryColor,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      Icons.arrow_forward_ios,
                      size: 12,
                      color: AppTheme.primaryColor,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _NewsDetailSheet extends StatelessWidget {
  final Map<String, dynamic> news;

  const _NewsDetailSheet({required this.news});

  @override
  Widget build(BuildContext context) {
    final category = news['category'] as String;
    final isAnnouncement = category == 'announcement';

    return Directionality(
      textDirection: ui.TextDirection.rtl,
      child: DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        builder: (context, scrollController) {
          return Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: Column(
              children: [
                // Handle
                Container(
                  margin: const EdgeInsets.symmetric(vertical: 12),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),

                // Content
                Expanded(
                  child: SingleChildScrollView(
                    controller: scrollController,
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Category & Date
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: (isAnnouncement
                                        ? AppTheme.infoColor
                                        : AppTheme.warningColor)
                                    .withOpacity(0.1),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    isAnnouncement
                                        ? Icons.campaign
                                        : Icons.emoji_events,
                                    size: 16,
                                    color: isAnnouncement
                                        ? AppTheme.infoColor
                                        : AppTheme.warningColor,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    isAnnouncement ? 'إعلان' : 'إنجاز',
                                    style: TextStyle(
                                      color: isAnnouncement
                                          ? AppTheme.infoColor
                                          : AppTheme.warningColor,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const Spacer(),
                            Icon(
                              Icons.calendar_today,
                              size: 14,
                              color: AppTheme.textMuted,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              news['date'],
                              style: TextStyle(
                                color: AppTheme.textMuted,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 20),

                        // Title
                        Text(
                          news['title'],
                          style: TextStyle(
                            color: AppTheme.textPrimary,
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                          ),
                        ),

                        const SizedBox(height: 16),

                        // Content
                        Text(
                          news['content'],
                          style: TextStyle(
                            color: AppTheme.textSecondary,
                            fontSize: 16,
                            height: 1.8,
                          ),
                        ),

                        const SizedBox(height: 32),

                        // Share Button
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed: () {
                              Navigator.pop(context);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: const Text('تم نسخ الرابط'),
                                  backgroundColor: AppTheme.primaryColor,
                                  behavior: SnackBarBehavior.floating,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                ),
                              );
                            },
                            icon: const Icon(Icons.share),
                            label: const Text('مشاركة الخبر'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
