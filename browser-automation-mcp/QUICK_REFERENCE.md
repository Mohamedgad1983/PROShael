# ⚡ Quick Reference - Browser Automation MCP

## 🚀 Setup Commands

```cmd
# Option 1: Automated Setup
setup.bat

# Option 2: Manual Setup
npm install
npm run install-browsers
npm run build
```

## 📍 Important Paths

**Project:** `D:\PROShael\browser-automation-mcp`  
**Build:** `D:\PROShael\browser-automation-mcp\build\index.js`  
**Config:** `%APPDATA%\Claude\claude_desktop_config.json`

## ⚙️ Claude Desktop Configuration

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

## 🎯 Most Used Tools

| Tool | Command Example |
|------|-----------------|
| Launch | `Launch Chromium browser (headless: false)` |
| Navigate | `Navigate to https://alshuail-admin.pages.dev` |
| Click | `Click button with selector: .login-btn` |
| Fill | `Fill input[name='email'] with: admin@alshuail.com` |
| Screenshot | `Take full-page screenshot` |
| Execute JS | `Execute: return document.title` |
| Close | `Close the browser` |

## 🔧 Common Tasks

### Test Al-Shuail Login
```
1. Launch browser (headless: false)
2. Navigate to https://alshuail-admin.pages.dev
3. Fill input[type='email'] with: admin@alshuail.com
4. Fill input[type='password'] with: Admin@123
5. Click button[type='submit']
6. Wait for selector: .dashboard-container
7. Take screenshot
```

### Get Member Count
```
1. Launch browser
2. Navigate to https://alshuail-admin.pages.dev/members
3. Execute: return document.querySelectorAll('.member-card').length
4. Close browser
```

### Generate PDF Report
```
1. Launch Chromium browser
2. Navigate to reports page
3. Wait 5 seconds
4. Generate PDF (A4, landscape)
5. Close browser
```

## 🐛 Quick Fixes

| Problem | Solution |
|---------|----------|
| Module not found | `npm run build` |
| Browser not found | `npx playwright install chromium` |
| Can't find node | Install from nodejs.org |
| Claude can't see | Check config path & restart Claude |
| Build fails | Delete build folder, run `npm run build` |

## 📊 Browser Options

```javascript
// Headless (faster)
browser_launch({ headless: true })

// Visible (for testing)
browser_launch({ headless: false })

// Custom size
browser_launch({ width: 1920, height: 1080 })

// Different browser
browser_launch({ browser: "firefox" })
```

## 🎯 Al-Shuail Specific

### Arabic Testing
```
1. Launch browser
2. Navigate to admin panel
3. Execute: return document.body.dir === 'rtl'
4. Take screenshot
```

### Mobile Testing
```
Launch browser with width: 375, height: 812
Navigate to admin panel
Take screenshot
```

### Member Data
```
Execute: return {
  total: document.querySelectorAll('.member-card').length,
  active: document.querySelectorAll('.member-card.active').length,
  names: Array.from(document.querySelectorAll('.member-name')).map(el => el.textContent)
}
```

## ✅ Verification

```cmd
# Check installation
dir build\index.js

# Check Node version
node --version

# Check npm version
npm --version

# Test browser install
npx playwright --version
```

## 🔄 Update/Reinstall

```cmd
# Clean install
rmdir /s /q node_modules
rmdir /s /q build
npm install
npm run build
```

---

**Quick Start:** Run `setup.bat` → Update Claude config → Restart Claude → Test!
