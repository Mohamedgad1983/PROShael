// Fast Mock Auth Controller - For Development
// Returns instant response without database calls

const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        process.env.JWT_SECRET || 'dev-secret-key-2024',
        { expiresIn: '24h' }
    );
};

// Fast login controller - no database, instant response
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'البريد الإلكتروني وكلمة المرور مطلوبان'
            });
        }

        // Mock user data - instant response, no database
        const mockUser = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            email: email,
            full_name: 'مدير النظام',
            role: 'super_admin',
            permissions: [
                'members:read', 'members:write', 'members:delete',
                'payments:read', 'payments:write', 'payments:approve',
                'reports:read', 'reports:generate',
                'settings:read', 'settings:write'
            ]
        };

        // Generate token instantly
        const token = generateToken(mockUser);

        // Send response immediately - no delay
        return res.json({
            success: true,
            token: token,
            user: mockUser,
            message: 'تم تسجيل الدخول بنجاح'
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            error: 'حدث خطأ في الخادم'
        });
    }
};

// Verify token
const verifyToken = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key-2024');

        return res.json({
            success: true,
            user: decoded
        });
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: 'Invalid token'
        });
    }
};

module.exports = {
    login,
    verifyToken
};