import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
mkdirSync(publicDir, { recursive: true });

const src = path.join(publicDir, 'pll-logo.png');

async function emit(name, size) {
  await sharp(src)
    .resize(size, size, { fit: 'contain' })
    .png()
    .toFile(path.join(publicDir, name));
  console.log('wrote', name, size);
}

await emit('favicon.png', 64);
await emit('apple-touch-icon.png', 180);
await emit('icon-192.png', 192);
await emit('icon-512.png', 512);
console.log('pll-logo derived icons done');