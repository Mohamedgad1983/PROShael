const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3002;

// Check if build directory exists
const buildPath = path.join(__dirname, 'build');
if (!fs.existsSync(buildPath)) {
  console.error('Build directory not found! Please run "npm run build" first.');
  process.exit(1);
}

// Serve static files from build directory
app.use(express.static(buildPath));

// Handle all routes - SPA routing
app.use((req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ============================================
  Server is running on port ${PORT}
  ============================================

  You can access the application at:
  - http://localhost:${PORT}
  - http://localhost:${PORT}/login

  All text should display as normal weight (400).
  No bold text should appear anywhere.
  ============================================
  `);
});

// Keep server running
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server closed');
  });
});

process.on('SIGINT', () => {
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});