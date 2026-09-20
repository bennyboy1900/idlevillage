// Minimaler, abhängigkeitsfreier PNG-Dekoder für die Asset-Prüfung.
// Unterstützt Bittiefe 8 mit Farbtyp 0/2/3/4/6 und den Standard-Zeilenfiltern.
// Ausreichend für die Sheets in maingamesprites/ und ui/.
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/** Liest ein PNG und liefert { width, height, data } mit data als RGBA-Bytes. */
export function readPng(file) {
  const buf = readFileSync(file);
  if (!buf.subarray(0, 8).equals(SIGNATURE)) throw new Error(`Kein PNG: ${file}`);

  let width = 0;
  let height = 0;
  let depth = 0;
  let colorType = 0;
  let interlace = 0;
  let palette = null;
  let trns = null;
  const idat = [];

  let offset = 8;
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const body = buf.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      depth = body[8];
      colorType = body[9];
      interlace = body[12];
    } else if (type === 'PLTE') {
      palette = Buffer.from(body);
    } else if (type === 'tRNS') {
      trns = Buffer.from(body);
    } else if (type === 'IDAT') {
      idat.push(Buffer.from(body));
    } else if (type === 'IEND') {
      break;
    }
  }

  if (depth !== 8) throw new Error(`Bittiefe ${depth} wird nicht unterstützt: ${file}`);
  if (interlace !== 0) throw new Error(`Interlaced PNG wird nicht unterstützt: ${file}`);

  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`Farbtyp ${colorType} wird nicht unterstützt: ${file}`);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const out = pixels.subarray(y * stride, y * stride + stride);
    const prev = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null;

    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? out[x - channels] : 0;
      const up = prev ? prev[x] : 0;
      const upLeft = prev && x >= channels ? prev[x - channels] : 0;
      let value = line[x];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += (left + up) >> 1;
      else if (filter === 4) value += paeth(left, up, upLeft);
      out[x] = value & 0xff;
    }
  }

  // Auf RGBA normalisieren.
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const s = i * channels;
    const d = i * 4;
    if (colorType === 6) {
      data[d] = pixels[s];
      data[d + 1] = pixels[s + 1];
      data[d + 2] = pixels[s + 2];
      data[d + 3] = pixels[s + 3];
    } else if (colorType === 2) {
      data[d] = pixels[s];
      data[d + 1] = pixels[s + 1];
      data[d + 2] = pixels[s + 2];
      data[d + 3] = 255;
    } else if (colorType === 0) {
      data[d] = data[d + 1] = data[d + 2] = pixels[s];
      data[d + 3] = 255;
    } else if (colorType === 4) {
      data[d] = data[d + 1] = data[d + 2] = pixels[s];
      data[d + 3] = pixels[s + 1];
    } else {
      const idx = pixels[s];
      data[d] = palette[idx * 3];
      data[d + 1] = palette[idx * 3 + 1];
      data[d + 2] = palette[idx * 3 + 2];
      data[d + 3] = trns && idx < trns.length ? trns[idx] : 255;
    }
  }

  return { width, height, data };
}

/** Anteil sichtbarer Pixel in einem Rechteck (0..1). */
export function coverage(png, rx, ry, rw, rh) {
  let visible = 0;
  for (let y = ry; y < ry + rh; y++) {
    for (let x = rx; x < rx + rw; x++) {
      if (x < 0 || y < 0 || x >= png.width || y >= png.height) continue;
      if (png.data[(y * png.width + x) * 4 + 3] > 8) visible++;
    }
  }
  return visible / (rw * rh);
}

/** Engste Hülle sichtbarer Pixel innerhalb eines Rechtecks, oder null. */
export function tightBounds(png, rx, ry, rw, rh) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let y = ry; y < ry + rh; y++) {
    for (let x = rx; x < rx + rw; x++) {
      if (x < 0 || y < 0 || x >= png.width || y >= png.height) continue;
      if (png.data[(y * png.width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (minX === Infinity) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
