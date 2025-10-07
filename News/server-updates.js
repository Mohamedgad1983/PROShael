// ============================================
// SERVER.JS UPDATE INSTRUCTIONS
// File: backend/server-updates.js
// Purpose: Instructions for updating your main server.js file
// ============================================

/*
STEP 1: Add these imports at the top of server.js (after other requires)
*/

const initiativesRoutes = require('./routes/initiatives');
const newsRoutes = require('./routes/news');
const fs = require('fs');
const path = require('path');

/*
STEP 2: Create uploads directory (add after app initialization)
*/

// Create uploads directories if they don't exist
const uploadsDir = path.join(__dirname, 'uploads');
const newsUploadsDir = path.join(uploadsDir, 'news');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(newsUploadsDir)) {
    fs.mkdirSync(newsUploadsDir, { recursive: true });
}

// Serve uploaded files as static
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/*
STEP 3: Register routes (add with other app.use statements)
*/

app.use('/api', initiativesRoutes);
app.use('/api', newsRoutes);

/*
STEP 4: Install required packages (run these in terminal)
*/

// npm install multer

/*
COMPLETE UPDATED SERVER.JS EXAMPLE:
*/

const express = require('express');
const cors = require('cors');
const { supabase } = require('./config/supabase');
const initiativesRoutes = require('./routes/initiatives');
const newsRoutes = require('./routes/news');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Create uploads directories
const uploadsDir = path.join(__dirname, 'uploads');
const newsUploadsDir = path.join(uploadsDir, 'news');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(newsUploadsDir)) {
    fs.mkdirSync(newsUploadsDir, { recursive: true });
}

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Register routes
app.use('/api', initiativesRoutes);
app.use('/api', newsRoutes);
// ... your other routes ...

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📁 Uploads directory: ${uploadsDir}`);
});

module.exports = app;
