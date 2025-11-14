/**
 * ModernCard Component
 * Material Design card with elevation system, hover effects, and responsive layout
 *
 * Features:
 * - Material Design elevation levels
 * - Hover lift effect (optional)
 * - Header, body, footer sections
 * - Responsive padding
 * - Dark mode support
 * - RTL/LTR support
 * - Smooth transitions
 *
 * @version 2.0.0
 * @date 2025-11-13
 */

import React, { memo,  ReactNode, HTMLAttributes } from 'react';
import { getTheme } from '../../modernDesignSystem';

// ============================================================================
// TYPES
// ============================================================================

export type CardElevation = 'none' | 'sm' | 'md' | 'lg' | 'xl';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface ModernCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /**
   * Card elevation/shadow level
   * @default 'md'
   */
  elevation?: CardElevation;

  /**
   * Enable hover lift effect
   * @default false
   */
  hoverable?: boolean;

  /**
   * Card padding size
   * @default 'md'
   */
  padding?: CardPadding;

  /**
   * Card header content
   */
  header?: ReactNode;

  /**
   * Card title (string or element)
   */
  title?: ReactNode;

  /**
   * Card subtitle/description
   */
  subtitle?: ReactNode;

  /**
   * Card body content
   */
  children: ReactNode;

  /**
   * Card footer content
   */
  footer?: ReactNode;

  /**
   * Dark mode
   * @default false
   */
  isDarkMode?: boolean;

  /**
   * RTL mode
   * @default true
   */
  isRTL?: boolean;

  /**
   * Custom styles
   */
  style?: React.CSSProperties;

  /**
   * Click handler (makes card interactive)
   */
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

// ============================================================================
// MODERN CARD COMPONENT
// ============================================================================

export const ModernCard: React.FC<ModernCardProps> = ({
  elevation = 'md',
  hoverable = false,
  padding = 'md',
  header,
  title,
  subtitle,
  children,
  footer,
  isDarkMode = false,
  isRTL = true,
  style = {},
  onClick,
  className = '',
  ...rest
}) => {
  const theme = getTheme(isDarkMode, isRTL);
  const isInteractive = !!onClick || hoverable;

  // State for hover effect
  const [isHovered, setIsHovered] = React.useState(false);

  // ========================================================================
  // STYLES
  // ========================================================================

  // Elevation mapping
  const elevationMap: Record<CardElevation, string> = {
    none: theme.shadows.none,
    sm: theme.shadows.sm,
    md: theme.shadows.md,
    lg: theme.shadows.lg,
    xl: theme.shadows.xl
  };

  // Padding mapping
  const paddingMap: Record<CardPadding, string> = {
    none: '0',
    sm: theme.spacing.md,
    md: theme.spacing.lg,
    lg: theme.spacing.xl
  };

  // Base card styles
  const baseStyles: React.CSSProperties = {
    // Layout
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',

    // Background
    background: isDarkMode ? theme.colors.background : theme.colors.white,
    backdropFilter: 'blur(20px)',

    // Border
    borderRadius: theme.borderRadius['2xl'],
    border: isDarkMode ? `1px solid ${theme.colors.gray[700]}` : 'none',

    // Shadow
    boxShadow: elevationMap[elevation],

    // Transitions
    transition: `
      ${theme.transitions.common.all},
      ${theme.transitions.common.transform},
      ${theme.transitions.common.shadow}
    `,

    // Cursor
    cursor: isInteractive ? 'pointer' : 'default',

    // Overflow
    overflow: 'hidden',

    // Direction
    direction: isRTL ? 'rtl' : 'ltr'
  };

  // Hover styles
  const hoverStyles: React.CSSProperties = isHovered && isInteractive ? {
    boxShadow: elevationMap[elevation === 'xl' ? 'xl' : elevation === 'lg' ? 'xl' : 'lg'],
    transform: hoverable ? 'translateY(-4px)' : 'none'
  } : {};

  // Combine styles
  const cardStyles: React.CSSProperties = {
    ...baseStyles,
    ...hoverStyles,
    ...style
  };

  // Header section styles
  const headerStyles: React.CSSProperties = {
    padding: paddingMap[padding],
    borderBottom: `1px solid ${isDarkMode ? theme.colors.gray[700] : theme.colors.gray[200]}`,
    background: isDarkMode ? theme.colors.surface : theme.colors.gray[50]
  };

  // Title styles
  const titleStyles: React.CSSProperties = {
    margin: 0,
    fontSize: theme.fontSize.h3,
    fontWeight: theme.fontWeight.semibold,
    color: isDarkMode ? theme.colors.gray[100] : theme.colors.gray[900],
    lineHeight: theme.lineHeight.tight,
    fontFamily: theme.fonts.primary
  };

  // Subtitle styles
  const subtitleStyles: React.CSSProperties = {
    margin: 0,
    marginTop: theme.spacing['2xs'],
    fontSize: theme.fontSize.bodySm,
    fontWeight: theme.fontWeight.regular,
    color: isDarkMode ? theme.colors.gray[400] : theme.colors.gray[600],
    lineHeight: theme.lineHeight.normal,
    fontFamily: theme.fonts.primary
  };

  // Body section styles
  const bodyStyles: React.CSSProperties = {
    flex: 1,
    padding: paddingMap[padding],
    color: isDarkMode ? theme.colors.gray[300] : theme.colors.gray[800],
    fontSize: theme.fontSize.body,
    lineHeight: theme.lineHeight.normal,
    fontFamily: theme.fonts.primary
  };

  // Footer section styles
  const footerStyles: React.CSSProperties = {
    padding: paddingMap[padding],
    borderTop: `1px solid ${isDarkMode ? theme.colors.gray[700] : theme.colors.gray[200]}`,
    background: isDarkMode ? theme.colors.surface : theme.colors.gray[50]
  };

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  const handleMouseEnter = () => {
    if (isInteractive) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) {
      onClick(event);
    }
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div
      className={className}
      style={cardStyles}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      {...rest}
    >
      {/* Custom Header */}
      {header && (
        <div style={headerStyles}>
          {header}
        </div>
      )}

      {/* Title/Subtitle Header */}
      {(title || subtitle) && !header && (
        <div style={headerStyles}>
          {title && (
            typeof title === 'string' ? (
              <h3 style={titleStyles}>{title}</h3>
            ) : (
              title
            )
          )}
          {subtitle && (
            typeof subtitle === 'string' ? (
              <p style={subtitleStyles}>{subtitle}</p>
            ) : (
              subtitle
            )
          )}
        </div>
      )}

      {/* Card Body */}
      <div style={bodyStyles}>
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div style={footerStyles}>
          {footer}
        </div>
      )}
    </div>
  );
};

export default memo(ModernCard);
