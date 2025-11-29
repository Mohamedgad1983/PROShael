# 🌐 Browser Automation MCP Server - Windows Setup

## ⚡ Quick Start (3 Steps)

### Step 1: Install Dependencies & Build

**Option A - Automated (Recommended):**
```cmd
# Double-click setup.bat
# OR run in Command Prompt:
setup.bat
```

**Option B - Manual:**
```cmd
npm install
npm run install-browsers
npm run build
```

### Step 2: Configure Claude Desktop

1. Open your Claude config file:
   - Press `Win+R`
   - Type: `%APPDATA%\Claude`
   - Create/edit: `claude_desktop_config.json`

2. Add this configuration:
```json
{
  "mcpServers": {
    "browser-automation": {
      "command": "node",
      "args": [
        "D:\\PROShael\\browser-automation-mcp\\build\\index.js"
      ]
    }
  }
}
```

**Important:** Use your actual path! Replace `D:\\PROShael` with your path.

### Step 3: Restart Claude & Test

1. Quit Claude Desktop completely
2. Reopen Claude Desktop
3. Test with: `Launch browser and navigate to google.com`

---

## 🛠️ What You Can Do

### 17 Browser Automation Tools:

1. **browser_launch** - Launch Chromium/Firefox/WebKit
2. **browser_navigate** - Go to any URL
3. **browser_screenshot** - Capture screenshots (PNG/JPEG)
4. **browser_pdf** - Generate PDFs (Chromium only)
5. **browser_click** - Click elements
6. **browser_fill** - Fill form inputs
7. **browser_evaluate** - Execute JavaScript
8. **browser_get_content** - Get HTML content
9. **browser_wait_for_selector** - Wait for elements
10. **browser_go_back** - Navigate back
11. **browser_go_forward** - Navigate forward
12. **browser_reload** - Reload page
13. **browser_get_cookies** - Get cookies
14. **browser_set_cookie** - Set cookies
15. **browser_get_title** - Get page title
16. **browser_get_url** - Get current URL
17. **browser_close** - Close browser

---

## 📋 For Al-Shuail Project

### Test Admin Panel Login:
```
1. Launch browser (headless: false)
2. Navigate to https://alshuail-admin.pages.dev
3. Fill email: admin@alshuail.com
4. Fill password: Admin@123
5. Click login button
6. Wait for dashboard
7. Take screenshot
```

### Extract Member Data:
```
1. Launch browser
2. Navigate to members page
3. Execute: return document.querySelectorAll('.member-card').length
4. Get page content
5. Close browser
```

### Generate Financial Report:
```
1. Launch Chromium
2. Go to financial reports page
3. Wait for charts to load (15 seconds)
4. Generate PDF (A4 landscape)
5. Take screenshot
6. Close browser
```

---

## 🐛 Troubleshooting

### "Module not found"
```cmd
npm run build
```

### "Browser not found"
```cmd
npx playwright install chromium
```

### "Cannot find node"
Install Node.js 18+ from: https://nodejs.org

### Claude doesn't see the server
1. Check config file syntax (valid JSON)
2. Verify path uses double backslashes: `D:\\PROShael\\...`
3. Restart Claude completely (close all windows + system tray)

---

## 📊 System Requirements

- Windows 10 or higher
- Node.js 18.0.0+
- npm 8.0.0+
- 4GB RAM minimum
- 1GB disk space

---

## 🎯 Example Usage in Claude

### Simple Navigation:
```
Launch a browser and go to https://example.com, 
then take a screenshot
```

### Test Al-Shuail Admin:
```
1. Launch Chromium browser (not headless)
2. Navigate to https://alshuail-admin.pages.dev
3. Wait 3 seconds
4. Take a full-page screenshot
5. Get the page title
6. Close the browser
```

### Scrape Data:
```
1. Launch browser
2. Go to https://alshuail-admin.pages.dev/members
3. Execute this JavaScript:
   return {
     total: document.querySelectorAll('.member-card').length,
     active: document.querySelectorAll('.member-card.active').length
   }
4. Close browser
```

---

## ⚙️ Configuration Tips

### Find Your Config File:
```cmd
# Open Windows Explorer
# Paste this in address bar:
%APPDATA%\Claude
```

### Get Your Installation Path:
```cmd
# In Command Prompt, run:
cd D:\PROShael\browser-automation-mcp
cd
# Copy the output
```

### Verify Build Exists:
```cmd
dir build\index.js
# Should show the file
```

---

## 🚀 Advanced Features

### Headless Mode (Faster):
```
Launch browser with headless: true
```

### Custom Viewport:
```
Launch browser with width: 1920, height: 1080
```

### Multiple Browsers:
```
Launch Firefox browser
# or
Launch WebKit browser
```

### Wait for Dynamic Content:
```
1. Navigate to page
2. Wait for selector: .chart-loaded
3. Take screenshot
```

---

## 📞 Need Help?

### Common Commands:
```cmd
# Reinstall dependencies
npm install

# Rebuild project
npm run build

# Install browsers manually
npx playwright install

# Check Node version
node --version

# Check npm version
npm --version
```

### Files Location:
- Config: `%APPDATA%\Claude\claude_desktop_config.json`
- Project: `D:\PROShael\browser-automation-mcp`
- Build: `D:\PROShael\browser-automation-mcp\build\index.js`

---

## ✅ Success Checklist

- [ ] Node.js 18+ installed
- [ ] npm available
- [ ] Ran `setup.bat` or `npm install`
- [ ] Ran `npm run build`
- [ ] Build file exists: `build\index.js`
- [ ] Claude config updated
- [ ] Claude restarted
- [ ] Test successful

---

## 🎉 You're Ready!

Your browser automation MCP server is installed and ready to use!

**Test it now in Claude:**
```
Launch a browser and navigate to google.com
```

If it works, you're all set! 🚀

---

**For Al-Shuail Family Management System**  
**Version:** 1.0.0  
**Platform:** Windows  
**License:** MIT
