import { lazy, Suspense } from 'react';
import LoadingSpinner from '../components/Common/LoadingSpinner';

// Code-split heavy components (200KB+ saved)
export const LazyDashboard = lazy(() =>
  import(/* webpackChunkName: "dashboard" */ '../components/Dashboard/AlShuailPremiumDashboard')
);

export const LazyMembersManagement = lazy(() =>
  import(/* webpackChunkName: "members" */ '../components/Members/AppleMembersManagement')
);

export const LazyPaymentsTracking = lazy(() =>
  import(/* webpackChunkName: "payments" */ '../components/Payments/PaymentsTracking')
);

export const LazyInitiativesManagement = lazy(() =>
  import(/* webpackChunkName: "initiatives" */ '../components/Initiatives/AppleInitiativesManagement')
);

export const LazyDiyasManagement = lazy(() =>
  import(/* webpackChunkName: "diyas" */ '../components/Diyas/AppleDiyasManagement')
);

export const LazyReports = lazy(() =>
  import(/* webpackChunkName: "reports" */ '../components/Reports/ExpenseManagement')
);

export const LazySettings = lazy(() =>
  import(/* webpackChunkName: "settings" */ '../components/Settings/AppleSettingsManagement')
);

// Wrapper component for lazy loaded components
export const LazyComponent = ({ Component, ...props }) => (
  <Suspense fallback={<LoadingSpinner />}>
    <Component {...props} />
  </Suspense>
);
