import type { JobId, NodeKind, ResourceId, Store } from '../core/types';

export type BuildingKategorie =
  | 'wohnen'
  | 'versorgung'
  | 'produktion'
  | 'handel'
  | 'gemeinschaft'
  | 'verteidigung'
  | 'infrastruktur';

export interface Rezept {
  ein: Store;
  aus: Store;
  /** Reine Arbeitszeit eines Zyklus in Simulationssekunden. */
  dauer: number;
}

export interface BuildingDef {
  id: string;
  name: string;
  kategorie: BuildingKategorie;
  beschreibung: string;
  /** Grafik: Sheet-Key und Framenummer aus dem Manifest. */
  sprite: { sheet: string; frame: number };
  /** Zusätzliche Grafikvarianten, zufällig aber seedstabil gewählt. */
  varianten?: number[];
  /** Kollisionsfläche in Kacheln. */
  w: number;
  h: number;
  /**
   * Höhe der Grafik in Kacheln. Größer als `h` bedeutet: das Bild ragt nach
   * oben über die Kollisionsfläche hinaus und darf Nachbarn überdecken.
   */
  bildHoehe: number;
  /** Eingangskachel relativ zur linken oberen Fußkachel; muss erreichbar sein. */
  eingang: { dx: number; dy: number };
  kosten: Store;
  /** Reine Bauarbeit in Sekunden, ohne Materialtransport. */
  bauarbeit: number;
  /** Freischaltbedingungen. */
  benoetigt?: { gebaeude?: string; forschung?: string; einwohner?: number; region?: string };
  wohnplaetze?: number;
  /** Wohnqualität: Bonus auf die Zufriedenheit der Bewohner. */
  wohnqualitaet?: number;
  arbeitsplaetze?: number;
  beruf?: JobId;
  /** Zusätzliche Lagerkapazität. */
  lager?: number;
  /** Abgabestelle für getragene Güter. */
  abgabe?: boolean;
  rezept?: Rezept;
  /** Erntet diese Knotenarten in der Umgebung statt eines festen Rezepts. */
  erntet?: NodeKind[];
  /** Arbeitsradius in Kacheln für erntende Gebäude. */
  radius?: number;
  /** Zufriedenheitsbonus im Wirkradius. */
  zufriedenheit?: number;
  reichweite?: number;
  /** Muss an Wasser liegen. */
  amWasser?: boolean;
  /** Wird auf Wasser gebaut und macht es begehbar. */
  ueberWasser?: boolean;
  maxStufe: number;
  /** Multiplikator je Ausbaustufe, abnehmender Grenzertrag über die Stufen. */
  stufenbonus: number;
  /** Kennzeichnet die Umdeutung, wenn kein eigenständiger Crop existiert. */
  umdeutung?: string;
  /** Wirkung auf das ganze Dorf, die nicht über die Felder oben abgebildet ist. */
  globalerBonus?: string;
}

const d = (def: BuildingDef) => def;

