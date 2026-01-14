import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../services/biometric_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _notificationsEnabled = true;
  bool _subscriptionReminders = true;
  bool _eventReminders = true;
  bool _darkMode = false;
  bool _biometricEnabled = false;
  bool _biometricAvailable = false;
  bool _biometricLoading = false;
  String _biometricTypeName = 'البصمة';
  String _language = 'ar';

  @override
  void initState() {
    super.initState();
    _loadSettings();
    _checkBiometricAvailability();
  }

  Future<void> _loadSettings() async {
    final authProvider = context.read<AuthProvider>();
    setState(() {
      _notificationsEnabled = true;
      _subscriptionReminders = true;
      _eventReminders = true;
      _darkMode = false;
      _biometricEnabled = authProvider.biometricEnabled;
    });
  }

  Future<void> _checkBiometricAvailability() async {
    final canCheck = await BiometricService.canCheckBiometrics();
    final isEnabled = await BiometricService.isBiometricLoginEnabled();
    final typeName = await BiometricService.getBiometricTypeName();
    
    if (mounted) {
      setState(() {
        _biometricAvailable = canCheck;
        _biometricEnabled = isEnabled;
        _biometricTypeName = typeName;
      });
    }
  }

  Future<void> _toggleBiometric(bool value) async {
    if (_biometricLoading) return;
    
    setState(() => _biometricLoading = true);
    
    try {
      if (value) {
        // Enable biometric
        final authProvider = context.read<AuthProvider>();
        final success = await authProvider.enableBiometric();
        
        if (success && mounted) {
          setState(() => _biometricEnabled = true);
          _showSnackBar(
            'تم تفعيل $_biometricTypeName بنجاح',
            AppTheme.successColor,
            Icons.check_circle,
          );
        } else if (mounted) {
          _showSnackBar(
            'فشل تفعيل $_biometricTypeName',
            AppTheme.errorColor,
            Icons.error,
          );
        }
      } else {
        // Disable biometric
        final authProvider = context.read<AuthProvider>();
        await authProvider.disableBiometric();
        
        if (mounted) {
          setState(() => _biometricEnabled = false);
          _showSnackBar(
            'تم إلغاء تفعيل $_biometricTypeName',
            AppTheme.infoColor,
            Icons.info,
          );
        }
      }
    } catch (e) {
      if (mounted) {
        _showSnackBar(
          'حدث خطأ: $e',
          AppTheme.errorColor,
          Icons.error,
        );
      }
    } finally {
      if (mounted) {
        setState(() => _biometricLoading = false);
      }
    }
  }

  void _showSnackBar(String message, Color color, IconData icon) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(icon, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: color,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  Future<void> _logout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => Directionality(
        textDirection: ui.TextDirection.rtl,
        child: AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          title: const Row(
            children: [
              Icon(Icons.logout, color: AppTheme.errorColor),
              SizedBox(width: 12),
              Text('تسجيل الخروج'),
            ],
          ),
          content: const Text('هل أنت متأكد من رغبتك في تسجيل الخروج؟'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('إلغاء'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.errorColor,
              ),
              child: const Text('تسجيل الخروج'),
            ),
          ],
        ),
      ),
    );

    if (confirmed == true && mounted) {
      await context.read<AuthProvider>().logout();
      context.go('/login');
    }
  }

  Future<void> _openWhatsApp() async {
    final url = Uri.parse('https://wa.me/966500000000');
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _openPhone() async {
    final url = Uri.parse('tel:+966500000000');
    if (await canLaunchUrl(url)) {
      await launchUrl(url);
    }
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
                title: const Text('الإعدادات'),
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
            ),

            // Content
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Notifications Section
                    _buildSection(
                      title: 'الإشعارات',
                      icon: Icons.notifications_outlined,
                      children: [
                        _buildSwitchTile(
                          title: 'تفعيل الإشعارات',
                          subtitle: 'استلام إشعارات من التطبيق',
                          value: _notificationsEnabled,
                          onChanged: (value) {
                            setState(() => _notificationsEnabled = value);
                          },
                        ),
                        _buildSwitchTile(
                          title: 'تذكير الاشتراكات',
                          subtitle: 'تذكير قبل موعد الدفع',
                          value: _subscriptionReminders,
                          enabled: _notificationsEnabled,
                          onChanged: (value) {
                            setState(() => _subscriptionReminders = value);
                          },
                        ),
                        _buildSwitchTile(
                          title: 'تذكير المناسبات',
                          subtitle: 'تذكير بالفعاليات والمناسبات',
                          value: _eventReminders,
                          enabled: _notificationsEnabled,
                          onChanged: (value) {
                            setState(() => _eventReminders = value);
                          },
                        ),
                      ],
                    ),

                    const SizedBox(height: 16),

                    // Security Section
                    _buildSection(
                      title: 'الأمان',
                      icon: Icons.security_outlined,
                      children: [
                        // Biometric Authentication
                        if (_biometricAvailable)
                          _buildBiometricTile()
                        else
                          _buildBiometricUnavailableTile(),
                        
                        _buildActionTile(
                          title: 'تغيير رقم الجوال',
                          subtitle: 'تحديث رقم الجوال المسجل',
                          icon: Icons.phone_outlined,
                          onTap: () {
                            _showSnackBar(
                              'يرجى التواصل مع إدارة الصندوق',
                              AppTheme.infoColor,
                              Icons.info,
                            );
                          },
                        ),
                      ],
                    ),

                    const SizedBox(height: 16),

                    // Appearance Section
                    _buildSection(
                      title: 'المظهر',
                      icon: Icons.palette_outlined,
                      children: [
                        _buildSwitchTile(
                          title: 'الوضع الداكن',
                          subtitle: 'تفعيل المظهر الداكن',
                          value: _darkMode,
                          onChanged: (value) {
                            setState(() => _darkMode = value);
                            _showSnackBar(
                              'الوضع الداكن قيد التطوير',
                              AppTheme.infoColor,
                              Icons.info,
                            );
                          },
                        ),
                        _buildDropdownTile(
                          title: 'اللغة',
                          subtitle: 'تغيير لغة التطبيق',
                          icon: Icons.language,
                          value: _language,
                          items: const [
                            DropdownMenuItem(value: 'ar', child: Text('العربية')),
                            DropdownMenuItem(value: 'en', child: Text('English')),
                          ],
                          onChanged: (value) {
                            if (value != null) {
                              setState(() => _language = value);
                              _showSnackBar(
                                'تغيير اللغة قيد التطوير',
                                AppTheme.infoColor,
                                Icons.info,
                              );
                            }
                          },
                        ),
                      ],
                    ),

                    const SizedBox(height: 16),

                    // Support Section
                    _buildSection(
                      title: 'الدعم والمساعدة',
                      icon: Icons.help_outline,
                      children: [
                        _buildActionTile(
                          title: 'تواصل عبر واتساب',
                          subtitle: 'للاستفسارات والدعم',
                          icon: Icons.chat,
                          iconColor: const Color(0xFF25D366),
                          onTap: _openWhatsApp,
                        ),
                        _buildActionTile(
                          title: 'اتصل بنا',
                          subtitle: 'خط دعم الصندوق',
                          icon: Icons.phone,
                          iconColor: AppTheme.infoColor,
                          onTap: _openPhone,
                        ),
                        _buildActionTile(
                          title: 'الأسئلة الشائعة',
                          subtitle: 'إجابات للأسئلة المتكررة',
                          icon: Icons.quiz_outlined,
                          onTap: () {
                            // TODO: Open FAQ page
                          },
                        ),
                      ],
                    ),

                    const SizedBox(height: 16),

                    // About Section
                    _buildSection(
                      title: 'حول التطبيق',
                      icon: Icons.info_outline,
                      children: [
                        _buildActionTile(
                          title: 'سياسة الخصوصية',
                          icon: Icons.privacy_tip_outlined,
                          onTap: () {
                            // TODO: Open privacy policy
                          },
                        ),
                        _buildActionTile(
                          title: 'شروط الاستخدام',
                          icon: Icons.description_outlined,
                          onTap: () {
                            // TODO: Open terms
                          },
                        ),
                        _buildInfoTile(
                          title: 'إصدار التطبيق',
                          value: '1.0.0',
                        ),
                      ],
                    ),

                    const SizedBox(height: 24),

                    // Logout Button
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: _logout,
                        icon: const Icon(Icons.logout, color: AppTheme.errorColor),
                        label: const Text(
                          'تسجيل الخروج',
                          style: TextStyle(color: AppTheme.errorColor),
                        ),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppTheme.errorColor),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 32),

                    // App Info
                    Center(
                      child: Column(
                        children: [
                          Text(
                            'صندوق عائلة شعيل العنزي',
                            style: TextStyle(
                              color: AppTheme.textMuted,
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '© 2024 جميع الحقوق محفوظة',
                            style: TextStyle(
                              color: AppTheme.textMuted,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBiometricTile() {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: AppTheme.primaryColor.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(
          _biometricTypeName.contains('وجه') ? Icons.face : Icons.fingerprint,
          size: 20,
          color: AppTheme.primaryColor,
        ),
      ),
      title: Text(
        _biometricTypeName,
        style: const TextStyle(
          color: AppTheme.textPrimary,
          fontSize: 14,
        ),
      ),
      subtitle: Text(
        _biometricEnabled 
            ? 'مفعّل - استخدم $_biometricTypeName لتسجيل الدخول'
            : 'تفعيل الدخول السريع باستخدام $_biometricTypeName',
        style: const TextStyle(
          color: AppTheme.textMuted,
          fontSize: 12,
        ),
      ),
      trailing: _biometricLoading
          ? const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : Switch.adaptive(
              value: _biometricEnabled,
              onChanged: _toggleBiometric,
              activeColor: AppTheme.primaryColor,
            ),
    );
  }

  Widget _buildBiometricUnavailableTile() {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Colors.grey.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Icon(
          Icons.fingerprint,
          size: 20,
          color: Colors.grey,
        ),
      ),
      title: const Text(
        'المصادقة البيومترية',
        style: TextStyle(
          color: Colors.grey,
          fontSize: 14,
        ),
      ),
      subtitle: const Text(
        'غير متاحة على هذا الجهاز',
        style: TextStyle(
          color: Colors.grey,
          fontSize: 12,
        ),
      ),
      trailing: const Icon(
        Icons.info_outline,
        color: Colors.grey,
        size: 20,
      ),
    );
  }

  Widget _buildSection({
    required String title,
    required IconData icon,
    required List<Widget> children,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Icon(icon, color: AppTheme.primaryColor, size: 20),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: const TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          Divider(height: 1, color: AppTheme.backgroundLight),
          ...children,
        ],
      ),
    );
  }

  Widget _buildSwitchTile({
    required String title,
    String? subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
    bool enabled = true,
  }) {
    return ListTile(
      title: Text(
        title,
        style: TextStyle(
          color: enabled ? AppTheme.textPrimary : AppTheme.textMuted,
          fontSize: 14,
        ),
      ),
      subtitle: subtitle != null
          ? Text(
              subtitle,
              style: const TextStyle(
                color: AppTheme.textMuted,
                fontSize: 12,
              ),
            )
          : null,
      trailing: Switch.adaptive(
        value: value,
        onChanged: enabled ? onChanged : null,
        activeColor: AppTheme.primaryColor,
      ),
    );
  }

  Widget _buildActionTile({
    required String title,
    String? subtitle,
    required IconData icon,
    Color? iconColor,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: (iconColor ?? AppTheme.primaryColor).withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(
          icon,
          size: 20,
          color: iconColor ?? AppTheme.primaryColor,
        ),
      ),
      title: Text(
        title,
        style: const TextStyle(
          color: AppTheme.textPrimary,
          fontSize: 14,
        ),
      ),
      subtitle: subtitle != null
          ? Text(
              subtitle,
              style: const TextStyle(
                color: AppTheme.textMuted,
                fontSize: 12,
              ),
            )
          : null,
      trailing: const Icon(
        Icons.arrow_forward_ios,
        size: 16,
        color: AppTheme.textMuted,
      ),
      onTap: onTap,
    );
  }

  Widget _buildDropdownTile({
    required String title,
    String? subtitle,
    required IconData icon,
    required String value,
    required List<DropdownMenuItem<String>> items,
    required ValueChanged<String?> onChanged,
  }) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: AppTheme.primaryColor.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, size: 20, color: AppTheme.primaryColor),
      ),
      title: Text(
        title,
        style: const TextStyle(
          color: AppTheme.textPrimary,
          fontSize: 14,
        ),
      ),
      subtitle: subtitle != null
          ? Text(
              subtitle,
              style: const TextStyle(
                color: AppTheme.textMuted,
                fontSize: 12,
              ),
            )
          : null,
      trailing: DropdownButton<String>(
        value: value,
        items: items,
        onChanged: onChanged,
        underline: const SizedBox(),
        icon: const Icon(
          Icons.arrow_drop_down,
          color: AppTheme.primaryColor,
        ),
      ),
    );
  }

  Widget _buildInfoTile({
    required String title,
    required String value,
  }) {
    return ListTile(
      title: Text(
        title,
        style: const TextStyle(
          color: AppTheme.textPrimary,
          fontSize: 14,
        ),
      ),
      trailing: Text(
        value,
        style: const TextStyle(
          color: AppTheme.textMuted,
          fontSize: 14,
        ),
      ),
    );
  }
}
