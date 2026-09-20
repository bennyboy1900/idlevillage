import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CHARACTER_ANIM,
  COAST,
  FIELD_FRAMES,
  GRASS_DETAIL,
  HIGHLIGHT,
  NODE_SPRITES,
  PATH_FRAMES,
  RESSOURCE_ICON,
  SAPLING,
  SHEETS,
  SHEET_BY_KEY,
  frameAnzahl,
  sheetMasse,
  spalten,
} from '../src/assets/manifest';
import { BUILDINGS } from '../src/game/content/buildings';
import { readPng } from '../scripts/pnglib';
import statusBericht from '../docs/asset-status.json';

const WURZEL = resolve(__dirname, '..');

/**
 * Diese Prüfungen laufen gegen die echten PNG-Dateien: keine registrierte
 * Quelle darf fehlen und kein verwendeter Frame darf außerhalb des Bildes
 * liegen.
 */
describe('Sprite-Manifest', () => {
  it('registriert nur vorhandene Originaldateien', () => {
    for (const sheet of SHEETS) {
      expect(existsSync(resolve(WURZEL, sheet.source)), `${sheet.source} fehlt`).toBe(true);
    }
  });

  it('liefert jede Laufzeitdatei aus public/assets aus', () => {
    for (const sheet of SHEETS) {
      const datei = resolve(WURZEL, 'public', sheet.url.replace(/^\//, ''));
      expect(existsSync(datei), `${sheet.url} wurde nicht aufbereitet`).toBe(true);
    }
  });

  it('kennt die tatsächlichen Bildmaße und passt die Raster hinein', () => {
    for (const sheet of SHEETS) {
      const png = readPng(resolve(WURZEL, sheet.source));
      const [breite, hoehe] = sheetMasse(sheet.key);
      expect([breite, hoehe], `${sheet.key}: Maße`).toEqual([png.width, png.height]);
      expect(png.width % sheet.fw, `${sheet.key}: Breite nicht durch Framebreite teilbar`).toBe(0);
      expect(Math.floor(png.height / sheet.fh), `${sheet.key}: keine volle Zeile`).toBeGreaterThan(0);
    }
  });

  const pruefeFrame = (sheetKey: string, frame: number, wofuer: string) => {
    const sheet = SHEET_BY_KEY[sheetKey];
    expect(sheet, `${wofuer}: unbekanntes Sheet ${sheetKey}`).toBeDefined();
    expect(frame, `${wofuer}: negativer Frame`).toBeGreaterThanOrEqual(0);
    expect(frame, `${wofuer}: Frame ${frame} liegt außerhalb von ${sheetKey}`).toBeLessThan(
      frameAnzahl(sheetKey),
    );
  };

  it('hält alle Gebäudegrafiken in den Bildgrenzen', () => {
    for (const def of BUILDINGS) {
      pruefeFrame(def.sprite.sheet, def.sprite.frame, `Gebäude ${def.id}`);
      for (const v of def.varianten ?? []) pruefeFrame(def.sprite.sheet, v, `Gebäude ${def.id} Variante`);
    }
  });

  it('hält Welt-, Symbol- und Bodenframes in den Bildgrenzen', () => {
    for (const [kind, def] of Object.entries(NODE_SPRITES)) {
      for (const frame of def.frames) pruefeFrame(def.sheet, frame, `Knoten ${kind}`);
    }
    pruefeFrame(SAPLING.sheet, SAPLING.frame, 'Setzling');
    for (const frame of GRASS_DETAIL.frames) pruefeFrame(GRASS_DETAIL.sheet, frame, 'Grasbüschel');
    for (const frame of FIELD_FRAMES) pruefeFrame('wheatfield', frame, 'Ackerstufe');
    for (const frame of [...PATH_FRAMES.senkrecht, ...PATH_FRAMES.waagerecht]) {
      pruefeFrame('cliff', frame, 'Steinweg');
    }
    for (const frame of Object.values(COAST)) pruefeFrame('cliffwater', frame, 'Küstenautotile');
    for (const frame of Object.values(HIGHLIGHT)) pruefeFrame('highlight', frame, 'Markierung');
    for (const [name, eintrag] of Object.entries(RESSOURCE_ICON)) {
      pruefeFrame(eintrag.sheet, eintrag.frame, `Symbol ${name}`);
    }
  });

  it('deckt jede Figurenanimation mit echten Frames ab', () => {
    const figuren = SHEETS.filter((s) => s.key.startsWith('worker-') || s.key === 'guard');
    expect(figuren.length).toBeGreaterThan(0);
    for (const sheet of figuren) {
      expect(spalten(sheet.key), `${sheet.key}: erwartete 5 Spalten`).toBe(CHARACTER_ANIM.spalten);
      for (const art of ['idle', 'walk', 'arbeit'] as const) {
        const def = CHARACTER_ANIM[art];
        expect(def.frames, `${sheet.key}/${art}: leere Pflichtanimation`).toBeGreaterThan(0);
        for (const zeile of Object.values(def.zeilen)) {
          const start = zeile * CHARACTER_ANIM.spalten;
          pruefeFrame(sheet.key, start, `${sheet.key}/${art} Start`);
          pruefeFrame(sheet.key, start + def.frames - 1, `${sheet.key}/${art} Ende`);
        }
      }
    }
  });
});

describe('Asset-Aufbereitung', () => {
  const bericht = statusBericht as {
    dateien: number;
    counts: Record<string, number>;
    report: { source: string; status: string; runtime?: string | null }[];
  };

  it('gibt jeder der 320 Originaldateien einen begründeten Status', () => {
    expect(bericht.dateien).toBe(320);
    const erlaubt = ['laufzeit', 'variante', 'referenz', 'quelldaten', 'duplikat'];
    for (const eintrag of bericht.report) {
      expect(erlaubt, `${eintrag.source}: unbekannter Status ${eintrag.status}`).toContain(eintrag.status);
    }
  });

  it('liefert byteidentische Duplikate nicht mehrfach aus', () => {
    const duplikate = bericht.report.filter((r) => r.status === 'duplikat');
    // Die 19 gleichnamigen Dateien direkt unter ui/ sind Kopien von ui/PNG/.
    expect(duplikate.length).toBe(19);
    for (const d of duplikate) expect(d.runtime ?? null).toBeNull();
  });

  it('verwendet jedes registrierte Sheet aus dem Laufzeitbestand', () => {
    const laufzeit = new Set(bericht.report.filter((r) => r.status === 'laufzeit').map((r) => r.runtime));
    for (const sheet of SHEETS) {
      expect(laufzeit.has(sheet.url), `${sheet.url} ist nicht als Laufzeitasset gelistet`).toBe(true);
    }
  });
});
