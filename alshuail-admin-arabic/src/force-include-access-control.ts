import { logger } from './utils/logger';

/**
 * Force-Include Shim for Access Control Component
 *
 * CRITICAL: This file creates eager side-effects that prevent Webpack
 * from tree-shaking the Access Control component.
 *
 * DO NOT REMOVE THIS FILE - It is required for production builds.
 */

// Eager import with explicit webpack hints
import(
  /* webpackChunkName: "access-control-bundle" */
  /* webpackMode: "eager" */
  /* webpackExports: ["default", "AccessControl", "__KEEP_ACCESS_CONTROL__"] */
  './features/access-control'
).then((module) => {
  // Store in global scope to create visible side-effect
  if (typeof window !== 'undefined') {
    (window as any).__ACCESS_CONTROL_LOADED__ = true;
    (window as any).__ACCESS_CONTROL_COMPONENT__ = module.default;

    // Log in development to verify loading
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[Force-Include] Access Control component loaded successfully');
    }
  }
}).catch((error) => {
  logger.error('[Force-Include] Failed to load Access Control component:', { error });
});

// ADDITIONAL SAFETY: Create module-level side-effect
if (typeof window !== 'undefined') {
  (window as any).__FORCE_INCLUDE_SHIM_EXECUTED__ = true;
}

// Export to make this module non-empty (Webpack optimization safety)
export const FORCE_INCLUDE_MARKER = '__ACCESS_CONTROL_FORCE_INCLUDED__';
