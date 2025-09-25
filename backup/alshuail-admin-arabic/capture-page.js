const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Navigate to the page
  await page.goto('http://localhost:3002/apple-register', { waitUntil: 'networkidle' });

  // Wait for the page to fully load
  await page.waitForTimeout(2000);

  // Get the full HTML
  const html = await page.content();

  // Get all styles
  const styles = await page.evaluate(() => {
    const styleSheets = Array.from(document.styleSheets);
    let css = '';

    styleSheets.forEach(sheet => {
      try {
        const rules = Array.from(sheet.cssRules || sheet.rules);
        rules.forEach(rule => {
          css += rule.cssText + '\n';
        });
      } catch (e) {
        // Handle cross-origin stylesheets
        if (sheet.href) {
          console.log('External stylesheet:', sheet.href);
        }
      }
    });

    // Get inline styles
    const inlineStyles = Array.from(document.querySelectorAll('[style]'));

    return {
      css,
      inlineStylesCount: inlineStyles.length
    };
  });

  // Save HTML
  const fs = require('fs');
  fs.writeFileSync('captured-page.html', html);
  fs.writeFileSync('captured-styles.css', styles.css);

  console.log('Page captured successfully!');
  console.log('HTML saved to captured-page.html');
  console.log('Styles saved to captured-styles.css');
  console.log('Inline styles found:', styles.inlineStylesCount);

  // Take a screenshot for reference
  await page.screenshot({ path: 'page-screenshot.png', fullPage: true });
  console.log('Screenshot saved to page-screenshot.png');

  await browser.close();
})();