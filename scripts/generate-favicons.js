/**
 * Generate all favicon sizes and social images from the ritual-icon.png source
 * Run with: node scripts/generate-favicons.js
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const SOURCE_ICON = path.join(PUBLIC_DIR, 'ritual-icon.png');

// Favicon sizes needed for comprehensive browser support
const FAVICON_SIZES = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 48, name: 'favicon-48x48.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'android-chrome-192x192.png' },
  { size: 512, name: 'android-chrome-512x512.png' },
];

async function generateFavicons() {
  console.log('🎨 Generating favicons from ritual-icon.png...\n');

  // Check source exists
  if (!fs.existsSync(SOURCE_ICON)) {
    console.error('❌ Source icon not found:', SOURCE_ICON);
    process.exit(1);
  }

  const sourceBuffer = fs.readFileSync(SOURCE_ICON);
  const sourceImage = sharp(sourceBuffer);
  const metadata = await sourceImage.metadata();
  console.log(`📐 Source image: ${metadata.width}x${metadata.height}\n`);

  // Generate PNG favicons
  for (const { size, name } of FAVICON_SIZES) {
    const outputPath = path.join(PUBLIC_DIR, name);
    await sharp(sourceBuffer)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(outputPath);
    console.log(`✅ Generated ${name} (${size}x${size})`);
  }

  // Generate ICO file (multi-resolution)
  // ICO needs 16, 32, and 48 px versions
  const icoSizes = [16, 32, 48];
  const icoBuffers = await Promise.all(
    icoSizes.map(size =>
      sharp(sourceBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toBuffer()
    )
  );

  // Write the 32x32 version as favicon.ico (simple approach)
  // For a true multi-res ICO, you'd need a dedicated ICO library
  await sharp(sourceBuffer)
    .resize(32, 32, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toFile(path.join(PUBLIC_DIR, 'favicon.ico'));
  console.log('✅ Generated favicon.ico (32x32)');

  // Generate OG image (1200x630 for social sharing)
  // Create a branded background with the icon centered
  const ogWidth = 1200;
  const ogHeight = 630;
  const iconSize = 300;

  // Create gradient background
  const gradient = Buffer.from(`
    <svg width="${ogWidth}" height="${ogHeight}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#E8E4F0;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#F5F3F8;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#E0F5F5;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${ogWidth}" height="${ogHeight}" fill="url(#bg)"/>
    </svg>
  `);

  // Resize icon for OG image
  const resizedIcon = await sharp(sourceBuffer)
    .resize(iconSize, iconSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer();

  // Composite icon onto gradient background
  await sharp(gradient)
    .composite([
      {
        input: resizedIcon,
        left: Math.round((ogWidth - iconSize) / 2),
        top: Math.round((ogHeight - iconSize) / 2) - 40
      }
    ])
    .png()
    .toFile(path.join(PUBLIC_DIR, 'og-image.png'));
  console.log(`✅ Generated og-image.png (${ogWidth}x${ogHeight})`);

  // Also create a Twitter-specific image (summary_large_image is 2:1 ratio, 1200x600 works)
  await sharp(gradient)
    .resize(1200, 600)
    .composite([
      {
        input: await sharp(sourceBuffer)
          .resize(280, 280, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toBuffer(),
        left: Math.round((1200 - 280) / 2),
        top: Math.round((600 - 280) / 2) - 20
      }
    ])
    .png()
    .toFile(path.join(PUBLIC_DIR, 'twitter-image.png'));
  console.log('✅ Generated twitter-image.png (1200x600)');

  console.log('\n🎉 All favicons and social images generated successfully!');
}

generateFavicons().catch(err => {
  console.error('❌ Error generating favicons:', err);
  process.exit(1);
});