export const BUILDINGS: BuildingDef[] = [
  // --- Wohnen -------------------------------------------------------------
  d({
    id: 'huette',
    name: 'Hütte',
    kategorie: 'wohnen',
    beschreibung: 'Einfacher Wohnplatz aus Holz. Schnell gebaut, wenig Komfort.',
    sprite: { sheet: 'huts', frame: 1 },
    varianten: [1, 2, 3, 4],
    w: 1,
    h: 1,
    bildHoehe: 1,
    eingang: { dx: 0, dy: 1 },
    kosten: { holz: 18 },
    bauarbeit: 30,
    wohnplaetze: 4,
    wohnqualitaet: 0,
    maxStufe: 2,
    stufenbonus: 1.25,
  }),
  d({
    id: 'haus',
    name: 'Haus',
    kategorie: 'wohnen',
    beschreibung: 'Festes Wohnhaus mit Steinsockel. Bewohner sind hier zufriedener.',
    sprite: { sheet: 'houses', frame: 3 },
    varianten: [3, 4, 5],
    w: 1,
    h: 1,
    bildHoehe: 1,
    eingang: { dx: 0, dy: 1 },
    kosten: { holz: 30, stein: 10 },
    bauarbeit: 45,
    wohnplaetze: 4,
    wohnqualitaet: 6,
    maxStufe: 3,
    stufenbonus: 1.2,
  }),
  d({
    id: 'familienhaus',
    name: 'Familienhaus',
    kategorie: 'wohnen',
    beschreibung: 'Großes Haus für mehrere Generationen.',
    sprite: { sheet: 'houses', frame: 9 },
    varianten: [9, 10, 11],
    w: 1,
    h: 1,
    bildHoehe: 1,
    eingang: { dx: 0, dy: 1 },
    kosten: { holz: 40, stein: 20, bretter: 10 },
    bauarbeit: 70,
    benoetigt: { forschung: 'groessere-familienhaeuser' },
    wohnplaetze: 6,
    wohnqualitaet: 10,
    maxStufe: 3,
    stufenbonus: 1.2,
  }),

  // --- Versorgung ---------------------------------------------------------
  d({
    id: 'lager',
    name: 'Lagerhaus',
    kategorie: 'versorgung',
    beschreibung: 'Abgabestelle und Lagerkapazität. Kurze Wege erhöhen den Durchsatz spürbar.',
    sprite: { sheet: 'resources', frame: 0 },
    varianten: [0, 1, 2],
    w: 1,
    h: 1,
    bildHoehe: 1,
    eingang: { dx: 0, dy: 1 },
    kosten: { holz: 25, stein: 5 },
    bauarbeit: 35,
    lager: 150,
    abgabe: true,
    maxStufe: 4,
    stufenbonus: 1.5,
  }),
  d({
    id: 'brunnen',
    name: 'Brunnen',
    kategorie: 'versorgung',
    beschreibung: 'Wasserversorgung im Umkreis und beliebter Treffpunkt.',
    sprite: { sheet: 'well', frame: 0 },
    w: 1,
    h: 1,
    bildHoehe: 1,
    eingang: { dx: 0, dy: 1 },
    kosten: { holz: 10, stein: 15 },
    bauarbeit: 25,
    zufriedenheit: 5,
    reichweite: 12,
    maxStufe: 3,
    stufenbonus: 1.3,
  }),
  d({
    id: 'rathaus',
    name: 'Rathaus',
    kategorie: 'versorgung',
    beschreibung: 'Verwaltung des Dorfes: Siedlungsstufe, Bauaufsicht und große Forschung.',
    sprite: { sheet: 'keep', frame: 0 },
    varianten: [0, 1, 2],
    w: 2,
    h: 2,
    bildHoehe: 2,
    eingang: { dx: 0, dy: 2 },
    kosten: { holz: 80, stein: 60, bretter: 20 },
    bauarbeit: 150,
    benoetigt: { einwohner: 10 },
    lager: 120,
    abgabe: true,
    arbeitsplaetze: 2,
    beruf: 'gelehrter',
    rezept: { ein: {}, aus: { forschung: 1 }, dauer: 20 },
    zufriedenheit: 4,
    reichweite: 16,
    maxStufe: 3,
    stufenbonus: 1.4,
  }),

  // --- Rohstoffe ----------------------------------------------------------
  d({
    id: 'saegewerk',
    name: 'Sägewerk',
    kategorie: 'produktion',
    beschreibung: 'Schneidet Holz zu Brettern. Bretter sind für jeden größeren Bau nötig.',
    sprite: { sheet: 'resources', frame: 6 },
    varianten: [6, 7],
    w: 1,
    h: 1,
    bildHoehe: 1,
    eingang: { dx: 0, dy: 1 },
    kosten: { holz: 35, stein: 10 },
    bauarbeit: 50,
    arbeitsplaetze: 2,
    beruf: 'handwerker',
    rezept: { ein: { holz: 3 }, aus: { bretter: 2 }, dauer: 12 },
    maxStufe: 5,
    stufenbonus: 1.25,
  }),
  d({
    id: 'steinbruch',
    name: 'Steinbruch',
    kategorie: 'produktion',
    beschreibung:
      'Dauerhafte Steinversorgung, unabhängig von einzelnen Felsen. Ergiebiger als das Klopfen an Findlingen.',
    sprite: { sheet: 'resources', frame: 9 },
    varianten: [9, 10, 11],
    w: 1,
    h: 1,
    bildHoehe: 1,
    eingang: { dx: 0, dy: 1 },
    kosten: { holz: 30, stein: 20 },
    bauarbeit: 60,
    benoetigt: { forschung: 'steinbrucharbeit' },
    arbeitsplaetze: 3,
    beruf: 'steinmetz',
    rezept: { ein: {}, aus: { stein: 2 }, dauer: 14 },
    maxStufe: 5,
    stufenbonus: 1.22,
  }),
  d({
    id: 'erzhoehle',
    name: 'Erzhöhle',
    kategorie: 'produktion',
    beschreibung: 'Fördert Erz aus dem Berg. Die Förderleistung ist begrenzt und lässt sich ausbauen.',
    sprite: { sheet: 'cave', frame: 0 },
    varianten: [0, 1, 2, 3, 4, 5],
    w: 1,
    h: 1,
    bildHoehe: 1,
    eingang: { dx: 0, dy: 1 },
    kosten: { holz: 40, stein: 25 },
    bauarbeit: 70,
    benoetigt: { forschung: 'bergbaustollen' },
    arbeitsplaetze: 2,
    beruf: 'bergmann',
    rezept: { ein: {}, aus: { erz: 1 }, dauer: 16 },
    maxStufe: 5,
    stufenbonus: 1.22,
  }),
  d({
    id: 'feld',
    name: 'Acker',
    kategorie: 'produktion',
    beschreibung: 'Getreidefeld. Wächst sichtbar und wird vom Bauern abgeerntet.',
    sprite: { sheet: 'wheatfield', frame: 3 },
    w: 1,
    h: 1,
    bildHoehe: 1,
    eingang: { dx: 0, dy: 1 },
    kosten: { holz: 8 },
    bauarbeit: 18,
    arbeitsplaetze: 1,
    beruf: 'bauer',
    rezept: { ein: {}, aus: { getreide: 3 }, dauer: 22 },
    maxStufe: 3,
    stufenbonus: 1.3,
  }),
  d({
    id: 'kraeutergarten',
    name: 'Kräutergarten',
    kategorie: 'produktion',
    beschreibung: 'Zieht Heilkräuter für Tränke und die Kapelle.',
    sprite: { sheet: 'wheatfield', frame: 2 },
    w: 1,
    h: 1,
    bildHoehe: 1,
    eingang: { dx: 0, dy: 1 },
    kosten: { holz: 10 },
    bauarbeit: 20,
    benoetigt: { forschung: 'heilkraeuter' },
    arbeitsplaetze: 1,
    beruf: 'kraeutlerin',
    rezept: { ein: {}, aus: { kraeuter: 2 }, dauer: 24 },
    maxStufe: 3,
    stufenbonus: 1.3,
    umdeutung: 'Ackerstufe aus Wheatfield.png als Kräuterbeet; kein eigener Kräuter-Crop vorhanden.',
  }),
  d({
    id: 'ranch',
    name: 'Ranch',
    kategorie: 'produktion',
    beschreibung: 'Hühner und Schafe liefern Eier und Wolle. Tiere brauchen Futter und Stallplatz.',
    sprite: { sheet: 'resources', frame: 7 },
    w: 1,
    h: 1,
    bildHoehe: 1,
    eingang: { dx: 0, dy: 1 },
    kosten: { holz: 35, bretter: 8 },
    bauarbeit: 55,
    benoetigt: { forschung: 'tierhaltung' },
    arbeitsplaetze: 2,
    beruf: 'hirte',
    rezept: { ein: { getreide: 1 }, aus: { eier: 2, wolle: 1 }, dauer: 20 },
    maxStufe: 4,
    stufenbonus: 1.25,
    umdeutung: 'Offene Werkbank aus Resources.png als Stallgebäude; Tiere laufen davor.',
  }),
  d({
    id: 'hafen',
    name: 'Hafen',
    kategorie: 'produktion',
    beschreibung: 'Fischerei an der Küste. Muss direkt am Wasser stehen.',
    sprite: { sheet: 'docks', frame: 0 },
    varianten: [0, 1, 2, 3],
    w: 1,
    h: 1,
    bildHoehe: 1,
    eingang: { dx: 0, dy: 1 },
    kosten: { holz: 45, bretter: 10 },
    bauarbeit: 65,
    amWasser: true,
    arbeitsplaetze: 2,
    beruf: 'fischer',
    rezept: { ein: {}, aus: { fisch: 2 }, dauer: 18 },
    maxStufe: 4,
    stufenbonus: 1.25,
  }),

  // --- Verarbeitung -------------------------------------------------------
  d({
    id: 'muehle',
    name: 'Mühle',
    kategorie: 'produktion',
    beschreibung: 'Mahlt Getreide zu Mehl.',
    sprite: { sheet: 'resources', frame: 3 },
    varianten: [3, 4, 5],
    w: 1,
    h: 1,
    bildHoehe: 1,
    eingang: { dx: 0, dy: 1 },
    kosten: { holz: 25, stein: 15, bretter: 5 },
    bauarbeit: 55,
    arbeitsplaetze: 1,
    beruf: 'handwerker',
    rezept: { ein: { getreide: 3 }, aus: { mehl: 2 }, dauer: 16 },
    maxStufe: 4,
    stufenbonus: 1.25,
    umdeutung: 'Scheune aus Resources.png als Mühlengebäude; kein eigener Mühlen-Crop vorhanden.',
  }),
  d({
    id: 'backhaus',
    name: 'Backhaus',
    kategorie: 'produktion',
    beschreibung: 'Backt Brot. Ein Brot sättigt vierfach und ist die effizienteste Nahrung.',
    sprite: { sheet: 'workshops', frame: 8 },
    w: 1,
    h: 1,
    bildHoehe: 1,
    eingang: { dx: 0, dy: 1 },
    kosten: { holz: 25, stein: 15 },
    bauarbeit: 50,
    benoetigt: { gebaeude: 'muehle' },
    arbeitsplaetze: 1,
    beruf: 'handwerker',
    rezept: { ein: { mehl: 2, holz: 1 }, aus: { brot: 2 }, dauer: 18 },
    maxStufe: 4,
    stufenbonus: 1.25,
    umdeutung: 'Werkstattgebäude aus Workshops.png als Backhaus; kein eigener Backofen-Crop vorhanden.',
  }),
  d({
    id: 'schmiede',
    name: 'Schmiede',
    kategorie: 'produktion',
    beschreibung: 'Schmilzt Erz zu Barren.',
    sprite: { sheet: 'workshops', frame: 0 },
    varianten: [0, 1, 2],
    w: 1,
    h: 1,
    bildHoehe: 1,
    eingang: { dx: 0, dy: 1 },
    kosten: { holz: 30, stein: 35, bretter: 10 },
    bauarbeit: 75,
    benoetigt: { forschung: 'schmiedekunst' },
    arbeitsplaetze: 2,
    beruf: 'handwerker',
    rezept: { ein: { erz: 2, holz: 2 }, aus: { barren: 1 }, dauer: 20 },
    maxStufe: 5,
    stufenbonus: 1.22,
  }),
  d({
    id: 'werkstatt',
    name: 'Werkstatt',
    kategorie: 'produktion',
    beschreibung: 'Fertigt Werkzeuge. Werkzeuge beschleunigen alle Sammel- und Bauarbeiten.',
    sprite: { sheet: 'workshops', frame: 6 },
    varianten: [6, 7],
    w: 1,
    h: 1,
    bildHoehe: 1,
    eingang: { dx: 0, dy: 1 },
    kosten: { holz: 35, bretter: 15 },
    bauarbeit: 65,
    arbeitsplaetze: 2,
    beruf: 'handwerker',
    rezept: { ein: { bretter: 2, barren: 1 }, aus: { werkzeug: 1 }, dauer: 26 },
    maxStufe: 5,
    stufenbonus: 1.2,
  }),
  d({
    id: 'weberei',
    name: 'Weberei',
    kategorie: 'produktion',
    beschreibung: 'Verarbeitet Wolle zu Stoff für Wohnkomfort und Handel.',
    sprite: { sheet: 'workshops', frame: 7 },
    w: 1,
    h: 1,
    bildHoehe: 1,
    eingang: { dx: 0, dy: 1 },
    kosten: { holz: 25, bretter: 10 },
    bauarbeit: 50,
    benoetigt: { forschung: 'winterkleidung' },
    arbeitsplaetze: 1,
    beruf: 'handwerker',
    rezept: { ein: { wolle: 3 }, aus: { stoff: 1 }, dauer: 22 },
    maxStufe: 4,
    stufenbonus: 1.22,
    umdeutung: 'Werkstattgebäude aus Workshops.png als Weberei; kein eigener Webstuhl-Crop vorhanden.',
  }),
  d({
    id: 'alchemie',
    name: 'Alchemie',
    kategorie: 'produktion',
    beschreibung: 'Braut Tränke aus Kräutern. Braucht Wasser in Reichweite eines Brunnens.',
    sprite: { sheet: 'workshops', frame: 3 },
    varianten: [3, 4, 5],
    w: 1,
    h: 1,
    bildHoehe: 1,
    eingang: { dx: 0, dy: 1 },
    kosten: { holz: 30, stein: 20, bretter: 10 },
    bauarbeit: 70,
    benoetigt: { forschung: 'heilkraeuter' },
    arbeitsplaetze: 1,
    beruf: 'kraeutlerin',
    rezept: { ein: { kraeuter: 3 }, aus: { trank: 1 }, dauer: 26 },
    maxStufe: 4,
    stufenbonus: 1.22,
  }),
  d({
    id: 'gelehrtenstube',
    name: 'Gelehrtenstube',
    kategorie: 'produktion',
    beschreibung: 'Beschäftigte Gelehrte erarbeiten Forschungspunkte.',
    sprite: { sheet: 'workshops', frame: 4 },
    w: 1,
    h: 1,
    bildHoehe: 1,
    eingang: { dx: 0, dy: 1 },
    kosten: { holz: 30, bretter: 15, stein: 10 },
    bauarbeit: 70,
    benoetigt: { gebaeude: 'rathaus' },
    arbeitsplaetze: 2,
    beruf: 'gelehrter',
    rezept: { ein: {}, aus: { forschung: 2 }, dauer: 22 },
    maxStufe: 5,
    stufenbonus: 1.22,
    umdeutung: 'Alchemievariante aus Workshops.png als Studierstube; keine eigene Bibliotheksgrafik vorhanden.',
  }),

  // --- Handel und Gemeinschaft -------------------------------------------
  d({
    id: 'markt',
    name: 'Markt',
    kategorie: 'handel',
    beschreibung:
      'Verkauft echte Überschüsse aus dem Lager. Ohne Überschuss gibt es auch keine Münzen.',
    sprite: { sheet: 'market', frame: 0 },
    varianten: [0, 1, 2, 3, 4, 5],
    w: 1,
    h: 1,
    bildHoehe: 1,
    eingang: { dx: 0, dy: 1 },
    kosten: { holz: 30, bretter: 8 },
    bauarbeit: 45,
    benoetigt: { einwohner: 8 },
    arbeitsplaetze: 2,
    beruf: 'haendler',
    zufriedenheit: 4,
    reichweite: 10,
    maxStufe: 4,
    stufenbonus: 1.3,
  }),
  d({
    id: 'taverne',
    name: 'Taverne',
    kategorie: 'gemeinschaft',
    beschreibung: 'Freizeit und Zufriedenheit. Reisende bringen Aufträge und Neuigkeiten.',
    sprite: { sheet: 'taverns', frame: 0 },
    varianten: [0, 1, 2],
    w: 1,
    h: 1,
    bildHoehe: 1,
    eingang: { dx: 0, dy: 1 },
    kosten: { holz: 40, stein: 10, bretter: 8 },
    bauarbeit: 60,
    benoetigt: { einwohner: 10 },
    zufriedenheit: 10,
    reichweite: 14,
    arbeitsplaetze: 1,
    beruf: 'haendler',
    rezept: { ein: { brot: 1 }, aus: { muenzen: 6, ansehen: 1 }, dauer: 30 },
    maxStufe: 3,
    stufenbonus: 1.3,
  }),
  d({
    id: 'kapelle',
    name: 'Kapelle',
    kategorie: 'gemeinschaft',
    beschreibung: 'Gemeinschaft und Heilung. Später Ausgangspunkt heilender Expeditionseinheiten.',
    sprite: { sheet: 'chapels', frame: 0 },
    varianten: [0, 1, 2],
    w: 1,
    h: 1,
    bildHoehe: 2,
    eingang: { dx: 0, dy: 1 },
    kosten: { holz: 30, stein: 40 },
    bauarbeit: 80,
    benoetigt: { einwohner: 14 },
    zufriedenheit: 8,
    reichweite: 16,
    maxStufe: 3,
    stufenbonus: 1.3,
  }),
  d({
    id: 'gedenkgarten',
    name: 'Gedenkgarten',
    kategorie: 'gemeinschaft',
    beschreibung: 'Ein ruhiger Ort für die Geschichte des Dorfes.',
    sprite: { sheet: 'tombstones', frame: 0 },
    varianten: [0, 1, 2, 3],
    w: 1,
    h: 1,
    bildHoehe: 1,
    eingang: { dx: 0, dy: 1 },
    kosten: { stein: 20 },
    bauarbeit: 25,
    zufriedenheit: 3,
    reichweite: 8,
    maxStufe: 1,
    stufenbonus: 1,
  }),
  d({
    id: 'werft',
    name: 'Werft',
    kategorie: 'handel',
    beschreibung: 'Baut Boote und eröffnet Handelswege über das Wasser.',
    sprite: { sheet: 'docks', frame: 4 },
    varianten: [4, 5, 6, 7],
    w: 1,
    h: 1,
    bildHoehe: 1,
    eingang: { dx: 0, dy: 1 },
    kosten: { holz: 50, bretter: 25, barren: 5 },
    bauarbeit: 100,
    amWasser: true,
    benoetigt: { forschung: 'schiffsbau' },
    arbeitsplaetze: 2,
    beruf: 'haendler',
    rezept: { ein: { bretter: 4, stoff: 1 }, aus: { muenzen: 45, ansehen: 2 }, dauer: 50 },
    maxStufe: 3,
    stufenbonus: 1.3,
  }),

  // --- Verteidigung und Infrastruktur ------------------------------------
  d({
    id: 'kaserne',
    name: 'Kaserne',
    kategorie: 'verteidigung',
    beschreibung: 'Bildet Wachen aus. Wachen patrouillieren und begleiten Expeditionen.',
    sprite: { sheet: 'barracks', frame: 0 },
    varianten: [0, 1, 2, 3],
    w: 1,
    h: 1,
    bildHoehe: 2,
    eingang: { dx: 0, dy: 1 },
    kosten: { holz: 45, stein: 30, werkzeug: 2 },
    bauarbeit: 95,
    benoetigt: { forschung: 'wachdienst' },
    arbeitsplaetze: 3,
    beruf: 'wache',
    zufriedenheit: 2,
    reichweite: 18,
    maxStufe: 3,
    stufenbonus: 1.25,
  }),
  d({
    id: 'stall',
    name: 'Stall',
    kategorie: 'infrastruktur',
    beschreibung: 'Pferde verkürzen die Transportwege aller Träger im Umkreis.',
    sprite: { sheet: 'barracks', frame: 4 },
    varianten: [4, 5, 6, 7],
    w: 1,
    h: 1,
    bildHoehe: 2,
    eingang: { dx: 0, dy: 1 },
    kosten: { holz: 40, bretter: 12, getreide: 20 },
    bauarbeit: 80,
    benoetigt: { forschung: 'quartierslager' },
    globalerBonus: 'Alle Träger im Dorf sind 8 % je Stufe schneller unterwegs.',
    maxStufe: 3,
    stufenbonus: 1.2,
  }),
  d({
    id: 'wachturm',
    name: 'Wachturm',
    kategorie: 'verteidigung',
    beschreibung: 'Weite Sicht und Sicherheit. Im friedlichen Modus vor allem ein Aussichtspunkt.',
    sprite: { sheet: 'tower', frame: 0 },
    varianten: [0, 1, 2],
    w: 1,
    h: 1,
    bildHoehe: 2,
    eingang: { dx: 0, dy: 1 },
    kosten: { holz: 25, stein: 45 },
    bauarbeit: 85,
    benoetigt: { forschung: 'wachdienst' },
    zufriedenheit: 2,
    reichweite: 20,
    maxStufe: 3,
    stufenbonus: 1.2,
  }),
  d({
    id: 'auftragsbrett',
    name: 'Auftragsbrett',
    kategorie: 'gemeinschaft',
    beschreibung: 'Das Brett am Dorfplatz sammelt Aufträge von Reisenden und Nachbarn.',
    sprite: { sheet: 'questboard', frame: 0 },
    varianten: [0, 1, 2, 3],
    w: 1,
    h: 1,
    bildHoehe: 1,
    eingang: { dx: 0, dy: 1 },
    kosten: { holz: 6 },
    bauarbeit: 10,
    zufriedenheit: 2,
    reichweite: 8,
    maxStufe: 1,
    stufenbonus: 1,
  }),
  d({
    id: 'wegweiser',
    name: 'Wegweiser',
    kategorie: 'infrastruktur',
    beschreibung: 'Macht das Dorf lesbar: Wege, Viertel und Ziele sind beschildert.',
    sprite: { sheet: 'streetsigns', frame: 0 },
    varianten: [0, 1, 2, 3, 4],
    w: 1,
    h: 1,
    bildHoehe: 1,
    eingang: { dx: 0, dy: 1 },
    kosten: { holz: 4 },
    bauarbeit: 8,
    zufriedenheit: 1,
    reichweite: 6,
    maxStufe: 1,
    stufenbonus: 1,
  }),
  d({
    id: 'bruecke',
    name: 'Brücke',
    kategorie: 'infrastruktur',
    beschreibung: 'Macht eine Wasserkachel begehbar und verbindet Ufer.',
    sprite: { sheet: 'bridge', frame: 5 },
    varianten: [5, 6, 7],
    w: 1,
    h: 1,
    bildHoehe: 1,
    eingang: { dx: 0, dy: 0 },
    kosten: { holz: 12, bretter: 4 },
    bauarbeit: 20,
    ueberWasser: true,
    maxStufe: 1,
    stufenbonus: 1,
  }),
];

