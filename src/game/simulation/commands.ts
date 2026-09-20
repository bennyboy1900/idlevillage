import type { Simulation } from './sim';
import type { JobId, ResourceId, StrategyId, Zone } from '../core/types';
import { BUILDING_BY_ID, ausbaukosten } from '../content/buildings';
import { RESEARCH_BY_ID } from '../content/research';
import { MAX_BERATER, REGION_BY_ID } from '../content/world-content';
import { generateNodes } from '../world/terrain';
import { deckt, lagerEin, verbrauche } from './store';
import { brichAufgabeAb } from './residents';
import { arbeitsplaetzeZuweisen, istFreigeschaltet } from './village';

/**
 * Alle Spielereingriffe laufen über diese Befehle. Gleicher Seed, gleiche
 * Befehlsfolge und gleiche Schrittzahl ergeben denselben Zustand.
 */
export type Befehl =
  | { art: 'strategie'; wert: StrategyId }
  | { art: 'bauanteil'; wert: number }
  | { art: 'holzreserve'; wert: number }
  | { art: 'nahrungsziel'; wert: number }
  | { art: 'autobau'; wert: boolean }
  | { art: 'roden'; wert: boolean }
  | { art: 'zone-setzen'; zone: Omit<Zone, 'id'> }
  | { art: 'zone-entfernen'; id: number }
  | { art: 'bauen'; typ: string; x: number; y: number }
  | { art: 'abreissen'; id: number }
  | { art: 'verschieben'; id: number; x: number; y: number }
  | { art: 'pausieren'; id: number; wert: boolean }
  | { art: 'ausbauen'; id: number }
  | { art: 'forschung'; id: string }
  | { art: 'region'; id: string }
  | { art: 'berater'; ids: string[] }
  | { art: 'beruf'; bewohner: number; beruf: JobId | null }
  | { art: 'umbenennen'; bewohner: number; name: string }
  | { art: 'favorit'; bewohner: number; wert: boolean };

export interface BefehlErgebnis {
  ok: boolean;
  meldung: string;
}

