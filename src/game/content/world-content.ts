import type { NodeKind, Store } from '../core/types';
import type { Effekt } from './research';

// ---------------------------------------------------------------------------
// Regionen
// ---------------------------------------------------------------------------

export interface RegionDef {
  id: string;
  name: string;
  beschreibung: string;
  /** Rechteck in Weltkacheln. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Grundfarbe des Bodens. */
  boden: 'wiese' | 'trockengras' | 'schnee' | 'sand';
  /** Häufigkeiten der Rohstoffknoten, Summe muss nicht 1 ergeben. */
  vorkommen: Partial<Record<NodeKind, number>>;
  /** Wasseranteil bei der Generierung. */
  wasser: number;
  /** Voraussetzung: abgeschlossenes Forschungsprojekt. */
  forschung?: string;
  /** Zusätzliche Erschließungskosten. */
  kosten: Store;
}

/**
 * Begrenzte, seedbasierte Welt aus 32x32-Chunks. Die Startregion ist 64x64
 * Kacheln groß, angrenzende Regionen werden gegen erfüllte Ziele geöffnet.
 */
export const WELTGROESSE = 128;

export const REGIONS: RegionDef[] = [
  {
    id: 'wiesenwald',
    name: 'Wiesenwald',
    beschreibung: 'Sonnige Lichtungen, dichte Baumgruppen und ein ruhiger See. Die Heimat des Dorfes.',
    x: 32,
    y: 32,
    w: 64,
    h: 64,
    boden: 'wiese',
    vorkommen: { baum: 0.06, fels: 0.012, beerenstrauch: 0.014, kraut: 0.006 },
    wasser: 0.14,
    kosten: {},
  },
  {
    id: 'hochland',
    name: 'Felsiges Hochland',
    beschreibung: 'Nadelwald über Stein. Hier liegen Erz und die ersten Kristalle.',
    x: 32,
    y: 0,
    w: 64,
    h: 32,
    boden: 'wiese',
    vorkommen: { nadelbaum: 0.05, fels: 0.045, erzfels: 0.022, kristallfels: 0.004 },
    wasser: 0.05,
    forschung: 'kartenkunde',
    kosten: { holz: 80, muenzen: 60 },
  },
  {
    id: 'kueste',
    name: 'Küste',
    beschreibung: 'Flache Buchten, Palmen und Fischgründe.',
    x: 96,
    y: 32,
    w: 32,
    h: 64,
    boden: 'sand',
    vorkommen: { palme: 0.04, fels: 0.01, beerenstrauch: 0.01 },
    wasser: 0.45,
    forschung: 'kuestenpfade',
    kosten: { holz: 120, bretter: 30, muenzen: 120 },
  },
  {
    id: 'grenzland',
    name: 'Trockenes Grenzland',
    beschreibung: 'Totholz, Kakteen und harter Boden. Wer hier arbeitet, braucht Vorräte.',
    x: 0,
    y: 32,
    w: 32,
    h: 64,
    boden: 'trockengras',
    vorkommen: { totholz: 0.035, kaktus: 0.02, fels: 0.03, erzfels: 0.012 },
    wasser: 0.02,
    forschung: 'trockenmarsch',
    kosten: { holz: 150, werkzeug: 4, muenzen: 200 },
  },
  {
    id: 'winterwald',
    name: 'Winterwald',
    beschreibung: 'Schnee zwischen alten Bäumen. Kristalle glitzern im Frost.',
    x: 32,
    y: 96,
    w: 64,
    h: 32,
    boden: 'schnee',
    vorkommen: { winterbaum: 0.05, fels: 0.02, kristallfels: 0.016, erzfels: 0.01 },
    wasser: 0.08,
    forschung: 'winterausruestung',
    kosten: { stoff: 20, trank: 5, muenzen: 350 },
  },
  {
    id: 'ruinen',
    name: 'Alte Ruinen',
    beschreibung: 'Verfallene Mauern um ein stilles Portal. Niemand weiß, wohin es führt.',
    x: 0,
    y: 0,
    w: 32,
    h: 32,
    boden: 'trockengras',
    vorkommen: { totholz: 0.02, fels: 0.035, kristallfels: 0.02 },
    wasser: 0.04,
    forschung: 'ruinenkunde',
    kosten: { barren: 40, trank: 12, muenzen: 600 },
  },
];

