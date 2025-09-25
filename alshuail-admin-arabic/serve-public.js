const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3002;

// Path to public directory
const publicPath = path.join(__dirname, 'public');

// Check if public directory exists
if (!fs.existsSync(publicPath)) {
  console.error('Public directory not found!');
  process.exit(1);
}

// Check if index.html exists
const indexPath = path.join(publicPath, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error('index.html not found in public directory!');
  process.exit(1);
}

// Serve static files from public directory
app.use(express.static(publicPath));

// Handle all routes for SPA
app.use((req, res) => {
  // Read and process the index.html file
  let html = fs.readFileSync(indexPath, 'utf8');

  // Replace %PUBLIC_URL% with empty string for local development
  html = html.replace(/%PUBLIC_URL%/g, '');

  // Send the processed HTML
  res.send(html);
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ============================================
  Development Server Running
  ============================================

  Server is running on port ${PORT}

  Access the application at:
  ✓ http://localhost:${PORT}
  ✓ http://localhost:${PORT}/login

  Features:
  - All text displays as normal weight (400)
  - No bold text anywhere
  - SPA routing enabled
  - Serving from public directory
  ============================================
  `);
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server closed');
  });
});

process.on('SIGINT', () => {
  server.close(() => {
    console.log('\nServer closed');
    process.exit(0);
  });
});