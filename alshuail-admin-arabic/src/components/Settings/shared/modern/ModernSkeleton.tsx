/**
 * ModernSkeleton Component
 * Loading placeholder with animated gradient shimmer effect
 *
 * Features:
 * - Multiple shape variants (text, circle, rectangle, rounded)
 * - Animated shimmer gradient effect
 * - Width and height customization
 * - Text line variants (single, multiple lines)
 * - Pulse animation option
 * - Dark mode support
 * - RTL/LTR support
 *
 * @version 2.0.0
 * @date 2025-11-13
 */

import React, { HTMLAttributes } from 'react';
import { getTheme } from '../../modernDesignSystem';

// ============================================================================
// TYPES
// ============================================================================

export type SkeletonVariant = 'text' | 'circle' | 'rectangle' | 'rounded';
export type SkeletonAnimation = 'shimmer' | 'pulse' | 'none';

export interface ModernSkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Skeleton shape variant
   * @default 'text'
   */
  variant?: SkeletonVariant;

  /**
   * Animation type
   * @default 'shimmer'
   */
  animation?: SkeletonAnimation;

  /**
   * Width (CSS value: px, %, rem, etc.)
   * @default '100%'
   */
  width?: string | number;

  /**
   * Height (CSS value: px, %, rem, etc.)
   * Text variant defaults to line height, others default to width
   */
  height?: string | number;

  /**
   * Number of text lines (only for variant="text")
   * @default 1
   */
  lines?: number;

  /**
   * Gap between lines (only for variant="text" with lines > 1)
   * @default '8px'
   */
  lineGap?: string;

  /**
   * Border radius (CSS value)
   * Defaults based on variant
   */
  borderRadius?: string;

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
// MODERN SKELETON COMPONENT
// ============================================================================

export const ModernSkeleton: React.FC<ModernSkeletonProps> = ({
  variant = 'text',
  animation = 'shimmer',
  width = '100%',
  height,
  lines = 1,
  lineGap = '8px',
  borderRadius,
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

  // Base color for skeleton
  const baseColor = isDarkMode ? theme.colors.gray[800] : theme.colors.gray[200];
  const shimmerColor = isDarkMode ? theme.colors.gray[700] : theme.colors.gray[100];

  // Default dimensions based on variant
  const getDefaultDimensions = () => {
    switch (variant) {
      case 'text':
        return {
          width: typeof width === 'number' ? `${width}px` : width,
          height: height ? (typeof height === 'number' ? `${height}px` : height) : '1em',
          borderRadius: borderRadius || theme.borderRadius.sm
        };

      case 'circle':
        const circleSize = width || '40px';
        return {
          width: typeof circleSize === 'number' ? `${circleSize}px` : circleSize,
          height: height || circleSize,
          borderRadius: borderRadius || '50%'
        };

      case 'rectangle':
        return {
          width: typeof width === 'number' ? `${width}px` : width,
          height: height
            ? typeof height === 'number' ? `${height}px` : height
            : typeof width === 'number' ? `${width}px` : width,
          borderRadius: borderRadius || '0'
        };

      case 'rounded':
        return {
          width: typeof width === 'number' ? `${width}px` : width,
          height: height
            ? typeof height === 'number' ? `${height}px` : height
            : typeof width === 'number' ? `${width}px` : width,
          borderRadius: borderRadius || theme.borderRadius.lg
        };

      default:
        return {
          width: typeof width === 'number' ? `${width}px` : width,
          height: height ? (typeof height === 'number' ? `${height}px` : height) : '1em',
          borderRadius: borderRadius || theme.borderRadius.sm
        };
    }
  };

  const dimensions = getDefaultDimensions();

  // Shimmer animation keyframes (injected once)
  const shimmerKeyframes = `
    @keyframes shimmer {
      0% {
        background-position: -1000px 0;
      }
      100% {
        background-position: 1000px 0;
      }
    }
  `;

  // Pulse animation keyframes
  const pulseKeyframes = `
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.4;
      }
    }
  `;

  // Base skeleton styles
  const baseStyles: React.CSSProperties = {
    display: 'inline-block',
    width: dimensions.width,
    height: dimensions.height,
    borderRadius: dimensions.borderRadius,
    background: baseColor,
    overflow: 'hidden',
    position: 'relative',
    ...(animation === 'shimmer' && {
      backgroundImage: `linear-gradient(
        90deg,
        ${baseColor} 0%,
        ${shimmerColor} 20%,
        ${shimmerColor} 40%,
        ${baseColor} 100%
      )`,
      backgroundSize: '1000px 100%',
      animation: 'shimmer 2s infinite linear'
    }),
    ...(animation === 'pulse' && {
      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
    }),
    ...style
  };

  // Container styles for multiple lines
  const containerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: lineGap,
    direction: isRTL ? 'rtl' : 'ltr'
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  // Single skeleton element
  const renderSkeleton = (key?: number) => (
    <div
      key={key}
      style={baseStyles}
      className={className}
      role="status"
      aria-label="Loading..."
      aria-busy="true"
      {...(key === undefined ? rest : {})}
    >
      {/* Inject keyframes on first render */}
      {animation === 'shimmer' && key === 0 && <style>{shimmerKeyframes}</style>}
      {animation === 'pulse' && key === 0 && <style>{pulseKeyframes}</style>}
    </div>
  );

  // Multiple text lines
  if (variant === 'text' && lines > 1) {
    return (
      <div style={containerStyles} className={className} {...rest}>
        {Array.from({ length: lines }).map((_, index) => {
          // Last line is shorter (80% width)
          const isLastLine = index === lines - 1;
          const lineWidth = isLastLine && lines > 2 ? '80%' : width;

          return (
            <div
              key={index}
              style={{
                ...baseStyles,
                width: typeof lineWidth === 'number' ? `${lineWidth}px` : lineWidth
              }}
              role="status"
              aria-label="Loading..."
              aria-busy="true"
            >
              {animation === 'shimmer' && index === 0 && <style>{shimmerKeyframes}</style>}
              {animation === 'pulse' && index === 0 && <style>{pulseKeyframes}</style>}
            </div>
          );
        })}
      </div>
    );
  }

  // Single skeleton
  return renderSkeleton();
};

export default ModernSkeleton;
