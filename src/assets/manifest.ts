/**
 * Geprüftes Sprite-Manifest.
 *
 * Jede Rastergröße wurde an der Originaldatei gemessen (siehe
 * `scripts/inspect-sheet.mjs` und `scripts/preview-sheet.mjs`), nicht aus der
 * Sheet-Größe geraten. `tests/manifest.test.ts` prüft gegen die echten PNGs,
 * dass jede Quelle existiert und jeder verwendete Frame im Bild liegt.
 *
 * Framenummern sind zeilenweise: index = zeile * spalten + spalte.
 */
import type { NodeKind } from '../game/core/types';
// Generiert von `npm run assets` aus den echten PNG-Kopfdaten.
import groessen from './sprite-sizes.json';

export interface SheetDef {
  key: string;
  /** Laufzeitpfad unter public/assets. */
  url: string;
  /** Originaldatei im Repository, für Prüfung und Nachweis. */
  source: string;
  /** Framebreite und -höhe in Pixeln. */
  fw: number;
  fh: number;
  /** Herkunft und Bedeutung, erscheint in der Asset-Galerie. */
  hinweis: string;
}

const S = 'maingamesprites/MiniWorldSprites';
const sprite = (rel: string) => `/assets/sprites/${rel}`;

export const SHEETS: readonly SheetDef[] = [
  // --- Boden -------------------------------------------------------------
  { key: 'grass', url: sprite('Ground/Grass.png'), source: `${S}/Ground/Grass.png`, fw: 16, fh: 16, hinweis: 'Fünf flächige Grundfarben: Wasser, helles Gras, Gras, Sand, Wasser.' },
  { key: 'shore', url: sprite('Ground/Shore.png'), source: `${S}/Ground/Shore.png`, fw: 16, fh: 16, hinweis: 'Fünf Uferabstufungen von Sand nach Wasser.' },
  { key: 'texturedgrass', url: sprite('Ground/TexturedGrass.png'), source: `${S}/Ground/TexturedGrass.png`, fw: 16, fh: 16, hinweis: 'Grasbüschel als sparsame Bodendetails.' },
  { key: 'deadgrass', url: sprite('Ground/DeadGrass.png'), source: `${S}/Ground/DeadGrass.png`, fw: 16, fh: 16, hinweis: 'Trockenes Grenzland.' },
  { key: 'winter', url: sprite('Ground/Winter.png'), source: `${S}/Ground/Winter.png`, fw: 16, fh: 16, hinweis: 'Acht Abstufungen von Wasser bis Schnee.' },
  { key: 'cliffwater', url: sprite('Ground/Cliff-Water.png'), source: `${S}/Ground/Cliff-Water.png`, fw: 16, fh: 16, hinweis: '3x3-Blob plus vier Innenecken für die Küste; Zeilen 3-5 sind identische Kopien.' },
  { key: 'cliff', url: sprite('Ground/Cliff.png'), source: `${S}/Ground/Cliff.png`, fw: 16, fh: 16, hinweis: 'Drei Klippensätze, Höhleneingänge, Findlinge und Steinwege.' },

  // --- Natur -------------------------------------------------------------
  { key: 'trees', url: sprite('Nature/Trees.png'), source: `${S}/Nature/Trees.png`, fw: 16, fh: 16, hinweis: 'Setzling, dann drei Wachstumsstufen.' },
  { key: 'pinetrees', url: sprite('Nature/PineTrees.png'), source: `${S}/Nature/PineTrees.png`, fw: 16, fh: 16, hinweis: 'Nadelwald des Hochlands.' },
  { key: 'deadtrees', url: sprite('Nature/DeadTrees.png'), source: `${S}/Nature/DeadTrees.png`, fw: 16, fh: 16, hinweis: 'Totholz der Trockenzone.' },
  { key: 'wintertrees', url: sprite('Nature/WinterTrees.png'), source: `${S}/Nature/WinterTrees.png`, fw: 16, fh: 16, hinweis: 'Winterwald in vier Varianten je Zeile.' },
  { key: 'winterdeadtrees', url: sprite('Nature/WinterDeadTrees.png'), source: `${S}/Nature/WinterDeadTrees.png`, fw: 16, fh: 16, hinweis: 'Winterliches Totholz.' },
  { key: 'coconuttrees', url: sprite('Nature/CoconutTrees.png'), source: `${S}/Nature/CoconutTrees.png`, fw: 16, fh: 16, hinweis: 'Küstenpalmen.' },
  { key: 'cactus', url: sprite('Nature/Cactus.png'), source: `${S}/Nature/Cactus.png`, fw: 16, fh: 16, hinweis: 'Kakteen der Trockenzone.' },
  { key: 'rocks', url: sprite('Nature/Rocks.png'), source: `${S}/Nature/Rocks.png`, fw: 16, fh: 16, hinweis: 'Drei Größen je Zeile; die vier Zeilen sind Farbvarianten (grau, gelbgrün, grün, weiß).' },
  { key: 'wheatfield', url: sprite('Nature/Wheatfield.png'), source: `${S}/Nature/Wheatfield.png`, fw: 16, fh: 16, hinweis: 'Vier aufsteigende Wachstumsstufen des Ackers.' },
  { key: 'tumbleweed', url: sprite('Nature/Tumbleweed.png'), source: `${S}/Nature/Tumbleweed.png`, fw: 16, fh: 16, hinweis: 'Dekoration der Trockenzone.' },

  // --- Gebäude -----------------------------------------------------------
  { key: 'huts', url: sprite('Buildings/Wood/Huts.png'), source: `${S}/Buildings/Wood/Huts.png`, fw: 16, fh: 16, hinweis: 'Fünf vollständige Hütten à 16x16; die erste hat eine offene Front.' },
  { key: 'houses', url: sprite('Buildings/Wood/Houses.png'), source: `${S}/Buildings/Wood/Houses.png`, fw: 16, fh: 16, hinweis: 'Vier Bauzeilen à drei Varianten; Zeile 3 hat Steinsockel und Schornstein.' },
  { key: 'keep', url: sprite('Buildings/Wood/Keep.png'), source: `${S}/Buildings/Wood/Keep.png`, fw: 32, fh: 32, hinweis: 'Drei Burgen à 32x32; die untere Hälfte des Sheets wiederholt die obere.' },
  { key: 'resources', url: sprite('Buildings/Wood/Resources.png'), source: `${S}/Buildings/Wood/Resources.png`, fw: 16, fh: 16, hinweis: 'Zeile 0 Speicher, 1 Scheune/Mühle, 2 offene Werkbank, 3 Steinbruch, 4 Erzmine mit sichtbarer Ader.' },
  { key: 'workshops', url: sprite('Buildings/Wood/Workshops.png'), source: `${S}/Buildings/Wood/Workshops.png`, fw: 16, fh: 16, hinweis: 'Zeile 0 Schmiede mit Amboss, 1 Alchemie mit Flaschen, 2 schlichte Werkstatt.' },
  { key: 'market', url: sprite('Buildings/Wood/Market.png'), source: `${S}/Buildings/Wood/Market.png`, fw: 16, fh: 16, hinweis: 'Vier Zeilen Marktstände: Getreide, Obst, Gemüse/Fisch, Fleisch.' },
  { key: 'taverns', url: sprite('Buildings/Wood/Taverns.png'), source: `${S}/Buildings/Wood/Taverns.png`, fw: 16, fh: 16, hinweis: 'Zwölf Tavernenvarianten à 16x16.' },
  { key: 'chapels', url: sprite('Buildings/Wood/Chapels.png'), source: `${S}/Buildings/Wood/Chapels.png`, fw: 16, fh: 32, hinweis: 'Drei Kapellen à 16x32; obere Zeile ist Turm, untere der Eingang.' },
  { key: 'docks', url: sprite('Buildings/Wood/Docks.png'), source: `${S}/Buildings/Wood/Docks.png`, fw: 16, fh: 16, hinweis: 'Stegteile und Hafenhaus.' },
  { key: 'barracks', url: sprite('Buildings/Wood/Barracks.png'), source: `${S}/Buildings/Wood/Barracks.png`, fw: 16, fh: 32, hinweis: 'Zeile 0 Kaserne, Zeile 1 Stall/Garnison mit dunklem Tor; die unterste 16px-Zeile bleibt ungenutzt.' },
  { key: 'cave', url: sprite('Buildings/Wood/CaveV2.png'), source: `${S}/Buildings/Wood/CaveV2.png`, fw: 16, fh: 16, hinweis: 'Sechs Erzhöhlen mit unterschiedlichen Adern.' },
  { key: 'well', url: sprite('Miscellaneous/Well.png'), source: `${S}/Miscellaneous/Well.png`, fw: 16, fh: 16, hinweis: 'Brunnen für die Holzfraktion; die zweite Zeile wiederholt die erste.' },
  { key: 'tower', url: sprite('Buildings/Wood/Tower.png'), source: `${S}/Buildings/Wood/Tower.png`, fw: 16, fh: 32, hinweis: 'Wachtürme à 16x32 und Mauerstücke.' },
  { key: 'tower2', url: sprite('Buildings/Wood/Tower2.png'), source: `${S}/Buildings/Wood/Tower2.png`, fw: 16, fh: 32, hinweis: 'Steinerne Variante der Türme.' },

  // --- Objekte und Hub ----------------------------------------------------
  { key: 'bridge', url: sprite('Miscellaneous/Bridge.png'), source: `${S}/Miscellaneous/Bridge.png`, fw: 16, fh: 16, hinweis: 'Brückenteile senkrecht und waagerecht.' },
  { key: 'chests', url: sprite('Miscellaneous/Chests.png'), source: `${S}/Miscellaneous/Chests.png`, fw: 16, fh: 16, hinweis: 'Lagerkiste und Belohnungstruhe.' },
  { key: 'questboard', url: sprite('Miscellaneous/QuestBoard.png'), source: `${S}/Miscellaneous/QuestBoard.png`, fw: 16, fh: 16, hinweis: 'Auftragsbrett des Dorfplatzes.' },
  { key: 'signs', url: sprite('Miscellaneous/Signs.png'), source: `${S}/Miscellaneous/Signs.png`, fw: 16, fh: 16, hinweis: 'Gebäudeschilder.' },
  { key: 'streetsigns', url: sprite('Miscellaneous/StreetSigns.png'), source: `${S}/Miscellaneous/StreetSigns.png`, fw: 16, fh: 16, hinweis: 'Wegweiser für die Dorfstruktur.' },
  { key: 'tombstones', url: sprite('Miscellaneous/Tombstones.png'), source: `${S}/Miscellaneous/Tombstones.png`, fw: 16, fh: 16, hinweis: 'Gedenkgarten.' },
  { key: 'portal', url: sprite('Miscellaneous/Portal.png'), source: `${S}/Miscellaneous/Portal.png`, fw: 16, fh: 16, hinweis: 'Spätes Reiseziel.' },
  { key: 'boat', url: sprite('Miscellaneous/Boat.png'), source: `${S}/Miscellaneous/Boat.png`, fw: 16, fh: 16, hinweis: 'Kleines Fischerboot.' },
  { key: 'transportship', url: sprite('Miscellaneous/TransportShip.png'), source: `${S}/Miscellaneous/TransportShip.png`, fw: 32, fh: 32, hinweis: 'Handels- und Siedlertransport.' },

  // --- Tiere --------------------------------------------------------------
  { key: 'chicken', url: sprite('Animals/Chicken.png'), source: `${S}/Animals/Chicken.png`, fw: 16, fh: 16, hinweis: 'Huhn, vier Richtungen à vier Frames.' },
  { key: 'chick', url: sprite('Animals/Chick.png'), source: `${S}/Animals/Chick.png`, fw: 16, fh: 16, hinweis: 'Küken der Ranch.' },
  { key: 'sheep', url: sprite('Animals/Sheep.png'), source: `${S}/Animals/Sheep.png`, fw: 16, fh: 16, hinweis: 'Schaf für die Wollproduktion.' },
  { key: 'pig', url: sprite('Animals/Pig.png'), source: `${S}/Animals/Pig.png`, fw: 16, fh: 16, hinweis: 'Schwein der Ranch.' },
  { key: 'marine', url: sprite('Animals/MarineAnimals.png'), source: `${S}/Animals/MarineAnimals.png`, fw: 16, fh: 16, hinweis: 'Fische und Meerestiere der Küste.' },
  { key: 'horse', url: sprite('Animals/Horse32x32.png'), source: `${S}/Animals/Horse(32x32).png`, fw: 32, fh: 32, hinweis: 'Pferd; tatsächlicher Dateiname enthält Klammern.' },

  // --- Figuren ------------------------------------------------------------
  { key: 'worker-cyan', url: sprite('Characters/Workers/CyanWorker/FarmerCyan.png'), source: `${S}/Characters/Workers/CyanWorker/FarmerCyan.png`, fw: 16, fh: 16, hinweis: 'Arbeiter: 5 Spalten, 12 Zeilen; Idle/Walk je 5 Frames, Arbeit 3 Frames, je vier Richtungen.' },
  { key: 'worker-lime', url: sprite('Characters/Workers/LimeWorker/FarmerLime.png'), source: `${S}/Characters/Workers/LimeWorker/FarmerLime.png`, fw: 16, fh: 16, hinweis: 'Arbeiter in Lime, gleiches Raster.' },
  { key: 'worker-purple', url: sprite('Characters/Workers/PurpleWorker/FarmerPurple.png'), source: `${S}/Characters/Workers/PurpleWorker/FarmerPurple.png`, fw: 16, fh: 16, hinweis: 'Arbeiter in Purple, gleiches Raster.' },
  { key: 'worker-red', url: sprite('Characters/Workers/RedWorker/FarmerRed.png'), source: `${S}/Characters/Workers/RedWorker/FarmerRed.png`, fw: 16, fh: 16, hinweis: 'Arbeiter in Rot, gleiches Raster.' },
  { key: 'worker-template', url: sprite('Characters/Workers/FarmerTemplate.png'), source: `${S}/Characters/Workers/FarmerTemplate.png`, fw: 16, fh: 16, hinweis: 'Neutrale Arbeiterbasis; Kinder werden hieraus verkleinert dargestellt.' },
  { key: 'guard', url: sprite('Characters/Soldiers/Melee/CyanMelee/SwordsmanCyan.png'), source: `${S}/Characters/Soldiers/Melee/CyanMelee/SwordsmanCyan.png`, fw: 16, fh: 16, hinweis: 'Wache: gleiches 5x12-Raster wie die Arbeiter.' },

  // --- Oberfläche ---------------------------------------------------------
  { key: 'icons-essentials', url: sprite('User-Interface/Icons-Essentials.png'), source: `${S}/User Interface/Icons-Essentials.png`, fw: 16, fh: 16, hinweis: 'Grundsymbole: Ressourcen, Nahrung, Münzen, Tränke.' },
  { key: 'uiicons', url: sprite('User-Interface/UiIcons.png'), source: `${S}/User Interface/UiIcons.png`, fw: 16, fh: 16, hinweis: 'Werkzeuge, Navigation und Status, 4 Spalten x 12 Zeilen.' },
  { key: 'boxselector', url: sprite('User-Interface/BoxSelector.png'), source: `${S}/User Interface/BoxSelector.png`, fw: 16, fh: 16, hinweis: 'Auswahlrahmen.' },
  { key: 'highlight', url: sprite('User-Interface/Highlighted-Boxes.png'), source: `${S}/User Interface/Highlighted-Boxes.png`, fw: 16, fh: 16, hinweis: 'Fünf Markierungsfarben für Bauvorschau und Reichweiten.' },
] as const;

