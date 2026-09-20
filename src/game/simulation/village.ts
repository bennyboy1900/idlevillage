import type { Simulation } from './sim';
import {
  type Building,
  type GameState,
  type JobId,
  type ResourceId,
  type Resident,
  type Store,
} from '../core/types';
import { BUILDING_BY_ID, BUILDINGS, type BuildingDef } from '../content/buildings';
import { RESOURCES, nahrungswert } from '../content/resources';
import { QUESTS, QUEST_BY_ID, type Ziel } from '../content/quests';
import { CHAMPIONS, EVENTS, EVENT_BY_ID } from '../content/world-content';
import { RESEARCH_BY_ID } from '../content/research';
import { DORFMITTE } from '../world/terrain';
import { createRng, deriveSeed } from '../core/rng';
import { addiere, lagerEin, menge, verfuegbar } from './store';
import { brichAufgabeAb } from './residents';
import { erzeugeBewohner } from './state';

/**
 * Spielzeit-Tag in Simulationssekunden; Grundlage für den „Zwei-Tage-Puffer“
 * beim Nachwuchs und für den Tag-Nacht-Wechsel. Vier Minuten je Tag halten die
 * Nachwuchsschwelle erreichbar und den Lichtwechsel sichtbar.
 */
export const TAG_SEKUNDEN = 240;

function rngFuer(state: GameState, label: string) {
  return createRng(deriveSeed(state.seed ^ (state.tick * 2654435761), label));
}

/**
 * Zentrale Taktung der Dorfsysteme. Die Intervalle sind in Simulationssekunden
 * angegeben, damit sie online wie in der Offline-Nachrechnung gleich greifen.
 */
export function dorfSysteme(sim: Simulation): void {
  if (sim.faellig(2)) {
    arbeitsplaetzeZuweisen(sim);
    wohnungenZuweisen(sim);
  }
  if (sim.faellig(3)) auftraegePruefen(sim);
  if (sim.faellig(5)) autobau(sim);
  if (sim.faellig(10)) {
    familien(sim, 10);
    ereignisse(sim);
    hinweise(sim);
    championsPruefen(sim);
  }
  if (sim.faellig(60)) werkzeugVerschleiss(sim);
  forschungFortschritt(sim);
  ereignisseAblaufen(sim);
}

// ---------------------------------------------------------------------------
// Arbeit und Wohnraum
// ---------------------------------------------------------------------------

const STRATEGIE_GEWICHTE: Record<string, Partial<Record<JobId, number>>> = {
  ausgewogen: { holzfaeller: 0.35, steinmetz: 0.2, bauer: 0.35, traeger: 0.1 },
  wachstum: { holzfaeller: 0.35, steinmetz: 0.1, bauer: 0.45, traeger: 0.1 },
  vorraete: { holzfaeller: 0.25, steinmetz: 0.15, bauer: 0.5, traeger: 0.1 },
  handwerk: { holzfaeller: 0.4, steinmetz: 0.3, bauer: 0.3 },
};

