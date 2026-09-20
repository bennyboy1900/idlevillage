// Entwicklungswerkzeug: dominante Farbe je Zelle, um Varianten (Erzfarben,
// Fraktionen) von echten Animationsframes zu unterscheiden.
//   node scripts/cell-color.mjs <pfad> [zellbreite] [zellhoehe]
import { readPng } from './pnglib.mjs';

const [, , file, cwArg, chArg] = process.argv;
const png = readPng(file);
const cw = Number(cwArg ?? 16);
const ch = Number(chArg ?? 16);
const cols = Math.floor(png.width / cw);
const rows = Math.floor(png.height / ch);

function dominant(rx, ry) {
  const counts = new Map();
  for (let y = ry; y < ry + ch; y++) {
    for (let x = rx; x < rx + cw; x++) {
      const i = (y * png.width + x) * 4;
      if (png.data[i + 3] < 128) continue;
      const key = `${png.data[i]},${png.data[i + 1]},${png.data[i + 2]}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  let best = '-';
  let bestN = 0;
  for (const [key, n] of counts) {
    if (n > bestN) {
      best = key;
      bestN = n;
    }
  }
  return `${best.padStart(11)}(${bestN.toString().padStart(3)})`;
}

console.log(`${file}: ${png.width}x${png.height}`);
for (let r = 0; r < rows; r++) {
  const out = [];
  for (let c = 0; c < cols; c++) out.push(dominant(c * cw, r * ch));
  console.log(`r${r.toString().padStart(2)} | ${out.join(' | ')}`);
}
