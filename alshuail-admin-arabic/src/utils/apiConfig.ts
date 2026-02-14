/**
 * Centralized API URL configuration.
 * Normalizes REACT_APP_API_URL to always include /api suffix,
 * regardless of whether the env var includes it or not.
 */

function getApiBaseUrl(): string {
  const envUrl = process.env.REACT_APP_API_URL;
  if (envUrl) {
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  }
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3001/api';
  }
  return 'https://api.alshailfund.com/api';
}

export const API_BASE_URL = getApiBaseUrl();
export default API_BASE_URL;
