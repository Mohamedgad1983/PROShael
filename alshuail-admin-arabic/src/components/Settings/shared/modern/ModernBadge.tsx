/**
 * ModernBadge Component
 * Versatile badge component for labels, status indicators, and counters
 *
 * Features:
 * - 5 semantic variants (primary, success, warning, error, info)
 * - 3 visual styles (solid, subtle, outline)
 * - 4 sizes (small, medium, large, xlarge)
 * - 3 display modes (pill, rounded, square)
 * - Dot indicator option
 * - Icon support
 * - Removable/closable option
 * - Dark mode support
 * - RTL/LTR support
 * - Accessibility support
 *
 * @version 2.0.0
 * @date 2025-11-13
 */

import React, { memo,  HTMLAttributes, ReactNode } from 'react';
import { getTheme } from '../../modernDesignSystem';
import { XMarkIcon } from '@heroicons/react/24/solid';

// ============================================================================
// TYPES
// ============================================================================

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'gray';
export type BadgeStyle = 'solid' | 'subtle' | 'outline';
export type BadgeSize = 'small' | 'medium' | 'large' | 'xlarge';
export type BadgeShape = 'pill' | 'rounded' | 'square';

export interface ModernBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'style'> {
  /**
   * Badge content
   */
  children: ReactNode;

  /**
   * Badge variant/color
   * @default 'primary'
   */
  variant?: BadgeVariant;

  /**
   * Badge visual style
   * @default 'solid'
   */
  badgeStyle?: BadgeStyle;

  /**
   * Badge size
   * @default 'medium'
   */
  size?: BadgeSize;

  /**
   * Badge shape
   * @default 'pill'
   */
  shape?: BadgeShape;

  /**
   * Show dot indicator before text
   * @default false
   */
  dot?: boolean;

  /**
   * Icon element (left side for LTR, right side for RTL)
   */
  icon?: ReactNode;

  /**
   * Removable badge with close button
   * @default false
   */
  removable?: boolean;

  /**
   * Remove handler
   */
  onRemove?: () => void;

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
   * Additional CSS classes
   */
  className?: string;
}

// ============================================================================
// SIZE CONFIGURATION
// ============================================================================

const SIZE_CONFIG = {
  small: {
    fontSize: '11px',
    height: '20px',
    padding: '0 8px',
    dotSize: '6px',
    iconSize: '12px',
    gap: '4px'
  },
  medium: {
    fontSize: '12px',
    height: '24px',
    padding: '0 12px',
    dotSize: '8px',
    iconSize: '14px',
    gap: '6px'
  },
  large: {
    fontSize: '14px',
    height: '28px',
    padding: '0 16px',
    dotSize: '8px',
    iconSize: '16px',
    gap: '8px'
  },
  xlarge: {
    fontSize: '16px',
    height: '32px',
    padding: '0 20px',
    dotSize: '10px',
    iconSize: '18px',
    gap: '10px'
  }
};

// ============================================================================
// MODERN BADGE COMPONENT
// ============================================================================

