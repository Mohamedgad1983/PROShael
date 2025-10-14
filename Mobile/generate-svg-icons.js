import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Icon sizes required for PWA
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Generate SVG icon for a specific size
function generateSVGIcon(size) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="grad${size}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow${size}">
      <feDropShadow dx="0" dy="${size * 0.01}" stdDeviation="${size * 0.02}" flood-opacity="0.3"/>
    </filter>
  </defs>
  <!-- Rounded rectangle background -->
  <rect width="${size}" height="${size}" rx="${size * 0.15}" ry="${size * 0.15}" fill="url(#grad${size})"/>

  <!-- Arabic text "الشعيل" -->
  <text x="50%" y="40%" text-anchor="middle" dominant-baseline="middle"
        fill="white" font-size="${size * 0.25}" font-weight="bold"
        font-family="Arial, sans-serif" filter="url(#shadow${size})">الشعيل</text>

  <!-- AS text -->
  <text x="50%" y="65%" text-anchor="middle" dominant-baseline="middle"
        fill="white" font-size="${size * 0.18}" font-weight="bold"
        font-family="Arial, sans-serif" filter="url(#shadow${size})">AS</text>

  <!-- Decorative line -->
  <line x1="${size * 0.3}" y1="${size * 0.8}" x2="${size * 0.7}" y2="${size * 0.8}"
        stroke="white" stroke-width="${size * 0.015}" stroke-linecap="round"/>
</svg>`;
}

// Save SVG icon to file
function saveIcon(svg, filename) {
  fs.writeFileSync(filename, svg);
  console.log(`✅ Generated: ${filename}`);
}

// Generate all icons
function generateAllIcons() {
  const iconsDir = path.join(__dirname, 'icons');

  // Create icons directory if it doesn't exist
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
    console.log('📁 Created icons directory');
  }

  console.log('🎨 Generating PWA SVG icons...\n');

  // Generate each icon size
  iconSizes.forEach(size => {
    const svg = generateSVGIcon(size);
    const filename = path.join(iconsDir, `icon-${size}.svg`);
    saveIcon(svg, filename);
  });

  // Also generate a small favicon SVG
  const faviconSvg = generateSVGIcon(32);
  saveIcon(faviconSvg, path.join(__dirname, 'favicon.svg'));

  console.log('\n✅ All SVG icons generated successfully!');
  console.log('📍 Icons saved in:', iconsDir);
  console.log('\n📌 Note: These are SVG icons. For PNG conversion, you can:');
  console.log('   1. Open generate-pwa-icons.html in a browser');
  console.log('   2. Use an online SVG to PNG converter');
  console.log('   3. Install canvas module: npm install canvas');
}

// Run the generator
generateAllIcons();