import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../../config/app_theme.dart';
import '../../providers/data_cache_provider.dart';

class EventsScreen extends StatefulWidget {
  const EventsScreen({super.key});

  @override
  State<EventsScreen> createState() => _EventsScreenState();
}

class _EventsScreenState extends State<EventsScreen> {
  bool _loading = true;
  List<Map<String, dynamic>> _events = [];
  String _filter = 'all'; // all, upcoming, past

  @override
  void initState() {
    super.initState();
    _loadEvents();
  }

  Future<void> _loadEvents({bool forceRefresh = false}) async {
    setState(() => _loading = true);

    try {
      final cacheProvider = context.read<DataCacheProvider>();
      final result = await cacheProvider.fetchEvents(forceRefresh: forceRefresh);
      
      if (result['success'] == true && result['data'] != null) {
        setState(() {
          _events = List<Map<String, dynamic>>.from(result['data'] ?? []);
        });
      }
    } catch (e) {
      // Handle error silently
    } finally {
      setState(() => _loading = false);
    }
  }

  List<Map<String, dynamic>> get _filteredEvents {
    final now = DateTime.now();
    
    switch (_filter) {
      case 'upcoming':
        return _events.where((e) {
          final dateStr = e['event_date'] ?? e['date'];
          if (dateStr == null) return true;
          try {
            final date = DateTime.parse(dateStr);
            return date.isAfter(now);
          } catch (_) {
            return true;
          }
        }).toList();
      case 'past':
        return _events.where((e) {
          final dateStr = e['event_date'] ?? e['date'];
          if (dateStr == null) return false;
          try {
            final date = DateTime.parse(dateStr);
            return date.isBefore(now);
          } catch (_) {
            return false;
          }
        }).toList();
      default:
        return _events;
    }
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return '-';
    try {
      final date = DateTime.parse(dateStr);
      return DateFormat('EEEE, d MMMM yyyy', 'ar').format(date);
    } catch (e) {
      return dateStr;
    }
  }

  @override
  Widget build(BuildContext context) {
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
                    '📅 المناسبات والفعاليات',
                    style: GoogleFonts.cairo(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'تابع جميع مناسبات وفعاليات العائلة',
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
                  _buildFilterChip('all', 'الكل'),
                  const SizedBox(width: 8),
                  _buildFilterChip('upcoming', 'القادمة'),
                  const SizedBox(width: 8),
                  _buildFilterChip('past', 'السابقة'),
                ],
              ),
            ),
          ),
          
          // Events List
          _loading
              ? const SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator()),
                )
              : _filteredEvents.isEmpty
                  ? SliverFillRemaining(child: _buildEmptyState())
                  : SliverPadding(
                      padding: const EdgeInsets.all(16),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (context, index) => _buildEventCard(_filteredEvents[index]),
                          childCount: _filteredEvents.length,
                        ),
                      ),
                    ),
        ],
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
          Icon(LucideIcons.calendar, size: 64, color: AppTheme.textMuted),
          const SizedBox(height: 16),
          Text(
            'لا توجد مناسبات',
            style: GoogleFonts.cairo(
              fontSize: 16,
              color: AppTheme.textMuted,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEventCard(Map<String, dynamic> event) {
    final isUpcoming = () {
      final dateStr = event['event_date'] ?? event['date'];
      if (dateStr == null) return true;
      try {
        final date = DateTime.parse(dateStr);
        return date.isAfter(DateTime.now());
      } catch (_) {
        return true;
      }
    }();
    
    final hasRsvp = event['user_rsvp'] != null || event['rsvp_status'] != null;
    
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
          // Event Image/Banner
          Container(
            height: 120,
            decoration: BoxDecoration(
              gradient: AppTheme.primaryGradient,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: Stack(
              children: [
                if (event['image_url'] != null)
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                    child: Image.network(
                      event['image_url'],
                      width: double.infinity,
                      height: 120,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const SizedBox(),
                    ),
                  ),
                Positioned(
                  top: 12,
                  right: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: isUpcoming ? AppTheme.successColor : AppTheme.textMuted,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      isUpcoming ? 'قادمة' : 'انتهت',
                      style: GoogleFonts.cairo(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          // Event Info
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  event['title_ar'] ?? event['title'] ?? 'مناسبة',
                  style: GoogleFonts.cairo(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                
                // Date & Time
                Row(
                  children: [
                    Icon(LucideIcons.calendar, size: 16, color: AppTheme.primaryColor),
                    const SizedBox(width: 8),
                    Text(
                      _formatDate(event['event_date'] ?? event['date']),
                      style: GoogleFonts.cairo(
                        fontSize: 13,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                  ],
                ),
                
                if (event['event_time'] != null || event['time'] != null) ...[
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(LucideIcons.clock, size: 16, color: AppTheme.primaryColor),
                      const SizedBox(width: 8),
                      Text(
                        event['event_time'] ?? event['time'],
                        style: GoogleFonts.cairo(
                          fontSize: 13,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ],
                
                if (event['location'] != null || event['event_location'] != null) ...[
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(LucideIcons.mapPin, size: 16, color: AppTheme.primaryColor),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          event['location'] ?? event['event_location'],
                          style: GoogleFonts.cairo(
                            fontSize: 13,
                            color: AppTheme.textSecondary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
                
                const SizedBox(height: 16),
                
                // RSVP Button
                if (isUpcoming)
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => _showRsvpDialog(event),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: hasRsvp ? AppTheme.successColor : AppTheme.primaryColor,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            hasRsvp ? LucideIcons.checkCircle : LucideIcons.userPlus,
                            size: 18,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            hasRsvp ? 'تم تأكيد الحضور' : 'تأكيد الحضور',
                            style: GoogleFonts.cairo(fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showRsvpDialog(Map<String, dynamic> event) {
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
              'تأكيد الحضور',
              style: GoogleFonts.cairo(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              event['title_ar'] ?? event['title'] ?? '',
              style: GoogleFonts.cairo(
                fontSize: 14,
                color: AppTheme.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            
            // RSVP Options
            _buildRsvpOption(
              icon: LucideIcons.checkCircle,
              label: 'سأحضر',
              color: AppTheme.successColor,
              onTap: () {
                Navigator.pop(context);
                _submitRsvp(event, 'attending');
              },
            ),
            const SizedBox(height: 12),
            _buildRsvpOption(
              icon: LucideIcons.helpCircle,
              label: 'ربما',
              color: AppTheme.warningColor,
              onTap: () {
                Navigator.pop(context);
                _submitRsvp(event, 'maybe');
              },
            ),
            const SizedBox(height: 12),
            _buildRsvpOption(
              icon: LucideIcons.xCircle,
              label: 'لن أحضر',
              color: AppTheme.errorColor,
              onTap: () {
                Navigator.pop(context);
                _submitRsvp(event, 'not_attending');
              },
            ),
            
            SizedBox(height: MediaQuery.of(context).padding.bottom + 16),
          ],
        ),
      ),
    );
  }

  Widget _buildRsvpOption({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(color: color.withOpacity(0.3)),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color),
            const SizedBox(width: 12),
            Text(
              label,
              style: GoogleFonts.cairo(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _submitRsvp(Map<String, dynamic> event, String status) {
    // TODO: Send RSVP to API
    
    String message;
    switch (status) {
      case 'attending':
        message = 'تم تأكيد حضورك';
        break;
      case 'maybe':
        message = 'تم تسجيل ردك';
        break;
      default:
        message = 'تم تسجيل اعتذارك';
    }
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message, style: GoogleFonts.cairo()),
        backgroundColor: AppTheme.successColor,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }
}