export const ModernBadge: React.FC<ModernBadgeProps> = ({
  children,
  variant = 'primary',
  badgeStyle = 'solid',
  size = 'medium',
  shape = 'pill',
  dot = false,
  icon,
  removable = false,
  onRemove,
  isDarkMode = false,
  isRTL = true,
  style = {},
  className = '',
  ...rest
}) => {
  const theme = getTheme(isDarkMode, isRTL);
  const sizeConfig = SIZE_CONFIG[size];

  // ========================================================================
  // STYLES
  // ========================================================================

  // Variant color mapping
  const variantColors = {
    primary: {
      solid: {
        background: theme.colors.primary[500],
        color: theme.colors.white,
        border: 'transparent'
      },
      subtle: {
        background: isDarkMode ? `${theme.colors.primary[500]}20` : theme.colors.primary[50],
        color: isDarkMode ? theme.colors.primary[400] : theme.colors.primary[700],
        border: 'transparent'
      },
      outline: {
        background: 'transparent',
        color: isDarkMode ? theme.colors.primary[400] : theme.colors.primary[600],
        border: isDarkMode ? theme.colors.primary[400] : theme.colors.primary[500]
      }
    },
    success: {
      solid: {
        background: theme.colors.success[500],
        color: theme.colors.white,
        border: 'transparent'
      },
      subtle: {
        background: isDarkMode ? `${theme.colors.success[500]}20` : theme.colors.success[50],
        color: isDarkMode ? theme.colors.success[400] : theme.colors.success[700],
        border: 'transparent'
      },
      outline: {
        background: 'transparent',
        color: isDarkMode ? theme.colors.success[400] : theme.colors.success[600],
        border: isDarkMode ? theme.colors.success[400] : theme.colors.success[500]
      }
    },
    warning: {
      solid: {
        background: theme.colors.warning[500],
        color: theme.colors.white,
        border: 'transparent'
      },
      subtle: {
        background: isDarkMode ? `${theme.colors.warning[500]}20` : theme.colors.warning[50],
        color: isDarkMode ? theme.colors.warning[400] : theme.colors.warning[700],
        border: 'transparent'
      },
      outline: {
        background: 'transparent',
        color: isDarkMode ? theme.colors.warning[400] : theme.colors.warning[600],
        border: isDarkMode ? theme.colors.warning[400] : theme.colors.warning[500]
      }
    },
    error: {
      solid: {
        background: theme.colors.error[500],
        color: theme.colors.white,
        border: 'transparent'
      },
      subtle: {
        background: isDarkMode ? `${theme.colors.error[500]}20` : theme.colors.error[50],
        color: isDarkMode ? theme.colors.error[400] : theme.colors.error[700],
        border: 'transparent'
      },
      outline: {
        background: 'transparent',
        color: isDarkMode ? theme.colors.error[400] : theme.colors.error[600],
        border: isDarkMode ? theme.colors.error[400] : theme.colors.error[500]
      }
    },
    info: {
      solid: {
        background: theme.colors.info[500],
        color: theme.colors.white,
        border: 'transparent'
      },
      subtle: {
        background: isDarkMode ? `${theme.colors.info[500]}20` : theme.colors.info[50],
        color: isDarkMode ? theme.colors.info[400] : theme.colors.info[700],
        border: 'transparent'
      },
      outline: {
        background: 'transparent',
        color: isDarkMode ? theme.colors.info[400] : theme.colors.info[600],
        border: isDarkMode ? theme.colors.info[400] : theme.colors.info[500]
      }
    },
    gray: {
      solid: {
        background: isDarkMode ? theme.colors.gray[700] : theme.colors.gray[500],
        color: theme.colors.white,
        border: 'transparent'
      },
      subtle: {
        background: isDarkMode ? theme.colors.gray[800] : theme.colors.gray[100],
        color: isDarkMode ? theme.colors.gray[300] : theme.colors.gray[700],
        border: 'transparent'
      },
      outline: {
        background: 'transparent',
        color: isDarkMode ? theme.colors.gray[400] : theme.colors.gray[600],
        border: isDarkMode ? theme.colors.gray[600] : theme.colors.gray[400]
      }
    }
  };

  const currentColors = variantColors[variant][badgeStyle];

  // Border radius mapping
  const borderRadiusMap = {
    pill: '999px',
    rounded: theme.borderRadius.lg,
    square: theme.borderRadius.sm
  };

  // Base badge styles
  const badgeStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sizeConfig.gap,
    height: sizeConfig.height,
    padding: sizeConfig.padding,
    fontSize: sizeConfig.fontSize,
    fontWeight: theme.fontWeight.medium,
    fontFamily: theme.fonts.primary,
    lineHeight: '1',
    whiteSpace: 'nowrap',
    borderRadius: borderRadiusMap[shape],
    background: currentColors.background,
    color: currentColors.color,
    border: badgeStyle === 'outline' ? `1px solid ${currentColors.border}` : 'none',
    transition: theme.transitions.common.all,
    userSelect: 'none' as const,
    direction: isRTL ? 'rtl' : 'ltr',
    ...style
  };

  // Dot indicator styles
  const dotStyles: React.CSSProperties = {
    width: sizeConfig.dotSize,
    height: sizeConfig.dotSize,
    borderRadius: '50%',
    background: currentColors.color,
    flexShrink: 0
  };

  // Icon styles
  const iconStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: sizeConfig.iconSize,
    height: sizeConfig.iconSize,
    flexShrink: 0
  };

  // Remove button styles
  const removeButtonStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: sizeConfig.iconSize,
    height: sizeConfig.iconSize,
    marginLeft: isRTL ? '0' : sizeConfig.gap,
    marginRight: isRTL ? sizeConfig.gap : '0',
    cursor: 'pointer',
    borderRadius: '50%',
    transition: theme.transitions.common.all,
    opacity: 0.7,
    flexShrink: 0
  };

  const [isHoveringRemove, setIsHoveringRemove] = React.useState(false);

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.();
  };

  const handleRemoveMouseEnter = () => {
    setIsHoveringRemove(true);
  };

  const handleRemoveMouseLeave = () => {
    setIsHoveringRemove(false);
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <span
      style={badgeStyles}
      className={className}
      role="status"
      aria-label={typeof children === 'string' ? children : undefined}
      {...rest}
    >
      {/* Dot Indicator */}
      {dot && <span style={dotStyles} aria-hidden="true" />}

      {/* Icon */}
      {icon && (
        <span style={iconStyles} aria-hidden="true">
          {icon}
        </span>
      )}

      {/* Content */}
      <span>{children}</span>

      {/* Remove Button */}
      {removable && (
        <span
          style={{
            ...removeButtonStyles,
            opacity: isHoveringRemove ? 1 : 0.7,
            background: isHoveringRemove
              ? badgeStyle === 'solid'
                ? 'rgba(0, 0, 0, 0.1)'
                : 'rgba(0, 0, 0, 0.05)'
              : 'transparent'
          }}
          onClick={handleRemove}
          onMouseEnter={handleRemoveMouseEnter}
          onMouseLeave={handleRemoveMouseLeave}
          role="button"
          aria-label="Remove"
          tabIndex={0}
        >
          <XMarkIcon style={{ width: '100%', height: '100%' }} />
        </span>
      )}
    </span>
  );
};

export default memo(ModernBadge);