export const SHEET_BY_KEY: Record<string, SheetDef> = Object.fromEntries(
  SHEETS.map((s) => [s.key, s]),
);

// ---------------------------------------------------------------------------
// Küstenautotile aus Cliff-Water.png (5 Spalten)
// ---------------------------------------------------------------------------

/** Frames des 3x3-Blobs, benannt nach der Lage des Wassers. */
export const COAST = {
  nw: 0,
  n: 1,
  ne: 2,
  w: 5,
  mitte: 6,
  e: 7,
  sw: 10,
  s: 11,
  se: 12,
  /** Innenecken: nur die Diagonale ist Wasser. */
  innenNw: 3,
  innenNe: 4,
  innenSw: 8,
  innenSe: 9,
} as const;

/** Flächige Grundfarben aus Grass.png bzw. Winter.png. */
export const GROUND_FRAMES = {
  wasser: { sheet: 'grass', frame: 0 },
  tiefwasser: { sheet: 'grass', frame: 4 },
  wiese: { sheet: 'grass', frame: 2 },
  grasnarbe: { sheet: 'grass', frame: 1 },
  sand: { sheet: 'grass', frame: 3 },
  trockengras: { sheet: 'deadgrass', frame: 0 },
  schnee: { sheet: 'winter', frame: 5 },
} as const;

