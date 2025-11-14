/**
 * ModernTooltip Component
 * Position-aware tooltip with fade animations and arrow pointer
 *
 * Features:
 * - 8 placement positions (top, bottom, left, right + variants)
 * - Fade in/out animations
 * - Arrow pointer
 * - Trigger modes (hover, click, focus)
 * - Delay configuration
 * - Max width control
 * - Dark/light variants
 * - RTL/LTR support
 * - Accessibility (role="tooltip", aria-describedby)
 *
 * @version 2.0.0
 * @date 2025-11-13
 */

import React, { memo,  ReactNode, useState, useRef, useEffect } from 'react';
import { getTheme } from '../../modernDesignSystem';

// ============================================================================
// TYPES
// ============================================================================

export type TooltipPlacement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'right';

export type TooltipTrigger = 'hover' | 'click' | 'focus' | 'manual';

export interface ModernTooltipProps {
  /**
   * Tooltip content
   */
  content: ReactNode;

  /**
   * Element that triggers the tooltip
   */
  children: ReactNode;

  /**
   * Tooltip placement
   * @default 'top'
   */
  placement?: TooltipPlacement;

  /**
   * Trigger mode
   * @default 'hover'
   */
  trigger?: TooltipTrigger;

  /**
   * Show delay in milliseconds
   * @default 200
   */
  showDelay?: number;

  /**
   * Hide delay in milliseconds
   * @default 0
   */
  hideDelay?: number;

  /**
   * Max width in pixels
   * @default 250
   */
  maxWidth?: number;

  /**
   * Show arrow pointer
   * @default true
   */
  arrow?: boolean;

  /**
   * Manually control visibility (for trigger="manual")
   */
  visible?: boolean;

  /**
   * Visibility change callback
   */
  onVisibleChange?: (visible: boolean) => void;

  /**
   * Disabled tooltip
   * @default false
   */
  disabled?: boolean;

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
   * Additional CSS classes for wrapper
   */
  className?: string;

  /**
   * Additional CSS classes for tooltip
   */
  tooltipClassName?: string;
}

// ============================================================================
// MODERN TOOLTIP COMPONENT
// ============================================================================

