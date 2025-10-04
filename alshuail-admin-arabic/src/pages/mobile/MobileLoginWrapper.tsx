import React from 'react';
import MobileLogin from './Login';

const MobileLoginWrapper = () => {
  console.log('🚀 MobileLoginWrapper component rendered!');

  // Clear any existing admin session when accessing mobile login
  const user = localStorage.getItem('user');
  if (user) {
    try {
      const userData = JSON.parse(user);
      if (userData.role === 'admin' || userData.role === 'super_admin' || userData.role === 'moderator') {
        console.log('Clearing admin session for mobile login...');
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        // Reload to clear any cached state
        window.location.reload();
        return null;
      }
    } catch (e) {
      console.error('Error parsing user data:', e);
    }
  }

  return <MobileLogin />;
};

export default MobileLoginWrapper;