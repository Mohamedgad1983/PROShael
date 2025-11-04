# 01 - PROJECT SETUP

**Phase**: Setup & Foundation  
**Time**: 15-20 minutes  
**Goal**: Initialize Node.js project and install all dependencies

---

## 🎯 OBJECTIVES

By the end of this step:
- ✅ Project directory structure created
- ✅ Node.js initialized with package.json
- ✅ All dependencies installed
- ✅ Environment variables configured
- ✅ Git repository initialized

---

## 📋 STEP-BY-STEP INSTRUCTIONS

### STEP 1: Create Project Directory

```bash
# Create main project directory
mkdir alshuail-system
cd alshuail-system

# Create subdirectories
mkdir backend
mkdir frontend
mkdir tests
mkdir docs

# Verify structure
ls -la
```

**Expected Output**:
```
drwxr-xr-x  backend/
drwxr-xr-x  frontend/
drwxr-xr-x  tests/
drwxr-xr-x  docs/
```

---

### STEP 2: Initialize Node.js Backend

```bash
cd backend

# Initialize npm
npm init -y
```

**Expected Output**: `package.json` created

---

### STEP 3: Install Backend Dependencies

```bash
# Install production dependencies
npm install express cors dotenv pg bcrypt jsonwebtoken express-validator

# Install development dependencies
npm install --save-dev nodemon jest supertest

# Verify installation
npm list --depth=0
```

**Expected Dependencies**:
- `express` - Web framework
- `cors` - Enable CORS for frontend
- `dotenv` - Environment variables
- `pg` - PostgreSQL client
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT authentication
- `express-validator` - Request validation
- `nodemon` - Auto-restart server
- `jest` - Testing framework
- `supertest` - API testing

---

### STEP 4: Update package.json Scripts

Edit `backend/package.json` and add these scripts:

```json
{
  "name": "alshuail-backend",
  "version": "1.0.0",
  "description": "Backend API for Al-Shuail Family Management System",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest --verbose",
    "test:watch": "jest --watch"
  },
  "keywords": ["family", "management", "api"],
  "author": "Al-Shuail",
  "license": "ISC"
}
```

**Action**: Replace the entire "scripts" and metadata section

---

### STEP 5: Create Backend Directory Structure

```bash
# Still in backend/ directory
mkdir config
mkdir controllers
mkdir routes
mkdir middleware
mkdir utils

# Create empty files
touch server.js
touch .env
touch .env.example
touch config/database.js
touch controllers/registrationController.js
touch controllers/adminController.js
touch controllers/familyTreeController.js
touch routes/registration.js
touch routes/admin.js
touch routes/familyTree.js
touch middleware/auth.js
touch middleware/errorHandler.js
touch utils/smsService.js
touch utils/otpGenerator.js

# Verify structure
tree -L 2
```

**Expected Structure**:
```
backend/
├── node_modules/
├── config/
│   └── database.js
├── controllers/
│   ├── registrationController.js
│   ├── adminController.js
│   └── familyTreeController.js
├── routes/
│   ├── registration.js
│   ├── admin.js
│   └── familyTree.js
├── middleware/
│   ├── auth.js
│   └── errorHandler.js
├── utils/
│   ├── smsService.js
│   └── otpGenerator.js
├── package.json
├── package-lock.json
├── .env
├── .env.example
└── server.js
```

---

### STEP 6: Create .env.example Template

Create `.env.example` file:

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@host:5432/dbname
DATABASE_HOST=your-project.supabase.co
DATABASE_PORT=5432
DATABASE_NAME=postgres
DATABASE_USER=postgres
DATABASE_PASSWORD=your-password-here

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Secret
JWT_SECRET=your-jwt-secret-key-here-change-in-production

# SMS Service (Optional for now)
SMS_API_KEY=your-sms-api-key
SMS_SENDER_ID=AlShuail

# CORS Origins
FRONTEND_URL=http://localhost:8080
ADMIN_URL=http://localhost:8081
```

**Action**: Create this file with above content

---

### STEP 7: Create Actual .env File

```bash
cp .env.example .env
```

**Action**: Edit `.env` and add your actual Supabase credentials

**IMPORTANT**: Get these from your Supabase dashboard:
1. Go to Project Settings > Database
2. Copy Connection String
3. Paste into `.env` file

Example:
```
DATABASE_URL=postgresql://postgres.oneiggrfzagqjbkdinin:YOUR_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
DATABASE_HOST=aws-0-eu-central-1.pooler.supabase.com
DATABASE_PORT=5432
DATABASE_NAME=postgres
DATABASE_USER=postgres.oneiggrfzagqjbkdinin
DATABASE_PASSWORD=YOUR_ACTUAL_PASSWORD

