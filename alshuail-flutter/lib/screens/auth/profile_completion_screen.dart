import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';

class ProfileCompletionScreen extends StatefulWidget {
  const ProfileCompletionScreen({super.key});

  @override
  State<ProfileCompletionScreen> createState() => _ProfileCompletionScreenState();
}

class _ProfileCompletionScreenState extends State<ProfileCompletionScreen> {
  final _formKey = GlobalKey<FormState>();
  final PageController _pageController = PageController();
  
  int _currentStep = 0;
  bool _isLoading = false;
  
  // Form Controllers
  final _fullNameArController = TextEditingController();
  final _fullNameEnController = TextEditingController();
  final _emailController = TextEditingController();
  final _nationalIdController = TextEditingController();
  final _birthDateController = TextEditingController();
  final _occupationController = TextEditingController();
  final _addressController = TextEditingController();
  
  DateTime? _selectedBirthDate;
  String? _selectedGender;
  String? _selectedMaritalStatus;
  
  final List<Map<String, dynamic>> _steps = [
    {
      'title': 'المعلومات الأساسية',
      'subtitle': 'اسمك الكامل بالعربية والإنجليزية',
      'icon': Icons.person,
    },
    {
      'title': 'البيانات الشخصية',
      'subtitle': 'معلومات إضافية عنك',
      'icon': Icons.badge,
    },
    {
      'title': 'معلومات التواصل',
      'subtitle': 'البريد والعنوان',
      'icon': Icons.contact_mail,
    },
  ];