export const REGION_BY_ID: Record<string, RegionDef> = Object.fromEntries(
  REGIONS.map((r) => [r.id, r]),
);

// ---------------------------------------------------------------------------
// Champions
// ---------------------------------------------------------------------------

export interface ChampionDef {
  id: string;
  name: string;
  rolle: string;
  quest: string;
  /** Bedingung, ab der die Quest angeboten wird. */
  ab: { einwohner?: number; forschung?: string; gebaeude?: string };
  beschreibung: string;
  /** Wirkt nur als aktiver Berater; höchstens drei gleichzeitig. */
  effekt: Effekt;
  sprite: string;
}

/**
 * Die Rollen sind neue Spielideen für dieses Projekt, keine überlieferte
 * Asset-Lore. Es können höchstens drei Berater gleichzeitig aktiv sein.
 */
export const CHAMPIONS: ChampionDef[] = [
  { id: 'arthax', name: 'Arthax', rolle: 'Bauleitung', quest: 'Stellt drei Gebäude fertig, während Arthax zusieht.', ab: { einwohner: 8 }, beschreibung: 'Ordnet Baustellen, damit Material nicht herumliegt.', effekt: { bauzeit: 0.85 }, sprite: 'Characters/Champions/Arthax.png' },
  { id: 'boerg', name: 'Börg', rolle: 'Bergbau', quest: 'Fördert 60 Stein, nachdem Börg angekommen ist.', ab: { forschung: 'steinbrucharbeit' }, beschreibung: 'Kennt jede Ader im Hochland.', effekt: { tempoBeruf: { beruf: 'bergmann', faktor: 1.3 } }, sprite: 'Characters/Champions/Boerg.png' },
  { id: 'gangblanc', name: 'Gangblanc', rolle: 'Handel', quest: 'Verdient 200 Münzen am Markt.', ab: { gebaeude: 'markt' }, beschreibung: 'Handelt hart, aber fair.', effekt: { handel: 1.25 }, sprite: 'Characters/Champions/Gangblanc.png' },
  { id: 'grum', name: 'Grum', rolle: 'Forstwirtschaft', quest: 'Pflanzt Schutzwald und fällt trotzdem 100 Holz.', ab: { forschung: 'aufforstung' }, beschreibung: 'Fällt nur, was nachwächst.', effekt: { tempoBeruf: { beruf: 'holzfaeller', faktor: 1.3 }, nachwachsen: 1.5 }, sprite: 'Characters/Champions/Grum.png' },
  { id: 'kanji', name: 'Kanji', rolle: 'Forschung', quest: 'Schließt drei Forschungsprojekte ab.', ab: { gebaeude: 'gelehrtenstube' }, beschreibung: 'Schreibt alles auf, was das Dorf lernt.', effekt: { lernen: 1.5 }, sprite: 'Characters/Champions/Kanji.png' },
  { id: 'katan', name: 'Katan', rolle: 'Diplomatie', quest: 'Erreicht 25 Ansehen.', ab: { einwohner: 20 }, beschreibung: 'Spricht mit den Nachbarn, bevor es Streit gibt.', effekt: { zufriedenheit: 5 }, sprite: 'Characters/Champions/Katan.png' },
  { id: 'okomo', name: 'Okomo', rolle: 'Landwirtschaft', quest: 'Erntet 150 Getreide.', ab: { gebaeude: 'muehle' }, beschreibung: 'Weiß, wann der Boden Ruhe braucht.', effekt: { ertrag: { getreide: 1.3 }, tempoBeruf: { beruf: 'bauer', faktor: 1.2 } }, sprite: 'Characters/Champions/Okomo.png' },
  { id: 'zhinja', name: 'Zhinja', rolle: 'Erkundung', quest: 'Erschließt eine zweite Region.', ab: { forschung: 'kartenkunde' }, beschreibung: 'Findet Wege, wo andere Felsen sehen.', effekt: { gehen: 1.15, offlineStunden: 4 }, sprite: 'Characters/Champions/Zhinja.png' },
];

