const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function captureAppleDesign() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    console.log('Navigating to Apple registration page...');
    await page.goto('http://localhost:3002/apple-register', { waitUntil: 'networkidle' });

    // Wait for page to fully load
    await page.waitForTimeout(2000);

    // Capture all styles
    const styles = await page.evaluate(() => {
        const allStyles = [];

        // Get all stylesheets
        for (let sheet of document.styleSheets) {
            try {
                const rules = sheet.cssRules || sheet.rules;
                if (rules) {
                    for (let rule of rules) {
                        allStyles.push(rule.cssText);
                    }
                }
            } catch (e) {
                // External stylesheets might throw security errors
                console.log('Could not access stylesheet:', e);
            }
        }

        // Get inline styles
        const elements = document.querySelectorAll('*[style]');
        elements.forEach(el => {
            allStyles.push(`/* Inline style for ${el.tagName} */`);
            allStyles.push(el.getAttribute('style'));
        });

        return allStyles.join('\n');
    });

    // Capture the HTML structure
    const htmlContent = await page.evaluate(() => {
        const container = document.querySelector('.apple-registration-container');
        return container ? container.outerHTML : document.body.innerHTML;
    });

    // Get computed styles for key elements
    const computedStyles = await page.evaluate(() => {
        const styles = {};
        const selectors = [
            '.apple-registration-container',
            '.apple-header',
            '.apple-content',
            '.apple-form-card',
            '.apple-progress-bar',
            '.apple-step',
            '.apple-form-group',
            '.apple-button',
            '.apple-gradient-overlay',
            '.apple-particle-effect'
        ];

        selectors.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                const computed = window.getComputedStyle(element);
                const important = [
                    'background', 'background-color', 'background-image',
                    'border', 'border-radius', 'box-shadow',
                    'color', 'font-family', 'font-size', 'font-weight',
                    'padding', 'margin', 'width', 'height',
                    'display', 'position', 'transform', 'transition',
                    'backdrop-filter', '-webkit-backdrop-filter'
                ];

                styles[selector] = {};
                important.forEach(prop => {
                    if (computed[prop]) {
                        styles[selector][prop] = computed[prop];
                    }
                });
            }
        });

        return styles;
    });

    // Save captured data
    const capturedData = {
        html: htmlContent,
        styles: styles,
        computedStyles: computedStyles,
        timestamp: new Date().toISOString()
    };

    await fs.writeFile(
        path.join(__dirname, 'captured-apple-design.json'),
        JSON.stringify(capturedData, null, 2)
    );

    console.log('Design captured successfully!');

    // Take a screenshot for reference
    await page.screenshot({
        path: 'apple-register-screenshot.png',
        fullPage: true
    });

    await browser.close();
    return capturedData;
}

captureAppleDesign().then(data => {
    console.log('Capture complete!');
    console.log('HTML length:', data.html.length);
    console.log('Styles length:', data.styles.length);
    console.log('Computed styles:', Object.keys(data.computedStyles).length, 'elements');
}).catch(console.error);