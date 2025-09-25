import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/database.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'البريد الإلكتروني وكلمة المرور مطلوبان'
      });
    }

    // FAST MODE - Skip database for development
    // Accept any email/password and return mock data instantly
    const mockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: email,
      role: 'super_admin',
      permissions: [
        'members:read', 'members:write', 'members:delete',
        'payments:read', 'payments:write', 'payments:approve',
        'reports:read', 'reports:generate',
        'settings:read', 'settings:write'
      ]
    };

    // Generate JWT token with mock user data - FAST MODE
    const token = jwt.sign(
      {
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        permissions: mockUser.permissions
      },
      process.env.JWT_SECRET || 'dev-secret-key-2024',
      { expiresIn: '7d' }
    );

    // Return instantly - no database delay
    res.json({
      success: true,
      token,
      user: mockUser
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في تسجيل الدخول'
    });
  }
});

// Mobile member login endpoint with test credentials support
router.post('/member-login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        error: 'رقم الهاتف وكلمة المرور مطلوبان'
      });
    }

    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = phone.replace(/\s|-/g, '');

    // Check for test credentials first (PWA development mode)
    const isTestUser = (cleanPhone === '0501234567' && password === 'password123') ||
                       (cleanPhone === '0555555555' && password === 'password123') ||
                       (cleanPhone === '0512345678' && password === 'password123');

    if (isTestUser) {
      // Return mock member data for test users
      const mockMember = {
        id: 'test-member-' + cleanPhone,
        full_name: cleanPhone === '0501234567' ? 'أحمد محمد الشعيل' : 'عضو تجريبي',
        phone: cleanPhone,
        membership_number: cleanPhone === '0501234567' ? 'SH001' : 'SH002',
        membership_status: 'active',
        balance: cleanPhone === '0501234567' ? 2500 : 3500,
        minimum_balance: 3000,
        join_date: '2023-06-15',
        total_paid: 450
      };

      const token = jwt.sign(
        {
          id: mockMember.id,
          phone: mockMember.phone,
          role: 'member',
          membershipNumber: mockMember.membership_number,
          fullName: mockMember.full_name
        },
        process.env.JWT_SECRET || 'dev-secret-key-2024',
        { expiresIn: '30d' }
      );

      return res.json({
        success: true,
        token,
        user: {
          id: mockMember.id,
          name: mockMember.full_name,
          phone: mockMember.phone,
          membershipId: mockMember.membership_number,
          avatar: null,
          role: 'member',
          balance: mockMember.balance,
          minimumBalance: mockMember.minimum_balance
        },
        message: 'تم تسجيل الدخول بنجاح'
      });
    }

    // Find member by phone number (for real users)
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('phone', cleanPhone)
      .eq('membership_status', 'active')
      .single();

    if (memberError || !member) {
      return res.status(401).json({
        success: false,
        error: 'رقم الهاتف أو كلمة المرور غير صحيح'
      });
    }

    // Verify password against temp_password (may be hashed or plain text)
    if (!member.temp_password) {
      return res.status(401).json({
        success: false,
        error: 'لم يتم تعيين كلمة مرور لهذا العضو'
      });
    }

    let isValidPassword = false;

    // Try plain text comparison first (for temp passwords stored as plain text)
    if (password === member.temp_password) {
      isValidPassword = true;
    } else {
      // Try bcrypt comparison (for hashed temp passwords)
      try {
        isValidPassword = await bcrypt.compare(password, member.temp_password);
      } catch (error) {
        // If bcrypt fails, it means temp_password is not a valid hash
        isValidPassword = false;
      }
    }

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'رقم الهاتف أو كلمة المرور غير صحيح'
      });
    }

    // Generate JWT token with member role
    const token = jwt.sign(
      {
        id: member.id,
        phone: member.phone,
        role: 'member',
        membershipNumber: member.membership_number,
        fullName: member.full_name
      },
      process.env.JWT_SECRET || 'dev-secret-key-2024',
      { expiresIn: '30d' } // Longer expiry for mobile
    );

    // Return member data (exclude sensitive fields)
    const { temp_password, password_hash, ...memberData } = member;
    res.json({
      success: true,
      token,
      user: {
        id: member.id,
        name: member.full_name,
        phone: member.phone,
        membershipId: member.membership_number,
        avatar: null,
        role: 'member',
        balance: member.balance || 0,
        minimumBalance: member.minimum_balance || 3000
      },
      message: 'تم تسجيل الدخول بنجاح'
    });

  } catch (error) {
    console.error('Mobile login error:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في تسجيل الدخول'
    });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'رمز التوثيق مطلوب'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    res.json({
      success: true,
      user: decoded
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'رمز التوثيق غير صالح'
    });
  }
});

// Add alias endpoint for PWA compatibility - duplicate the member-login logic
router.post('/mobile-login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        error: 'رقم الهاتف وكلمة المرور مطلوبان'
      });
    }

    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = phone.replace(/\s|-/g, '');

    // Check for test credentials first (PWA development mode)
    const isTestUser = (cleanPhone === '0501234567' && password === 'password123') ||
                       (cleanPhone === '0555555555' && password === 'password123') ||
                       (cleanPhone === '0512345678' && password === 'password123');

    if (isTestUser) {
      // Return mock member data for test users
      const mockMember = {
        id: 'test-member-' + cleanPhone,
        full_name: cleanPhone === '0501234567' ? 'أحمد محمد الشعيل' : 'عضو تجريبي',
        phone: cleanPhone,
        membership_number: cleanPhone === '0501234567' ? 'SH001' : 'SH002',
        membership_status: 'active',
        balance: cleanPhone === '0501234567' ? 2500 : 3500,
        minimum_balance: 3000,
        join_date: '2023-06-15',
        total_paid: 450
      };

      const token = jwt.sign(
        {
          id: mockMember.id,
          phone: mockMember.phone,
          role: 'member',
          membershipNumber: mockMember.membership_number,
          fullName: mockMember.full_name
        },
        process.env.JWT_SECRET || 'dev-secret-key-2024',
        { expiresIn: '30d' }
      );

      return res.json({
        success: true,
        token,
        user: {
          id: mockMember.id,
          name: mockMember.full_name,
          phone: mockMember.phone,
          membershipId: mockMember.membership_number,
          avatar: null,
          role: 'member',
          balance: mockMember.balance,
          minimumBalance: mockMember.minimum_balance
        },
        message: 'تم تسجيل الدخول بنجاح'
      });
    }

    // Return error for non-test users to avoid database calls in this demo
    return res.status(401).json({
      success: false,
      error: 'رقم الهاتف أو كلمة المرور غير صحيح'
    });

  } catch (error) {
    console.error('Mobile login error:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في تسجيل الدخول'
    });
  }
});


export default router;