import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../config/app_theme.dart';
import '../../services/api_service.dart';

class AddChildrenScreen extends StatefulWidget {
  const AddChildrenScreen({super.key});

  @override
  State<AddChildrenScreen> createState() => _AddChildrenScreenState();
}

class _AddChildrenScreenState extends State<AddChildrenScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _birthDateController = TextEditingController();
  final _nationalIdController = TextEditingController();
  final _phoneController = TextEditingController();
  
  String _selectedGender = 'male';
  DateTime? _birthDate;
  bool _isLoading = false;
  List<Map<String, dynamic>> _myChildren = [];
  bool _loadingChildren = true;

  @override
  void initState() {
    super.initState();
    _loadMyChildren();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _birthDateController.dispose();
    _nationalIdController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _loadMyChildren() async {
    try {
      // TODO: Replace with actual API call
      await Future.delayed(const Duration(seconds: 1));
      setState(() {
        _myChildren = [
          {
            'id': '1',
            'name': 'أحمد محمد الشعيل',
            'gender': 'male',
            'birth_date': '2010-05-15',
            'status': 'pending',
          },
          {
            'id': '2',
            'name': 'فاطمة محمد الشعيل',
            'gender': 'female',
            'birth_date': '2015-08-20',
            'status': 'approved',
          },
        ];
        _loadingChildren = false;
      });
    } catch (e) {
      setState(() => _loadingChildren = false);
    }
  }

  Future<void> _selectBirthDate() async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _birthDate ?? DateTime.now().subtract(const Duration(days: 365 * 10)),
      firstDate: DateTime(1950),
      lastDate: DateTime.now(),
      locale: const Locale('ar', 'SA'),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppTheme.primaryColor,
              onPrimary: Colors.white,
              surface: Colors.white,
              onSurface: AppTheme.textPrimary,
            ),
          ),
          child: child!,
        );
      },
    );
    
    if (picked != null) {
      setState(() {
        _birthDate = picked;
        _birthDateController.text = DateFormat('yyyy/MM/dd').format(picked);
      });
    }
  }

  Future<void> _submitForm() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      // TODO: Replace with actual API call
      await Future.delayed(const Duration(seconds: 2));

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: const [
                Icon(Icons.check_circle, color: Colors.white),
                SizedBox(width: 12),
                Expanded(
                  child: Text('تم إرسال طلب إضافة الابن/الابنة بنجاح\nسيتم مراجعته من قبل الإدارة'),
                ),
              ],
            ),
            backgroundColor: AppTheme.successColor,
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 4),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );

        // Clear form
        _nameController.clear();
        _birthDateController.clear();
        _nationalIdController.clear();
        _phoneController.clear();
        setState(() {
          _selectedGender = 'male';
          _birthDate = null;
        });

        // Reload children list
        _loadMyChildren();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('حدث خطأ: ${e.toString()}'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
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
                title: const Text('إضافة أبناء'),
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
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Info Card
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppTheme.infoColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: AppTheme.infoColor.withOpacity(0.3),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.info_outline,
                            color: AppTheme.infoColor,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'يمكنك إضافة أبنائك فقط. سيتم مراجعة الطلب من قبل إدارة الصندوق قبل الموافقة.',
                              style: TextStyle(
                                color: AppTheme.infoColor,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Add Child Form
                    _buildAddChildForm(),

                    const SizedBox(height: 32),

                    // My Children List
                    _buildMyChildrenSection(),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAddChildForm() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.person_add, color: AppTheme.primaryColor),
                const SizedBox(width: 8),
                Text(
                  'إضافة ابن/ابنة جديد',
                  style: TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Full Name
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'الاسم الكامل *',
                hintText: 'أدخل الاسم الرباعي',
                prefixIcon: Icon(Icons.person_outline),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'الاسم الكامل مطلوب';
                }
                final parts = value.trim().split(' ');
                if (parts.length < 3) {
                  return 'يجب إدخال الاسم الثلاثي على الأقل';
                }
                return null;
              },
            ),

            const SizedBox(height: 16),

            // Gender Selection
            Text(
              'الجنس *',
              style: TextStyle(
                color: AppTheme.textSecondary,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: _GenderOption(
                    label: 'ذكر',
                    icon: Icons.male,
                    isSelected: _selectedGender == 'male',
                    onTap: () => setState(() => _selectedGender = 'male'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _GenderOption(
                    label: 'أنثى',
                    icon: Icons.female,
                    isSelected: _selectedGender == 'female',
                    onTap: () => setState(() => _selectedGender = 'female'),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Birth Date
            TextFormField(
              controller: _birthDateController,
              readOnly: true,
              onTap: _selectBirthDate,
              decoration: const InputDecoration(
                labelText: 'تاريخ الميلاد *',
                hintText: 'اختر تاريخ الميلاد',
                prefixIcon: Icon(Icons.calendar_today),
                suffixIcon: Icon(Icons.arrow_drop_down),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'تاريخ الميلاد مطلوب';
                }
                return null;
              },
            ),

            const SizedBox(height: 16),

            // National ID (Optional)
            TextFormField(
              controller: _nationalIdController,
              keyboardType: TextInputType.number,
              maxLength: 10,
              decoration: const InputDecoration(
                labelText: 'رقم الهوية (اختياري)',
                hintText: 'أدخل رقم الهوية الوطنية',
                prefixIcon: Icon(Icons.badge_outlined),
                counterText: '',
              ),
              validator: (value) {
                if (value != null && value.isNotEmpty && value.length != 10) {
                  return 'رقم الهوية يجب أن يكون 10 أرقام';
                }
                return null;
              },
            ),

            const SizedBox(height: 16),

            // Phone (Optional for older children)
            TextFormField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'رقم الجوال (اختياري)',
                hintText: '05xxxxxxxx',
                prefixIcon: Icon(Icons.phone_outlined),
              ),
              validator: (value) {
                if (value != null && value.isNotEmpty) {
                  if (!RegExp(r'^05\d{8}$').hasMatch(value)) {
                    return 'رقم الجوال غير صحيح';
                  }
                }
                return null;
              },
            ),

            const SizedBox(height: 24),

            // Submit Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _submitForm,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.send),
                          SizedBox(width: 8),
                          Text('إرسال الطلب'),
                        ],
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMyChildrenSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.family_restroom, color: AppTheme.primaryColor),
            const SizedBox(width: 8),
            Text(
              'أبنائي المسجلين',
              style: TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),

        const SizedBox(height: 16),

        if (_loadingChildren)
          const Center(
            child: Padding(
              padding: EdgeInsets.all(30),
              child: CircularProgressIndicator(),
            ),
          )
        else if (_myChildren.isEmpty)
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
                    Icons.child_care,
                    size: 60,
                    color: AppTheme.textMuted,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'لم تقم بإضافة أي أبناء بعد',
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
          ...List.generate(_myChildren.length, (index) {
            final child = _myChildren[index];
            return _ChildCard(
              name: child['name'],
              gender: child['gender'],
              birthDate: child['birth_date'],
              status: child['status'],
            );
          }),
      ],
    );
  }
}

