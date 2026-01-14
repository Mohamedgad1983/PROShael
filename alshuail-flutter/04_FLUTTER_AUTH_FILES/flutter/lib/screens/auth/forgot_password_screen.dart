/// =====================================================
/// AL-SHUAIL FAMILY FUND - FORGOT PASSWORD SCREEN
/// =====================================================
/// Password reset flow: Phone → OTP → New Password
/// Date: December 20, 2024
/// =====================================================

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:async';
import '../services/auth_service.dart';
import '../config/app_theme.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({Key? key}) : super(key: key);

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  // Page Controller
  final _pageController = PageController();
  
  // Controllers
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final List<TextEditingController> _otpControllers = 
      List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _otpFocusNodes = 
      List.generate(6, (_) => FocusNode());
  
  // Service
  final _authService = AuthService();
  
  // State
  int _currentStep = 0;
  bool _isLoading = false;
  String? _errorMessage;
  bool _obscurePassword = true;
  bool _obscureConfirm = true;
  int _resendTimer = 0;
  Timer? _timer;

  @override
  void dispose() {
    _timer?.cancel();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    for (var c in _otpControllers) {
      c.dispose();
    }
    for (var n in _otpFocusNodes) {
      n.dispose();
    }
    _pageController.dispose();
    super.dispose();
  }

  String get _otpCode => _otpControllers.map((c) => c.text).join();

  void _startResendTimer() {
    _resendTimer = 60;
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_resendTimer > 0) {
        setState(() => _resendTimer--);
      } else {
        timer.cancel();
      }
    });
  }

  void _goToStep(int step) {
    setState(() {
      _currentStep = step;
      _errorMessage = null;
    });
    _pageController.animateToPage(
      step,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  // =====================================================
  // STEP 1: REQUEST OTP
  // =====================================================
  Future<void> _requestOTP() async {
    if (_phoneController.text.trim().isEmpty) {
      setState(() => _errorMessage = 'أدخل رقم الجوال');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await _authService.requestOTP(
      phone: _phoneController.text.trim(),
      purpose: 'password_reset',
    );

    setState(() => _isLoading = false);

    if (result.success) {
      _startResendTimer();
      _goToStep(1);
      // Focus first OTP field
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _otpFocusNodes[0].requestFocus();
      });
    } else {
      setState(() => _errorMessage = result.message);
    }
  }

  // =====================================================
  // STEP 2: VERIFY OTP (just validate, don't submit yet)
  // =====================================================
  void _verifyOTPAndProceed() {
    if (_otpCode.length != 6) {
      setState(() => _errorMessage = 'أدخل رمز التحقق كاملاً');
      return;
    }
    
    setState(() => _errorMessage = null);
    _goToStep(2);
  }

  // =====================================================
  // STEP 3: RESET PASSWORD
  // =====================================================
  Future<void> _resetPassword() async {
    if (_passwordController.text.length < 6) {
      setState(() => _errorMessage = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    if (_passwordController.text != _confirmPasswordController.text) {
      setState(() => _errorMessage = 'كلمة المرور غير متطابقة');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await _authService.resetPassword(
      phone: _phoneController.text.trim(),
      otp: _otpCode,
      newPassword: _passwordController.text,
      confirmPassword: _confirmPasswordController.text,
    );

    setState(() => _isLoading = false);

    if (result.success) {
      _showSuccessDialog();
    } else {
      setState(() => _errorMessage = result.message);
      // If OTP error, go back to OTP step
      if (result.message.contains('رمز التحقق')) {
        _goToStep(1);
      }
    }
  }

  Future<void> _resendOTP() async {
    if (_resendTimer > 0) return;

    setState(() => _isLoading = true);

    final result = await _authService.requestOTP(
      phone: _phoneController.text.trim(),
      purpose: 'password_reset',
    );

    setState(() => _isLoading = false);

    if (result.success) {
      _startResendTimer();
      _showSnackBar('تم إرسال رمز جديد', isSuccess: true);
      // Clear old OTP
      for (var c in _otpControllers) {
        c.clear();
      }
      _otpFocusNodes[0].requestFocus();
    } else {
      _showSnackBar(result.message);
    }
  }

  void _showSnackBar(String message, {bool isSuccess = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message, textAlign: TextAlign.center),
        backgroundColor: isSuccess ? Colors.green : Colors.red,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _showSuccessDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.cardBackground,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.2),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_circle, size: 50, color: Colors.green),
            ),
            const SizedBox(height: 20),
            const Text(
              'تم بنجاح!',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            const SizedBox(height: 12),
            Text(
              'تم تغيير كلمة المرور بنجاح.\nيمكنك الآن تسجيل الدخول.',
              style: TextStyle(fontSize: 14, color: Colors.white.withOpacity(0.8)),
              textAlign: TextAlign.center,
            ),
          ],
        ),
        actions: [
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                Navigator.pushReplacementNamed(context, '/login');
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('تسجيل الدخول', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
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
          child: Column(
            children: [
              // App Bar
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back_ios, color: Colors.white),
                      onPressed: () {
                        if (_currentStep > 0) {
                          _goToStep(_currentStep - 1);
                        } else {
                          Navigator.pop(context);
                        }
                      },
                    ),
                    const Expanded(
                      child: Text(
                        'استعادة كلمة المرور',
                        style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                        textAlign: TextAlign.center,
                      ),
                    ),
                    const SizedBox(width: 48),
                  ],
                ),
              ),
              
              // Progress Indicator
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 40),
                child: Row(
                  children: List.generate(3, (index) {
                    return Expanded(
                      child: Container(
                        margin: EdgeInsets.only(right: index < 2 ? 8 : 0),
                        height: 4,
                        decoration: BoxDecoration(
                          color: index <= _currentStep
                              ? Colors.white
                              : Colors.white.withOpacity(0.3),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    );
                  }),
                ),
              ),
              
              const SizedBox(height: 8),
              
              // Step Labels
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildStepLabel('رقم الجوال', 0),
                    _buildStepLabel('رمز التحقق', 1),
                    _buildStepLabel('كلمة المرور', 2),
                  ],
                ),
              ),
              
              // Page View
              Expanded(
                child: PageView(
                  controller: _pageController,
                  physics: const NeverScrollableScrollPhysics(),
                  children: [
                    _buildPhoneStep(),
                    _buildOTPStep(),
                    _buildPasswordStep(),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStepLabel(String label, int step) {
    return Text(
      label,
      style: TextStyle(
        color: step <= _currentStep ? Colors.white : Colors.white.withOpacity(0.5),
        fontSize: 12,
        fontWeight: step == _currentStep ? FontWeight.bold : FontWeight.normal,
      ),
    );
  }

  // =====================================================
  // STEP 1: PHONE INPUT
  // =====================================================
  Widget _buildPhoneStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const SizedBox(height: 40),
          
          // Icon
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.phone_android, size: 50, color: Colors.white),
          ),
          
          const SizedBox(height: 30),
          
          const Text(
            'أدخل رقم الجوال',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          
          const SizedBox(height: 12),
          
          Text(
            'سنرسل رمز تحقق إلى WhatsApp',
            style: TextStyle(fontSize: 14, color: Colors.white.withOpacity(0.8)),
          ),
          
          const SizedBox(height: 40),
          
          // Card
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
            ),
            child: Column(
              children: [
                if (_errorMessage != null) ...[
                  _buildErrorBox(),
                  const SizedBox(height: 16),
                ],
                
                TextFormField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  textDirection: TextDirection.ltr,
                  decoration: InputDecoration(
                    labelText: 'رقم الجوال',
                    hintText: '05xxxxxxxx',
                    prefixIcon: const Icon(Icons.phone),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onChanged: (_) => setState(() => _errorMessage = null),
                ),
                
                const SizedBox(height: 24),
                
                _buildPrimaryButton('إرسال رمز التحقق', _requestOTP),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // =====================================================
  // STEP 2: OTP INPUT
  // =====================================================
  Widget _buildOTPStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const SizedBox(height: 40),
          
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.sms, size: 50, color: Colors.white),
          ),
          
          const SizedBox(height: 30),
          
          const Text(
            'أدخل رمز التحقق',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          
          const SizedBox(height: 12),
          
          Text(
            'تم إرسال الرمز إلى ${_phoneController.text}',
            style: TextStyle(fontSize: 14, color: Colors.white.withOpacity(0.8)),
            textDirection: TextDirection.rtl,
          ),
          
          const SizedBox(height: 40),
          
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
            ),
            child: Column(
              children: [
                if (_errorMessage != null) ...[
                  _buildErrorBox(),
                  const SizedBox(height: 16),
                ],
                
                // OTP Fields
                Directionality(
                  textDirection: TextDirection.ltr,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: List.generate(6, (index) {
                      return SizedBox(
                        width: 45,
                        height: 55,
                        child: TextFormField(
                          controller: _otpControllers[index],
                          focusNode: _otpFocusNodes[index],
                          keyboardType: TextInputType.number,
                          textAlign: TextAlign.center,
                          maxLength: 1,
                          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                          decoration: InputDecoration(
                            counterText: '',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: AppTheme.primaryColor, width: 2),
                            ),
                          ),
                          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                          onChanged: (value) {
                            setState(() => _errorMessage = null);
                            if (value.isNotEmpty && index < 5) {
                              _otpFocusNodes[index + 1].requestFocus();
                            }
                            if (value.isEmpty && index > 0) {
                              _otpFocusNodes[index - 1].requestFocus();
                            }
                          },
                        ),
                      );
                    }),
                  ),
                ),
                
                const SizedBox(height: 24),
                
                _buildPrimaryButton('متابعة', _verifyOTPAndProceed),
                
                const SizedBox(height: 16),
                
                // Resend
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text('لم يصلك الرمز؟', style: TextStyle(color: Colors.grey[600])),
                    TextButton(
                      onPressed: _resendTimer > 0 ? null : _resendOTP,
                      child: Text(
                        _resendTimer > 0 ? 'إعادة الإرسال ($_resendTimer)' : 'إعادة الإرسال',
                        style: TextStyle(
                          color: _resendTimer > 0 ? Colors.grey : AppTheme.primaryColor,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // =====================================================
  // STEP 3: NEW PASSWORD
  // =====================================================
  Widget _buildPasswordStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const SizedBox(height: 40),
          
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.lock_outline, size: 50, color: Colors.white),
          ),
          
          const SizedBox(height: 30),
          
          const Text(
            'كلمة مرور جديدة',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          
          const SizedBox(height: 12),
          
          Text(
            'أدخل كلمة المرور الجديدة',
            style: TextStyle(fontSize: 14, color: Colors.white.withOpacity(0.8)),
          ),
          
          const SizedBox(height: 40),
          
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
            ),
            child: Column(
              children: [
                if (_errorMessage != null) ...[
                  _buildErrorBox(),
                  const SizedBox(height: 16),
                ],
                
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  decoration: InputDecoration(
                    labelText: 'كلمة المرور الجديدة',
                    hintText: '6 أحرف على الأقل',
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(
                      icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility),
                      onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                    ),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                
                const SizedBox(height: 16),
                
                TextFormField(
                  controller: _confirmPasswordController,
                  obscureText: _obscureConfirm,
                  decoration: InputDecoration(
                    labelText: 'تأكيد كلمة المرور',
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(
                      icon: Icon(_obscureConfirm ? Icons.visibility_off : Icons.visibility),
                      onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
                    ),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                
                const SizedBox(height: 24),
                
                _buildPrimaryButton('تغيير كلمة المرور', _resetPassword),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorBox() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: Colors.red, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(_errorMessage!, style: const TextStyle(color: Colors.red, fontSize: 14)),
          ),
        ],
      ),
    );
  }

  Widget _buildPrimaryButton(String text, VoidCallback onPressed) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: _isLoading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.primaryColor,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
        child: _isLoading
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
              )
            : Text(text, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
      ),
    );
  }
}