export const BUILDING_BY_ID: Record<string, BuildingDef> = Object.fromEntries(
  BUILDINGS.map((b) => [b.id, b]),
);

export const KATEGORIE_NAME: Record<BuildingKategorie, string> = {
  wohnen: 'Wohnen',
  versorgung: 'Versorgung',
  produktion: 'Produktion',
  handel: 'Handel',
  gemeinschaft: 'Gemeinschaft',
  verteidigung: 'Verteidigung',
  infrastruktur: 'Infrastruktur',
};

/** Kosten einer Ausbaustufe: steigend, damit späte Stufen echte Entscheidungen sind. */
export function ausbaukosten(def: BuildingDef, stufe: number): Store {
  const faktor = 0.8 * Math.pow(1.7, stufe - 1);
  const out: Store = {};
  for (const [id, n] of Object.entries(def.kosten) as [ResourceId, number][]) {
    out[id] = Math.ceil(n * faktor);
  }
  return out;
}

/** Wirkungsmultiplikator einer Stufe mit abnehmendem Grenzertrag. */
export function stufenfaktor(def: BuildingDef, stufe: number): number {
  let faktor = 1;
  let bonus = def.stufenbonus;
  for (let i = 1; i < stufe; i++) {
    faktor *= bonus;
    bonus = 1 + (bonus - 1) * 0.8;
  }
  return faktor;
}