export const CHAMPION_BY_ID: Record<string, ChampionDef> = Object.fromEntries(
  CHAMPIONS.map((c) => [c.id, c]),
);

export const MAX_BERATER = 3;

// ---------------------------------------------------------------------------
// Ereignisse
// ---------------------------------------------------------------------------

export interface EventDef {
  id: string;
  name: string;
  text: string;
  /** Dauer in Simulationssekunden. */
  dauer: number;
  /** Relative Häufigkeit. */
  gewicht: number;
  ab?: { einwohner?: number; region?: string; gebaeude?: string };
  /** Sofortige Gabe beim Eintreten. */
  gabe?: Store;
  /** Solange das Ereignis läuft wirkende Effekte. */
  effekt?: Effekt;
}

/** Keine Pflichttermine nach realem Kalender; alles läuft in Spielzeit. */
export const EVENTS: EventDef[] = [
  { id: 'haendler', name: 'Fahrender Händler', text: 'Ein Händler rastet am Marktplatz und zahlt gute Preise.', dauer: 180, gewicht: 10, ab: { gebaeude: 'markt' }, effekt: { handel: 1.5 } },
  { id: 'erntefest', name: 'Erntefest', text: 'Das Dorf feiert die Ernte. Alle sind bester Laune.', dauer: 240, gewicht: 8, ab: { einwohner: 10 }, effekt: { zufriedenheit: 12, tempo: 1.1 } },
  { id: 'reisende', name: 'Reisende Familie', text: 'Eine Familie sucht ein neues Zuhause.', dauer: 1, gewicht: 7, ab: { einwohner: 6 } },
  { id: 'tiernachwuchs', name: 'Tiernachwuchs', text: 'Auf der Ranch gibt es Nachwuchs.', dauer: 1, gewicht: 6, ab: { gebaeude: 'ranch' }, gabe: { eier: 15, wolle: 8 } },
  { id: 'erzfund', name: 'Erzfund', text: 'Beim Graben stoßen die Bergleute auf eine reiche Ader.', dauer: 200, gewicht: 6, ab: { gebaeude: 'erzhoehle' }, effekt: { ertrag: { erz: 1.8 } } },
  { id: 'regenperiode', name: 'Regenperiode', text: 'Tagelanger Regen. Die Felder danken es, die Wege sind matschig.', dauer: 220, gewicht: 7, effekt: { ertrag: { getreide: 1.4 }, gehen: 0.85 } },
  { id: 'bauwettbewerb', name: 'Bauwettbewerb', text: 'Die Nachbardörfer schauen zu: alle bauen schneller.', dauer: 200, gewicht: 5, ab: { einwohner: 12 }, effekt: { bauzeit: 0.7 } },
  { id: 'marktansturm', name: 'Marktansturm', text: 'Käufer aus der ganzen Gegend drängen auf den Markt.', dauer: 150, gewicht: 5, ab: { gebaeude: 'markt' }, effekt: { handel: 2 } },
  { id: 'gestrandetes-schiff', name: 'Gestrandetes Schiff', text: 'An der Küste liegt ein havariertes Schiff. Die Ladung ist zu bergen.', dauer: 1, gewicht: 4, ab: { region: 'kueste' }, gabe: { bretter: 40, stoff: 6, muenzen: 80 } },
  { id: 'goblinhandel', name: 'Goblinhandel', text: 'Ein Farmer-Goblin bietet seltsame Waren zum Tausch an.', dauer: 160, gewicht: 4, ab: { einwohner: 15 }, gabe: { kraeuter: 15, kristall: 2 } },
  { id: 'sternennacht', name: 'Sternennacht', text: 'Ein klarer Himmel. Die Gelehrten arbeiten die ganze Nacht.', dauer: 180, gewicht: 4, ab: { gebaeude: 'gelehrtenstube' }, effekt: { ertrag: { forschung: 1.8 } } },
  { id: 'wintervorbereitung', name: 'Wintervorbereitung', text: 'Das Dorf legt Vorräte an. Alle packen mit an.', dauer: 200, gewicht: 5, ab: { einwohner: 18 }, effekt: { tempo: 1.15, nahrungsbedarf: 1.1 } },
];

export const EVENT_BY_ID: Record<string, EventDef> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
