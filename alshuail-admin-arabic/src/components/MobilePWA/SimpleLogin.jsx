import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SimpleLogin = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    console.log('Login form submitted');
    console.log('Phone:', phone);
    console.log('Password:', password);

    setLoading(true);

    // Store user data and navigate
    const userData = {
      phone: phone,
      name: 'عضو تجريبي',
      balance: 5000,
      membershipId: 'SH001'
    };
    const token = 'test-token-' + Date.now();

    console.log('Storing user data:', userData);
    localStorage.setItem('pwa_user', JSON.stringify(userData));
    localStorage.setItem('pwa_token', token);

    console.log('Navigating to dashboard in 500ms...');
    setTimeout(() => {
      console.log('Navigating now to /pwa/dashboard');
      navigate('/pwa/dashboard');
    }, 500);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      direction: 'rtl'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <h1 style={{
          textAlign: 'center',
          color: '#333',
          marginBottom: '30px',
          fontSize: '28px'
        }}>
          صندوق آل شعيل
        </h1>

        <form onSubmit={handleLogin}>
          {/* Phone Field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#333',
              fontSize: '16px',
              fontWeight: 'bold'
            }}>
              رقم الجوال
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05XXXXXXXX"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                direction: 'ltr',
                textAlign: 'left',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#333',
              fontSize: '16px',
              fontWeight: 'bold'
            }}>
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                direction: 'ltr',
                textAlign: 'left',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '18px',
              fontWeight: 'bold',
              color: 'white',
              background: loading ? '#999' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '10px'
            }}
          >
            {loading ? 'جاري التحميل...' : 'تسجيل الدخول'}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          color: '#666',
          fontSize: '14px'
        }}>
          يمكنك استخدام أي رقم وكلمة مرور للتجربة
        </div>
      </div>
    </div>
  );
};

export default SimpleLogin;