/**
 * Feature Package: Access Control (Password Management)
 * This package wrapper prevents Webpack from tree-shaking the component
 */

// Import the actual component
import AccessControlComponent from '../../components/Settings/AccessControl';

// CRITICAL: Export with side-effect to prevent tree-shaking
if (typeof window !== 'undefined') {
  // Force runtime side-effect - Webpack cannot optimize this away
  (window as any).__ACCESS_CONTROL_MODULE_LOADED__ = true;
  (window as any).__ACCESS_CONTROL_MODULE__ = AccessControlComponent;
}

// Export symbol that must be referenced to create dependency
export const __KEEP_ACCESS_CONTROL__ = Symbol('keep-access-control');

// Export the component
export default AccessControlComponent;

// Named export as well for flexibility
export { AccessControlComponent as AccessControl };