export function fuehreBefehlAus(sim: Simulation, befehl: Befehl): BefehlErgebnis {
  const s = sim.state;
  switch (befehl.art) {
    case 'strategie':
      s.policy.strategie = befehl.wert;
      arbeitsplaetzeZuweisen(sim);
      return { ok: true, meldung: `Strategie: ${befehl.wert}` };
    case 'bauanteil':
      s.policy.bauanteil = Math.max(0, Math.min(1, befehl.wert));
      return { ok: true, meldung: `Bauanteil ${Math.round(s.policy.bauanteil * 100)} %` };
    case 'holzreserve':
      s.policy.holzreserve = Math.max(0, Math.round(befehl.wert));
      return { ok: true, meldung: `Holzreserve ${s.policy.holzreserve}` };
    case 'nahrungsziel':
      s.policy.nahrungsziel = Math.max(0, Math.round(befehl.wert));
      return { ok: true, meldung: `Nahrungsziel ${s.policy.nahrungsziel}` };
    case 'autobau':
      s.policy.autobau = befehl.wert;
      return { ok: true, meldung: befehl.wert ? 'Autobau eingeschaltet' : 'Autobau pausiert' };
    case 'roden':
      s.policy.rodenErlaubt = befehl.wert;
      return { ok: true, meldung: befehl.wert ? 'Roden freigegeben' : 'Roden gesperrt' };

    case 'zone-setzen': {
      const zone: Zone = { id: sim.neueId(), ...befehl.zone };
      s.policy.zonen.push(zone);
      return { ok: true, meldung: 'Bauzone freigegeben' };
    }
    case 'zone-entfernen':
      s.policy.zonen = s.policy.zonen.filter((z) => z.id !== befehl.id);
      return { ok: true, meldung: 'Bauzone entfernt' };

    case 'bauen': {
      const def = BUILDING_BY_ID[befehl.typ];
      if (!def) return { ok: false, meldung: 'Unbekanntes Gebäude' };
      if (!istFreigeschaltet(sim, def) && !sim.boni.freigeschaltet.has(def.id)) {
        return { ok: false, meldung: `${def.name} ist noch nicht freigeschaltet.` };
      }
      const pruefung = sim.bauplatzPruefen(def, befehl.x, befehl.y);
      if (!pruefung.ok) return { ok: false, meldung: pruefung.grund };
      if (!deckt(s, def.kosten)) return { ok: false, meldung: 'Nicht genug freie Baustoffe im Lager.' };
      const b = sim.baustelleAnlegen(def.id, befehl.x, befehl.y, false);
      return b
        ? { ok: true, meldung: `${def.name}: Baustelle eingerichtet.` }
        : { ok: false, meldung: 'Die Baustelle konnte nicht eingerichtet werden.' };
    }

    case 'abreissen':
      return sim.abreissen(befehl.id)
        ? { ok: true, meldung: 'Abgerissen.' }
        : { ok: false, meldung: 'Gebäude nicht gefunden.' };

    case 'verschieben': {
      const b = sim.gebaeude(befehl.id);
      if (!b) return { ok: false, meldung: 'Gebäude nicht gefunden.' };
      const def = BUILDING_BY_ID[b.type];
      const kosten: Record<string, number> = {};
      for (const [id, n] of Object.entries(def.kosten)) kosten[id] = Math.ceil(n * 0.25);
      if (!deckt(s, kosten)) return { ok: false, meldung: 'Der Umzug ist nicht bezahlbar.' };
      const alt = { x: b.x, y: b.y };
      b.x = befehl.x;
      b.y = befehl.y;
      const pruefung = sim.bauplatzPruefen(def, befehl.x, befehl.y);
      if (!pruefung.ok) {
        b.x = alt.x;
        b.y = alt.y;
        return { ok: false, meldung: pruefung.grund };
      }
      verbrauche(s, kosten);
      sim.markiereNavAlt();
      for (const r of s.residents) if (r.task?.buildingId === b.id) brichAufgabeAb(sim, r);
      return { ok: true, meldung: `${def.name} verschoben.` };
    }

    case 'pausieren': {
      const b = sim.gebaeude(befehl.id);
      if (!b || b.status === 'baustelle') return { ok: false, meldung: 'Nicht möglich.' };
      b.status = befehl.wert ? 'pausiert' : 'aktiv';
      sim.markiereBoniAlt();
      for (const r of s.residents) if (r.arbeitsplatz === b.id) brichAufgabeAb(sim, r);
      return { ok: true, meldung: befehl.wert ? 'Betrieb pausiert.' : 'Betrieb läuft wieder.' };
    }

    case 'ausbauen': {
      const b = sim.gebaeude(befehl.id);
      if (!b || b.status !== 'aktiv') return { ok: false, meldung: 'Nur aktive Gebäude lassen sich ausbauen.' };
      const def = BUILDING_BY_ID[b.type];
      if (b.stufe >= def.maxStufe) return { ok: false, meldung: 'Höchste Stufe erreicht.' };
      const kosten = ausbaukosten(def, b.stufe);
      if (!verbrauche(s, kosten)) return { ok: false, meldung: 'Nicht genug Material für den Ausbau.' };
      b.stufe++;
      sim.markiereBoniAlt();
      sim.sfx('bau-fertig', b.x, b.y);
      sim.protokoll(`${def.name} auf Stufe ${b.stufe} ausgebaut.`, 'erfolg');
      return { ok: true, meldung: `${def.name} ist jetzt Stufe ${b.stufe}.` };
    }

    case 'forschung': {
      const def = RESEARCH_BY_ID[befehl.id];
      if (!def) return { ok: false, meldung: 'Unbekanntes Projekt.' };
      if (s.research.abgeschlossen.includes(def.id)) return { ok: false, meldung: 'Bereits erforscht.' };
      if (!def.braucht.every((id) => s.research.abgeschlossen.includes(id))) {
        return { ok: false, meldung: 'Voraussetzungen fehlen.' };
      }
      s.research.aktiv = def.id;
      s.research.fortschritt = 0;
      return { ok: true, meldung: `Forschung gestartet: ${def.name}` };
    }

    case 'region': {
      const def = REGION_BY_ID[befehl.id];
      if (!def) return { ok: false, meldung: 'Unbekannte Region.' };
      if (s.regionen.includes(def.id)) return { ok: false, meldung: 'Bereits erschlossen.' };
      if (def.forschung && !s.research.abgeschlossen.includes(def.forschung)) {
        return { ok: false, meldung: `Dafür fehlt die Forschung „${RESEARCH_BY_ID[def.forschung]?.name}“.` };
      }
      if (!verbrauche(s, def.kosten)) return { ok: false, meldung: 'Die Erschließung ist zu teuer.' };
      s.regionen.push(def.id);
      sim.weltNeuAufbauen();
      const belegt = (x: number, y: number) => !!sim.gebaeudeAn(x, y);
      const neue = generateNodes(sim.world, def.id, s.naechsteId, belegt);
      s.naechsteId += neue.length + 1;
      s.nodes.push(...neue);
      sim.markiereNavAlt();
      sim.protokoll(`${def.name} erschlossen: ${def.beschreibung}`, 'erfolg');
      return { ok: true, meldung: `${def.name} ist erschlossen.` };
    }

    case 'berater': {
      const gueltig = befehl.ids.filter((id) => s.champions.includes(id)).slice(0, MAX_BERATER);
      s.beraterAktiv = gueltig;
      sim.markiereBoniAlt();
      return { ok: true, meldung: `${gueltig.length} von ${MAX_BERATER} Beratern aktiv.` };
    }

    case 'beruf': {
      const r = s.residents.find((x) => x.id === befehl.bewohner);
      if (!r) return { ok: false, meldung: 'Bewohner nicht gefunden.' };
      if (r.stage === 'kind') return { ok: false, meldung: 'Kinder arbeiten nicht.' };
      if (befehl.beruf === null) {
        r.berufFixiert = false;
        return { ok: true, meldung: `${r.name} folgt wieder der Dorfplanung.` };
      }
      r.beruf = befehl.beruf;
      r.berufFixiert = true;
      r.arbeitsplatz = null;
      brichAufgabeAb(sim, r);
      arbeitsplaetzeZuweisen(sim);
      return { ok: true, meldung: `${r.name} arbeitet jetzt als ${befehl.beruf}.` };
    }

    case 'umbenennen': {
      const r = s.residents.find((x) => x.id === befehl.bewohner);
      if (!r) return { ok: false, meldung: 'Bewohner nicht gefunden.' };
      const name = befehl.name.trim().slice(0, 28);
      if (!name) return { ok: false, meldung: 'Der Name darf nicht leer sein.' };
      r.name = name;
      return { ok: true, meldung: 'Name geändert.' };
    }

    case 'favorit': {
      const r = s.residents.find((x) => x.id === befehl.bewohner);
      if (!r) return { ok: false, meldung: 'Bewohner nicht gefunden.' };
      r.favorit = befehl.wert;
      return { ok: true, meldung: befehl.wert ? 'Als Liebling markiert.' : 'Markierung entfernt.' };
    }
  }
}

