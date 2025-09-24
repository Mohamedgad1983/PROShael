import React, { useState } from 'react';
import './MainContent.css';

const MainContent = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
  };

  return (
    <main className="main-content">
      <div className="container">
        <div className="login-container">
          <div className="login-header">
            <h2>مرحباً بكم في نظام الشعيل</h2>
            <p>نظام إدارة متكامل للعائلة</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">البريد الإلكتروني</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="أدخل بريدك الإلكتروني"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">كلمة المرور</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="أدخل كلمة المرور"
                required
              />
            </div>

            <button type="submit" className="login-button">
              تسجيل الدخول
            </button>
          </form>
        </div>
      </div>
    </main>
  );
};

export default MainContent;