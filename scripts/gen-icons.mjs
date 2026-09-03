import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
mkdirSync(out, { recursive: true });

const gold = '#D4AF37';
const brass = '#e9c349';
const charcoal = '#141313';

function svg({ size, maskable }) {
  const pad = maskable ? size * 0.18 : 0;
  const bg = size;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${brass}"/>
      <stop offset="1" stop-color="${gold}"/>
    </linearGradient>
  </defs>
  ${maskable ? `<rect width="${size}" height="${size}" fill="${charcoal}"/>` : ''}
  <rect x="${maskable ? size * 0.12 : 0}" y="${maskable ? size * 0.12 : 0}"
        width="${bg * (maskable ? 0.76 : 1)}" height="${bg * (maskable ? 0.76 : 1)}"
        rx="${size * 0.22}" fill="url(#g)"/>
  <text x="${size / 2}" y="${size * 0.72}" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-weight="800"
        font-size="${size * (maskable ? 0.52 : 0.58)}" fill="${charcoal}">P</text>
</svg>`;
}

async function render(name, size, maskable) {
  const markup = svg({ size, maskable });
  const img = sharp(Buffer.from(markup), { density: 144 });
  const outName = maskable ? `${name}-maskable` : name;
  const file = path.join(out, `${outName}.png`);
  await img.resize(size, size).png().toFile(file);
  console.log('wrote', file);
}

await render('icon-192', 192, false);
await render('icon-512', 512, false);
await render('icon-512', 512, true);
await render('maskable-192', 192, true);
await render('apple-touch-icon', 180, false);
await render('favicon', 64, false);

console.log('icons done');