export function arbeitsplaetzeZuweisen(sim: Simulation): void {
  const s = sim.state;
  for (const b of s.buildings) b.arbeiter = [];

  // Ungültige Zuordnungen lösen.
  for (const r of s.residents) {
    if (r.stage === 'kind') {
      r.arbeitsplatz = null;
      continue;
    }
    if (r.arbeitsplatz == null) continue;
    const b = sim.gebaeude(r.arbeitsplatz);
    if (!b || b.status !== 'aktiv' || !BUILDING_BY_ID[b.type].arbeitsplaetze) {
      r.arbeitsplatz = null;
    }
  }
  for (const r of s.residents) {
    if (r.arbeitsplatz == null) continue;
    const b = sim.gebaeude(r.arbeitsplatz)!;
    const def = BUILDING_BY_ID[b.type];
    if (b.arbeiter.length < (def.arbeitsplaetze ?? 0)) {
      b.arbeiter.push(r.id);
      if (!r.berufFixiert && def.beruf) r.beruf = def.beruf;
    } else {
      r.arbeitsplatz = null;
    }
  }

  // Offene Stellen mit den nächstgelegenen freien Bewohnern besetzen.
  const frei = () => s.residents.filter((r) => r.stage !== 'kind' && r.arbeitsplatz == null && !r.berufFixiert);
  for (const b of s.buildings) {
    if (b.status !== 'aktiv') continue;
    const def = BUILDING_BY_ID[b.type];
    if (!def.arbeitsplaetze || !def.beruf) continue;
    while (b.arbeiter.length < def.arbeitsplaetze) {
      const kandidaten = frei();
      if (!kandidaten.length) break;
      kandidaten.sort((a, c) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c.x - b.x, c.y - b.y));
      const r = kandidaten[0];
      r.arbeitsplatz = b.id;
      if (r.beruf !== def.beruf) {
        r.beruf = def.beruf;
        brichAufgabeAb(sim, r);
      }
      b.arbeiter.push(r.id);
    }
  }

  // Alle übrigen nach Strategie auf Sammelberufe verteilen.
  const rest = frei();
  if (!rest.length) return;
  const gewichte = STRATEGIE_GEWICHTE[s.policy.strategie] ?? STRATEGIE_GEWICHTE.ausgewogen;
  const berufe = Object.keys(gewichte) as JobId[];
  const summe = berufe.reduce((n, j) => n + (gewichte[j] ?? 0), 0);
  let i = 0;
  for (const beruf of berufe) {
    const anzahl = Math.round((rest.length * (gewichte[beruf] ?? 0)) / summe);
    for (let k = 0; k < anzahl && i < rest.length; k++, i++) {
      const r = rest[i];
      if (r.beruf !== beruf) {
        r.beruf = beruf;
        brichAufgabeAb(sim, r);
      }
    }
  }
  for (; i < rest.length; i++) {
    if (rest[i].beruf !== 'holzfaeller') {
      rest[i].beruf = 'holzfaeller';
      brichAufgabeAb(sim, rest[i]);
    }
  }
}

export function wohnungenZuweisen(sim: Simulation): void {
  const s = sim.state;
  for (const b of s.buildings) b.bewohner = [];
  for (const r of s.residents) {
    if (r.wohnung == null) continue;
    const b = sim.gebaeude(r.wohnung);
    const def = b ? BUILDING_BY_ID[b.type] : null;
    // Wohnplätze entstehen erst mit der Fertigstellung.
    if (!b || b.status !== 'aktiv' || !def?.wohnplaetze || b.bewohner.length >= def.wohnplaetze) {
      r.wohnung = null;
      continue;
    }
    b.bewohner.push(r.id);
  }
  for (const r of s.residents) {
    if (r.wohnung != null) continue;
    const heim = s.buildings
      .filter((b) => {
        const def = BUILDING_BY_ID[b.type];
        return b.status === 'aktiv' && def.wohnplaetze && b.bewohner.length < def.wohnplaetze;
      })
      .sort((a, b) => Math.hypot(a.x - r.x, a.y - r.y) - Math.hypot(b.x - r.x, b.y - r.y))[0];
    if (!heim) continue;
    r.wohnung = heim.id;
    heim.bewohner.push(r.id);
  }
}

export function freieWohnplaetze(sim: Simulation): number {
  return sim.wohnplaetze - sim.state.residents.length;
}

// ---------------------------------------------------------------------------
// Autobau
// ---------------------------------------------------------------------------

/**
 * Autobau-Budget nach der Dorfregel: höchstens `bauanteil` der frei
 * verfügbaren Baustoffe, und die feste Mindestreserve bleibt unangetastet.
 * „Verfügbar“ heißt Lagerbestand minus bereits zugesagte Mengen.
 */
function mindestreserve(sim: Simulation, id: ResourceId): number {
  return id === 'holz' ? sim.state.policy.holzreserve : 5;
}

/**
 * Dringende Engpässe (keine Abgabestelle, volles Lager, gar kein Wohnraum)
 * dürfen die Bauanteilsgrenze überschreiten, halten aber immer die
 * Mindestreserve ein. Ohne diese Ausnahme kann sich ein kleines Dorf das
 * rettende Lagerhaus nie leisten und bleibt dauerhaft stecken.
 */
