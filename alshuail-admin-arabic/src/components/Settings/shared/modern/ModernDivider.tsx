/**
 * ModernDivider Component
 * Horizontal and vertical dividers with optional text integration
 *
 * Features:
 * - Horizontal and vertical orientations
 * - Text/label integration (left, center, right)
 * - Multiple thickness options
 * - Dashed/solid styles
 * - Spacing control
 * - Dark mode support
 * - RTL/LTR support
 * - Semantic colors
 *
 * @version 2.0.0
 * @date 2025-11-13
 */

import React, { HTMLAttributes, ReactNode } from 'react';
import { getTheme } from '../../modernDesignSystem';

// ============================================================================
// TYPES
// ============================================================================

export type DividerOrientation = 'horizontal' | 'vertical';
export type DividerStyle = 'solid' | 'dashed' | 'dotted';
export type DividerThickness = 'thin' | 'medium' | 'thick';
export type DividerTextAlign = 'left' | 'center' | 'right';
export type DividerVariant = 'default' | 'primary' | 'success' | 'warning' | 'error';

export interface ModernDividerProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Divider orientation
   * @default 'horizontal'
   */
  orientation?: DividerOrientation;

  /**
   * Divider line style
   * @default 'solid'
   */
  dividerStyle?: DividerStyle;

  /**
   * Divider thickness
   * @default 'thin'
   */
  thickness?: DividerThickness;

  /**
   * Text/label to display (only for horizontal)
   */
  children?: ReactNode;

  /**
   * Text alignment (only for horizontal with children)
   * @default 'center'
   */
  textAlign?: DividerTextAlign;

  /**
   * Color variant
   * @default 'default'
   */
  variant?: DividerVariant;

  /**
   * Spacing around divider (multiplier of base spacing)
   * @default 1
   */
  spacing?: number;

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
// MODERN DIVIDER COMPONENT
// ============================================================================

export const ModernDivider: React.FC<ModernDividerProps> = ({
  orientation = 'horizontal',
  dividerStyle = 'solid',
  thickness = 'thin',
  children,
  textAlign = 'center',
  variant = 'default',
  spacing = 1,
  isDarkMode = false,
  isRTL = true,
  style = {},
  className = '',
  ...rest
}) => {
  const theme = getTheme(isDarkMode, isRTL);

  // ========================================================================
  // STYLES
  // ========================================================================

  // Thickness mapping
  const thicknessMap = {
    thin: '1px',
    medium: '2px',
    thick: '3px'
  };

  // Color variants
  const variantColors = {
    default: isDarkMode ? theme.colors.gray[700] : theme.colors.gray[200],
    primary: theme.colors.primary[500],
    success: theme.colors.success[500],
    warning: theme.colors.warning[500],
    error: theme.colors.error[500]
  };

  const dividerColor = variantColors[variant];
  const dividerThickness = thicknessMap[thickness];

  // Base spacing for margins
  const baseSpacing = spacing * 16; // 16px base

  // Container styles (horizontal or vertical)
  const containerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    fontFamily: theme.fonts.primary,
    direction: isRTL ? 'rtl' : 'ltr',
    ...(orientation === 'horizontal'
      ? {
          width: '100%',
          marginTop: `${baseSpacing}px`,
          marginBottom: `${baseSpacing}px`,
          flexDirection: 'row'
        }
      : {
          height: '100%',
          marginLeft: `${baseSpacing}px`,
          marginRight: `${baseSpacing}px`,
          flexDirection: 'column'
        }),
    ...style
  };

  // Line styles
  const lineStyles: React.CSSProperties = {
    flex: 1,
    ...(orientation === 'horizontal'
      ? {
          height: dividerThickness,
          borderTop: `${dividerThickness} ${dividerStyle} ${dividerColor}`
        }
      : {
          width: dividerThickness,
          borderLeft: `${dividerThickness} ${dividerStyle} ${dividerColor}`
        })
  };

  // Text wrapper styles (only for horizontal with children)
  const textWrapperStyles: React.CSSProperties = {
    padding: `0 ${theme.spacing.md}`,
    fontSize: theme.fontSize.bodySm,
    fontWeight: theme.fontWeight.medium,
    color: isDarkMode ? theme.colors.gray[400] : theme.colors.gray[600],
    whiteSpace: 'nowrap',
    flexShrink: 0
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  // Vertical divider (no text support)
  if (orientation === 'vertical') {
    return (
      <div
        style={containerStyles}
        className={className}
        role="separator"
        aria-orientation="vertical"
        {...rest}
      >
        <div style={lineStyles} />
      </div>
    );
  }

  // Horizontal divider without text
  if (!children) {
    return (
      <div
        style={containerStyles}
        className={className}
        role="separator"
        aria-orientation="horizontal"
        {...rest}
      >
        <div style={lineStyles} />
      </div>
    );
  }

  // Horizontal divider with text
  const renderTextDivider = () => {
    switch (textAlign) {
      case 'left':
        return (
          <>
            <span style={textWrapperStyles}>{children}</span>
            <div style={lineStyles} />
          </>
        );

      case 'right':
        return (
          <>
            <div style={lineStyles} />
            <span style={textWrapperStyles}>{children}</span>
          </>
        );

      case 'center':
      default:
        return (
          <>
            <div style={lineStyles} />
            <span style={textWrapperStyles}>{children}</span>
            <div style={lineStyles} />
          </>
        );
    }
  };

  return (
    <div
      style={containerStyles}
      className={className}
      role="separator"
      aria-orientation="horizontal"
      aria-label={typeof children === 'string' ? children : undefined}
      {...rest}
    >
      {renderTextDivider()}
    </div>
  );
};

export default ModernDivider;
