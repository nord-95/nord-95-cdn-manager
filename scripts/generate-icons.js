const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputPath = path.join(__dirname, '../public/icons/icon-original.png');
const outputDir = path.join(__dirname, '../public/icons');

async function generateIcons() {
  try {
    // Check if original icon exists
    if (!fs.existsSync(inputPath)) {
      console.error('Original icon not found at:', inputPath);
      return;
    }

    console.log('Generating PWA icons...');

    for (const size of iconSizes) {
      const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
      
      await sharp(inputPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`Generated: icon-${size}x${size}.png`);
    }

    // Generate favicon
    await sharp(inputPath)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(outputDir, 'favicon-32x32.png'));

    await sharp(inputPath)
      .resize(16, 16, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(outputDir, 'favicon-16x16.png'));

    console.log('Generated: favicon-32x32.png');
    console.log('Generated: favicon-16x16.png');

    console.log('✅ All PWA icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();