/** Kostenvorschau für die Oberfläche: nie eine Aktion ohne sichtbaren Preis. */
export function kostenVorschau(sim: Simulation, befehl: Befehl): { kosten: Record<string, number>; bezahlbar: boolean } {
  const s = sim.state;
  let kosten: Record<string, number> = {};
  if (befehl.art === 'bauen') kosten = { ...BUILDING_BY_ID[befehl.typ]?.kosten };
  if (befehl.art === 'ausbauen') {
    const b = sim.gebaeude(befehl.id);
    if (b) kosten = ausbaukosten(BUILDING_BY_ID[b.type], b.stufe) as Record<string, number>;
  }
  if (befehl.art === 'verschieben') {
    const b = sim.gebaeude(befehl.id);
    if (b) {
      for (const [id, n] of Object.entries(BUILDING_BY_ID[b.type].kosten)) kosten[id] = Math.ceil(n * 0.25);
    }
  }
  if (befehl.art === 'region') kosten = { ...REGION_BY_ID[befehl.id]?.kosten };
  return { kosten, bezahlbar: deckt(s, kosten as Partial<Record<ResourceId, number>>) };
}

/** Notration: verhindert ein Softlock, wenn Nahrung und Arbeit zugleich fehlen. */
export function notration(sim: Simulation): BefehlErgebnis {
  const s = sim.state;
  const preis = 10;
  if ((s.store.muenzen ?? 0) < preis) {
    return { ok: false, meldung: 'Dafür fehlen die Münzen.' };
  }
  verbrauche(s, { muenzen: preis });
  s.statistik.gewonnen.beeren = (s.statistik.gewonnen.beeren ?? 0) + 25;
  lagerEin(s, { beeren: 25 }, sim.kapazitaet);
  sim.protokoll('Notration gekauft: 25 Beeren für 10 Münzen.', 'warnung');
  return { ok: true, meldung: '25 Beeren gekauft.' };
}
