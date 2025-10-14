import fs from 'fs';

const filePath = '/d/PROShael/Mobile/src/api/api-client.js';
let content = fs.readFileSync(filePath, 'utf8');

// Add CSRF token support after JWT token addition
const csrfAddition = `
    // Add CSRF token for state-changing requests
    if (method !== 'GET' && method !== 'HEAD') {
      try {
        const csrfToken = await csrfManager.getCSRFToken();
        if (csrfToken) {
          requestHeaders['X-CSRF-Token'] = csrfToken;
        }
      } catch (error) {
        console.warn('Failed to get CSRF token:', error);
      }
    }
`;

// Find where to add CSRF support (after JWT token)
const searchString = `    // Add JWT token if authentication required
    if (requiresAuth) {
      const token = tokenManager.getToken();
      if (token) {
        requestHeaders['Authorization'] = \`Bearer \${token}\`;
      }
    }`;

const replacement = searchString + csrfAddition;

content = content.replace(searchString, replacement);

// Also add credentials: 'include' to fetch options
const fetchOptionsSearch = `    // Build request options
    const requestOptions = {
      method,
      headers: requestHeaders,
      signal: AbortSignal.timeout(this.config.timeout)
    };`;

const fetchOptionsReplacement = `    // Build request options
    const requestOptions = {
      method,
      headers: requestHeaders,
      credentials: 'include', // Include cookies for CSRF
      signal: AbortSignal.timeout(this.config.timeout)
    };`;

content = content.replace(fetchOptionsSearch, fetchOptionsReplacement);

// Write the updated content
fs.writeFileSync(filePath, content);
console.log('✅ API client updated with CSRF support');