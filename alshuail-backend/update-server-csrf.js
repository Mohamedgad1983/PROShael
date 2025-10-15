const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, 'server.js');
let serverContent = fs.readFileSync(serverFile, 'utf8');

// Add cookie-parser and csrf imports
const importsToAdd = `import cookieParser from 'cookie-parser';
import csrfRoutes from './src/routes/csrf.js';
import { validateCSRFToken } from './src/middleware/csrf.js';`;

// Add after the existing imports (after import { errorHandler })
serverContent = serverContent.replace(
  "import { errorHandler } from './src/utils/errorCodes.js';",
  `import { errorHandler } from './src/utils/errorCodes.js';
${importsToAdd}`
);

// Add cookie-parser middleware after express.json
const cookieParserMiddleware = `
// Cookie parser for CSRF tokens
app.use(cookieParser());
`;

serverContent = serverContent.replace(
  'app.use(express.json({',
  `${cookieParserMiddleware}
app.use(express.json({`
);

// Add CSRF route before other routes
const csrfRoute = `
// CSRF token endpoint (must be before CSRF validation)
app.use('/api', csrfRoutes);

// Apply CSRF validation to all routes except auth and health
app.use('/api', (req, res, next) => {
  // Skip CSRF for specific endpoints
  const skipCSRF = [
    '/api/auth/login',
    '/api/auth/verify-otp',
    '/api/health',
    '/api/csrf-token'
  ];

  if (skipCSRF.includes(req.path) || req.method === 'GET') {
    return next();
  }

  validateCSRFToken(req, res, next);
});
`;

// Add before the auth routes
serverContent = serverContent.replace(
  "app.use('/api/auth', authRoutes);",
  `${csrfRoute}
app.use('/api/auth', authRoutes);`
);

// Write the updated content
fs.writeFileSync(serverFile, serverContent);
console.log('✅ Server.js updated with CSRF protection');