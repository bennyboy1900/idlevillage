import type { JobId, ResourceId, Store } from '../core/types';

export type Ziel =
  | { art: 'ressource'; id: ResourceId; menge: number }
  | { art: 'nahrung'; menge: number }
  | { art: 'gebaeude'; typ: string; anzahl: number }
  | { art: 'einwohner'; anzahl: number }
  | { art: 'forschung'; anzahl: number }
  | { art: 'beruf'; beruf: JobId; anzahl: number }
  | { art: 'region'; id: string }
  | { art: 'gesamt'; id: ResourceId; menge: number }
  | { art: 'zufriedenheit'; wert: number };

export interface QuestDef {
  id: string;
  name: string;
  text: string;
  kapitel: number;
  ziel: Ziel;
  belohnung: Store;
}

const q = (def: QuestDef) => def;

/**
 * Aufträge sind bewusst an echte Aktionen gebunden. Frühe Aufträge bleiben
 * erreichbar, auch wenn ein Dorf sie zunächst überspringt.
 */
export const QUESTS: QuestDef[] = [
  q({ id: 'erstes-holz', name: 'Der erste Stapel', text: 'Liefert 30 Holz ins Lager.', kapitel: 1, ziel: { art: 'gesamt', id: 'holz', menge: 30 }, belohnung: { muenzen: 10 } }),
  q({ id: 'erster-stein', name: 'Fester Grund', text: 'Liefert 20 Stein ins Lager.', kapitel: 1, ziel: { art: 'gesamt', id: 'stein', menge: 20 }, belohnung: { muenzen: 12 } }),
  q({ id: 'nahrungspuffer', name: 'Ein voller Speicher', text: 'Haltet 120 Nahrungswerte im Lager.', kapitel: 1, ziel: { art: 'nahrung', menge: 120 }, belohnung: { muenzen: 15, ansehen: 1 } }),
  q({ id: 'erstes-haus', name: 'Ein Dach mehr', text: 'Stellt ein weiteres Wohngebäude fertig.', kapitel: 1, ziel: { art: 'gebaeude', typ: 'huette', anzahl: 3 }, belohnung: { holz: 20, muenzen: 10 } }),
  q({ id: 'brunnen-bauen', name: 'Wasser für alle', text: 'Baut einen Brunnen.', kapitel: 1, ziel: { art: 'gebaeude', typ: 'brunnen', anzahl: 1 }, belohnung: { stein: 15, ansehen: 1 } }),

  q({ id: 'zehn-koepfe', name: 'Zehn Köpfe', text: 'Das Dorf zählt 10 Einwohner.', kapitel: 2, ziel: { art: 'einwohner', anzahl: 10 }, belohnung: { muenzen: 25, ansehen: 2 } }),
  q({ id: 'erstes-lager', name: 'Ordnung im Lager', text: 'Baut ein Lagerhaus.', kapitel: 2, ziel: { art: 'gebaeude', typ: 'lager', anzahl: 1 }, belohnung: { bretter: 10 } }),
  q({ id: 'erster-acker', name: 'Eigene Ernte', text: 'Legt zwei Äcker an.', kapitel: 2, ziel: { art: 'gebaeude', typ: 'feld', anzahl: 2 }, belohnung: { getreide: 20 } }),
  q({ id: 'saegewerk-bauen', name: 'Bretter statt Stämme', text: 'Baut ein Sägewerk.', kapitel: 2, ziel: { art: 'gebaeude', typ: 'saegewerk', anzahl: 1 }, belohnung: { holz: 40, muenzen: 20 } }),
  q({ id: 'erste-forschung', name: 'Erste Erkenntnis', text: 'Schließt ein Forschungsprojekt ab.', kapitel: 2, ziel: { art: 'forschung', anzahl: 1 }, belohnung: { forschung: 5 } }),
  q({ id: 'bretter-liefern', name: 'Vierzig Bretter', text: 'Produziert insgesamt 40 Bretter.', kapitel: 2, ziel: { art: 'gesamt', id: 'bretter', menge: 40 }, belohnung: { muenzen: 30 } }),
  q({ id: 'zufriedene-leute', name: 'Gute Stimmung', text: 'Haltet die Zufriedenheit über 70.', kapitel: 2, ziel: { art: 'zufriedenheit', wert: 70 }, belohnung: { ansehen: 3, muenzen: 20 } }),

  q({ id: 'muehle-bauen', name: 'Mehl mahlen', text: 'Baut eine Mühle.', kapitel: 3, ziel: { art: 'gebaeude', typ: 'muehle', anzahl: 1 }, belohnung: { getreide: 25 } }),
  q({ id: 'brot-backen', name: 'Duft von Brot', text: 'Backt insgesamt 30 Brote.', kapitel: 3, ziel: { art: 'gesamt', id: 'brot', menge: 30 }, belohnung: { muenzen: 45, ansehen: 2 } }),
  q({ id: 'steinbruch-bauen', name: 'Der Bruch', text: 'Baut einen Steinbruch.', kapitel: 3, ziel: { art: 'gebaeude', typ: 'steinbruch', anzahl: 1 }, belohnung: { stein: 40 } }),
  q({ id: 'werkstatt-bauen', name: 'Gutes Werkzeug', text: 'Baut eine Werkstatt.', kapitel: 3, ziel: { art: 'gebaeude', typ: 'werkstatt', anzahl: 1 }, belohnung: { bretter: 20 } }),
  q({ id: 'markt-bauen', name: 'Markttag', text: 'Baut einen Markt.', kapitel: 3, ziel: { art: 'gebaeude', typ: 'markt', anzahl: 1 }, belohnung: { muenzen: 50 } }),
  q({ id: 'zwanzig-koepfe', name: 'Zwanzig Köpfe', text: 'Das Dorf zählt 20 Einwohner.', kapitel: 3, ziel: { art: 'einwohner', anzahl: 20 }, belohnung: { muenzen: 60, ansehen: 3 } }),
  q({ id: 'handwerker-ausbilden', name: 'Fünf Handwerker', text: 'Fünf Bewohner arbeiten als Handwerker.', kapitel: 3, ziel: { art: 'beruf', beruf: 'handwerker', anzahl: 5 }, belohnung: { werkzeug: 2 } }),
  q({ id: 'taverne-bauen', name: 'Ein Krug Bier', text: 'Baut eine Taverne.', kapitel: 3, ziel: { art: 'gebaeude', typ: 'taverne', anzahl: 1 }, belohnung: { ansehen: 4, muenzen: 40 } }),

  q({ id: 'schmiede-bauen', name: 'Feuer und Eisen', text: 'Baut eine Schmiede.', kapitel: 4, ziel: { art: 'gebaeude', typ: 'schmiede', anzahl: 1 }, belohnung: { erz: 20 } }),
  q({ id: 'barren-giessen', name: 'Fünfzig Barren', text: 'Gießt insgesamt 50 Barren.', kapitel: 4, ziel: { art: 'gesamt', id: 'barren', menge: 50 }, belohnung: { muenzen: 120 } }),
  q({ id: 'hafen-bauen', name: 'Netze auswerfen', text: 'Baut einen Hafen am Wasser.', kapitel: 4, ziel: { art: 'gebaeude', typ: 'hafen', anzahl: 1 }, belohnung: { fisch: 30 } }),
  q({ id: 'wolle-liefern', name: 'Warme Sachen', text: 'Sammelt insgesamt 60 Wolle.', kapitel: 4, ziel: { art: 'gesamt', id: 'wolle', menge: 60 }, belohnung: { stoff: 8, muenzen: 60 } }),
  q({ id: 'hochland-erschliessen', name: 'Blick von oben', text: 'Erschließt das felsige Hochland.', kapitel: 4, ziel: { art: 'region', id: 'hochland' }, belohnung: { ansehen: 5, muenzen: 80 } }),
  q({ id: 'muenzen-sammeln', name: 'Volle Kasse', text: 'Besitzt 500 Münzen.', kapitel: 4, ziel: { art: 'ressource', id: 'muenzen', menge: 500 }, belohnung: { ansehen: 6 } }),

  q({ id: 'kuste-erschliessen', name: 'Salz in der Luft', text: 'Erschließt die Küste.', kapitel: 5, ziel: { art: 'region', id: 'kueste' }, belohnung: { ansehen: 6, muenzen: 120 } }),
  q({ id: 'traenke-brauen', name: 'Heilende Hand', text: 'Braut insgesamt 20 Tränke.', kapitel: 5, ziel: { art: 'gesamt', id: 'trank', menge: 20 }, belohnung: { muenzen: 150, ansehen: 4 } }),
  q({ id: 'vierzig-koepfe', name: 'Eine kleine Stadt', text: 'Das Dorf zählt 40 Einwohner.', kapitel: 5, ziel: { art: 'einwohner', anzahl: 40 }, belohnung: { muenzen: 200, ansehen: 8 } }),
  q({ id: 'winterwald-erschliessen', name: 'Erster Schnee', text: 'Erschließt den Winterwald.', kapitel: 6, ziel: { art: 'region', id: 'winterwald' }, belohnung: { ansehen: 10, kristall: 5 } }),
];

export const QUEST_BY_ID: Record<string, QuestDef> = Object.fromEntries(QUESTS.map((x) => [x.id, x]));