/** Grasbüschel als sparsames Detail. */
export const GRASS_DETAIL = { sheet: 'texturedgrass', frames: [0, 1, 2, 3, 4, 5] };

/** Steinwege aus Cliff.png (7 Spalten): Zeile 4 senkrecht, Zeile 5 waagerecht. */
export const PATH_FRAMES = { senkrecht: [33, 34], waagerecht: [40, 41] };

// ---------------------------------------------------------------------------
// Weltobjekte
// ---------------------------------------------------------------------------

export const NODE_SPRITES: Record<NodeKind, { sheet: string; frames: number[] }> = {
  // Trees.png: Frame 0 ist der Setzling, 1-3 sind gewachsene Bäume.
  baum: { sheet: 'trees', frames: [1, 2, 3] },
  nadelbaum: { sheet: 'pinetrees', frames: [0, 1, 2] },
  totholz: { sheet: 'deadtrees', frames: [0, 1, 2, 3] },
  winterbaum: { sheet: 'wintertrees', frames: [0, 1, 2, 3] },
  palme: { sheet: 'coconuttrees', frames: [0, 1, 2, 3, 4, 5] },
  kaktus: { sheet: 'cactus', frames: [0, 1, 2, 3] },
  fels: { sheet: 'rocks', frames: [0, 1, 2] },
  erzfels: { sheet: 'rocks', frames: [3, 4, 5] },
  kristallfels: { sheet: 'rocks', frames: [9, 10, 11] },
  // Trees.png Frame 0 ist ein niedriger Busch und passt als Beerenstrauch;
  // ein eigener Strauch-Crop existiert im Satz nicht.
  beerenstrauch: { sheet: 'trees', frames: [0] },
  kraut: { sheet: 'texturedgrass', frames: [0, 2] },
};

