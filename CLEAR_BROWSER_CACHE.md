# Fix Mobile Login Redirect Issue

## Problem
Mobile login (`http://localhost:3002/mobile/login`) redirects to admin panel due to cached session/service worker.

## Solutions

### 1. Quick Force Refresh
- **Windows/Linux**: Press `Ctrl + Shift + R` or `Ctrl + F5`
- **Mac**: Press `Cmd + Shift + R`

### 2. Clear Browser Cache & Service Workers (Recommended)
1. Open Chrome DevTools (`F12`)
2. Go to **Application** tab
3. Click **Storage** → **Clear site data**
4. OR manually:
   - Clear Local Storage
   - Clear Session Storage
   - Clear Cookies
   - Unregister Service Workers
5. Refresh the page

### 3. Use Incognito Mode
- Open incognito window (`Ctrl+Shift+N` or `Cmd+Shift+N`)
- Navigate to: `http://localhost:3002/mobile/login`

### 4. Use Different Browser
Try Firefox, Edge, or Safari if Chrome keeps redirecting.

## Test After Clearing
1. Go to: `http://localhost:3002/mobile/login`
2. You should see the mobile login form with:
   - Phone number field
   - Password field
   - Default password hint: 123456

## If Still Not Working
Run this in browser console:
```javascript
// Clear everything
localStorage.clear();
sessionStorage.clear();
// Unregister service workers
navigator.serviceWorker.getRegistrations().then(function(registrations) {
  for(let registration of registrations) {
    registration.unregister();
  }
});
// Reload
window.location.reload(true);
```