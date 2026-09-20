// Entwicklungswerkzeug: zeigt die Belegung eines Sheets als Raster, damit
// Framegrößen und Zeilenbedeutung gemessen statt geraten werden.
//   node scripts/inspect-sheet.mjs <pfad> [zellbreite] [zellhoehe]
import { readPng, coverage, tightBounds } from './pnglib.mjs';

const [, , file, cwArg, chArg] = process.argv;
if (!file) {
  console.error('Aufruf: node scripts/inspect-sheet.mjs <pfad> [zellbreite] [zellhoehe]');
  process.exit(1);
}

const png = readPng(file);
const cw = Number(cwArg ?? 16);
const ch = Number(chArg ?? 16);
const cols = Math.floor(png.width / cw);
const rows = Math.floor(png.height / ch);

console.log(`${file}: ${png.width} x ${png.height} -> ${cols} x ${rows} Zellen à ${cw}x${ch}`);
for (let r = 0; r < rows; r++) {
  const cells = [];
  for (let c = 0; c < cols; c++) {
    const cov = coverage(png, c * cw, r * ch, cw, ch);
    const b = tightBounds(png, c * cw, r * ch, cw, ch);
    cells.push(
      cov === 0
        ? '  ----  '
        : `${Math.round(cov * 100)
            .toString()
            .padStart(3)}%${b ? `@${b.x - c * cw},${b.y - r * ch},${b.w},${b.h}` : ''}`,
    );
  }
  console.log(`r${r.toString().padStart(2)} | ${cells.join(' | ')}`);
}
