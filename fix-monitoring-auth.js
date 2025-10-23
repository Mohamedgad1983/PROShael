const fs = require('fs');

const htmlPath = './alshuail-admin-arabic/public/monitoring-standalone/index.html';
let html = fs.readFileSync(htmlPath, 'utf8');

// 1. Hide login modal by default (change active class removal)
html = html.replace(
    '<div class="modal active" id="loginModal">',
    '<div class="modal" id="loginModal" style="display: none;">'
);

// 2. Replace checkAuth function to get token from parent window
const oldCheckAuth = /async function checkAuth\(\) \{[\s\S]*?\n        \}/;
const newCheckAuth = `async function checkAuth() {
            // Get token from parent window (React app)
            try {
                const parentToken = window.parent.localStorage.getItem('token');
                if (parentToken) {
                    localStorage.setItem('auth_token', parentToken);
                    return true;
                }
            } catch (e) {
                console.log('Could not access parent token:', e);
            }

            // Fallback: check own localStorage
            const token = localStorage.getItem('auth_token');
            if (!token) {
                return false;
            }

            return true;
        }`;

html = html.replace(oldCheckAuth, newCheckAuth);

// 3. Modify window.onload to always load dashboard (no auth check needed)
const oldOnload = /window\.onload = async function\(\) \{[\s\S]*?\n        \};/;
const newOnload = `window.onload = async function() {
            initSubscriptionChart();
            initBranchChart();

            // Get token from parent React app
            try {
                const parentToken = window.parent.localStorage.getItem('token');
                if (parentToken) {
                    localStorage.setItem('auth_token', parentToken);
                }
            } catch (e) {
                console.log('Running standalone, using own auth');
            }

            // Always load dashboard
            await initDashboard();
        };`;

html = html.replace(oldOnload, newOnload);

// Write modified HTML
fs.writeFileSync(htmlPath, html, 'utf8');
console.log('✅ Modified monitoring dashboard to use parent authentication');
console.log('✅ Removed login modal requirement');
console.log('✅ Dashboard will now load automatically with React app token');
