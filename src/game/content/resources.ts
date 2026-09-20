import type { ResourceId, Store } from '../core/types';

export interface ResourceDef {
  id: ResourceId;
  name: string;
  kurz: string;
  /** Nahrungswert je Einheit; 0 bedeutet kein Nahrungsmittel. */
  nahrung: number;
  /** Belegt Lagerplatz. Münzen, Forschung und Ansehen tun das nicht. */
  lagert: boolean;
  /** Handelswert in Münzen beim Verkauf über den Markt. */
  wert: number;
  /** Symbolindex in User Interface/Icons-Essentials bzw. UiIcons. */
  icon: string;
  beschreibung: string;
}

export const RESOURCES: Record<ResourceId, ResourceDef> = {
  holz: { id: 'holz', name: 'Holz', kurz: 'Holz', nahrung: 0, lagert: true, wert: 1, icon: 'holz', beschreibung: 'Grundbaustoff aus gefällten Bäumen.' },
  stein: { id: 'stein', name: 'Stein', kurz: 'Stein', nahrung: 0, lagert: true, wert: 1.4, icon: 'stein', beschreibung: 'Aus Felsen und dem Steinbruch.' },
  bretter: { id: 'bretter', name: 'Bretter', kurz: 'Bretter', nahrung: 0, lagert: true, wert: 3, icon: 'bretter', beschreibung: 'Im Sägewerk aus Holz geschnitten.' },
  erz: { id: 'erz', name: 'Erz', kurz: 'Erz', nahrung: 0, lagert: true, wert: 3, icon: 'erz', beschreibung: 'Aus der Erzhöhle und aus Erzfelsen.' },
  barren: { id: 'barren', name: 'Barren', kurz: 'Barren', nahrung: 0, lagert: true, wert: 7, icon: 'barren', beschreibung: 'In der Schmiede aus Erz und Holz.' },
  getreide: { id: 'getreide', name: 'Getreide', kurz: 'Getreide', nahrung: 0, lagert: true, wert: 1.5, icon: 'getreide', beschreibung: 'Ernte der Felder, Ausgangsstoff für Mehl.' },
  mehl: { id: 'mehl', name: 'Mehl', kurz: 'Mehl', nahrung: 0, lagert: true, wert: 3, icon: 'mehl', beschreibung: 'In der Mühle gemahlen.' },
  wolle: { id: 'wolle', name: 'Wolle', kurz: 'Wolle', nahrung: 0, lagert: true, wert: 2.5, icon: 'wolle', beschreibung: 'Von den Schafen der Ranch.' },
  stoff: { id: 'stoff', name: 'Stoff', kurz: 'Stoff', nahrung: 0, lagert: true, wert: 6, icon: 'stoff', beschreibung: 'In der Weberei gefertigt.' },
  kraeuter: { id: 'kraeuter', name: 'Kräuter', kurz: 'Kräuter', nahrung: 0, lagert: true, wert: 2, icon: 'kraeuter', beschreibung: 'Aus dem Kräutergarten und der Wildnis.' },
  trank: { id: 'trank', name: 'Tränke', kurz: 'Tränke', nahrung: 0, lagert: true, wert: 9, icon: 'trank', beschreibung: 'Heilung für Expeditionen.' },
  werkzeug: { id: 'werkzeug', name: 'Werkzeuge', kurz: 'Werkzeug', nahrung: 0, lagert: true, wert: 10, icon: 'werkzeug', beschreibung: 'Erhöht die Arbeitsleistung, nutzt sich langsam ab.' },
  kristall: { id: 'kristall', name: 'Kristalle', kurz: 'Kristall', nahrung: 0, lagert: true, wert: 14, icon: 'kristall', beschreibung: 'Seltener Fund im Hochland und Winterwald.' },
  beeren: { id: 'beeren', name: 'Beeren', kurz: 'Beeren', nahrung: 1, lagert: true, wert: 0.8, icon: 'beeren', beschreibung: 'Wildnahrung, schnell gesammelt und schnell aufgezehrt.' },
  brot: { id: 'brot', name: 'Brot', kurz: 'Brot', nahrung: 4, lagert: true, wert: 5, icon: 'brot', beschreibung: 'Sättigt vier Mahlzeiten; die effizienteste Nahrung.' },
  fisch: { id: 'fisch', name: 'Fisch', kurz: 'Fisch', nahrung: 2, lagert: true, wert: 2.5, icon: 'fisch', beschreibung: 'Vom Hafen und von Fischerbooten.' },
  eier: { id: 'eier', name: 'Eier', kurz: 'Eier', nahrung: 1, lagert: true, wert: 1.2, icon: 'eier', beschreibung: 'Aus dem Hühnerhof der Ranch.' },
  fleisch: { id: 'fleisch', name: 'Fleisch', kurz: 'Fleisch', nahrung: 3, lagert: true, wert: 4, icon: 'fleisch', beschreibung: 'Aus der Ranch und von der Jagd.' },
  muenzen: { id: 'muenzen', name: 'Münzen', kurz: 'Münzen', nahrung: 0, lagert: false, wert: 1, icon: 'muenzen', beschreibung: 'Aus echten Verkäufen und Dienstleistungen.' },
  forschung: { id: 'forschung', name: 'Forschung', kurz: 'Forschung', nahrung: 0, lagert: false, wert: 0, icon: 'forschung', beschreibung: 'Von beschäftigten Gelehrten erarbeitet.' },
  ansehen: { id: 'ansehen', name: 'Ansehen', kurz: 'Ansehen', nahrung: 0, lagert: false, wert: 0, icon: 'ansehen', beschreibung: 'Ruf des Dorfes bei Nachbarn und Reisenden.' },
};

export const RESOURCE_IDS = Object.keys(RESOURCES) as ResourceId[];

/** Nahrungsmittel, aufsteigend nach Nahrungswert: Verderbliches zuerst essen. */
export const FOOD_IDS: ResourceId[] = RESOURCE_IDS.filter((id) => RESOURCES[id].nahrung > 0).sort(
  (a, b) => RESOURCES[a].nahrung - RESOURCES[b].nahrung,
);

/** Summe der Nahrungswerte im Lager. Jede Einheit zählt genau einmal. */
export function nahrungswert(store: Store): number {
  let total = 0;
  for (const id of FOOD_IDS) total += (store[id] ?? 0) * RESOURCES[id].nahrung;
  return total;
}

/** Belegter Lagerplatz: alle physischen Güter zählen mit je einer Einheit. */
export function lagerbelegung(store: Store): number {
  let total = 0;
  for (const id of RESOURCE_IDS) if (RESOURCES[id].lagert) total += store[id] ?? 0;
  return total;
}

export function formatStore(store: Store): string {
  return (Object.entries(store) as [ResourceId, number][])
    .filter(([, n]) => n > 0)
    .map(([id, n]) => `${Math.round(n)} ${RESOURCES[id].name}`)
    .join(', ');
}
