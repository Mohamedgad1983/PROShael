import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../services/biometric_service.dart';
import '../../services/storage_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  // Step management
  String _step = 'phone'; // 'phone' | 'otp' | 'password'

  // Phone step state
  final _phoneController = TextEditingController();
  String _phoneError = '';
  bool _sendingOTP = false;
  String _memberName = '';

  // Password step state
  final _passwordController = TextEditingController();
  String _passwordError = '';
  bool _loggingIn = false;
  bool _obscurePassword = true;
  
  // OTP step state
  final List<TextEditingController> _otpControllers = List.generate(
    6,
    (_) => TextEditingController(),
  );
  final List<FocusNode> _otpFocusNodes = List.generate(6, (_) => FocusNode());
  String _otpError = '';
  bool _verifying = false;
  
  // Timers
  int _expiryTime = 300; // 5 minutes
  int _resendCooldown = 0;
  
  // Biometric
  bool _showBiometricOption = false;
  bool _hasFaceId = false;
  String _biometricTypeName = 'البصمة';
  
  @override
  void initState() {
    super.initState();
    _checkBiometricAvailability();
    _loadLastPhone();
  }
  
  @override
  void dispose() {
    _phoneController.dispose();
    _passwordController.dispose();
    for (var controller in _otpControllers) {
      controller.dispose();
    }
    for (var node in _otpFocusNodes) {
      node.dispose();
    }
    super.dispose();
  }
  
  // Check if biometric login is available
  Future<void> _checkBiometricAvailability() async {
    final authProvider = context.read<AuthProvider>();
    final shouldShow = await authProvider.shouldShowBiometricLogin();
    _hasFaceId = await BiometricService.hasFaceId();
    _biometricTypeName = await BiometricService.getBiometricTypeName();
    
    if (mounted) {
      setState(() {
        _showBiometricOption = shouldShow;
      });
    }
  }
  
  // Load last phone number
  Future<void> _loadLastPhone() async {
    final lastPhone = StorageService.getLastLoginPhone();
    if (lastPhone != null && lastPhone.isNotEmpty) {
      _phoneController.text = lastPhone;
    }
  }
  
  // Handle biometric login
  Future<void> _handleBiometricLogin() async {
    final result = await BiometricService.authenticate(
      reason: 'يرجى استخدام $_biometricTypeName للدخول إلى حسابك',
    );
    
    if (result.success) {
      final userId = await StorageService.getBiometricUserId();
      if (userId != null && mounted) {
        final authProvider = context.read<AuthProvider>();
        final success = await authProvider.loginWithBiometric(userId);
        
        if (success && mounted) {
          context.go('/dashboard');
        } else if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('فشل تسجيل الدخول. يرجى استخدام رقم الهاتف'),
              backgroundColor: AppTheme.errorColor,
            ),
          );
        }
      }
    } else if (result.error != BiometricError.cancelled && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result.message),
          backgroundColor: AppTheme.warningColor,
        ),
      );
    }
  }
  
  // Validate phone number
  bool _validatePhone(String phone) {
    final cleanPhone = phone.replaceAll(RegExp(r'\D'), '');
    
    // Saudi: 05xxxxxxxx (10 digits) or 5xxxxxxxx (9 digits)
    if (cleanPhone.length == 10 && cleanPhone.startsWith('05')) return true;
    if (cleanPhone.length == 9 && cleanPhone.startsWith('5')) return true;
    // Kuwait: 9xxxxxxx or 6xxxxxxx (8 digits)
    if (cleanPhone.length == 8 && RegExp(r'^[569]').hasMatch(cleanPhone)) return true;
    // With country code
    if (cleanPhone.startsWith('966') && cleanPhone.length == 12) return true;
    if (cleanPhone.startsWith('965') && cleanPhone.length == 11) return true;
    
    return false;
  }
  
  // Handle send OTP
  Future<void> _handleSendOTP() async {
    if (!mounted) return;
    setState(() => _phoneError = '');

    final phone = _phoneController.text.trim();
    if (!_validatePhone(phone)) {
      if (!mounted) return;
      setState(() => _phoneError = 'يرجى إدخال رقم هاتف صحيح');
      return;
    }

    if (!mounted) return;
    setState(() => _sendingOTP = true);

    final authProvider = context.read<AuthProvider>();
    final result = await authProvider.sendOtp(phone);

    if (!mounted) return;
    setState(() => _sendingOTP = false);

    if (result['success'] == true) {
      if (!mounted) return;
      setState(() {
        _memberName = result['memberName'] ?? '';
        _step = 'otp';
        _expiryTime = result['expiresIn'] ?? 300;
        _resendCooldown = 60;
      });
      _startTimers();
      if (mounted) _otpFocusNodes[0].requestFocus();
    } else {
      if (!mounted) return;
      setState(() => _phoneError = result['message'] ?? 'فشل إرسال رمز التحقق');
    }
  }
  
  // Start countdown timers
  void _startTimers() {
    Future.doWhile(() async {
      await Future.delayed(const Duration(seconds: 1));
      if (!mounted || _step != 'otp') return false;
      
      setState(() {
        if (_expiryTime > 0) _expiryTime--;
        if (_resendCooldown > 0) _resendCooldown--;
      });
      
      return _step == 'otp';
    });
  }
  
  // Handle OTP input
  void _handleOtpChange(int index, String value) {
    if (value.length > 1) {
      // Handle paste
      final pastedCode = value.replaceAll(RegExp(r'\D'), '');
      if (pastedCode.length == 6) {
        for (int i = 0; i < 6; i++) {
          _otpControllers[i].text = pastedCode[i];
        }
        _otpFocusNodes[5].requestFocus();
        _handleVerifyOTP();
        return;
      }
    }
    
    if (value.isNotEmpty && index < 5) {
      _otpFocusNodes[index + 1].requestFocus();
    }
    
    // Auto-submit when complete
    if (value.isNotEmpty && index == 5) {
      final otp = _otpControllers.map((c) => c.text).join();
      if (otp.length == 6) {
        _handleVerifyOTP();
      }
    }
    
    setState(() => _otpError = '');
  }
  
  // Handle OTP backspace
  void _handleOtpBackspace(int index, String value) {
    if (value.isEmpty && index > 0) {
      _otpFocusNodes[index - 1].requestFocus();
    }
  }
  
  // Handle verify OTP
  Future<void> _handleVerifyOTP() async {
    final otp = _otpControllers.map((c) => c.text).join();
    
    if (otp.length != 6) {
      setState(() => _otpError = 'يرجى إدخال رمز التحقق كاملاً');
      return;
    }
    
    if (_expiryTime <= 0) {
      setState(() => _otpError = 'انتهت صلاحية رمز التحقق. يرجى إعادة الإرسال');
      return;
    }
    
    setState(() {
      _verifying = true;
      _otpError = '';
    });
    
    final authProvider = context.read<AuthProvider>();
    final success = await authProvider.verifyOtp(_phoneController.text.trim(), otp);
    
    if (!mounted) return;
    
    setState(() => _verifying = false);
    
    if (success) {
      context.go('/dashboard');
    } else {
      setState(() {
        _otpError = authProvider.error ?? 'رمز التحقق غير صحيح';
        for (var controller in _otpControllers) {
          controller.clear();
        }
      });
      _otpFocusNodes[0].requestFocus();
    }
  }
  
  // Handle password login
  Future<void> _handlePasswordLogin() async {
    final password = _passwordController.text.trim();

    if (password.isEmpty) {
      setState(() => _passwordError = 'يرجى إدخال كلمة المرور');
      return;
    }

    setState(() {
      _loggingIn = true;
      _passwordError = '';
    });

    print('🔐 [LOGIN] Starting password login...');
    print('🔐 [LOGIN] Phone: ${_phoneController.text.trim()}');

    final authProvider = context.read<AuthProvider>();
    final result = await authProvider.loginWithPassword(
      _phoneController.text.trim(),
      password,
    );

    print('🔐 [LOGIN] Result: $result');

    if (!mounted) return;
    setState(() => _loggingIn = false);

    if (result['success'] == true) {
      print('🔐 [LOGIN] Success! mustChangePassword: ${result['mustChangePassword']}');
      print('🔐 [LOGIN] Auth status: ${authProvider.status}');
      print('🔐 [LOGIN] User: ${authProvider.user}');

      // Check if user must change password (first-time login)
      if (result['mustChangePassword'] == true) {
        print('🔐 [LOGIN] Navigating to /create-password');
        // Navigate to create password screen
        context.go('/create-password');
      } else {
        print('🔐 [LOGIN] Navigating to /dashboard');
        // Navigate to dashboard
        context.go('/dashboard');
      }
    } else {
      setState(() {
        _passwordError = result['message'] ?? 'فشل تسجيل الدخول';
        if (result['featureDisabled'] == true) {
          // Password auth is disabled, fallback to OTP
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('تسجيل الدخول بكلمة المرور غير متاح. استخدم رمز التحقق'),
              backgroundColor: AppTheme.warningColor,
            ),
          );
          _step = 'phone';
        }
      });
    }
  }

  // Switch to password login step
  void _switchToPasswordLogin() {
    setState(() {
      _step = 'password';
      _passwordError = '';
      _passwordController.clear();
    });
  }

  // Handle resend OTP
  Future<void> _handleResendOTP() async {
    if (_resendCooldown > 0) return;
    if (!mounted) return;

    setState(() => _sendingOTP = true);

    final authProvider = context.read<AuthProvider>();
    final result = await authProvider.resendOTP(_phoneController.text.trim());

    if (!mounted) return;
    setState(() => _sendingOTP = false);

    if (result['success'] == true) {
      if (!mounted) return;
      setState(() {
        _expiryTime = result['expiresIn'] ?? 300;
        _resendCooldown = 60;
        _otpError = '';
        for (var controller in _otpControllers) {
          controller.clear();
        }
      });
      if (mounted) _otpFocusNodes[0].requestFocus();
    } else {
      if (!mounted) return;
      setState(() => _otpError = result['message'] ?? 'فشل إعادة الإرسال');
    }
  }
  
  // Go back to phone step
  void _handleBack() {
    setState(() {
      _step = 'phone';
      _otpError = '';
      _passwordError = '';
      _passwordController.clear();
      for (var controller in _otpControllers) {
        controller.clear();
      }
    });
  }
  
  // Format time as MM:SS
  String _formatTime(int seconds) {
    final mins = seconds ~/ 60;
    final secs = seconds % 60;
    return '$mins:${secs.toString().padLeft(2, '0')}';
  }
  
  // Demo login for testing
  void _handleDemoLogin() {
    final demoUser = {
      'id': 'demo-001',
      'membership_id': 'SH-0001',
      'full_name_ar': 'محمد أحمد الشعيل',
      'full_name_en': 'Mohammed Ahmed Al-Shuail',
      'name': 'محمد أحمد الشعيل',
      'phone': '+966501234567',
      'branch_name': 'فخذ رشود',
      'balance': 2500.0,
      'status': 'active',
      'join_date': '1446/01/15',
    };
    
    context.read<AuthProvider>().login(demoUser);
    context.go('/dashboard');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: AppTheme.primaryGradient,
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Logo
                  Container(
                    width: 180,
                    height: 180,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.25),
                          blurRadius: 25,
                          offset: const Offset(0, 12),
                        ),
                      ],
                    ),
                    padding: const EdgeInsets.all(10),
                    child: Image.asset(
                      'assets/images/logo.png',
                      fit: BoxFit.contain,
                      filterQuality: FilterQuality.high,
                    ),
                  ),
                  
                  const SizedBox(height: 32),
                  
                  // Login Card
                  Container(
                    width: double.infinity,
                    constraints: const BoxConstraints(maxWidth: 400),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.95),
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: AppTheme.elevatedShadow,
                    ),
                    padding: const EdgeInsets.all(24),
                    child: _step == 'phone'
                        ? _buildPhoneStep()
                        : _step == 'password'
                            ? _buildPasswordStep()
                            : _buildOtpStep(),
                  ),
                  
                  const SizedBox(height: 32),
                  
                  Text(
                    'جميع الحقوق محفوظة © 2024',
                    style: GoogleFonts.cairo(
                      fontSize: 12,
                      color: Colors.white.withOpacity(0.5),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
  
  // Phone input step
  Widget _buildPhoneStep() {
    return Column(
      children: [
        // Icon
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF22c55e), Color(0xFF16a34a)],
            ),
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Icon(
            LucideIcons.phone,
            size: 32,
            color: Colors.white,
          ),
        ),
        
        const SizedBox(height: 16),
        
        Text(
          'مرحباً بك',
          style: GoogleFonts.cairo(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: AppTheme.textPrimary,
          ),
        ),
        
        const SizedBox(height: 4),
        
        Text(
          'أدخل رقم هاتفك للتسجيل عبر WhatsApp',
          style: GoogleFonts.cairo(
            fontSize: 13,
            color: AppTheme.textSecondary,
          ),
        ),
        
        const SizedBox(height: 24),
        
        // Error message
        if (_phoneError.isNotEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: Colors.red.shade50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.red.shade200),
            ),
            child: Row(
              children: [
                Icon(LucideIcons.alertCircle, size: 18, color: Colors.red.shade600),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _phoneError,
                    style: GoogleFonts.cairo(
                      fontSize: 13,
                      color: Colors.red.shade600,
                    ),
                  ),
                ),
              ],
            ),
          ),
        
        // Phone input
        Directionality(
          textDirection: TextDirection.ltr,
          child: TextField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            style: GoogleFonts.cairo(fontSize: 16),
            decoration: InputDecoration(
              hintText: '05xxxxxxxx',
              prefixIcon: const Icon(LucideIcons.phone),
              suffixText: '🇸🇦',
            ),
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(15),
            ],
            enabled: !_sendingOTP,
          ),
        ),
        
        const SizedBox(height: 8),
        
        Text(
          '🇸🇦 السعودية أو 🇰🇼 الكويت',
          style: GoogleFonts.cairo(
            fontSize: 11,
            color: AppTheme.textMuted,
          ),
        ),
        
        const SizedBox(height: 24),
        
        // Send OTP button
        SizedBox(
          width: double.infinity,
          height: 54,
          child: ElevatedButton(
            onPressed: _sendingOTP ? null : _handleSendOTP,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: _sendingOTP
                ? const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        'إرسال رمز التحقق',
                        style: GoogleFonts.cairo(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Icon(LucideIcons.arrowLeft, size: 20),
                    ],
                  ),
          ),
        ),
        
        // Biometric Login Option
        if (_showBiometricOption) ...[
          const SizedBox(height: 16),
          
          Row(
            children: [
              Expanded(child: Divider(color: Colors.grey.shade300)),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  'أو',
                  style: GoogleFonts.cairo(
                    fontSize: 13,
                    color: AppTheme.textMuted,
                  ),
                ),
              ),
              Expanded(child: Divider(color: Colors.grey.shade300)),
            ],
          ),
          
          const SizedBox(height: 16),
          
          // Biometric Button
          SizedBox(
            width: double.infinity,
            height: 54,
            child: OutlinedButton(
              onPressed: _handleBiometricLogin,
              style: OutlinedButton.styleFrom(
                side: BorderSide(color: AppTheme.primaryColor),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    _hasFaceId ? Icons.face : Icons.fingerprint,
                    size: 24,
                    color: AppTheme.primaryColor,
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'الدخول باستخدام $_biometricTypeName',
                    style: GoogleFonts.cairo(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.primaryColor,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],

        // Password Login Option
        const SizedBox(height: 16),

        Row(
          children: [
            Expanded(child: Divider(color: Colors.grey.shade300)),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                'أو',
                style: GoogleFonts.cairo(
                  fontSize: 13,
                  color: AppTheme.textMuted,
                ),
              ),
            ),
            Expanded(child: Divider(color: Colors.grey.shade300)),
          ],
        ),

        const SizedBox(height: 16),

        // Password Login Button
        SizedBox(
          width: double.infinity,
          height: 54,
          child: OutlinedButton(
            onPressed: _sendingOTP ? null : _switchToPasswordLogin,
            style: OutlinedButton.styleFrom(
              side: BorderSide(color: AppTheme.primaryColor),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  LucideIcons.lock,
                  size: 20,
                  color: AppTheme.primaryColor,
                ),
                const SizedBox(width: 10),
                Text(
                  'الدخول بكلمة المرور',
                  style: GoogleFonts.cairo(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.primaryColor,
                  ),
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 16),

        // WhatsApp info
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.green.shade50,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.green.shade100),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(LucideIcons.messageCircle, size: 16, color: Colors.green.shade700),
              const SizedBox(width: 8),
              Text(
                'سيتم إرسال رمز التحقق عبر WhatsApp',
                style: GoogleFonts.cairo(
                  fontSize: 12,
                  color: Colors.green.shade700,
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 24),

        // Demo login
        TextButton(
          onPressed: _handleDemoLogin,
          child: Text(
            '🧪 دخول تجريبي (للمعاينة)',
            style: GoogleFonts.cairo(
              fontSize: 13,
              color: AppTheme.textMuted,
            ),
          ),
        ),
      ],
    );
  }
  
  // OTP verification step
  Widget _buildOtpStep() {
    return Column(
      children: [
        // Icon
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            gradient: AppTheme.primaryGradient,
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Icon(
            LucideIcons.shield,
            size: 32,
            color: Colors.white,
          ),
        ),
        
        const SizedBox(height: 16),
        
        Text(
          'أدخل رمز التحقق',
          style: GoogleFonts.cairo(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: AppTheme.textPrimary,
          ),
        ),
        
        const SizedBox(height: 4),
        
        Text(
          'تم إرسال رمز التحقق إلى',
          style: GoogleFonts.cairo(
            fontSize: 13,
            color: AppTheme.textSecondary,
          ),
        ),
        
        const SizedBox(height: 4),
        
        Directionality(
          textDirection: TextDirection.ltr,
          child: Text(
            _phoneController.text,
            style: GoogleFonts.cairo(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: AppTheme.primaryColor,
            ),
          ),
        ),
        
        if (_memberName.isNotEmpty) ...[
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(LucideIcons.checkCircle, size: 16, color: Colors.green.shade600),
              const SizedBox(width: 4),
              Text(
                _memberName,
                style: GoogleFonts.cairo(
                  fontSize: 13,
                  color: Colors.green.shade600,
                ),
              ),
            ],
          ),
        ],
        
        const SizedBox(height: 24),
        
        // Error message
        if (_otpError.isNotEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: Colors.red.shade50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.red.shade200),
            ),
            child: Row(
              children: [
                Icon(LucideIcons.alertCircle, size: 18, color: Colors.red.shade600),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _otpError,
                    style: GoogleFonts.cairo(
                      fontSize: 13,
                      color: Colors.red.shade600,
                    ),
                  ),
                ),
              ],
            ),
          ),
        
        // OTP input fields
        Directionality(
          textDirection: TextDirection.ltr,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: List.generate(6, (index) {
              return SizedBox(
                width: 45,
                height: 55,
                child: TextField(
                  controller: _otpControllers[index],
                  focusNode: _otpFocusNodes[index],
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.center,
                  maxLength: 1,
                  style: GoogleFonts.cairo(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                  decoration: InputDecoration(
                    counterText: '',
                    contentPadding: const EdgeInsets.symmetric(vertical: 12),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                  ],
                  onChanged: (value) => _handleOtpChange(index, value),
                  enabled: !_verifying,
                ),
              );
            }),
          ),
        ),
        
        const SizedBox(height: 16),
        
        // Timer
        Text(
          _expiryTime > 0
              ? 'صالح لمدة ${_formatTime(_expiryTime)}'
              : 'انتهت صلاحية الرمز',
          style: GoogleFonts.cairo(
            fontSize: 13,
            fontWeight: _expiryTime > 0 ? FontWeight.normal : FontWeight.bold,
            color: _expiryTime > 0 ? AppTheme.textSecondary : Colors.red,
          ),
        ),
        
        const SizedBox(height: 24),
        
        // Verify button
        SizedBox(
          width: double.infinity,
          height: 54,
          child: ElevatedButton(
            onPressed: _verifying ? null : _handleVerifyOTP,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: _verifying
                ? const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(LucideIcons.checkCircle, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        'تأكيد',
                        style: GoogleFonts.cairo(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
          ),
        ),
        
        const SizedBox(height: 12),
        
        // Resend button
        TextButton(
          onPressed: _resendCooldown > 0 || _sendingOTP ? null : _handleResendOTP,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (_sendingOTP)
                const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              else
                Icon(
                  LucideIcons.refreshCw,
                  size: 16,
                  color: _resendCooldown > 0 
                      ? AppTheme.textMuted 
                      : AppTheme.primaryColor,
                ),
              const SizedBox(width: 8),
              Text(
                _resendCooldown > 0
                    ? 'إعادة الإرسال بعد $_resendCooldown ثانية'
                    : 'إعادة إرسال الرمز',
                style: GoogleFonts.cairo(
                  fontSize: 13,
                  color: _resendCooldown > 0 
                      ? AppTheme.textMuted 
                      : AppTheme.primaryColor,
                ),
              ),
            ],
          ),
        ),
        
        // Change number button
        TextButton(
          onPressed: _handleBack,
          child: Text(
            'تغيير رقم الهاتف',
            style: GoogleFonts.cairo(
              fontSize: 13,
              color: AppTheme.textMuted,
            ),
          ),
        ),
      ],
    );
  }

  // Password login step
  Widget _buildPasswordStep() {
    return Column(
      children: [
        // Icon
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            gradient: AppTheme.primaryGradient,
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Icon(
            LucideIcons.lock,
            size: 32,
            color: Colors.white,
          ),
        ),

        const SizedBox(height: 16),

        Text(
          'أدخل كلمة المرور',
          style: GoogleFonts.cairo(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: AppTheme.textPrimary,
          ),
        ),

        const SizedBox(height: 4),

        Text(
          'أدخل كلمة المرور للدخول إلى حسابك',
          style: GoogleFonts.cairo(
            fontSize: 13,
            color: AppTheme.textSecondary,
          ),
        ),

        const SizedBox(height: 4),

        Directionality(
          textDirection: TextDirection.ltr,
          child: Text(
            _phoneController.text,
            style: GoogleFonts.cairo(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: AppTheme.primaryColor,
            ),
          ),
        ),

        const SizedBox(height: 24),

        // Error message
        if (_passwordError.isNotEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: Colors.red.shade50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.red.shade200),
            ),
            child: Row(
              children: [
                Icon(LucideIcons.alertCircle, size: 18, color: Colors.red.shade600),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _passwordError,
                    style: GoogleFonts.cairo(
                      fontSize: 13,
                      color: Colors.red.shade600,
                    ),
                  ),
                ),
              ],
            ),
          ),

        // Password input
        TextField(
          controller: _passwordController,
          obscureText: _obscurePassword,
          style: GoogleFonts.cairo(fontSize: 16),
          decoration: InputDecoration(
            hintText: 'كلمة المرور',
            prefixIcon: const Icon(LucideIcons.lock),
            suffixIcon: IconButton(
              icon: Icon(
                _obscurePassword ? LucideIcons.eyeOff : LucideIcons.eye,
              ),
              onPressed: () {
                setState(() => _obscurePassword = !_obscurePassword);
              },
            ),
          ),
          enabled: !_loggingIn,
          onSubmitted: (_) => _handlePasswordLogin(),
        ),

        const SizedBox(height: 8),

        // First-time login hint
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.blue.shade50,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.blue.shade100),
          ),
          child: Row(
            children: [
              Icon(LucideIcons.info, size: 16, color: Colors.blue.shade700),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'لأول مرة؟ كلمة المرور الافتراضية: 123456',
                  style: GoogleFonts.cairo(
                    fontSize: 12,
                    color: Colors.blue.shade700,
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 24),

        // Login button
        SizedBox(
          width: double.infinity,
          height: 54,
          child: ElevatedButton(
            onPressed: _loggingIn ? null : _handlePasswordLogin,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: _loggingIn
                ? const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(LucideIcons.logIn, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        'تسجيل الدخول',
                        style: GoogleFonts.cairo(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
          ),
        ),

        const SizedBox(height: 16),

        // Forgot password link
        TextButton(
          onPressed: () {
            context.push('/forgot-password');
          },
          child: Text(
            'نسيت كلمة المرور؟',
            style: GoogleFonts.cairo(
              fontSize: 13,
              color: AppTheme.primaryColor,
            ),
          ),
        ),

        // Change number / Use OTP button
        TextButton(
          onPressed: _handleBack,
          child: Text(
            'استخدام رمز التحقق بدلاً من ذلك',
            style: GoogleFonts.cairo(
              fontSize: 13,
              color: AppTheme.textMuted,
            ),
          ),
        ),
      ],
    );
  }
}
