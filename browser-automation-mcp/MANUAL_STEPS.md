# 🚀 Manual Setup Steps - Run These Commands

## Step 1: Install Dependencies

Run this command in your Command Prompt:

```cmd
npm install
```

This will:
- Install @modelcontextprotocol/sdk
- Install Playwright
- Install TypeScript
- Install all other dependencies

**Wait for it to complete** (2-3 minutes)

---

## Step 2: Install Playwright Browsers

After Step 1 completes, run:

```cmd
npm run install-browsers
```

OR:

```cmd
npx playwright install chromium
```

This will:
- Download Chromium browser (~150MB)
- Install browser dependencies

**Wait for it to complete** (3-5 minutes)

---

## Step 3: Build TypeScript

After Step 2 completes, run:

```cmd
npm run build
```

This will:
- Compile TypeScript to JavaScript
- Create build/index.js
- Generate type definitions

**Wait for it to complete** (~30 seconds)

---

## Step 4: Verify Installation

Run:

```cmd
dir build\index.js
```

You should see the file listed.

---

## Step 5: Get Your Installation Path

Run:

```cmd
cd
```

Copy the output. It should be:
```
D:\PROShael\browser-automation-mcp
```

---

## Step 6: Configure Claude Desktop

1. Press `Win+R`
2. Type: `%APPDATA%\Claude`
3. Press Enter
4. Create/edit file: `claude_desktop_config.json`
5. Add this content:

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

6. Save the file (Ctrl+S)

---

## Step 7: Restart Claude Desktop

1. Close all Claude windows
2. Exit from system tray (if present)
3. Reopen Claude Desktop

---

## Step 8: Test in Claude

Type this in Claude:

```
Launch a browser and navigate to google.com
```

If it works, you'll see Claude control the browser!

---

## ✅ Checklist

- [ ] Step 1: npm install (completed)
- [ ] Step 2: install browsers (completed)
- [ ] Step 3: npm run build (completed)
- [ ] Step 4: verify build/index.js exists
- [ ] Step 5: get installation path
- [ ] Step 6: configure Claude Desktop
- [ ] Step 7: restart Claude
- [ ] Step 8: test successfully

---

**Start with Step 1 now!**

Run: `npm install`
