const { chromium } = require('playwright');

async function captureResponsiveScreenshots() {
  const browser = await chromium.launch();

  const viewports = [
    { name: 'mobile', width: 375, height: 812 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 800 }
  ];

  for (const viewport of viewports) {
    console.log(`Capturing ${viewport.name} (${viewport.width}x${viewport.height})...`);

    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height }
    });
    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3002', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Wait for content to render
      await page.waitForTimeout(2000);

      // Capture full page screenshot
      await page.screenshot({
        path: `screenshots/${viewport.name}-${viewport.width}px.png`,
        fullPage: true
      });

      console.log(`✓ Saved screenshots/${viewport.name}-${viewport.width}px.png`);
    } catch (error) {
      console.error(`Error capturing ${viewport.name}:`, error.message);
    }

    await context.close();
  }

  await browser.close();
  console.log('\nDone! Screenshots saved to ./screenshots/');
}

captureResponsiveScreenshots();
