// Minimaler PNG-Encoder (RGBA8) für Entwicklungsvorschauen und Ableitungen.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, body) {
  const out = Buffer.alloc(body.length + 12);
  out.writeUInt32BE(body.length, 0);
  out.write(type, 4, 'ascii');
  body.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + body.length)), 8 + body.length);
  return out;
}

/** Schreibt ein RGBA-Bild als PNG. */
export function writePng(file, { width, height, data }) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bittiefe
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // Filter: none
    data.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  writeFileSync(
    file,
    Buffer.concat([
      SIGNATURE,
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  );
}

/** Erzeugt ein neues leeres RGBA-Bild. */
export function createImage(width, height) {
  return { width, height, data: Buffer.alloc(width * height * 4) };
}

/** Kopiert ein Rechteck (nearest-neighbour skaliert) in ein Zielbild. */
export function blit(dst, src, sx, sy, sw, sh, dx, dy, scale = 1) {
  for (let y = 0; y < sh * scale; y++) {
    for (let x = 0; x < sw * scale; x++) {
      const px = sx + Math.floor(x / scale);
      const py = sy + Math.floor(y / scale);
      if (px < 0 || py < 0 || px >= src.width || py >= src.height) continue;
      const tx = dx + x;
      const ty = dy + y;
      if (tx < 0 || ty < 0 || tx >= dst.width || ty >= dst.height) continue;
      const s = (py * src.width + px) * 4;
      const d = (ty * dst.width + tx) * 4;
      const a = src.data[s + 3] / 255;
      if (a === 0) continue;
      const inv = 1 - a;
      dst.data[d] = src.data[s] * a + dst.data[d] * inv;
      dst.data[d + 1] = src.data[s + 1] * a + dst.data[d + 1] * inv;
      dst.data[d + 2] = src.data[s + 2] * a + dst.data[d + 2] * inv;
      dst.data[d + 3] = Math.min(255, src.data[s + 3] + dst.data[d + 3] * inv);
    }
  }
}

/** Füllt ein Rechteck mit einer Farbe. */
export function fill(img, x0, y0, w, h, [r, g, b, a = 255]) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue;
      const d = (y * img.width + x) * 4;
      img.data[d] = r;
      img.data[d + 1] = g;
      img.data[d + 2] = b;
      img.data[d + 3] = a;
    }
  }
}
