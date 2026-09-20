import type { JobId, ResourceId } from '../core/types';

export type Forschungsast =
  | 'versorgung'
  | 'forst'
  | 'handwerk'
  | 'gemeinschaft'
  | 'handel'
  | 'erkundung';

/** Alle Effekte sind multiplikativ oder additiv auf klar benannte Werte. */
export interface Effekt {
  /** Zusätzliche Tragekapazität in Einheiten. */
  tragen?: number;
  /** Globaler Arbeitstempofaktor. */
  tempo?: number;
  /** Tempofaktor für einen Beruf. */
  tempoBeruf?: { beruf: JobId; faktor: number };
  /** Gehgeschwindigkeitsfaktor. */
  gehen?: number;
  /** Zusätzliche Lagerkapazität. */
  lager?: number;
  /** Faktor auf das Nachwachsen von Wäldern und Feldern. */
  nachwachsen?: number;
  /** Faktor auf den Nahrungsverbrauch. */
  nahrungsbedarf?: number;
  /** Zufriedenheitsbonus für alle Bewohner. */
  zufriedenheit?: number;
  /** Zusätzliche Stunden Offline-Nachrechnung. */
  offlineStunden?: number;
  /** Faktor auf die Bauzeit. */
  bauzeit?: number;
  /** Faktor auf Verkaufserlöse. */
  handel?: number;
  /** Faktor auf die Ausbeute je Ressource. */
  ertrag?: Partial<Record<ResourceId, number>>;
  /** Schaltet Gebäude frei. */
  freischalten?: string[];
  /** Schaltet eine Region frei. */
  region?: string;
  /** Faktor auf die Lerngeschwindigkeit von Fähigkeiten. */
  lernen?: number;
}

export interface ForschungDef {
  id: string;
  name: string;
  ast: Forschungsast;
  kosten: number;
  /** Vorausgesetzte Projekte. */
  braucht: string[];
  beschreibung: string;
  /** Konkreter Vorher-/Nachher-Text für die Oberfläche. */
  wirkung: string;
  effekt: Effekt;
}

export const AST_NAME: Record<Forschungsast, string> = {
  versorgung: 'Versorgung',
  forst: 'Forst und Bergbau',
  handwerk: 'Handwerk',
  gemeinschaft: 'Gemeinschaft',
  handel: 'Handel',
  erkundung: 'Erkundung',
};

const f = (def: ForschungDef) => def;