export const ModernTooltip: React.FC<ModernTooltipProps> = ({
  content,
  children,
  placement = 'top',
  trigger = 'hover',
  showDelay = 200,
  hideDelay = 0,
  maxWidth = 250,
  arrow = true,
  visible: controlledVisible,
  onVisibleChange,
  disabled = false,
  isDarkMode = false,
  isRTL = true,
  className = '',
  tooltipClassName = ''
}) => {
  const theme = getTheme(isDarkMode, isRTL);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [internalVisible, setInternalVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const visible = controlledVisible !== undefined ? controlledVisible : internalVisible;

  // Generate unique ID for aria-describedby
  const tooltipId = useRef(`tooltip-${Math.random().toString(36).substr(2, 9)}`).current;

  // ========================================================================
  // POSITION CALCULATION
  // ========================================================================

  const calculatePosition = () => {
    if (!wrapperRef.current || !tooltipRef.current) return;

    const triggerRect = wrapperRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const gap = 8; // Gap between trigger and tooltip
    const arrowSize = arrow ? 6 : 0;

    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - gap - arrowSize;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;

      case 'top-start':
        top = triggerRect.top - tooltipRect.height - gap - arrowSize;
        left = triggerRect.left;
        break;

      case 'top-end':
        top = triggerRect.top - tooltipRect.height - gap - arrowSize;
        left = triggerRect.right - tooltipRect.width;
        break;

      case 'bottom':
        top = triggerRect.bottom + gap + arrowSize;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;

      case 'bottom-start':
        top = triggerRect.bottom + gap + arrowSize;
        left = triggerRect.left;
        break;

      case 'bottom-end':
        top = triggerRect.bottom + gap + arrowSize;
        left = triggerRect.right - tooltipRect.width;
        break;

      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - gap - arrowSize;
        break;

      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + gap + arrowSize;
        break;
    }

    // Viewport boundary checks
    const padding = 8;
    if (left < padding) left = padding;
    if (left + tooltipRect.width > window.innerWidth - padding) {
      left = window.innerWidth - tooltipRect.width - padding;
    }
    if (top < padding) top = padding;
    if (top + tooltipRect.height > window.innerHeight - padding) {
      top = window.innerHeight - tooltipRect.height - padding;
    }

    setPosition({ top, left });
  };

  // ========================================================================
  // VISIBILITY CONTROL
  // ========================================================================

  const show = () => {
    if (disabled) return;

    clearTimeout(hideTimeoutRef.current);
    showTimeoutRef.current = setTimeout(() => {
      if (controlledVisible === undefined) {
        setInternalVisible(true);
      }
      onVisibleChange?.(true);
    }, showDelay);
  };

  const hide = () => {
    clearTimeout(showTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      if (controlledVisible === undefined) {
        setInternalVisible(false);
      }
      onVisibleChange?.(false);
    }, hideDelay);
  };

  const toggle = () => {
    if (visible) {
      hide();
    } else {
      show();
    }
  };

  // ========================================================================
  // EFFECTS
  // ========================================================================

  // Calculate position when visible changes
  useEffect(() => {
    if (visible) {
      calculatePosition();

      // Recalculate on window resize/scroll
      const handleUpdate = () => calculatePosition();
      window.addEventListener('resize', handleUpdate);
      window.addEventListener('scroll', handleUpdate, true);

      return () => {
        window.removeEventListener('resize', handleUpdate);
        window.removeEventListener('scroll', handleUpdate, true);
      };
    }
  }, [visible, placement]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      clearTimeout(showTimeoutRef.current);
      clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  // ========================================================================
  // STYLES
  // ========================================================================

  const wrapperStyles: React.CSSProperties = {
    display: 'inline-block',
    position: 'relative'
  };

  const tooltipStyles: React.CSSProperties = {
    position: 'fixed',
    top: `${position.top}px`,
    left: `${position.left}px`,
    maxWidth: `${maxWidth}px`,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    background: isDarkMode ? theme.colors.gray[800] : theme.colors.gray[900],
    color: theme.colors.white,
    fontSize: theme.fontSize.bodySm,
    fontWeight: theme.fontWeight.regular,
    fontFamily: theme.fonts.primary,
    lineHeight: theme.lineHeight.normal,
    borderRadius: theme.borderRadius.md,
    boxShadow: theme.shadows.lg,
    zIndex: theme.zIndex.tooltip,
    pointerEvents: 'none',
    opacity: visible ? 1 : 0,
    visibility: visible ? 'visible' : 'hidden',
    transform: visible ? 'scale(1)' : 'scale(0.95)',
    transition: `opacity 150ms ${theme.transitions.easing.standard},
                 transform 150ms ${theme.transitions.easing.standard},
                 visibility 150ms`,
    wordWrap: 'break-word',
    direction: isRTL ? 'rtl' : 'ltr'
  };

  // Arrow styles based on placement
  const getArrowStyles = (): React.CSSProperties => {
    const arrowSize = 6;
    const baseStyles: React.CSSProperties = {
      position: 'absolute',
      width: 0,
      height: 0,
      borderStyle: 'solid',
      borderColor: 'transparent'
    };

    if (placement.startsWith('top')) {
      return {
        ...baseStyles,
        bottom: `-${arrowSize}px`,
        left: placement === 'top' ? '50%' : placement === 'top-start' ? '20px' : 'auto',
        right: placement === 'top-end' ? '20px' : 'auto',
        transform: placement === 'top' ? 'translateX(-50%)' : 'none',
        borderWidth: `${arrowSize}px ${arrowSize}px 0 ${arrowSize}px`,
        borderTopColor: isDarkMode ? theme.colors.gray[800] : theme.colors.gray[900]
      };
    }

    if (placement.startsWith('bottom')) {
      return {
        ...baseStyles,
        top: `-${arrowSize}px`,
        left: placement === 'bottom' ? '50%' : placement === 'bottom-start' ? '20px' : 'auto',
        right: placement === 'bottom-end' ? '20px' : 'auto',
        transform: placement === 'bottom' ? 'translateX(-50%)' : 'none',
        borderWidth: `0 ${arrowSize}px ${arrowSize}px ${arrowSize}px`,
        borderBottomColor: isDarkMode ? theme.colors.gray[800] : theme.colors.gray[900]
      };
    }

    if (placement === 'left') {
      return {
        ...baseStyles,
        right: `-${arrowSize}px`,
        top: '50%',
        transform: 'translateY(-50%)',
        borderWidth: `${arrowSize}px 0 ${arrowSize}px ${arrowSize}px`,
        borderLeftColor: isDarkMode ? theme.colors.gray[800] : theme.colors.gray[900]
      };
    }

    if (placement === 'right') {
      return {
        ...baseStyles,
        left: `-${arrowSize}px`,
        top: '50%',
        transform: 'translateY(-50%)',
        borderWidth: `${arrowSize}px ${arrowSize}px ${arrowSize}px 0`,
        borderRightColor: isDarkMode ? theme.colors.gray[800] : theme.colors.gray[900]
      };
    }

    return baseStyles;
  };

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  const handleMouseEnter = () => {
    if (trigger === 'hover') show();
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') hide();
  };

  const handleClick = () => {
    if (trigger === 'click') toggle();
  };

  const handleFocus = () => {
    if (trigger === 'focus') show();
  };

  const handleBlur = () => {
    if (trigger === 'focus') hide();
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <>
      <div
        ref={wrapperRef}
        style={wrapperStyles}
        className={className}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onFocus={handleFocus}
        onBlur={handleBlur}
        aria-describedby={visible ? tooltipId : undefined}
      >
        {children}
      </div>

      {/* Tooltip Portal (rendered at document level for proper positioning) */}
      <div
        ref={tooltipRef}
        id={tooltipId}
        role="tooltip"
        style={tooltipStyles}
        className={tooltipClassName}
      >
        {content}
        {arrow && <div style={getArrowStyles()} />}
      </div>
    </>
  );
};

export default memo(ModernTooltip);
