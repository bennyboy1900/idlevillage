/**
 * Achtnachbarn-Autotile für 3x3-Blobsätze mit vier Innenecken.
 * Cliff-Water.png und Cliff.png sind genau so aufgebaut (gemessen, siehe
 * `docs/ASSET-PIPELINE.md`).
 */
export interface BlobSatz {
  nw: number;
  n: number;
  ne: number;
  w: number;
  mitte: number;
  e: number;
  sw: number;
  s: number;
  se: number;
  innenNw: number;
  innenNe: number;
  innenSw: number;
  innenSe: number;
}

export const COAST_SATZ: BlobSatz = {
  nw: 0, n: 1, ne: 2,
  w: 5, mitte: 6, e: 7,
  sw: 10, s: 11, se: 12,
  innenNw: 3, innenNe: 4, innenSw: 8, innenSe: 9,
};

/** Cliff.png hat sieben Spalten; der erste Klippensatz beginnt oben links. */
export const CLIFF_SATZ: BlobSatz = {
  nw: 0, n: 1, ne: 2,
  w: 7, mitte: 8, e: 9,
  sw: 14, s: 15, se: 16,
  innenNw: 17, innenNe: 18, innenSw: 24, innenSe: 25,
};

export interface Nachbarn {
  n: boolean;
  s: boolean;
  w: boolean;
  e: boolean;
  nw: boolean;
  ne: boolean;
  sw: boolean;
  se: boolean;
}

/**
 * Wählt den Randframe. `true` bedeutet: dort ist dieselbe Fläche wie in der
 * Mitte. Zurück kommt der Hauptframe und optional ein Innenecken-Overlay.
 */
export function blobFrames(satz: BlobSatz, nb: Nachbarn): { haupt: number; ecken: number[] } {
  const ecken: number[] = [];
  let haupt = satz.mitte;

  if (!nb.n && !nb.w) haupt = satz.nw;
  else if (!nb.n && !nb.e) haupt = satz.ne;
  else if (!nb.s && !nb.w) haupt = satz.sw;
  else if (!nb.s && !nb.e) haupt = satz.se;
  else if (!nb.n) haupt = satz.n;
  else if (!nb.s) haupt = satz.s;
  else if (!nb.w) haupt = satz.w;
  else if (!nb.e) haupt = satz.e;
  else {
    // Alle geraden Nachbarn passen: nur Diagonalen können noch fehlen.
    if (!nb.nw) ecken.push(satz.innenNw);
    if (!nb.ne) ecken.push(satz.innenNe);
    if (!nb.sw) ecken.push(satz.innenSw);
    if (!nb.se) ecken.push(satz.innenSe);
  }
  return { haupt, ecken };
}
