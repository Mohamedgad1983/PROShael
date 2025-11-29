# 🚀 HOW TO START THE DEV SERVERS

## 📋 **QUICK START GUIDE**

### **METHOD 1: Using Batch Files** (Easiest!)

**Step 1: Start Backend**
```
1. Double-click: D:\PROShael\START_BACKEND.bat
2. Wait for "Server running on port 3001"
3. Keep this window open
```

**Step 2: Start Frontend** 
```
1. Double-click: D:\PROShael\START_FRONTEND.bat
2. Wait for browser to open automatically
3. Keep this window open
```

**That's it!** Browser will open at http://localhost:3002

---

### **METHOD 2: Using Command Prompt** (Manual)

**Step 1: Open 2 Command Prompt Windows**

**Terminal 1 - Backend:**
```cmd
cd D:\PROShael\alshuail-backend
npm start
```
Wait for: `Server running on port 3001`

**Terminal 2 - Frontend:**
```cmd
cd D:\PROShael\alshuail-admin-arabic
npm start
```
Wait for: `Compiled successfully!`

Browser should open automatically at http://localhost:3002

---

## ⚠️ **TROUBLESHOOTING**

### **Problem 1: "npm is not recognized"**
**Solution:** Install Node.js
```
1. Download: https://nodejs.org
2. Install LTS version
3. Restart computer
4. Try again
```

### **Problem 2: Port 3002 already in use**
**Solution A:** Kill existing process
```cmd
netstat -ano | findstr :3002
taskkill /PID [PID_NUMBER] /F
```

**Solution B:** Use different port
```cmd
# In D:\PROShael\alshuail-admin-arabic\.env
# Change: PORT=3002
# To: PORT=3003
```

### **Problem 3: Backend not starting (Port 3001 in use)**
**Solution:** Kill existing process
```cmd
netstat -ano | findstr :3001
taskkill /PID [PID_NUMBER] /F
```

### **Problem 4: "Module not found" errors**
**Solution:** Install dependencies
```cmd
# Backend
cd D:\PROShael\alshuail-backend
npm install

# Frontend  
cd D:\PROShael\alshuail-admin-arabic
npm install
```

### **Problem 5: Browser opens but shows error**
**Checklist:**
- ✅ Backend running on port 3001?
- ✅ Frontend running on port 3002?
- ✅ Check browser console (F12) for errors
- ✅ Check .env file exists in both folders

---

## 📊 **WHAT YOU SHOULD SEE**

### **Backend Terminal (Port 3001):**
```
✅ Server running on port 3001
✅ Database connected
✅ Ready to accept connections
```

### **Frontend Terminal (Port 3002):**
```
✅ Compiled successfully!
✅ webpack compiled successfully
✅ On Your Network: http://localhost:3002
```

### **Browser (http://localhost:3002):**
```
✅ Al-Shuail Admin Dashboard
✅ Login page appears
✅ No console errors (F12)
```

---

## 🔍 **CHECKING IF SERVERS ARE RUNNING**

Open browser and test:

**Backend API:**
```
http://localhost:3001/api/health
```
Should show: `{"status":"ok"}`

**Frontend:**
```
http://localhost:3002
```
Should show: Login page

---

## 🛑 **STOPPING SERVERS**

**Method 1: Close Windows**
- Just close the batch file windows

**Method 2: Ctrl+C**
- Press Ctrl+C in each terminal
- Press Y when asked "Terminate batch job?"

---

## ✅ **VERIFICATION CHECKLIST**

After starting both servers:

- [ ] Backend terminal shows "Server running on port 3001"
- [ ] Frontend terminal shows "Compiled successfully!"
- [ ] Browser opened automatically
- [ ] http://localhost:3002 shows login page
- [ ] No red errors in browser console (F12)
- [ ] Both terminal windows stay open (don't close them!)

---

## 🆘 **STILL NOT WORKING?**

Tell me what you see:

1. **"Backend won't start"** → Share backend terminal output
2. **"Frontend won't start"** → Share frontend terminal output  
3. **"Port already in use"** → I'll help kill the process
4. **"Shows error page"** → Share screenshot/error message
5. **"Just blank page"** → Share browser console errors (F12)

---

## 📍 **IMPORTANT NOTES**

✅ **Both servers must run at the same time**
- Backend: localhost:3001 (API)
- Frontend: localhost:3002 (UI)

✅ **Keep terminal windows open**
- Don't close them while working
- They show important logs

✅ **Browser auto-opens**
- Frontend automatically opens browser
- If not, manually go to http://localhost:3002

✅ **First time startup is slower**
- Takes 30-60 seconds to compile
- Next times will be faster

---

**READY TO START?**

1. Double-click `D:\PROShael\START_BACKEND.bat`
2. Wait 10 seconds
3. Double-click `D:\PROShael\START_FRONTEND.bat`
4. Wait for browser to open

**Let me know when both are running!** 🚀
