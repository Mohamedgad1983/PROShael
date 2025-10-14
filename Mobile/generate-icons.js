import fs from 'fs';
import path from 'path';
import { createCanvas } from 'canvas';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Icon sizes required for PWA
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Generate icon for a specific size
function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');

  // Draw rounded rectangle background
  const radius = size * 0.15;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();

  // Draw white text "AS" (Al-Shuail)
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${size * 0.35}px Arial`;

  // Add text shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = size * 0.02;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = size * 0.01;

  ctx.fillText('AS', size / 2, size / 2);

  // Add decorative line below text
  ctx.strokeStyle = 'white';
  ctx.lineWidth = size * 0.02;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(size * 0.3, size * 0.7);
  ctx.lineTo(size * 0.7, size * 0.7);
  ctx.stroke();

  return canvas;
}

// Save icon to file
function saveIcon(canvas, filename) {
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filename, buffer);
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

  console.log('🎨 Generating PWA icons...\n');

  // Generate each icon size
  iconSizes.forEach(size => {
    const canvas = generateIcon(size);
    const filename = path.join(iconsDir, `icon-${size}.png`);
    saveIcon(canvas, filename);
  });

  // Also generate a favicon (32x32)
  const faviconCanvas = generateIcon(32);
  saveIcon(faviconCanvas, path.join(__dirname, 'favicon.ico'));

  console.log('\n✅ All icons generated successfully!');
  console.log('📍 Icons saved in:', iconsDir);
}

// Check if canvas module is available
try {
  generateAllIcons();
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND') {
    console.log('⚠️ Canvas module not installed.');
    console.log('Creating placeholder icons instead...\n');

    // Create placeholder icons as simple colored squares
    const iconsDir = path.join(__dirname, 'icons');
    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir, { recursive: true });
    }

    // Create simple SVG icons as placeholders
    iconSizes.forEach(size => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#grad)"/>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="${size * 0.35}" font-weight="bold" font-family="Arial">AS</text>
        <line x1="${size * 0.3}" y1="${size * 0.7}" x2="${size * 0.7}" y2="${size * 0.7}" stroke="white" stroke-width="${size * 0.02}"/>
      </svg>`;

      const filename = path.join(iconsDir, `icon-${size}.svg`);
      fs.writeFileSync(filename, svg);
      console.log(`✅ Generated: icon-${size}.svg (placeholder)`);
    });

    console.log('\n⚠️ Note: SVG placeholders created. For PNG icons, install canvas:');
    console.log('npm install canvas');
  } else {
    console.error('Error:', error.message);
  }
}