/** Setzling und Stumpf für nachwachsende Bäume. */
export const SAPLING = { sheet: 'trees', frame: 0 };

/** Ackerwachstum in vier Stufen. */
export const FIELD_FRAMES = [0, 1, 2, 3];

// ---------------------------------------------------------------------------
// Animationen
// ---------------------------------------------------------------------------

/**
 * Shade nennt Idle 300 ms, Walk 200 ms und Attack 100 ms je Frame. Die Werte
 * wurden im Animationsplayer geprüft; Walk wirkt bei 16x16 auf 140 ms
 * lebendiger und wird deshalb abweichend verwendet (dokumentierte Abweichung).
 */
export const CHARACTER_ANIM = {
  spalten: 5,
  idle: { zeilen: { down: 0, up: 1, left: 2, right: 3 }, frames: 5, dauer: 300 },
  walk: { zeilen: { down: 4, up: 5, left: 6, right: 7 }, frames: 5, dauer: 140 },
  arbeit: { zeilen: { down: 8, up: 9, left: 10, right: 11 }, frames: 3, dauer: 160 },
} as const;

export type Richtung = keyof typeof CHARACTER_ANIM.idle.zeilen;

// ---------------------------------------------------------------------------
// Symbole
// ---------------------------------------------------------------------------

/** Frames aus UiIcons.png und Icons-Essentials.png für Berufs- und Statusicons. */
export const ICON_FRAMES = {
  werkzeug: { sheet: 'uiicons', frame: 0 },
  hammer: { sheet: 'uiicons', frame: 1 },
  axt: { sheet: 'uiicons', frame: 2 },
  spitzhacke: { sheet: 'uiicons', frame: 3 },
  herz: { sheet: 'icons-essentials', frame: 0 },
  schild: { sheet: 'icons-essentials', frame: 1 },
  muenze: { sheet: 'icons-essentials', frame: 2 },
  trank: { sheet: 'icons-essentials', frame: 3 },
} as const;

