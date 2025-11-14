import React, { memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HomeIcon, CreditCardIcon, BellIcon, UserIcon } from '@heroicons/react/24/outline';
import { HomeIcon as HomeIconSolid, CreditCardIcon as CreditCardIconSolid, BellIcon as BellIconSolid, UserIcon as UserIconSolid } from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';
import './BottomNav.css';

const BottomNav = ({ unreadNotifications = 0 }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      path: '/mobile/dashboard',
      label: 'الرئيسية',
      Icon: HomeIcon,
      IconSolid: HomeIconSolid
    },
    {
      path: '/mobile/payment',
      label: 'الدفع',
      Icon: CreditCardIcon,
      IconSolid: CreditCardIconSolid
    },
    {
      path: '/mobile/notifications',
      label: 'الإشعارات',
      Icon: BellIcon,
      IconSolid: BellIconSolid,
      badge: unreadNotifications
    },
    {
      path: '/mobile/profile',
      label: 'الملف',
      Icon: UserIcon,
      IconSolid: UserIconSolid
    }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-container">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const IconComponent = active ? item.IconSolid : item.Icon;

          return (
            <motion.button
              key={item.path}
              className={`nav-item ${active ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
              whileTap={{ scale: 0.9 }}
            >
              <div className="nav-icon-wrapper">
                <IconComponent className="nav-icon" />
                {item.badge > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="nav-badge"
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </motion.span>
                )}
              </div>
              <span className="nav-label">{item.label}</span>
              {active && (
                <motion.div
                  layoutId="activeIndicator"
                  className="active-indicator"
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

export default memo(BottomNav);