function bezahlbar(sim: Simulation, def: BuildingDef, dringend = false): boolean {
  const s = sim.state;
  for (const [id, n] of Object.entries(def.kosten) as [ResourceId, number][]) {
    const frei = verfuegbar(s, id);
    if (!dringend && n > frei * s.policy.bauanteil) return false;
    if (frei - n < mindestreserve(sim, id)) return false;
  }
  return true;
}

export function istFreigeschaltet(sim: Simulation, def: BuildingDef): boolean {
  const s = sim.state;
  const b = def.benoetigt;
  if (!b) return true;
  if (b.forschung && !s.research.abgeschlossen.includes(b.forschung)) return false;
  if (b.einwohner && s.residents.length < b.einwohner) return false;
  if (b.gebaeude && !s.buildings.some((x) => x.type === b.gebaeude && x.status === 'aktiv')) return false;
  if (b.region && !s.regionen.includes(b.region)) return false;
  return true;
}

function anzahl(sim: Simulation, typ: string, nurAktiv = false): number {
  return sim.state.buildings.filter((b) => b.type === typ && (!nurAktiv || b.status === 'aktiv')).length;
}

/**
 * Was das Dorf als Nächstes selbst bauen würde, nach Dringlichkeit sortiert.
 * Der Autobau nimmt den ersten Eintrag, der freigeschaltet und bezahlbar ist.
 */
export function bauBedarfListe(sim: Simulation): { typ: string; grund: string; dringend?: boolean }[] {
  const s = sim.state;
  const plaetze = sim.wohnplaetze;
  const belegt = s.residents.length;
  const liste: { typ: string; grund: string; dringend?: boolean }[] = [];

  if (!s.buildings.some((b) => b.status === 'aktiv' && BUILDING_BY_ID[b.type].abgabe)) {
    liste.push({ typ: 'lager', grund: 'Es fehlt eine Abgabestelle', dringend: true });
  }
  // Lagerraum wächst mit dem Dorf, nicht ins Unendliche.
  const lagerGrenze = Math.max(3, Math.ceil(belegt / 4));
  if (sim.belegung > sim.kapazitaet * 0.85 && anzahl(sim, 'lager') < lagerGrenze) {
    liste.push({ typ: 'lager', grund: 'Das Lager läuft über', dringend: true });
  }
  // 80 % Belegung ist die Regel; in kleinen Dörfern greift zusätzlich eine
  // Untergrenze von drei freien Plätzen, damit früh sichtbar gebaut wird.
  if (plaetze === 0 || belegt / Math.max(1, plaetze) >= 0.8 || plaetze - belegt < 3) {
    const nahrungOk = sim.nahrung > belegt * 4;
    if (nahrungOk) {
      const haus = BUILDING_BY_ID.haus;
      if (istFreigeschaltet(sim, haus) && bezahlbar(sim, haus) && anzahl(sim, 'huette') >= 2) {
        liste.push({ typ: 'haus', grund: 'Wohnraum wird knapp' });
      }
      liste.push({ typ: 'huette', grund: 'Wohnraum wird knapp', dringend: plaetze <= belegt });
    }
  }
  if (anzahl(sim, 'brunnen') === 0) liste.push({ typ: 'brunnen', grund: 'Das Dorf braucht Wasser' });
  // Äcker entstehen mit der Dorfgröße, nicht erst im Mangel: sonst bliebe die
  // Kette Getreide → Mehl → Brot dauerhaft ungenutzt.
  if (anzahl(sim, 'feld') < Math.ceil(belegt / 6)) {
    liste.push({
      typ: 'feld',
      grund:
        sim.nahrung < s.policy.nahrungsziel
          ? 'Die Nahrungsreserve ist zu klein'
          : 'Die Nahrung soll nicht nur aus Beeren kommen',
    });
  }
  if (anzahl(sim, 'saegewerk') === 0 && belegt >= 8) {
    liste.push({ typ: 'saegewerk', grund: 'Bretter fehlen für größere Bauten' });
  }
  // Die Kette Getreide → Mehl → Brot lohnt sich erst, wenn Getreide da ist.
  if (anzahl(sim, 'muehle') === 0 && menge(s.store, 'getreide') > 30) {
    liste.push({ typ: 'muehle', grund: 'Getreide liegt ungenutzt im Lager' });
  }
  // Ohne Backhaus bleibt die Getreidekette ein Sackgassen-Lager: Mehl ist
  // keine Nahrung. Sobald eine Mühle läuft, gehört das Backhaus dazu.
  if (anzahl(sim, 'backhaus') === 0 && anzahl(sim, 'muehle', true) > 0) {
    liste.push({ typ: 'backhaus', grund: 'Aus Mehl soll Brot werden' });
  }
  if (anzahl(sim, 'rathaus') === 0 && belegt >= 10) {
    liste.push({ typ: 'rathaus', grund: 'Das Dorf braucht eine Verwaltung' });
  }
  if (anzahl(sim, 'gelehrtenstube') === 0 && anzahl(sim, 'rathaus', true) > 0) {
    liste.push({ typ: 'gelehrtenstube', grund: 'Forschung braucht einen festen Ort' });
  }
  if (anzahl(sim, 'markt') === 0 && belegt >= 8 && sim.belegung > sim.kapazitaet * 0.6) {
    liste.push({ typ: 'markt', grund: 'Überschüsse sollen zu Münzen werden' });
  }
  return liste;
}