/** Markierungsfarben aus Highlighted-Boxes.png. */
export const HIGHLIGHT = { gruen: 0, gelb: 1, rot: 2, blau: 3, weiss: 4 } as const;

// ---------------------------------------------------------------------------
// Rastermaße aus den echten Bilddateien
// ---------------------------------------------------------------------------

type Groessen = Record<string, [number, number]>;

/** Bildbreite und -höhe eines Sheets in Pixeln. */
export function sheetMasse(key: string): [number, number] {
  const def = SHEET_BY_KEY[key];
  const masse = (groessen as unknown as Groessen)[def?.url ?? ''];
  return masse ?? [16, 16];
}

/** Spaltenzahl eines Sheets; Framenummern sind zeilenweise durchgezählt. */
export function spalten(key: string): number {
  return Math.max(1, Math.floor(sheetMasse(key)[0] / (SHEET_BY_KEY[key]?.fw ?? 16)));
}

export function zeilen(key: string): number {
  return Math.max(1, Math.floor(sheetMasse(key)[1] / (SHEET_BY_KEY[key]?.fh ?? 16)));
}

export function frameAnzahl(key: string): number {
  return spalten(key) * zeilen(key);
}

/** Position eines Frames im Sheet, für CSS-Hintergründe in der Oberfläche. */
export function framePosition(key: string, frame: number): { x: number; y: number } {
  const cols = spalten(key);
  return { x: (frame % cols) * (SHEET_BY_KEY[key]?.fw ?? 16), y: Math.floor(frame / cols) * (SHEET_BY_KEY[key]?.fh ?? 16) };
}

