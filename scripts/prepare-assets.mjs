// Reproduzierbare Aufbereitung der Laufzeitassets.
//
// Die Originalordner (maingamesprites/, ui/, font/, sfx/, music/) bleiben
// unverändert. Dieses Skript kopiert ausschliesslich die tatsächlich
// benötigten Dateien nach public/assets/, vergibt URL-sichere Namen und
// erzeugt kleinere Audio-Ableitungen. public/assets/ ist Build-Ausgabe und
// steht in .gitignore.
//
// Ausgabe: public/assets/... sowie docs/asset-status.json mit einem
// begründeten Status für jede der 320 Originaldateien.
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPng } from './pnglib.mjs';
import { blit, createImage, writePng } from './pngwrite.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'assets');
const SPRITES = 'maingamesprites/MiniWorldSprites';

/** Ersetzt Leerzeichen und Unicode durch URL-sichere ASCII-Namen. */
function slug(path) {
  return path
    .replace(/ö/g, 'oe')
    .replace(/ä/g, 'ae')
    .replace(/ü/g, 'ue')
    .replace(/Ö/g, 'Oe')
    .replace(/Ä/g, 'Ae')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .replace(/[()]/g, '')
    .replace(/[ _]+/g, '-')
    .replace(/[^A-Za-z0-9\-./]/g, '-');
}

function listFiles(dir) {
  const out = [];
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...listFiles(rel));
    else out.push(rel);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Auswahl der Laufzeitassets
// ---------------------------------------------------------------------------

/** Sprites, die zur Laufzeit geladen werden dürfen (Präfixe unter SPRITES). */
const SPRITE_DIRS = [
  'Animals',
  'Buildings',
  'Characters',
  'Ground',
  'Miscellaneous',
  'Nature',
  'Objects',
  'User Interface',
];

/** Dateien, die bewusst nicht ausgeliefert werden, mit Begründung. */
const EXCLUDED = new Map([
  [`${SPRITES}/AllAssetsPreview.png`, 'referenz: Übersichtsbild, kein Weltsprite'],
  [`${SPRITES}/ColoredBuildingsPreview.png`, 'referenz: Übersichtsbild, kein Weltsprite'],
  [`${SPRITES}/OtherLinks.docx`, 'quelldaten: Danksagung und Links, kein Laufzeitasset'],
  [`${SPRITES}/Templates/16x16Large.png`, 'referenz: Rastervorlage für die Entwicklung'],
  [`${SPRITES}/Templates/16x16Small.png`, 'referenz: Rastervorlage für die Entwicklung'],
  [`${SPRITES}/Templates/32x32Small.png`, 'referenz: Rastervorlage für die Entwicklung'],
  ['font/bitmap/monogram-bitfontmaker.json', 'quelldaten: Bitmap-Quellformat, Renderer nutzt TTF'],
  ['font/bitmap/monogram-bitmap.json', 'quelldaten: Bitmap-Quellformat, Renderer nutzt TTF'],
  ['font/bitmap/monogram-bitmap.png', 'quelldaten: Bitmap-Quellformat, Renderer nutzt TTF'],
  ['font/bitmap/monogram-italic-bitmap.png', 'quelldaten: Bitmap-Quellformat, Renderer nutzt TTF'],
  ['font/ttf/monogram.ttf', 'variante: gekürzter Zeichensatz, extended deckt Deutsch ab'],
  [
    'music/Minifantasy_Dungeon_Music/Acknowledgements.txt',
    'quelldaten: Lizenz-/Credittext, in den Credits zitiert',
  ],
  [
    'music/Minifantasy_Dungeon_Music/Licensing.txt',
    'quelldaten: Lizenztext, in den Credits zitiert',
  ],
  [
    'music/Minifantasy_Dungeon_Music/Patreon_Leohpaz.url',
    'quelldaten: Urheberlink, in den Credits zitiert',
  ],
]);

// ---------------------------------------------------------------------------
// WAV-Ableitungen (ohne externe Encoder)
// ---------------------------------------------------------------------------

