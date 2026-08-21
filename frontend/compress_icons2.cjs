// compress_icons2.cjs — Writes to temp location then renames
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, 'public');

async function compress() {
  console.log('Reading icon-192.png...');
  const buf192 = fs.readFileSync(path.join(publicDir, 'icon-192.png'));
  
  console.log('Compressing icon-192.png...');
  const out192 = await sharp(buf192)
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 85, compressionLevel: 9 })
    .toBuffer();

  console.log('Reading icon-512.png...');
  const buf512 = fs.readFileSync(path.join(publicDir, 'icon-512.png'));

  console.log('Compressing icon-512.png...');
  const out512 = await sharp(buf512)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 85, compressionLevel: 9 })
    .toBuffer();

  // Write back using writeFileSync (overwrites in place)
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), out192);
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), out512);

  const s192 = fs.statSync(path.join(publicDir, 'icon-192.png')).size;
  const s512 = fs.statSync(path.join(publicDir, 'icon-512.png')).size;
  console.log(`icon-192.png: ${(s192/1024).toFixed(1)} KB (was 531.8 KB)`);
  console.log(`icon-512.png: ${(s512/1024).toFixed(1)} KB (was 531.8 KB)`);
  console.log('Done!');
}

compress().catch(console.error);
