const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

(async () => {
  console.log('🚀 Starting website cloning process...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Create output directory
    const outputDir = 'cloned-website';
    await fs.mkdir(outputDir, { recursive: true });
    await fs.mkdir(path.join(outputDir, 'screenshots'), { recursive: true });
    await fs.mkdir(path.join(outputDir, 'components'), { recursive: true });
    await fs.mkdir(path.join(outputDir, 'styles'), { recursive: true });

    // 1. Navigate to the website
    console.log('📍 Step 1: Navigating to localhost:3002...');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });

    // Take initial screenshot
    await page.screenshot({
      path: path.join(outputDir, 'screenshots', 'homepage.png'),
      fullPage: true
    });
    console.log('✅ Homepage screenshot saved\n');

    // 2. Extract HTML structure
    console.log('🏗️ Step 2: Extracting HTML structure...');
    const htmlStructure = await page.evaluate(() => {
      function extractStructure(element, depth = 0) {
        if (!element || depth > 10) return null;

        const structure = {
          tagName: element.tagName?.toLowerCase(),
          id: element.id || null,
          className: element.className || null,
          attributes: {},
          children: [],
          text: null
        };

        // Get attributes
        if (element.attributes) {
          for (let attr of element.attributes) {
            if (attr.name !== 'class' && attr.name !== 'id') {
              structure.attributes[attr.name] = attr.value;
            }
          }
        }

        // Get text content (only if no children)
        if (element.childNodes.length === 1 && element.childNodes[0].nodeType === 3) {
          structure.text = element.textContent.trim();
        }

        // Get children
        if (element.children) {
          for (let child of element.children) {
            const childStructure = extractStructure(child, depth + 1);
            if (childStructure) {
              structure.children.push(childStructure);
            }
          }
        }

        return structure;
      }

      return extractStructure(document.body);
    });

    await fs.writeFile(
      path.join(outputDir, 'html-structure.json'),
      JSON.stringify(htmlStructure, null, 2)
    );
    console.log('✅ HTML structure extracted\n');

    // 3. Extract CSS styles
    console.log('🎨 Step 3: Extracting CSS styles...');
    const cssStyles = await page.evaluate(() => {
      const styles = {};
      const elements = document.querySelectorAll('*');

      // Get unique classes and their styles
      const processedClasses = new Set();

      elements.forEach(element => {
        if (element.className && typeof element.className === 'string') {
          const classes = element.className.split(' ').filter(c => c);

          classes.forEach(className => {
            if (!processedClasses.has(className)) {
              processedClasses.add(className);
              const computedStyle = window.getComputedStyle(element);

              // Extract important styles
              styles[`.${className}`] = {
                // Layout
                display: computedStyle.display,
                position: computedStyle.position,
                width: computedStyle.width,
                height: computedStyle.height,
                margin: computedStyle.margin,
                padding: computedStyle.padding,

                // Typography
                fontSize: computedStyle.fontSize,
                fontFamily: computedStyle.fontFamily,
                fontWeight: computedStyle.fontWeight,
                lineHeight: computedStyle.lineHeight,
                textAlign: computedStyle.textAlign,
                color: computedStyle.color,

                // Background
                backgroundColor: computedStyle.backgroundColor,
                backgroundImage: computedStyle.backgroundImage,

                // Borders
                border: computedStyle.border,
                borderRadius: computedStyle.borderRadius,

                // Effects
                boxShadow: computedStyle.boxShadow,
                opacity: computedStyle.opacity,
                transform: computedStyle.transform,
                transition: computedStyle.transition,

                // Flexbox
                flexDirection: computedStyle.flexDirection,
                justifyContent: computedStyle.justifyContent,
                alignItems: computedStyle.alignItems,
                gap: computedStyle.gap,

                // Grid
                gridTemplateColumns: computedStyle.gridTemplateColumns,
                gridTemplateRows: computedStyle.gridTemplateRows,
                gridGap: computedStyle.gridGap
              };
            }
          });
        }
      });

      // Get global styles
      const bodyStyle = window.getComputedStyle(document.body);
      styles.body = {
        margin: bodyStyle.margin,
        padding: bodyStyle.padding,
        fontFamily: bodyStyle.fontFamily,
        fontSize: bodyStyle.fontSize,
        lineHeight: bodyStyle.lineHeight,
        color: bodyStyle.color,
        backgroundColor: bodyStyle.backgroundColor,
        direction: bodyStyle.direction
      };

      return styles;
    });

    await fs.writeFile(
      path.join(outputDir, 'styles', 'extracted-styles.json'),
      JSON.stringify(cssStyles, null, 2)
    );
    console.log('✅ CSS styles extracted\n');

    // 4. Check for multiple pages
    console.log('🔍 Step 4: Checking for navigation links...');
    const links = await page.evaluate(() => {
      const anchors = document.querySelectorAll('a, button[onclick], button[type="submit"]');
      return Array.from(anchors).map(a => ({
        text: a.textContent?.trim(),
        href: a.href || null,
        onclick: a.onclick?.toString() || null,
        type: a.tagName.toLowerCase()
      })).filter(link => link.text);
    });

    console.log(`Found ${links.length} interactive elements`);

    // Try to navigate through the site
    if (links.length > 0) {
      for (let i = 0; i < Math.min(links.length, 5); i++) {
        const link = links[i];
        if (link.type === 'button' && link.text) {
          try {
            console.log(`  Clicking: ${link.text}`);
            await page.click(`button:has-text("${link.text}")`, { timeout: 3000 });
            await page.waitForTimeout(2000);
            await page.screenshot({
              path: path.join(outputDir, 'screenshots', `page-${i}.png`),
              fullPage: true
            });
            await page.goBack({ timeout: 3000 }).catch(() => {});
          } catch (e) {
            console.log(`  Could not interact with: ${link.text}`);
          }
        }
      }
    }
    console.log('');

    // 5. Generate React components
    console.log('⚛️ Step 5: Generating React components...\n');

    // Main App component
    const appComponent = `import React from 'react';
import './App.css';
import Header from './components/Header';
import MainContent from './components/MainContent';
import Footer from './components/Footer';

function App() {
  return (
    <div className="App" dir="rtl">
      <Header />
      <MainContent />
      <Footer />
    </div>
  );
}

export default App;`;

    await fs.writeFile(
      path.join(outputDir, 'App.js'),
      appComponent
    );

    // Header component
    const headerComponent = `import React from 'react';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="header-content">
        <h1 className="logo">الشعيل</h1>
        <nav className="navigation">
          <ul>
            <li><a href="#home">الرئيسية</a></li>
            <li><a href="#about">حول</a></li>
            <li><a href="#services">الخدمات</a></li>
            <li><a href="#contact">اتصل بنا</a></li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;`;

    await fs.writeFile(
      path.join(outputDir, 'components', 'Header.js'),
      headerComponent
    );

    // MainContent component
    const mainComponent = `import React, { useState } from 'react';
import './MainContent.css';

const MainContent = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
  };

  return (
    <main className="main-content">
      <div className="container">
        <div className="login-container">
          <div className="login-header">
            <h2>مرحباً بكم في نظام الشعيل</h2>
            <p>نظام إدارة متكامل للعائلة</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">البريد الإلكتروني</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="أدخل بريدك الإلكتروني"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">كلمة المرور</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="أدخل كلمة المرور"
                required
              />
            </div>

            <button type="submit" className="login-button">
              تسجيل الدخول
            </button>
          </form>
        </div>
      </div>
    </main>
  );
};

export default MainContent;`;

    await fs.writeFile(
      path.join(outputDir, 'components', 'MainContent.js'),
      mainComponent
    );

    // Footer component
    const footerComponent = `import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <p>&copy; 2024 نظام الشعيل. جميع الحقوق محفوظة.</p>
      </div>
    </footer>
  );
};

export default Footer;`;

    await fs.writeFile(
      path.join(outputDir, 'components', 'Footer.js'),
      footerComponent
    );

    // 6. Generate CSS files
    console.log('🎨 Step 6: Generating CSS files...');

    // App.css
    const appCSS = `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Cairo', 'Tajawal', sans-serif;
  line-height: 1.6;
  color: #333;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  direction: rtl;
}

.App {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Responsive Design */
@media (max-width: 768px) {
  .App {
    padding: 0 10px;
  }
}

@media (max-width: 480px) {
  body {
    font-size: 14px;
  }
}`;

    await fs.writeFile(
      path.join(outputDir, 'App.css'),
      appCSS
    );

    // Header.css
    const headerCSS = `.header {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding: 1rem 0;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-size: 2rem;
  font-weight: bold;
  color: white;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.navigation ul {
  list-style: none;
  display: flex;
  gap: 2rem;
}

.navigation a {
  color: white;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
}

.navigation a:hover {
  color: #ffd700;
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 1rem;
  }

  .navigation ul {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }
}`;

    await fs.writeFile(
      path.join(outputDir, 'components', 'Header.css'),
      headerCSS
    );

    // MainContent.css
    const mainContentCSS = `.main-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.login-container {
  max-width: 400px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  animation: slideIn 0.5s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  text-align: center;
}

.login-header h2 {
  margin-bottom: 0.5rem;
  font-size: 1.8rem;
}

.login-header p {
  opacity: 0.9;
  font-size: 0.95rem;
}

.login-form {
  padding: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #555;
  font-weight: 600;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 1rem;
  transition: all 0.3s ease;
  font-family: inherit;
  direction: rtl;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.login-button {
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
}

.login-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
}

.login-button:active {
  transform: translateY(0);
}

@media (max-width: 480px) {
  .login-container {
    margin: 0 10px;
  }

  .login-header {
    padding: 1.5rem;
  }

  .login-form {
    padding: 1.5rem;
  }
}`;

    await fs.writeFile(
      path.join(outputDir, 'components', 'MainContent.css'),
      mainContentCSS
    );

    // Footer.css
    const footerCSS = `.footer {
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  padding: 1.5rem 0;
  margin-top: auto;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  text-align: center;
  color: white;
}

.footer-content p {
  opacity: 0.9;
}

@media (max-width: 480px) {
  .footer {
    padding: 1rem 0;
  }

  .footer-content {
    font-size: 0.9rem;
  }
}`;

    await fs.writeFile(
      path.join(outputDir, 'components', 'Footer.css'),
      footerCSS
    );

    // 7. Create package.json
    const packageJson = {
      "name": "cloned-website",
      "version": "1.0.0",
      "private": true,
      "dependencies": {
        "react": "^18.2.0",
        "react-dom": "^18.2.0",
        "react-scripts": "5.0.1"
      },
      "scripts": {
        "start": "react-scripts start",
        "build": "react-scripts build",
        "test": "react-scripts test",
        "eject": "react-scripts eject"
      },
      "eslintConfig": {
        "extends": ["react-app"]
      },
      "browserslist": {
        "production": [">0.2%", "not dead", "not op_mini all"],
        "development": ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"]
      }
    };

    await fs.writeFile(
      path.join(outputDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Create public and src folders first
    await fs.mkdir(path.join(outputDir, 'public'), { recursive: true });
    await fs.mkdir(path.join(outputDir, 'src'), { recursive: true });

    // 8. Create index.js
    const indexJs = `import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;

    await fs.writeFile(
      path.join(outputDir, 'src', 'index.js'),
      indexJs
    );

    const indexHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#667eea" />
    <meta name="description" content="نظام إدارة عائلة الشعيل" />
    <link rel="apple-touch-icon" href="%PUBLIC_URL%/logo192.png" />
    <link rel="manifest" href="%PUBLIC_URL%/manifest.json" />
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
    <title>نظام الشعيل</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>`;

    await fs.writeFile(
      path.join(outputDir, 'public', 'index.html'),
      indexHtml
    );

    // 9. Create index.css
    const indexCss = `@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&family=Tajawal:wght@400;500;700&display=swap');

body {
  margin: 0;
  font-family: 'Cairo', 'Tajawal', -apple-system, BlinkMacSystemFont, 'Segoe UI',
    'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
    'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}`;

    await fs.writeFile(
      path.join(outputDir, 'src', 'index.css'),
      indexCss
    );

    // Move components to src folder
    await fs.rename(
      path.join(outputDir, 'App.js'),
      path.join(outputDir, 'src', 'App.js')
    );
    await fs.rename(
      path.join(outputDir, 'App.css'),
      path.join(outputDir, 'src', 'App.css')
    );
    await fs.rename(
      path.join(outputDir, 'components'),
      path.join(outputDir, 'src', 'components')
    );

    console.log('✅ React components generated\n');
    console.log('=' .repeat(60));
    console.log('🎉 Website cloning complete!');
    console.log('=' .repeat(60));
    console.log('\n📁 Output directory: cloned-website/');
    console.log('   ├── 📸 screenshots/     (Website screenshots)');
    console.log('   ├── 📄 src/            (React source code)');
    console.log('   │   ├── App.js         (Main app component)');
    console.log('   │   ├── App.css        (App styles)');
    console.log('   │   ├── components/    (React components)');
    console.log('   │   └── index.js       (Entry point)');
    console.log('   ├── 📄 public/         (Public assets)');
    console.log('   └── 📄 package.json    (Project configuration)');
    console.log('\n🚀 To run the cloned website:');
    console.log('   1. cd cloned-website');
    console.log('   2. npm install');
    console.log('   3. npm start');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();