  @override
  void dispose() {
    _pageController.dispose();
    _fullNameArController.dispose();
    _fullNameEnController.dispose();
    _emailController.dispose();
    _nationalIdController.dispose();
    _birthDateController.dispose();
    _occupationController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  void _nextStep() {
    if (_currentStep < _steps.length - 1) {
      setState(() {
        _currentStep++;
      });
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    } else {
      _submitProfile();
    }
  }

  void _previousStep() {
    if (_currentStep > 0) {
      setState(() {
        _currentStep--;
      });
      _pageController.previousPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  Future<void> _selectBirthDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedBirthDate ?? DateTime(1990),
      firstDate: DateTime(1940),
      lastDate: DateTime.now(),
      locale: const Locale('ar'),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppTheme.primaryColor,
            ),
          ),
          child: child!,
        );
      },
    );
    
    if (picked != null) {
      setState(() {
        _selectedBirthDate = picked;
        _birthDateController.text = 
            '${picked.day}/${picked.month}/${picked.year}';
      });
    }
  }

  Future<void> _submitProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      
      final profileData = {
        'full_name_ar': _fullNameArController.text,
        'full_name_en': _fullNameEnController.text,
        'email': _emailController.text,
        'national_id': _nationalIdController.text,
        'date_of_birth': _selectedBirthDate?.toIso8601String(),
        'gender': _selectedGender,
        'marital_status': _selectedMaritalStatus,
        'occupation': _occupationController.text,
        'address': _addressController.text,
        'profile_completed': true,
      };

      await authProvider.updateProfile(profileData);
      
      if (mounted) {
        // Show success dialog
        await showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => AlertDialog(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: AppTheme.successColor.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.check_circle,
                    size: 50,
                    color: AppTheme.successColor,
                  ),
                ),
                const SizedBox(height: 20),
                const Text(
                  'تم بنجاح!',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'تم حفظ بياناتك بنجاح\nيمكنك الآن استخدام التطبيق',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: AppTheme.textSecondary,
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.of(context).pop();
                      context.go('/dashboard');
                    },
                    child: const Text('ابدأ الآن'),
                  ),
                ),
              ],
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('حدث خطأ: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
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
                  child: Column(
                    children: [
                      Row(
                        children: [
                          if (_currentStep > 0)
                            GestureDetector(
                              onTap: _previousStep,
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
                              'إكمال الملف الشخصي',
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
                      
                      const SizedBox(height: 20),
                      
                      // Progress Indicator
                      Row(
                        children: List.generate(_steps.length, (index) {
                          final isActive = index <= _currentStep;
                          return Expanded(
                            child: Container(
                              height: 4,
                              margin: EdgeInsets.only(
                                left: index < _steps.length - 1 ? 4 : 0,
                              ),
                              decoration: BoxDecoration(
                                color: isActive
                                    ? Colors.white
                                    : Colors.white.withOpacity(0.3),
                                borderRadius: BorderRadius.circular(2),
                              ),
                            ),
                          );
                        }),
                      ),
                      
                      const SizedBox(height: 16),
                      
                      // Step Info
                      Row(
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(
                              _steps[_currentStep]['icon'],
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _steps[_currentStep]['title'],
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                Text(
                                  _steps[_currentStep]['subtitle'],
                                  style: TextStyle(
                                    color: Colors.white.withOpacity(0.8),
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            '${_currentStep + 1}/${_steps.length}',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.8),
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
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
                    child: Form(
                      key: _formKey,
                      child: PageView(
                        controller: _pageController,
                        physics: const NeverScrollableScrollPhysics(),
                        children: [
                          _buildBasicInfoStep(),
                          _buildPersonalInfoStep(),
                          _buildContactInfoStep(),
                        ],
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

  Widget _buildBasicInfoStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          // Arabic Name
          _buildTextField(
            controller: _fullNameArController,
            label: 'الاسم الكامل بالعربية',
            hint: 'مثال: محمد أحمد الشعيل',
            icon: Icons.person,
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'يرجى إدخال الاسم بالعربية';
              }
              final parts = value.trim().split(' ');
              if (parts.length < 3) {
                return 'يرجى إدخال الاسم الثلاثي على الأقل';
              }
              return null;
            },
          ),
          
          const SizedBox(height: 20),
          
          // English Name
          _buildTextField(
            controller: _fullNameEnController,
            label: 'الاسم الكامل بالإنجليزية',
            hint: 'Example: Mohammed Ahmed Alshuail',
            icon: Icons.person_outline,
            textDirection: TextDirection.ltr,
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'يرجى إدخال الاسم بالإنجليزية';
              }
              return null;
            },
          ),
          
          const SizedBox(height: 40),
          
          // Next Button
          _buildActionButton(),
        ],
      ),
    );
  }

  Widget _buildPersonalInfoStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          // National ID
          _buildTextField(
            controller: _nationalIdController,
            label: 'رقم الهوية / الإقامة',
            hint: 'أدخل رقم الهوية',
            icon: Icons.badge,
            keyboardType: TextInputType.number,
            textDirection: TextDirection.ltr,
          ),
          
          const SizedBox(height: 20),
          
          // Birth Date
          GestureDetector(
            onTap: _selectBirthDate,
            child: AbsorbPointer(
              child: _buildTextField(
                controller: _birthDateController,
                label: 'تاريخ الميلاد',
                hint: 'اختر تاريخ الميلاد',
                icon: Icons.calendar_today,
                textDirection: TextDirection.ltr,
              ),
            ),
          ),
          
          const SizedBox(height: 20),
          
          // Gender
          _buildDropdown(
            label: 'الجنس',
            icon: Icons.wc,
            value: _selectedGender,
            items: const [
              DropdownMenuItem(value: 'male', child: Text('ذكر')),
              DropdownMenuItem(value: 'female', child: Text('أنثى')),
            ],
            onChanged: (value) {
              setState(() {
                _selectedGender = value;
              });
            },
          ),
          
          const SizedBox(height: 20),
          
          // Marital Status
          _buildDropdown(
            label: 'الحالة الاجتماعية',
            icon: Icons.family_restroom,
            value: _selectedMaritalStatus,
            items: const [
              DropdownMenuItem(value: 'single', child: Text('أعزب')),
              DropdownMenuItem(value: 'married', child: Text('متزوج')),
              DropdownMenuItem(value: 'divorced', child: Text('مطلق')),
              DropdownMenuItem(value: 'widowed', child: Text('أرمل')),
            ],
            onChanged: (value) {
              setState(() {
                _selectedMaritalStatus = value;
              });
            },
          ),
          
          const SizedBox(height: 40),
          
          // Next Button
          _buildActionButton(),
        ],
      ),
    );
  }

  Widget _buildContactInfoStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          // Email
          _buildTextField(
            controller: _emailController,
            label: 'البريد الإلكتروني',
            hint: 'example@email.com',
            icon: Icons.email,
            keyboardType: TextInputType.emailAddress,
            textDirection: TextDirection.ltr,
            validator: (value) {
              if (value != null && value.isNotEmpty) {
                if (!value.contains('@')) {
                  return 'يرجى إدخال بريد إلكتروني صحيح';
                }
              }
              return null;
            },
          ),
          
          const SizedBox(height: 20),
          
          // Occupation
          _buildTextField(
            controller: _occupationController,
            label: 'المهنة',
            hint: 'أدخل مهنتك',
            icon: Icons.work,
          ),
          
          const SizedBox(height: 20),
          
          // Address
          _buildTextField(
            controller: _addressController,
            label: 'العنوان',
            hint: 'المدينة، الحي',
            icon: Icons.location_on,
            maxLines: 2,
          ),
          
          const SizedBox(height: 40),
          
          // Submit Button
          _buildActionButton(isLast: true),
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    TextInputType? keyboardType,
    TextDirection textDirection = TextDirection.rtl,
    int maxLines = 1,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 14,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          textDirection: textDirection,
          maxLines: maxLines,
          validator: validator,
          decoration: InputDecoration(
            hintText: hint,
            hintTextDirection: textDirection,
            prefixIcon: Icon(icon, color: AppTheme.primaryColor),
            filled: true,
            fillColor: AppTheme.backgroundLight,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(
                color: AppTheme.primaryColor,
                width: 2,
              ),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(
                color: AppTheme.errorColor,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDropdown({
    required String label,
    required IconData icon,
    required String? value,
    required List<DropdownMenuItem<String>> items,
    required void Function(String?) onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 14,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: AppTheme.backgroundLight,
            borderRadius: BorderRadius.circular(12),
          ),
          child: DropdownButtonFormField<String>(
            value: value,
            items: items,
            onChanged: onChanged,
            decoration: InputDecoration(
              prefixIcon: Icon(icon, color: AppTheme.primaryColor),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
            ),
            hint: const Text('اختر'),
            isExpanded: true,
          ),
        ),
      ],
    );
  }

  Widget _buildActionButton({bool isLast = false}) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: _isLoading ? null : _nextStep,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.primaryColor,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
        child: _isLoading
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  color: Colors.white,
                  strokeWidth: 2,
                ),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    isLast ? 'حفظ وإكمال' : 'التالي',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Icon(
                    isLast ? Icons.check : Icons.arrow_back,
                    size: 20,
                  ),
                ],
              ),
      ),
    );
  }
}
