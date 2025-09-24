import React from 'react';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="header-content">
        <h1 className="logo">الشعيل</h1>
        <nav className="navigation">
          <ul>
            <li><a href="#home">الرئيسية</a></li>
            <li><a href="#about">حول</a></li>
            <li><a href="#services">الخدمات</a></li>
            <li><a href="#contact">اتصل بنا</a></li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;