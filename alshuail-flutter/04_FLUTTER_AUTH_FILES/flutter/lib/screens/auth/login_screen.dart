/// =====================================================
/// AL-SHUAIL FAMILY FUND - LOGIN SCREEN
/// =====================================================
/// Supports: Password, OTP, Face ID authentication
/// Date: December 20, 2024
/// =====================================================

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/auth_service.dart';
import '../config/app_theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  // Controllers
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  
  // Service
  final _authService = AuthService();
  
  // State
  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _showPasswordField = false;
  bool _faceIdAvailable = false;
  bool _faceIdEnabled = false;
  String? _errorMessage;
  
  // Animation
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _setupAnimations();
    _checkBiometric();
  }

  void _setupAnimations() {
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );
    _animationController.forward();
  }

  Future<void> _checkBiometric() async {
    final status = await _authService.checkBiometricAvailability();
    final isEnabled = await _authService.isFaceIdEnabled();
    
    setState(() {
      _faceIdAvailable = status.available;
      _faceIdEnabled = isEnabled;
    });

    // Auto-trigger Face ID if enabled
    if (_faceIdEnabled && _faceIdAvailable) {
      _loginWithFaceId();
    }
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _passwordController.dispose();
    _animationController.dispose();
    super.dispose();
  }

  // =====================================================
  // LOGIN WITH PASSWORD
  // =====================================================
  Future<void> _loginWithPassword() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await _authService.loginWithPassword(
      phone: _phoneController.text.trim(),
      password: _passwordController.text,
    );

    setState(() => _isLoading = false);

    if (result.success) {
      _navigateToHome();
    } else if (result.requiresPasswordSetup) {
      // User doesn't have password, redirect to OTP
      _showSnackBar('لم يتم إنشاء كلمة مرور. استخدم تسجيل الدخول بـ OTP', isError: true);
    } else if (result.locked) {
      _showLockedDialog(result.remainingMinutes ?? 30);
    } else {
      setState(() => _errorMessage = result.message);
      if (result.attemptsRemaining != null) {
        _showSnackBar('متبقي ${result.attemptsRemaining} محاولات', isError: true);
      }
    }
  }

  // =====================================================
  // REQUEST OTP
  // =====================================================
  Future<void> _requestOTP() async {
    if (_phoneController.text.trim().isEmpty) {
      setState(() => _errorMessage = 'أدخل رقم الجوال أولاً');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await _authService.requestOTP(
      phone: _phoneController.text.trim(),
      purpose: 'login',
    );

    setState(() => _isLoading = false);

    if (result.success) {
      _navigateToOTP(
        phone: _phoneController.text.trim(),
        requiresPasswordSetup: result.requiresPasswordSetup,
      );
    } else if (result.waitSeconds != null) {
      _showSnackBar('انتظر ${result.waitSeconds} ثانية', isError: true);
    } else {
      setState(() => _errorMessage = result.message);
    }
  }

  // =====================================================
  // LOGIN WITH FACE ID
  // =====================================================
  Future<void> _loginWithFaceId() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await _authService.loginWithFaceId();

    setState(() => _isLoading = false);

    if (result.success) {
      _navigateToHome();
    } else {
      setState(() => _errorMessage = result.message);
    }
  }

  // =====================================================
  // NAVIGATION
  // =====================================================
  void _navigateToHome() {
    Navigator.pushReplacementNamed(context, '/home');
  }

  void _navigateToOTP({required String phone, bool requiresPasswordSetup = false}) {
    Navigator.pushNamed(
      context,
      '/otp-verification',
      arguments: {
        'phone': phone,
        'requiresPasswordSetup': requiresPasswordSetup,
      },
    );
  }

  void _navigateToForgotPassword() {
    Navigator.pushNamed(context, '/forgot-password');
  }

  // =====================================================
  // UI HELPERS
  // =====================================================
  void _showSnackBar(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message, textAlign: TextAlign.center),
        backgroundColor: isError ? Colors.red : AppTheme.primaryColor,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  void _showLockedDialog(int minutes) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.cardBackground,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.lock, color: Colors.red),
            SizedBox(width: 10),
            Text('الحساب مقفل', style: TextStyle(color: Colors.white)),
          ],
        ),
        content: Text(
          'تم قفل حسابك بسبب عدة محاولات فاشلة.\n\nحاول مرة أخرى بعد $minutes دقيقة.',
          style: const TextStyle(color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('حسناً'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              AppTheme.primaryColor,
              AppTheme.primaryColor.withOpacity(0.8),
              AppTheme.backgroundColor,
            ],
          ),
        ),
        child: SafeArea(
          child: FadeTransition(
            opacity: _fadeAnimation,
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Form(
                key: _formKey,
                child: Column(
                  children: [
                    const SizedBox(height: 40),
                    
                    // Logo
                    _buildLogo(),
                    
                    const SizedBox(height: 40),
                    
                    // Login Card
                    _buildLoginCard(),
                    
                    const SizedBox(height: 24),
                    
                    // Face ID Button (if available)
                    if (_faceIdAvailable && _faceIdEnabled)
                      _buildFaceIdButton(),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLogo() {
    return Column(
      children: [
        Container(
          width: 100,
          height: 100,
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.2),
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white.withOpacity(0.3), width: 2),
          ),
          child: const Icon(
            Icons.account_balance,
            size: 50,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 20),
        const Text(
          'صندوق عائلة شعيل العنزي',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Al-Shuail Family Fund',
          style: TextStyle(
            fontSize: 14,
            color: Colors.white.withOpacity(0.8),
          ),
        ),
      ],
    );
  }

  Widget _buildLoginCard() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Title
          const Text(
            'مرحباً بك',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Color(0xFF333333),
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            _showPasswordField 
                ? 'أدخل كلمة المرور للدخول'
                : 'أدخل رقم هاتفك للبدء',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[600],
            ),
            textAlign: TextAlign.center,
          ),
          
          const SizedBox(height: 24),
          
          // Error Message
          if (_errorMessage != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.red.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.red.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline, color: Colors.red, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      _errorMessage!,
                      style: const TextStyle(color: Colors.red, fontSize: 14),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],
          
          // Phone Field
          TextFormField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            textDirection: TextDirection.ltr,
            enabled: !_showPasswordField,
            decoration: InputDecoration(
              labelText: 'رقم الجوال',
              hintText: '05xxxxxxxx',
              prefixIcon: const Icon(Icons.phone_android),
              suffixIcon: _showPasswordField
                  ? IconButton(
                      icon: const Icon(Icons.edit),
                      onPressed: () => setState(() => _showPasswordField = false),
                    )
                  : null,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey[300]!),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: AppTheme.primaryColor, width: 2),
              ),
            ),
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'أدخل رقم الجوال';
              }
              if (value.length < 10) {
                return 'رقم الجوال غير صحيح';
              }
              return null;
            },
            onChanged: (_) => setState(() => _errorMessage = null),
          ),
          
          const SizedBox(height: 16),
          
          // Password Field (conditional)
          if (_showPasswordField) ...[
            TextFormField(
              controller: _passwordController,
              obscureText: _obscurePassword,
              decoration: InputDecoration(
                labelText: 'كلمة المرور',
                prefixIcon: const Icon(Icons.lock_outline),
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscurePassword ? Icons.visibility_off : Icons.visibility,
                  ),
                  onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey[300]!),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: AppTheme.primaryColor, width: 2),
                ),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'أدخل كلمة المرور';
                }
                return null;
              },
            ),
            
            const SizedBox(height: 8),
            
            // Forgot Password Link
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                onPressed: _navigateToForgotPassword,
                child: Text(
                  'نسيت كلمة المرور؟',
                  style: TextStyle(
                    color: AppTheme.primaryColor,
                    fontSize: 14,
                  ),
                ),
              ),
            ),
            
            const SizedBox(height: 16),
            
            // Login Button
            _buildPrimaryButton(
              text: 'تسجيل الدخول',
              icon: Icons.login,
              onPressed: _loginWithPassword,
            ),
            
            const SizedBox(height: 12),
            
            // Or divider
            _buildDivider('أو'),
            
            const SizedBox(height: 12),
            
            // OTP Login Button
            _buildSecondaryButton(
              text: 'الدخول برمز التحقق OTP',
              icon: Icons.sms,
              onPressed: _requestOTP,
            ),
          ] else ...[
            // Continue Button (to show password)
            _buildPrimaryButton(
              text: 'متابعة',
              icon: Icons.arrow_forward,
              onPressed: () {
                if (_phoneController.text.trim().isNotEmpty) {
                  setState(() => _showPasswordField = true);
                } else {
                  setState(() => _errorMessage = 'أدخل رقم الجوال أولاً');
                }
              },
            ),
            
            const SizedBox(height: 12),
            
            // Or divider
            _buildDivider('أو'),
            
            const SizedBox(height: 12),
            
            // OTP Login Button
            _buildSecondaryButton(
              text: 'الدخول برمز التحقق OTP',
              icon: Icons.sms,
              onPressed: _requestOTP,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPrimaryButton({
    required String text,
    required IconData icon,
    required VoidCallback onPressed,
  }) {
    return SizedBox(
      height: 56,
      child: ElevatedButton(
        onPressed: _isLoading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.primaryColor,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          elevation: 0,
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
                    text,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Icon(icon, size: 20),
                ],
              ),
      ),
    );
  }

  Widget _buildSecondaryButton({
    required String text,
    required IconData icon,
    required VoidCallback onPressed,
  }) {
    return SizedBox(
      height: 56,
      child: OutlinedButton(
        onPressed: _isLoading ? null : onPressed,
        style: OutlinedButton.styleFrom(
          foregroundColor: AppTheme.primaryColor,
          side: BorderSide(color: AppTheme.primaryColor),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 20),
            const SizedBox(width: 8),
            Text(
              text,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFaceIdButton() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.2)),
      ),
      child: Column(
        children: [
          Text(
            'أو استخدم',
            style: TextStyle(
              color: Colors.white.withOpacity(0.8),
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 16),
          InkWell(
            onTap: _isLoading ? null : _loginWithFaceId,
            child: Container(
              width: 70,
              height: 70,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white.withOpacity(0.3), width: 2),
              ),
              child: const Icon(
                Icons.face,
                size: 35,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            'Face ID',
            style: TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDivider(String text) {
    return Row(
      children: [
        Expanded(child: Divider(color: Colors.grey[300])),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            text,
            style: TextStyle(color: Colors.grey[500], fontSize: 14),
          ),
        ),
        Expanded(child: Divider(color: Colors.grey[300])),
      ],
    );
  }
}