/** Der dringendste Bedarf, unabhängig von der Bezahlbarkeit; für die Anzeige. */
export function bauBedarf(sim: Simulation): { typ: string; grund: string; dringend?: boolean } | null {
  return bauBedarfListe(sim)[0] ?? null;
}

function bauplatzSuchen(sim: Simulation, def: BuildingDef): { x: number; y: number } | null {
  const s = sim.state;
  const art =
    def.kategorie === 'wohnen' ? 'wohnen' : def.kategorie === 'produktion' ? 'produktion' : 'produktion';
  const zonen = s.policy.zonen.filter((z) => z.art === art || z.art === 'produktion');
  const bereiche = zonen.length
    ? zonen
    : [{ x: DORFMITTE.x - 16, y: DORFMITTE.y - 16, w: 33, h: 33 }];

  let best: { x: number; y: number; wert: number } | null = null;
  for (const bereich of bereiche) {
    for (let y = bereich.y; y < bereich.y + bereich.h; y++) {
      for (let x = bereich.x; x < bereich.x + bereich.w; x++) {
        if (!sim.bauplatzPruefen(def, x, y).ok) continue;
        const lager = sim.naechsteAbgabe(x, y);
        const dLager = lager ? Math.hypot(lager.x - x, lager.y - y) : 40;
        const dMitte = Math.hypot(DORFMITTE.x - x, DORFMITTE.y - y);
        // Nachbarschaft: dicht genug fürs Dorfbild, aber nicht eingeklemmt.
        let nachbarn = 0;
        for (const b of s.buildings) {
          const dd = Math.hypot(b.x - x, b.y - y);
          if (dd < 2.5) nachbarn += 3;
          else if (dd < 5) nachbarn += 1;
        }
        const wert = -dLager * 1.5 - dMitte * 0.4 - nachbarn * 1.2;
        if (!best || wert > best.wert) best = { x, y, wert };
      }
    }
  }
  if (!best) return null;
  return { x: best.x, y: best.y };
}

