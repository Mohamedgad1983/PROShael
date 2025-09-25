const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3002;

// Serve static files from build directory
app.use(express.static(path.join(__dirname, 'build')));

// Handle all routes - send index.html for SPA routing
app.get('/*', (req, res) => {
  const indexPath = path.join(__dirname, 'build', 'index.html');

  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>الشعيل - إدارة الأسرة</title>
        <style>
          body {
            font-family: 'Tajawal', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            direction: rtl;
            margin: 0;
          }
          .error-container {
            background: rgba(255, 255, 255, 0.95);
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
            text-align: center;
          }
          h1 { color: #333; }
          p { color: #666; margin: 20px 0; }
          .btn {
            background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
            color: white;
            padding: 12px 30px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin: 10px;
          }
        </style>
      </head>
      <body>
        <div class="error-container">
          <h1>⚠️ النظام قيد الصيانة</h1>
          <p>نحن نعمل على تحسين النظام. سيكون متاحاً قريباً.</p>
          <p>The build folder doesn't exist. Please build the application first.</p>
          <a href="/" class="btn">المحاولة مرة أخرى</a>
        </div>
      </body>
      </html>
    `);
  }
});

console.log(`
╔════════════════════════════════════════════════╗
║                                                ║
║   🚀 Build Server Started!                     ║
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

app.listen(PORT);