PORT=3000
NODE_ENV=development
JWT_SECRET=alshuail-super-secret-key-2025-change-me
FRONTEND_URL=http://localhost:8080
ADMIN_URL=http://localhost:8081
```

---

### STEP 8: Copy Frontend Files

```bash
# Go back to project root
cd ..

# Copy the 3 frontend HTML files to frontend directory
# (Assuming they're in current directory or specify correct path)
cp mobile_app_registration.html frontend/
cp admin_clan_management.html frontend/
cp family-tree-timeline.html frontend/

# Verify
ls -la frontend/
```

**Expected Files**:
```
frontend/
├── mobile_app_registration.html
├── admin_clan_management.html
└── family-tree-timeline.html
```

---

### STEP 9: Initialize Git Repository

```bash
# In project root (alshuail-system/)
git init

# Create .gitignore
cat > .gitignore << 'EOF'
# Node modules
node_modules/
backend/node_modules/

# Environment variables
.env
backend/.env

# Logs
*.log
npm-debug.log*

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Build files
dist/
build/

# Test coverage
coverage/
EOF

# Initial commit
git add .
git commit -m "Initial project setup"
```

---

### STEP 10: Create README.md

```bash
# In project root
cat > README.md << 'EOF'
# Al-Shuail Family Management System

Complete family management system with member registration, admin dashboard, and family tree visualization.

## Project Structure

- `backend/` - Node.js/Express API server
- `frontend/` - HTML/CSS/JS frontend files
- `tests/` - API and integration tests
- `docs/` - Documentation

## Quick Start

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
Open HTML files in browser or use a local server:
```bash
cd frontend
python3 -m http.server 8080
```

## Features

- 📱 Mobile registration flow
- 👨‍💼 Admin dashboard for clan management
- 🌳 Interactive family tree timeline
- 🔐 JWT authentication
- 📲 SMS OTP verification
- 📊 Member statistics and reports

## Tech Stack

- **Backend**: Node.js, Express, PostgreSQL
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Render.com (backend) + Cloudflare Pages (frontend)

## Documentation

See `docs/` folder for detailed API documentation.

EOF
```

---

## ✅ VERIFICATION TESTS

Run these commands to verify everything is set up correctly:

### Test 1: Check Node.js Version
```bash
node --version
```
**Expected**: `v18.x.x` or higher

### Test 2: Check npm Version
```bash
npm --version
```
**Expected**: `9.x.x` or higher

### Test 3: Verify Dependencies Installed
```bash
cd backend
npm list --depth=0
```
**Expected**: All packages listed without errors

### Test 4: Verify Directory Structure
```bash
cd ..  # Back to project root
find . -type d -maxdepth 3 | grep -v node_modules | grep -v .git
```
**Expected**: All directories listed

### Test 5: Check .env File Exists
```bash
ls -la backend/.env
```
**Expected**: File exists (not empty)

### Test 6: Verify Frontend Files
```bash
ls -la frontend/
```
**Expected**: 3 HTML files present

---

## 🎯 COMPLETION CHECKLIST

Before moving to next step, confirm:

- [ ] `alshuail-system/` directory created
- [ ] Backend initialized with npm
- [ ] All dependencies installed (10 packages)
- [ ] Directory structure matches expected layout
- [ ] `.env` file created with actual credentials
- [ ] `.env.example` template created
- [ ] All 3 frontend files copied
- [ ] Git repository initialized
- [ ] README.md created
- [ ] `.gitignore` configured
- [ ] All verification tests passed

---

## 🚨 TROUBLESHOOTING

### Issue: npm install fails
**Solution**: 
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Issue: Permission denied
**Solution**:
```bash
sudo chown -R $USER:$USER .
```

### Issue: Node version too old
**Solution**:
```bash
# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

### Issue: Can't find Supabase credentials
**Solution**:
1. Log into Supabase dashboard
2. Go to Project Settings > Database
3. Copy "Connection string" under "Connection pooling"
4. Update `.env` file

---

## 📊 CURRENT STATUS

```
Project Setup: ████████████████████ 100%
```

**Completed**: ✅ Basic project structure  
**Next Step**: Database connection and verification

---

## ⏭️ NEXT FILE

**File**: `02_DATABASE_SETUP.md`  
**Purpose**: Connect to Supabase and verify database tables

---

**Time Spent**: ~20 minutes  
**Estimated Remaining**: 8-10 hours
