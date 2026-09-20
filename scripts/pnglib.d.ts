// Typen für das abhängigkeitsfreie PNG-Werkzeug, damit die Tests es nutzen können.
export interface Png {
  width: number;
  height: number;
  data: Buffer;
}
export function readPng(file: string): Png;
export function coverage(png: Png, rx: number, ry: number, rw: number, rh: number): number;
export function tightBounds(
  png: Png,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): { x: number; y: number; w: number; h: number } | null;