class _GenderOption extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _GenderOption({
    required this.label,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: isSelected
              ? AppTheme.primaryColor.withOpacity(0.1)
              : AppTheme.backgroundLight,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected
                ? AppTheme.primaryColor
                : Colors.transparent,
            width: 2,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              color: isSelected ? AppTheme.primaryColor : AppTheme.textMuted,
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? AppTheme.primaryColor : AppTheme.textSecondary,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ChildCard extends StatelessWidget {
  final String name;
  final String gender;
  final String birthDate;
  final String status;

  const _ChildCard({
    required this.name,
    required this.gender,
    required this.birthDate,
    required this.status,
  });

  @override
  Widget build(BuildContext context) {
    final bool isPending = status == 'pending';
    final statusColor = isPending ? AppTheme.warningColor : AppTheme.successColor;
    final statusText = isPending ? 'قيد المراجعة' : 'مقبول';
    final statusIcon = isPending ? Icons.hourglass_empty : Icons.check_circle;

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
          // Avatar
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              gradient: AppTheme.primaryGradient,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              gender == 'male' ? Icons.boy : Icons.girl,
              color: Colors.white,
              size: 28,
            ),
          ),

          const SizedBox(width: 12),

          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'تاريخ الميلاد: $birthDate',
                  style: TextStyle(
                    color: AppTheme.textMuted,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),

          // Status Badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(statusIcon, size: 14, color: statusColor),
                const SizedBox(width: 4),
                Text(
                  statusText,
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
