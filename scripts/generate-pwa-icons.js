const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// SVG with modern rounded gradient and wallet icon
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1" />
      <stop offset="50%" stop-color="#8b5cf6" />
      <stop offset="100%" stop-color="#a855f7" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#4f46e5" flood-opacity="0.35"/>
    </filter>
  </defs>
  
  <!-- App Background with smooth rounded corners -->
  <rect width="512" height="512" rx="128" fill="url(#grad)" filter="url(#shadow)"/>
  
  <!-- Subtle inner border -->
  <rect x="4" y="4" width="504" height="504" rx="124" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="8"/>
  
  <!-- Wallet Symbol -->
  <g transform="translate(106, 116)" fill="none" stroke="#ffffff" stroke-width="28" stroke-linecap="round" stroke-linejoin="round">
    <path d="M260 90V40c0-16.6-13.4-30-30-30H40C23.4 10 10 23.4 10 40v200c0 16.6 13.4 30 30 30h190c16.6 0 30-13.4 30-30v-50"/>
    <path d="M260 90H180c-16.6 0-30 13.4-30 30v40c0 16.6 13.4 30 30 30h80c16.6 0 30-13.4 30-30v-40c0-16.6-13.4-30-30-30z" fill="rgba(255,255,255,0.25)"/>
    <circle cx="215" cy="145" r="14" fill="#ffffff"/>
  </g>
</svg>
`;

async function generate() {
  const svgBuffer = Buffer.from(svgIcon);

  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, 'icon-192x192.png'));
  console.log('✓ Generated icon-192x192.png');

  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon-512x512.png'));
  console.log('✓ Generated icon-512x512.png');

  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'));
  console.log('✓ Generated apple-touch-icon.png');
}

generate().catch(console.error);