// ---------------------------------------------------------------------------
// Ressourcensymbole
// ---------------------------------------------------------------------------

/**
 * Symbole für die Oberfläche. Alle Frames stammen aus vorhandener Pixelgrafik,
 * gemessen an den Sheets Icons-Essentials.png (4x4: Münzen, Tränke, Getreide,
 * Herz, Kopf, Schädel, Steine mit Adern) und UiIcons.png (4x12: Werkzeuge,
 * Rechenzeichen, Pfeile, Haken, Zahnräder).
 */
export const RESSOURCE_ICON: Record<string, { sheet: string; frame: number }> = {
  holz: { sheet: 'trees', frame: 1 },
  stein: { sheet: 'icons-essentials', frame: 12 },
  bretter: { sheet: 'bridge', frame: 5 },
  erz: { sheet: 'icons-essentials', frame: 13 },
  barren: { sheet: 'icons-essentials', frame: 2 },
  kristall: { sheet: 'icons-essentials', frame: 14 },
  getreide: { sheet: 'icons-essentials', frame: 8 },
  mehl: { sheet: 'icons-essentials', frame: 8 },
  brot: { sheet: 'icons-essentials', frame: 8 },
  beeren: { sheet: 'trees', frame: 0 },
  fisch: { sheet: 'marine', frame: 0 },
  eier: { sheet: 'chicken', frame: 0 },
  fleisch: { sheet: 'pig', frame: 0 },
  wolle: { sheet: 'sheep', frame: 0 },
  stoff: { sheet: 'icons-essentials', frame: 1 },
  kraeuter: { sheet: 'texturedgrass', frame: 0 },
  trank: { sheet: 'icons-essentials', frame: 4 },
  werkzeug: { sheet: 'uiicons', frame: 0 },
  muenzen: { sheet: 'icons-essentials', frame: 0 },
  forschung: { sheet: 'uiicons', frame: 13 },
  ansehen: { sheet: 'icons-essentials', frame: 9 },
  nahrung: { sheet: 'icons-essentials', frame: 8 },
  einwohner: { sheet: 'icons-essentials', frame: 10 },
  zufriedenheit: { sheet: 'icons-essentials', frame: 9 },
  bauen: { sheet: 'uiicons', frame: 0 },
  einstellungen: { sheet: 'uiicons', frame: 43 },
  ja: { sheet: 'uiicons', frame: 30 },
  nein: { sheet: 'uiicons', frame: 28 },
  achtung: { sheet: 'uiicons', frame: 31 },
  dorf: { sheet: 'huts', frame: 1 },
  handel: { sheet: 'market', frame: 0 },
  welt: { sheet: 'streetsigns', frame: 0 },
  forschung_tab: { sheet: 'uiicons', frame: 13 },
  pause: { sheet: 'uiicons', frame: 9 },
};
