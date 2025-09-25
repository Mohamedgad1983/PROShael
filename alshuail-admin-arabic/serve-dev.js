const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3002;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the React app HTML for all routes (SPA)
app.use((req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');

  // Read the HTML file
  let html = fs.readFileSync(indexPath, 'utf8');

  // Replace %PUBLIC_URL% with empty string
  html = html.replace(/%PUBLIC_URL%/g, '');

  // Send the HTML
  res.send(html);
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║                                                ║
║   🚀 Development Server Started!               ║
║                                                ║
║   📍 URL: http://localhost:${PORT}               ║
║                                                ║
║   📱 Mobile App: http://localhost:${PORT}/member  ║
║   🔐 Login Page: http://localhost:${PORT}/login   ║
║                                                ║
║   Press Ctrl+C to stop the server             ║
║                                                ║
╚════════════════════════════════════════════════╝
  `);
});