export const RESEARCH: ForschungDef[] = [
  // --- Versorgung ---------------------------------------------------------
  f({ id: 'tragekoerbe', name: 'Tragekörbe', ast: 'versorgung', kosten: 8, braucht: [], beschreibung: 'Geflochtene Körbe für längere Transportwege.', wirkung: 'Tragekapazität 6 → 8', effekt: { tragen: 2 } }),
  f({ id: 'feldbestellung', name: 'Feldbestellung', ast: 'versorgung', kosten: 14, braucht: ['tragekoerbe'], beschreibung: 'Geordnete Fruchtfolge auf den Äckern.', wirkung: 'Getreideertrag +25 %', effekt: { ertrag: { getreide: 1.25 } } }),
  f({ id: 'vorratshaltung', name: 'Vorratshaltung', ast: 'versorgung', kosten: 20, braucht: ['tragekoerbe'], beschreibung: 'Trockene, kühle Lagerung verdirbt weniger.', wirkung: 'Lagerkapazität +120, Nahrungsverbrauch −8 %', effekt: { lager: 120, nahrungsbedarf: 0.92 } }),
  f({ id: 'muehlenantrieb', name: 'Mühlenantrieb', ast: 'versorgung', kosten: 30, braucht: ['feldbestellung'], beschreibung: 'Ein besseres Getriebe für die Mühle.', wirkung: 'Mehlausbeute +30 %', effekt: { ertrag: { mehl: 1.3 } } }),
  f({ id: 'quartierslager', name: 'Quartierslager', ast: 'versorgung', kosten: 45, braucht: ['vorratshaltung'], beschreibung: 'Kleine Lager in den Vierteln verkürzen Wege.', wirkung: 'Lager +150, Ställe verfügbar', effekt: { lager: 150, freischalten: ['stall'] } }),
  f({ id: 'tierhaltung', name: 'Tierhaltung', ast: 'versorgung', kosten: 26, braucht: ['feldbestellung'], beschreibung: 'Hühner und Schafe im Dorf halten.', wirkung: 'Ranch verfügbar', effekt: { freischalten: ['ranch'] } }),

  // --- Forst und Bergbau ---------------------------------------------------
  f({ id: 'geschaerfte-aexte', name: 'Geschärfte Äxte', ast: 'forst', kosten: 10, braucht: [], beschreibung: 'Regelmäßig geschliffene Klingen.', wirkung: 'Holzfäller arbeiten 20 % schneller', effekt: { tempoBeruf: { beruf: 'holzfaeller', faktor: 1.2 } } }),
  f({ id: 'aufforstung', name: 'Aufforstung', ast: 'forst', kosten: 16, braucht: ['geschaerfte-aexte'], beschreibung: 'Setzlinge statt kahler Flächen.', wirkung: 'Wälder wachsen doppelt so schnell nach', effekt: { nachwachsen: 2 } }),
  f({ id: 'steinbrucharbeit', name: 'Steinbrucharbeit', ast: 'forst', kosten: 22, braucht: ['geschaerfte-aexte'], beschreibung: 'Systematischer Abbau statt einzelner Findlinge.', wirkung: 'Steinbruch verfügbar', effekt: { freischalten: ['steinbruch'] } }),
  f({ id: 'bergbaustollen', name: 'Bergbaustollen', ast: 'forst', kosten: 34, braucht: ['steinbrucharbeit'], beschreibung: 'Abgestützte Stollen erreichen die Erzadern.', wirkung: 'Erzhöhle verfügbar', effekt: { freischalten: ['erzhoehle'] } }),
  f({ id: 'grubenlampen', name: 'Grubenlampen', ast: 'forst', kosten: 48, braucht: ['bergbaustollen'], beschreibung: 'Licht im Stollen verlängert die Schicht.', wirkung: 'Bergleute arbeiten 25 % schneller', effekt: { tempoBeruf: { beruf: 'bergmann', faktor: 1.25 } } }),
  f({ id: 'schutzwald', name: 'Schutzwald', ast: 'forst', kosten: 40, braucht: ['aufforstung'], beschreibung: 'Ein bewusst erhaltener Waldgürtel.', wirkung: 'Zufriedenheit +4, Holzertrag +15 %', effekt: { zufriedenheit: 4, ertrag: { holz: 1.15 } } }),

  // --- Handwerk -----------------------------------------------------------
  f({ id: 'saegeblatt', name: 'Besseres Sägeblatt', ast: 'handwerk', kosten: 12, braucht: [], beschreibung: 'Feinere Zähne schneiden sauberer.', wirkung: 'Bretterausbeute +25 %', effekt: { ertrag: { bretter: 1.25 } } }),
  f({ id: 'schmiedekunst', name: 'Schmiedekunst', ast: 'handwerk', kosten: 28, braucht: ['saegeblatt'], beschreibung: 'Erz schmelzen und Barren gießen.', wirkung: 'Schmiede verfügbar', effekt: { freischalten: ['schmiede'] } }),
  f({ id: 'werkzeugpflege', name: 'Werkzeugpflege', ast: 'handwerk', kosten: 36, braucht: ['schmiedekunst'], beschreibung: 'Gepflegte Werkzeuge halten länger.', wirkung: 'Werkzeugverschleiß −50 %', effekt: { ertrag: { werkzeug: 2 } } }),
  f({ id: 'befestigte-wege', name: 'Befestigte Wege', ast: 'handwerk', kosten: 30, braucht: ['saegeblatt'], beschreibung: 'Steinwege zwischen Lager, Feldern und Werkstätten.', wirkung: 'Alle gehen 20 % schneller', effekt: { gehen: 1.2 } }),
  f({ id: 'winterkleidung', name: 'Winterkleidung', ast: 'handwerk', kosten: 42, braucht: ['werkzeugpflege'], beschreibung: 'Wolle wird zu warmem Stoff.', wirkung: 'Weberei verfügbar, Zufriedenheit +3', effekt: { freischalten: ['weberei'], zufriedenheit: 3 } }),
  f({ id: 'heilkraeuter', name: 'Heilkräuter', ast: 'handwerk', kosten: 38, braucht: ['saegeblatt'], beschreibung: 'Kräuterkunde für Tränke und Pflege.', wirkung: 'Kräutergarten und Alchemie verfügbar', effekt: { freischalten: ['kraeutergarten', 'alchemie'] } }),

  // --- Gemeinschaft --------------------------------------------------------
  f({ id: 'nachbarschaftshilfe', name: 'Nachbarschaftshilfe', ast: 'gemeinschaft', kosten: 10, braucht: [], beschreibung: 'Wer gemeinsam baut, baut schneller.', wirkung: 'Bauzeit −15 %', effekt: { bauzeit: 0.85 } }),
  f({ id: 'lehrlingsausbildung', name: 'Lehrlingsausbildung', ast: 'gemeinschaft', kosten: 24, braucht: ['nachbarschaftshilfe'], beschreibung: 'Erfahrene geben ihr Können weiter.', wirkung: 'Fähigkeiten steigen doppelt so schnell', effekt: { lernen: 2 } }),
  f({ id: 'groessere-familienhaeuser', name: 'Größere Familienhäuser', ast: 'gemeinschaft', kosten: 32, braucht: ['nachbarschaftshilfe'], beschreibung: 'Platz für mehrere Generationen.', wirkung: 'Familienhaus verfügbar (6 Wohnplätze)', effekt: { freischalten: ['familienhaus'] } }),
  f({ id: 'dorffest', name: 'Dorffest', ast: 'gemeinschaft', kosten: 30, braucht: ['lehrlingsausbildung'], beschreibung: 'Ein fester Termin für die Gemeinschaft.', wirkung: 'Zufriedenheit +6', effekt: { zufriedenheit: 6 } }),
  f({ id: 'wachdienst', name: 'Wachdienst', ast: 'gemeinschaft', kosten: 44, braucht: ['dorffest'], beschreibung: 'Geregelte Patrouillen geben Sicherheit.', wirkung: 'Kaserne und Wachturm verfügbar', effekt: { freischalten: ['kaserne', 'wachturm'] } }),
  f({ id: 'gesunde-ernaehrung', name: 'Gesunde Ernährung', ast: 'gemeinschaft', kosten: 40, braucht: ['dorffest'], beschreibung: 'Abwechslung auf dem Teller.', wirkung: 'Nahrungsverbrauch −10 %, Zufriedenheit +3', effekt: { nahrungsbedarf: 0.9, zufriedenheit: 3 } }),

  // --- Handel --------------------------------------------------------------
  f({ id: 'marktkarren', name: 'Marktkarren', ast: 'handel', kosten: 18, braucht: [], beschreibung: 'Waren kommen gebündelt zum Stand.', wirkung: 'Verkaufserlöse +20 %', effekt: { handel: 1.2 } }),
  f({ id: 'wiegen-und-masse', name: 'Wiegen und Maße', ast: 'handel', kosten: 26, braucht: ['marktkarren'], beschreibung: 'Verlässliche Maße schaffen Vertrauen.', wirkung: 'Verkaufserlöse +15 %, Ansehen wächst schneller', effekt: { handel: 1.15 } }),
  f({ id: 'schiffsbau', name: 'Schiffsbau', ast: 'handel', kosten: 50, braucht: ['wiegen-und-masse'], beschreibung: 'Eigene Boote für weite Wege.', wirkung: 'Werft verfügbar', effekt: { freischalten: ['werft'] } }),
  f({ id: 'handelsvertraege', name: 'Handelsverträge', ast: 'handel', kosten: 60, braucht: ['schiffsbau'], beschreibung: 'Feste Abnahmemengen mit Nachbardörfern.', wirkung: 'Verkaufserlöse +25 %', effekt: { handel: 1.25 } }),
  f({ id: 'diplomatie', name: 'Diplomatie', ast: 'handel', kosten: 70, braucht: ['handelsvertraege'], beschreibung: 'Gesandte bei den Nachbarn.', wirkung: 'Zufriedenheit +4, Erlöse +10 %', effekt: { zufriedenheit: 4, handel: 1.1 } }),
  f({ id: 'gaestezimmer', name: 'Gästezimmer', ast: 'handel', kosten: 34, braucht: ['marktkarren'], beschreibung: 'Reisende bleiben über Nacht.', wirkung: 'Taverne wirft mehr ab, Zuzug wird wahrscheinlicher', effekt: { handel: 1.1, zufriedenheit: 2 } }),

  // --- Erkundung -----------------------------------------------------------
  f({ id: 'kartenkunde', name: 'Kartenkunde', ast: 'erkundung', kosten: 20, braucht: [], beschreibung: 'Das Umland wird vermessen.', wirkung: 'Hochland erschließbar', effekt: { region: 'hochland' } }),
  f({ id: 'kuestenpfade', name: 'Küstenpfade', ast: 'erkundung', kosten: 30, braucht: ['kartenkunde'], beschreibung: 'Wege entlang der Küste.', wirkung: 'Küste erschließbar', effekt: { region: 'kueste' } }),
  f({ id: 'trockenmarsch', name: 'Trockenmarsch', ast: 'erkundung', kosten: 45, braucht: ['kuestenpfade'], beschreibung: 'Ausrüstung für das trockene Grenzland.', wirkung: 'Grenzland erschließbar', effekt: { region: 'grenzland' } }),
  f({ id: 'winterausruestung', name: 'Winterausrüstung', ast: 'erkundung', kosten: 60, braucht: ['trockenmarsch'], beschreibung: 'Schneeschuhe und warme Zelte.', wirkung: 'Winterwald erschließbar', effekt: { region: 'winterwald' } }),
  f({ id: 'ruinenkunde', name: 'Ruinenkunde', ast: 'erkundung', kosten: 80, braucht: ['winterausruestung'], beschreibung: 'Alte Inschriften werden lesbar.', wirkung: 'Alte Ruinen erschließbar', effekt: { region: 'ruinen' } }),
  f({ id: 'portalstabilisierung', name: 'Portalstabilisierung', ast: 'erkundung', kosten: 120, braucht: ['ruinenkunde'], beschreibung: 'Das Portal lässt sich sicher betreten.', wirkung: 'Offline-Nachrechnung bis 24 Stunden', effekt: { offlineStunden: 16 } }),
];

export const RESEARCH_BY_ID: Record<string, ForschungDef> = Object.fromEntries(
  RESEARCH.map((r) => [r.id, r]),
);