/**
 * Wandelt ein PCM-WAV in 16-bit Mono mit reduzierter Abtastrate.
 * Es steht kein mp3-/ogg-Encoder zur Verfügung, deshalb bleibt das Format WAV;
 * das ist in allen Zielbrowsern inklusive Safari abspielbar.
 */
function downsampleWav(buf, targetRate) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') return null;

  let format = 0;
  let channels = 0;
  let rate = 0;
  let bits = 0;
  let data = null;
  let offset = 12;
  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const body = buf.subarray(offset + 8, offset + 8 + size);
    if (id === 'fmt ') {
      format = body.readUInt16LE(0);
      channels = body.readUInt16LE(2);
      rate = body.readUInt32LE(4);
      bits = body.readUInt16LE(14);
    } else if (id === 'data') {
      data = body;
    }
    offset += 8 + size + (size % 2);
  }
  if (format !== 1 || !data || ![8, 16, 24, 32].includes(bits)) return null;

  const bytesPerSample = bits / 8;
  const frames = Math.floor(data.length / (bytesPerSample * channels));
  const readSample = (frame, ch) => {
    const at = (frame * channels + ch) * bytesPerSample;
    if (bits === 8) return (data[at] - 128) / 128;
    if (bits === 16) return data.readInt16LE(at) / 32768;
    if (bits === 24) return ((data[at] | (data[at + 1] << 8) | (data[at + 2] << 24 >> 8)) << 8 >> 8) / 8388608;
    return data.readInt32LE(at) / 2147483648;
  };

  const ratio = rate / targetRate;
  const outFrames = Math.floor(frames / ratio);
  const pcm = Buffer.alloc(outFrames * 2);
  for (let i = 0; i < outFrames; i++) {
    // Mittelung über das Quellfenster: einfacher Tiefpass gegen Aliasing.
    const from = Math.floor(i * ratio);
    const to = Math.min(frames, Math.max(from + 1, Math.floor((i + 1) * ratio)));
    let sum = 0;
    let n = 0;
    for (let f = from; f < to; f++) {
      for (let c = 0; c < channels; c++) sum += readSample(f, c);
      n += channels;
    }
    const value = Math.max(-1, Math.min(1, n ? sum / n : 0));
    pcm.writeInt16LE(Math.round(value * 32767), i * 2);
  }

  const out = Buffer.alloc(44 + pcm.length);
  out.write('RIFF', 0, 'ascii');
  out.writeUInt32LE(36 + pcm.length, 4);
  out.write('WAVE', 8, 'ascii');
  out.write('fmt ', 12, 'ascii');
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(1, 22);
  out.writeUInt32LE(targetRate, 24);
  out.writeUInt32LE(targetRate * 2, 28);
  out.writeUInt16LE(2, 32);
  out.writeUInt16LE(16, 34);
  out.write('data', 36, 'ascii');
  pcm.copy(out, 44);
  return out;
}

// ---------------------------------------------------------------------------
// Ausführung
// ---------------------------------------------------------------------------

function write(target, buffer) {
  const file = join(OUT, target);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, buffer);
  return buffer.length;
}

function copy(source, target) {
  const file = join(OUT, target);
  mkdirSync(dirname(file), { recursive: true });
  copyFileSync(join(ROOT, source), file);
  return statSync(file).size;
}

const sources = [
  ...listFiles(SPRITES),
  ...listFiles('ui'),
  ...listFiles('font'),
  ...listFiles('sfx'),
  ...listFiles('music'),
];

if (existsSync(OUT)) rmSync(OUT, { recursive: true });

const report = [];
const hashes = new Map();
/** Bildmaße je Laufzeitpfad, damit das Manifest Spalten und Zeilen kennt. */
const groessen = {};
let bytes = 0;

