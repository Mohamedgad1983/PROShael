import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import styles from './styles';

export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

interface NavigationListProps {
  items: NavigationItem[];
  activeSection: string;
  onSelect: (id: string, event: React.MouseEvent<HTMLButtonElement>) => void;
}

const NavigationList: React.FC<NavigationListProps> = ({ items, activeSection, onSelect }) => (
  <>
    {items.map((item) => {
      const Icon = item.icon;
      const isActive = activeSection === item.id;

      return (
        <button
          key={item.id}
          onClick={(event) => onSelect(item.id, event)}
          style={{
            ...styles.menuItem,
            ...(isActive ? styles.menuItemActive : {})
          }}
          onMouseEnter={(event) => {
            if (!isActive) {
              Object.assign(event.currentTarget.style, styles.menuItemHover);
              const icon = event.currentTarget.querySelector('svg');
              if (icon instanceof HTMLElement) {
                icon.style.transform = 'scale(1.1) rotate(-5deg)';
              }
            }
          }}
          onMouseLeave={(event) => {
            if (!isActive) {
              event.currentTarget.style.background = 'transparent';
              event.currentTarget.style.transform = 'translateX(0)';
              const icon = event.currentTarget.querySelector('svg');
              if (icon instanceof HTMLElement) {
                icon.style.transform = 'scale(1) rotate(0)';
              }
            }
          }}
          aria-label={item.label}
          aria-current={isActive ? 'page' : undefined}
        >
          <div
            style={{
              ...styles.activeIndicator,
              ...(isActive ? styles.activeIndicatorVisible : {})
            }}
          />
          <Icon
            style={{
              ...styles.menuIcon,
              ...(isActive ? styles.menuIconActive : {})
            }}
          />
          <span>{item.label}</span>
        </button>
      );
    })}
  </>
);

interface NavigationShellProps {
  logoSrc: string;
  title: string;
  subtitle: string;
  logoSize?: number;
}

const NavigationShell: React.FC<NavigationShellProps> = ({ logoSrc, title, subtitle, logoSize = 140 }) => (
  <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
    <img
      src={logoSrc}
      alt={title}
      style={{
        width: `${logoSize}px`,
        height: `${logoSize}px`,
        display: 'block',
        margin: '0 auto 1rem auto',
        filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '50%',
        padding: '10px'
      }}
    />
    <h2 style={{ fontSize: '20px', marginBottom: '8px', color: '#ffffff', fontWeight: '400' }}>{title}</h2>
    <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>{subtitle}</p>
  </div>
);

interface DesktopNavigationProps extends NavigationListProps {
  logoSrc: string;
  title: string;
  subtitle: string;
}

export const DesktopNavigation: React.FC<DesktopNavigationProps> = ({
  items,
  activeSection,
  onSelect,
  logoSrc,
  title,
  subtitle
}) => (
  <div className="desktop-sidebar" style={styles.sidebar}>
    <NavigationShell logoSrc={logoSrc} title={title} subtitle={subtitle} />
    <NavigationList items={items} activeSection={activeSection} onSelect={onSelect} />
  </div>
);

interface MobileNavigationProps extends NavigationListProps {
  logoSrc: string;
  title: string;
  subtitle: string;
  sidebarOpen: boolean;
  onClose: () => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  items,
  activeSection,
  onSelect,
  logoSrc,
  title,
  subtitle,
  sidebarOpen,
  onClose
}) => (
  <div
    className="mobile-sidebar"
    style={{
      ...styles.sidebarMobile,
      ...(sidebarOpen ? styles.sidebarMobileOpen : {})
    }}
  >
    <button
      onClick={onClose}
      style={styles.closeButton}
      aria-label="????? ???????"
    >
      <XMarkIcon style={{ width: '20px', height: '20px' }} />
    </button>
    <div style={{ marginBottom: '2rem', marginTop: '3rem', textAlign: 'center' }}>
      <NavigationShell logoSrc={logoSrc} title={title} subtitle={subtitle} logoSize={100} />
    </div>
    <NavigationList
      items={items}
      activeSection={activeSection}
      onSelect={(id, event) => {
        onSelect(id, event);
        onClose();
      }}
    />
  </div>
);