export function autobau(sim: Simulation): void {
  const s = sim.state;
  if (!s.policy.autobau) return;
  if (s.buildings.filter((b) => b.status === 'baustelle').length >= 2) return;

  for (const eintrag of bauBedarfListe(sim)) {
    const def = BUILDING_BY_ID[eintrag.typ];
    if (!def) continue;
    if (!istFreigeschaltet(sim, def) && !sim.boni.freigeschaltet.has(def.id)) continue;
    if (!bezahlbar(sim, def, eintrag.dringend)) continue;
    const platz = bauplatzSuchen(sim, def);
    if (!platz) {
      if (!s.hinweise.includes('kein-bauplatz')) s.hinweise.push('kein-bauplatz');
      continue;
    }
    const b = sim.baustelleAnlegen(def.id, platz.x, platz.y, true);
    if (b) {
      sim.protokoll(`${eintrag.grund}: ${def.name} geplant.`, 'bau');
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Familien, Zuzug und Alter
// ---------------------------------------------------------------------------

/** Nahrungspuffer für zwei Spieltage. */
export function nahrungspufferZiel(sim: Simulation): number {
  return (sim.state.residents.length * 2 * TAG_SEKUNDEN) / 60;
}

function familien(sim: Simulation, dt: number): void {
  const s = sim.state;
  const rng = rngFuer(s, 'familien');

  // Kinder werden nach etwa 24 aktiven Minuten erwachsen.
  for (const r of s.residents) {
    if (r.stage === 'kind' && r.alter >= 24 * 60) {
      r.stage = 'erwachsen';
      sim.protokoll(`${r.name} ist jetzt erwachsen und kann arbeiten.`, 'familie');
    }
  }

  for (const haushalt of s.haushalte) haushalt.cooldown = Math.max(0, haushalt.cooldown - dt);

  const platzFrei = freieWohnplaetze(sim) >= 1;
  const nahrungOk = sim.nahrung >= nahrungspufferZiel(sim);
  // Frühestens nach 12 aktiven Minuten ein Kind je berechtigtem Haushalt.
  const fruehestens = s.zeit >= 12 * 60;

  if (platzFrei && nahrungOk && fruehestens) {
    for (const haushalt of s.haushalte) {
      if (haushalt.cooldown > 0) continue;
      const mitglieder = haushalt.mitglieder
        .map((id) => s.residents.find((r) => r.id === id))
        .filter((r): r is Resident => !!r && r.stage === 'erwachsen');
      if (mitglieder.length < 2) continue;
      const zufrieden = mitglieder.filter((r) => r.zufriedenheit > 65);
      if (zufrieden.length < 2) continue;
      const [a, b] = zufrieden;
      if ((a.beziehungen[b.id] ?? 0) < 30) continue;
      if (freieWohnplaetze(sim) < 1) break;

      const kind = erzeugeBewohner(s, rng, {
        stage: 'kind',
        haushalt: haushalt.id,
        x: a.x,
        y: a.y,
      });
      kind.wohnung = a.wohnung;
      haushalt.mitglieder.push(kind.id);
      haushalt.cooldown = 20 * 60;
      s.statistik.geburten++;
      sim.protokoll(`${a.name} und ${b.name} haben ein Kind: ${kind.name}.`, 'familie');
      sim.sfx('familie', a.x, a.y);
      break;
    }
  }

  // Neue Haushalte aus zufriedenen Paaren mit eigenem Wohnraum.
  for (const r of s.residents) {
    if (r.stage !== 'erwachsen' || r.zufriedenheit < 60) continue;
    const eigen = s.haushalte.find((h) => h.id === r.haushalt);
    if (eigen && eigen.mitglieder.length >= 2) continue;
    const partner = s.residents.find(
      (o) =>
        o.id !== r.id &&
        o.stage === 'erwachsen' &&
        o.haushalt !== r.haushalt &&
        (r.beziehungen[o.id] ?? 0) >= 45 &&
        (s.haushalte.find((h) => h.id === o.haushalt)?.mitglieder.length ?? 2) < 2,
    );
    if (!partner || freieWohnplaetze(sim) < 1) continue;
    const haushalt = { id: s.naechsteId++, mitglieder: [r.id, partner.id], cooldown: 5 * 60 };
    s.haushalte.push(haushalt);
    for (const h of s.haushalte) h.mitglieder = h.mitglieder.filter((id) => id !== r.id && id !== partner.id);
    haushalt.mitglieder = [r.id, partner.id];
    s.haushalte = s.haushalte.filter((h) => h.mitglieder.length > 0);
    r.haushalt = haushalt.id;
    partner.haushalt = haushalt.id;
    sim.protokoll(`${r.name} und ${partner.name} gründen einen Haushalt.`, 'familie');
    break;
  }

  // Zuzug: hilft früh gegen lange Bevölkerungslücken.
  if (
    s.residents.length < 12 &&
    freieWohnplaetze(sim) >= 1 &&
    sim.zufriedenheit > 55 &&
    sim.nahrung > s.residents.length * 6 &&
    rng.chance(0.08)
  ) {
    zuzug(sim, 1);
  }
}

export function zuzug(sim: Simulation, anzahlPersonen: number): void {
  const s = sim.state;
  const rng = rngFuer(s, 'zuzug');
  for (let i = 0; i < anzahlPersonen; i++) {
    if (freieWohnplaetze(sim) < 1) break;
    const haushalt = { id: s.naechsteId++, mitglieder: [] as number[], cooldown: 10 * 60 };
    s.haushalte.push(haushalt);
    const r = erzeugeBewohner(s, rng, {
      stage: 'erwachsen',
      haushalt: haushalt.id,
      x: DORFMITTE.x + rng.range(-2, 2),
      y: DORFMITTE.y + rng.range(-2, 2),
    });
    haushalt.mitglieder.push(r.id);
    s.statistik.zugezogen++;
    sim.protokoll(`${r.name} zieht ins Dorf.`, 'familie');
  }
}

// ---------------------------------------------------------------------------
// Forschung, Aufträge, Ereignisse
// ---------------------------------------------------------------------------

function forschungFortschritt(sim: Simulation): void {
  const s = sim.state;
  if (!s.research.aktiv) return;
  const def = RESEARCH_BY_ID[s.research.aktiv];
  if (!def) {
    s.research.aktiv = null;
    return;
  }
  const punkte = menge(s.store, 'forschung');
  if (punkte <= 0) return;
  const offen = def.kosten - s.research.fortschritt;
  const nutze = Math.min(punkte, offen);
  s.research.fortschritt += nutze;
  s.store.forschung = punkte - nutze;
  if (s.research.fortschritt + 1e-6 >= def.kosten) {
    s.research.abgeschlossen.push(def.id);
    s.research.aktiv = null;
    s.research.fortschritt = 0;
    sim.markiereBoniAlt();
    sim.sfx('forschung');
    sim.protokoll(`Forschung abgeschlossen: ${def.name}. ${def.wirkung}`, 'erfolg');
  }
}

function zielFortschritt(sim: Simulation, ziel: Ziel): { ist: number; soll: number } {
  const s = sim.state;
  switch (ziel.art) {
    case 'ressource':
      return { ist: menge(s.store, ziel.id), soll: ziel.menge };
    case 'gesamt':
      return { ist: menge(s.statistik.gewonnen, ziel.id), soll: ziel.menge };
    case 'nahrung':
      return { ist: sim.nahrung, soll: ziel.menge };
    case 'gebaeude':
      return {
        ist: s.buildings.filter((b) => b.type === ziel.typ && b.status === 'aktiv').length,
        soll: ziel.anzahl,
      };
    case 'einwohner':
      return { ist: s.residents.length, soll: ziel.anzahl };
    case 'forschung':
      return { ist: s.research.abgeschlossen.length, soll: ziel.anzahl };
    case 'beruf':
      return { ist: s.residents.filter((r) => r.beruf === ziel.beruf).length, soll: ziel.anzahl };
    case 'region':
      return { ist: s.regionen.includes(ziel.id) ? 1 : 0, soll: 1 };
    case 'zufriedenheit':
      return { ist: sim.zufriedenheit, soll: ziel.wert };
  }
}

function auftraegePruefen(sim: Simulation): void {
  const s = sim.state;
  for (const def of QUESTS) {
    let eintrag = s.quests.find((q) => q.id === def.id);
    if (!eintrag) {
      eintrag = { id: def.id, status: 'offen', fortschritt: 0 };
      s.quests.push(eintrag);
    }
    if (eintrag.status !== 'offen') continue;
    const { ist, soll } = zielFortschritt(sim, def.ziel);
    eintrag.fortschritt = Math.max(0, Math.min(1, ist / soll));
    if (ist + 1e-6 >= soll) {
      eintrag.status = 'abgeholt';
      addiere(s.statistik.gewonnen, def.belohnung);
      lagerEin(s, def.belohnung, sim.kapazitaet);
      sim.sfx('auftrag');
      sim.protokoll(`Auftrag erfüllt: ${def.name}.`, 'erfolg');
    }
  }
}

function ereignisseAblaufen(sim: Simulation): void {
  const s = sim.state;
  if (!s.events.length) return;
  let entfernt = false;
  for (const ev of s.events) ev.restzeit -= sim.dt;
  const rest = s.events.filter((ev) => ev.restzeit > 0);
  if (rest.length !== s.events.length) {
    s.events = rest;
    entfernt = true;
  }
  if (entfernt) sim.markiereBoniAlt();
}

function ereignisse(sim: Simulation): void {
  const s = sim.state;
  if (s.events.length >= 2) return;
  const rng = rngFuer(s, 'ereignisse');
  if (!rng.chance(0.06)) return;

  const moeglich = EVENTS.filter((e) => {
    if (s.events.some((x) => x.id === e.id)) return false;
    if (e.ab?.einwohner && s.residents.length < e.ab.einwohner) return false;
    if (e.ab?.region && !s.regionen.includes(e.ab.region)) return false;
    if (e.ab?.gebaeude && !s.buildings.some((b) => b.type === e.ab!.gebaeude && b.status === 'aktiv')) return false;
    return true;
  });
  if (!moeglich.length) return;

  const summe = moeglich.reduce((n, e) => n + e.gewicht, 0);
  let wurf = rng.next() * summe;
  const gewaehlt = moeglich.find((e) => (wurf -= e.gewicht) <= 0) ?? moeglich[0];

  if (gewaehlt.gabe) {
    addiere(s.statistik.gewonnen, gewaehlt.gabe);
    lagerEin(s, gewaehlt.gabe, sim.kapazitaet);
  }
  if (gewaehlt.id === 'reisende') zuzug(sim, 2);
  if (gewaehlt.dauer > 1) {
    s.events.push({ id: gewaehlt.id, restzeit: gewaehlt.dauer });
    sim.markiereBoniAlt();
  }
  sim.sfx('ereignis');
  sim.protokoll(`${gewaehlt.name}: ${gewaehlt.text}`, 'info');
}

function championsPruefen(sim: Simulation): void {
  const s = sim.state;
  for (const c of CHAMPIONS) {
    if (s.champions.includes(c.id)) continue;
    const ab = c.ab;
    if (ab.einwohner && s.residents.length < ab.einwohner) continue;
    if (ab.forschung && !s.research.abgeschlossen.includes(ab.forschung)) continue;
    if (ab.gebaeude && !s.buildings.some((b) => b.type === ab.gebaeude && b.status === 'aktiv')) continue;
    s.champions.push(c.id);
    sim.protokoll(`${c.name} (${c.rolle}) bietet dem Dorf seine Hilfe an.`, 'erfolg');
    sim.sfx('champion');
    break;
  }
}

function werkzeugVerschleiss(sim: Simulation): void {
  const s = sim.state;
  const werkzeug = menge(s.store, 'werkzeug');
  if (werkzeug <= 0) return;
  const haltbarkeit = sim.boni.ertrag.werkzeug ?? 1;
  const abnutzung = (0.05 * sim.erwachsene.length) / haltbarkeit;
  s.store.werkzeug = Math.max(0, werkzeug - abnutzung);
  addiere(s.statistik.verbraucht, { werkzeug: Math.min(werkzeug, abnutzung) });
}

// ---------------------------------------------------------------------------
// Hinweise
// ---------------------------------------------------------------------------

function hinweise(sim: Simulation): void {
  const s = sim.state;
  const neu: string[] = [];
  if (sim.nahrung < s.residents.length * 3) neu.push('hunger');
  if (sim.belegung > sim.kapazitaet * 0.95) neu.push('lager-voll');
  if (sim.wohnplaetze <= s.residents.length) neu.push('wohnraum');
  if (s.residents.some((r) => r.wegFehler > 2)) neu.push('kein-weg');
  const ohneArbeit = s.residents.filter((r) => r.stage !== 'kind' && r.status.startsWith('Findet keinen'));
  if (ohneArbeit.length >= 2) neu.push('keine-arbeit');
  if (!s.buildings.some((b) => b.status === 'aktiv' && BUILDING_BY_ID[b.type].abgabe)) neu.push('kein-lager');
  s.hinweise = neu;
}

export const HINWEIS_TEXT: Record<string, string> = {
  hunger: 'Die Nahrung wird knapp. Mehr Sammler, ein Acker oder ein Hafen helfen.',
  'lager-voll': 'Das Lager ist voll. Ein weiteres Lagerhaus oder Verkäufe am Markt schaffen Platz.',
  wohnraum: 'Es fehlt Wohnraum. Ohne freie Plätze wächst das Dorf nicht.',
  'kein-weg': 'Ein Bewohner findet keinen Weg. Prüfe Gebäude, die einen Durchgang blockieren.',
  'keine-arbeit': 'Mehrere Bewohner finden keine Arbeit. In der Nähe fehlen Rohstoffe oder Arbeitsplätze.',
  'kein-bauplatz': 'Der Autobau findet keinen freien Bauplatz in den freigegebenen Zonen.',
  'kein-lager': 'Es gibt keine Abgabestelle. Ohne Lagerhaus kann niemand etwas abliefern.',
};

/** Alle Gebäude, die der Spieler gerade bauen darf. */
export function verfuegbareGebaeude(sim: Simulation): BuildingDef[] {
  return BUILDINGS.filter((def) => istFreigeschaltet(sim, def) || sim.boni.freigeschaltet.has(def.id));
}

/** Nettobilanz der Nahrung je Minute, inklusive Verbrauch. */
export function nahrungsbilanz(sim: Simulation): number {
  let rate = 0;
  for (const id of Object.keys(RESOURCES) as ResourceId[]) {
    if (RESOURCES[id].nahrung > 0) rate += (sim.state.raten[id] ?? 0) * RESOURCES[id].nahrung;
  }
  return rate;
}

export function auftragsFortschritt(sim: Simulation, id: string) {
  const def = QUEST_BY_ID[id];
  return def ? zielFortschritt(sim, def.ziel) : { ist: 0, soll: 1 };
}

export function ereignisName(id: string): string {
  return EVENT_BY_ID[id]?.name ?? id;
}

export function gesamtNahrung(store: Store): number {
  return nahrungswert(store);
}

export function gebaeudeStatusText(sim: Simulation, b: Building): string {
  const def = BUILDING_BY_ID[b.type];
  if (b.status === 'baustelle') {
    const fehlt = sim.fehlendeMaterialien(b);
    const teile = (Object.entries(def.kosten) as [ResourceId, number][]).map(([id, n]) => {
      const da = n - (fehlt[id] ?? 0);
      return `${Math.round(da)}/${n} ${RESOURCES[id].name}`;
    });
    if (Object.keys(fehlt).length) return `Material unterwegs: ${teile.join(', ')}`;
    return `Bauarbeit: noch ${Math.max(0, Math.ceil(b.bauarbeit))} s`;
  }
  if (b.status === 'pausiert') return 'Pausiert';
  if (def.wohnplaetze) return `${b.bewohner.length}/${def.wohnplaetze} Bewohner`;
  if (def.arbeitsplaetze) {
    const rezept = def.rezept;
    const text = rezept
      ? ` · ${(Object.entries(rezept.aus) as [ResourceId, number][])
          .map(([id, n]) => `${n} ${RESOURCES[id].name}`)
          .join(', ')} je ${rezept.dauer} s`
      : '';
    return `${b.arbeiter.length}/${def.arbeitsplaetze} Arbeiter${text}`;
  }
  if (def.lager) return `Lagerkapazität +${def.lager}`;
  if (def.zufriedenheit) return `Zufriedenheit +${def.zufriedenheit} im Umkreis von ${def.reichweite}`;
  return 'Aktiv';
}
