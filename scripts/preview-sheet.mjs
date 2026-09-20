// Entwicklungswerkzeug: skaliert ein Sheet hoch und zeichnet ein Raster ein,
// damit Frames und Varianten mit dem Auge geprüft werden können.
//   node scripts/preview-sheet.mjs <pfad> <ziel.png> [zellbreite] [zellhoehe] [scale]
import { readPng } from './pnglib.mjs';
import { writePng, createImage, blit, fill } from './pngwrite.mjs';

const [, , file, out, cwArg, chArg, scaleArg] = process.argv;
const png = readPng(file);
const cw = Number(cwArg ?? 16);
const ch = Number(chArg ?? 16);
const scale = Number(scaleArg ?? 8);
const pad = 2;
const cols = Math.ceil(png.width / cw);
const rows = Math.ceil(png.height / ch);

const img = createImage(cols * (cw * scale + pad) + pad, rows * (ch * scale + pad) + pad);
fill(img, 0, 0, img.width, img.height, [24, 24, 32, 255]);

for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const dx = pad + c * (cw * scale + pad);
    const dy = pad + r * (ch * scale + pad);
    // Schachbrett als Alpha-Hintergrund.
    for (let y = 0; y < ch * scale; y += scale) {
      for (let x = 0; x < cw * scale; x += scale) {
        const light = ((x / scale + y / scale) & 1) === 0;
        fill(img, dx + x, dy + y, scale, scale, light ? [70, 70, 80, 255] : [50, 50, 58, 255]);
      }
    }
    blit(img, png, c * cw, r * ch, cw, ch, dx, dy, scale);
  }
}

writePng(out, img);
console.log(`${file} -> ${out} (${cols}x${rows} Zellen à ${cw}x${ch}, Faktor ${scale})`);