/** Liest Breite und Höhe aus dem IHDR-Block eines PNG. */
function pngGroesse(datei) {
  const buf = readFileSync(datei);
  if (buf.length < 24 || buf.toString('ascii', 12, 16) !== 'IHDR') return null;
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

for (const source of sources.sort()) {
  const excluded = EXCLUDED.get(source);
  if (excluded) {
    const [status, reason] = excluded.split(': ');
    report.push({ source, status, reason });
    continue;
  }

  // ui/ dupliziert ui/PNG/ byteweise: nur einmal ausliefern.
  const hash = createHash('sha256').update(readFileSync(join(ROOT, source))).digest('hex');
  const twin = hashes.get(hash);
  if (twin) {
    report.push({ source, status: 'duplikat', reason: `SHA-256-identisch mit ${twin}`, runtime: null });
    continue;
  }
  hashes.set(hash, source);

  let runtime;
  let size;
  if (source.startsWith(`${SPRITES}/`)) {
    const rel = source.slice(SPRITES.length + 1);
    if (!SPRITE_DIRS.some((dir) => rel.startsWith(`${dir}/`))) {
      report.push({ source, status: 'referenz', reason: 'ausserhalb der Laufzeitordner' });
      continue;
    }
    runtime = `sprites/${slug(rel)}`;
    size = copy(source, runtime);
  } else if (source.startsWith('ui/')) {
    runtime = `ui/${slug(source.replace(/^ui\/(PNG\/)?/, ''))}`;
    size = copy(source, runtime);
  } else if (source.startsWith('font/')) {
    runtime = `font/${slug(source.split('/').pop())}`;
    size = copy(source, runtime);
  } else if (source.startsWith('sfx/')) {
    // Effekte: 22,05 kHz Mono reicht für kurze Cues und spart rund zwei Drittel.
    const derived = downsampleWav(readFileSync(join(ROOT, source)), 22050);
    runtime = `audio/sfx/${slug(source.split('/').pop().replace(/\.wav$/, '.wav'))}`;
    size = derived ? write(runtime, derived) : copy(source, runtime);
  } else if (source.includes('/Music/')) {
    // Musik: 32 kHz Mono, wird ohnehin erst auf Anforderung geladen.
    const derived = downsampleWav(readFileSync(join(ROOT, source)), 32000);
    runtime = `audio/music/${slug(source.split('/').pop())}`;
    size = derived ? write(runtime, derived) : copy(source, runtime);
  } else {
    report.push({ source, status: 'quelldaten', reason: 'nicht als Laufzeitasset vorgesehen' });
    continue;
  }

  bytes += size;
  if (runtime.endsWith('.png')) {
    const masse = pngGroesse(join(OUT, runtime));
    if (masse) groessen[`/assets/${runtime}`] = masse;
  }
  report.push({ source, status: 'laufzeit', runtime: `/assets/${runtime}`, bytes: size });
}

const counts = report.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] ?? 0) + 1;
  return acc;
}, {});

writeFileSync(
  join(ROOT, 'docs', 'asset-status.json'),
  `${JSON.stringify({ generiert: 'npm run assets', dateien: report.length, counts, laufzeitBytes: bytes, report }, null, 2)}\n`,
);
writeFileSync(join(OUT, 'asset-status.json'), `${JSON.stringify({ counts, laufzeitBytes: bytes }, null, 2)}\n`);
// Generiert: vom Sprite-Manifest importiert, damit Raster nie geraten werden.
writeFileSync(
  join(ROOT, 'src', 'assets', 'sprite-sizes.json'),
  `${JSON.stringify(groessen, null, 0)}\n`,
);

// Favicon: die zweite Hütte aus Huts.png, auf 64x64 hochskaliert.
{
  const quelle = readPng(join(ROOT, SPRITES, 'Buildings/Wood/Huts.png'));
  const icon = createImage(64, 64);
  blit(icon, quelle, 16, 0, 16, 16, 0, 0, 4);
  writePng(join(ROOT, 'public', 'favicon.png'), icon);
}

const missing = sources.filter((s) => !report.some((r) => r.source === s));
if (missing.length) {
  console.error(`Ohne Status: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(
  `Assets aufbereitet: ${report.length} Quelldateien, ${counts.laufzeit} Laufzeitdateien, ` +
    `${(bytes / 1024 / 1024).toFixed(1)} MiB in public/assets`,
);
console.log(
  Object.entries(counts)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n'),
);
