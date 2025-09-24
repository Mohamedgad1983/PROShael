const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Set viewport to mobile size
  await page.setViewportSize({ width: 390, height: 844 });

  // Navigate to PWA login
  await page.goto('http://localhost:3002/pwa/login');

  // Wait for page to load
  await page.waitForTimeout(3000);

  // Take screenshot
  await page.screenshot({
    path: 'pwa-login-screenshot.png',
    fullPage: true
  });

  console.log('Screenshot saved as pwa-login-screenshot.png');

  // Get computed styles of text elements
  const textStyles = await page.evaluate(() => {
    const elements = document.querySelectorAll('h1, h2, h3, label, span, p, input');
    const styles = [];

    elements.forEach(el => {
      const computed = window.getComputedStyle(el);
      styles.push({
        tag: el.tagName,
        text: el.textContent?.substring(0, 30),
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        opacity: computed.opacity,
        visibility: computed.visibility,
        display: computed.display
      });
    });

    return styles;
  });

  console.log('\nText Element Styles:');
  console.log('====================');
  textStyles.forEach(style => {
    if (style.text && style.text.trim()) {
      console.log(`${style.tag}: "${style.text.trim()}"
        Color: ${style.color}
        BG: ${style.backgroundColor}
        Opacity: ${style.opacity}
        Visibility: ${style.visibility}
        ---`);
    }
  });

  await browser.close();
})();