// compress_icons.cjs — Compresses PWA icons to proper sizes
const sharp = require('sharp');
const path = require('path');

const publicDir = path.join(__dirname, 'public');

async function compress() {
  console.log('Compressing icon-192.png...');
  await sharp(path.join(publicDir, 'icon-192.png'))
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 90, compressionLevel: 9 })
    .toFile(path.join(publicDir, 'icon-192-compressed.png'));

  console.log('Compressing icon-512.png...');
  await sharp(path.join(publicDir, 'icon-512.png'))
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 90, compressionLevel: 9 })
    .toFile(path.join(publicDir, 'icon-512-compressed.png'));

  const fs = require('fs');
  
  // Replace originals
  fs.copyFileSync(path.join(publicDir, 'icon-192-compressed.png'), path.join(publicDir, 'icon-192.png'));
  fs.copyFileSync(path.join(publicDir, 'icon-512-compressed.png'), path.join(publicDir, 'icon-512.png'));
  fs.unlinkSync(path.join(publicDir, 'icon-192-compressed.png'));
  fs.unlinkSync(path.join(publicDir, 'icon-512-compressed.png'));

  const s192 = fs.statSync(path.join(publicDir, 'icon-192.png')).size;
  const s512 = fs.statSync(path.join(publicDir, 'icon-512.png')).size;
  console.log(`icon-192.png: ${(s192/1024).toFixed(1)} KB`);
  console.log(`icon-512.png: ${(s512/1024).toFixed(1)} KB`);
  console.log('Done!');
}

compress().catch(console.error);
