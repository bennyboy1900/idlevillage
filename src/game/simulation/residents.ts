import type { Simulation } from './sim';
import {
  type Building,
  type JobId,
  type NodeKind,
  type ResourceId,
  type ResourceNode,
  type Resident,
  type Store,
  type Task,
} from '../core/types';
import { BUILDING_BY_ID, stufenfaktor, type Rezept } from '../content/buildings';
import { FOOD_IDS, RESOURCES, nahrungswert } from '../content/resources';
import { arbeitstempo } from './boni';
import {
  addiere,
  entnimmReserviert,
  gibReservierungFrei,
  istLeer,
  lagerEin,
  menge,
  reserviere,
  verfuegbar,
} from './store';

/** Grundgeschwindigkeit in Kacheln je Sekunde. */
const TEMPO = 2.2;

/** Arbeitszeit je Einheit und gewonnene Ressource für jede Knotenart. */
const KNOTEN_ARBEIT: Record<NodeKind, { sekunden: number; gibt: ResourceId }> = {
  baum: { sekunden: 3, gibt: 'holz' },
  nadelbaum: { sekunden: 3.4, gibt: 'holz' },
  winterbaum: { sekunden: 3.4, gibt: 'holz' },
  palme: { sekunden: 3, gibt: 'holz' },
  totholz: { sekunden: 2.5, gibt: 'holz' },
  kaktus: { sekunden: 4, gibt: 'kraeuter' },
  fels: { sekunden: 5, gibt: 'stein' },
  erzfels: { sekunden: 7, gibt: 'erz' },
  kristallfels: { sekunden: 12, gibt: 'kristall' },
  beerenstrauch: { sekunden: 2.5, gibt: 'beeren' },
  kraut: { sekunden: 3, gibt: 'kraeuter' },
};

/** Welche Knoten ein Beruf bearbeitet, wenn kein Gebäude zugewiesen ist. */
const BERUF_KNOTEN: Partial<Record<JobId, NodeKind[]>> = {
  holzfaeller: ['baum', 'nadelbaum', 'winterbaum', 'palme', 'totholz'],
  steinmetz: ['fels'],
  bergmann: ['erzfels', 'kristallfels'],
  bauer: ['beerenstrauch'],
  kraeutlerin: ['kraut', 'kaktus'],
  hirte: ['beerenstrauch'],
  traeger: ['beerenstrauch', 'baum'],
  fischer: ['beerenstrauch'],
};

const KNOTEN_TEXT: Record<NodeKind, string> = {
  baum: 'Fällt einen Baum',
  nadelbaum: 'Fällt eine Kiefer',
  winterbaum: 'Fällt einen Winterbaum',
  palme: 'Schlägt eine Palme',
  totholz: 'Sammelt Totholz',
  kaktus: 'Erntet einen Kaktus',
  fels: 'Bricht Stein',
  erzfels: 'Schlägt Erz aus dem Fels',
  kristallfels: 'Löst einen Kristall',
  beerenstrauch: 'Pflückt Beeren',
  kraut: 'Sammelt Kräuter',
};

export function tragkraft(sim: Simulation, r: Resident): number {
  return sim.boni.tragen + (r.traits.includes('sorgfaeltig') ? 1 : 0);
}

function getragen(store: Store): number {
  let n = 0;
  for (const wert of Object.values(store)) n += wert ?? 0;
  return n;
}

function tempoVon(sim: Simulation, r: Resident): number {
  return arbeitstempo(
    sim.boni,
    r.beruf,
    r.faehigkeiten[r.beruf] ?? 0,
    r.energie,
    r.traits.includes('fleissig'),
  );
}

function lerne(sim: Simulation, r: Resident, dt: number): void {
  const faktor = sim.boni.lernen * (r.traits.includes('neugierig') ? 1.25 : 1);
  const jetzt = r.faehigkeiten[r.beruf] ?? 0;
  r.faehigkeiten[r.beruf] = Math.min(100, jetzt + 0.12 * dt * faktor);
}

// ---------------------------------------------------------------------------
// Bewegung
// ---------------------------------------------------------------------------

type Schritt = 'laeuft' | 'angekommen' | 'blockiert';

function bewege(sim: Simulation, r: Resident, dt: number): Schritt {
  if (!r.weg.length) return 'angekommen';
  const size = sim.world.size;
  const ziel = r.weg[r.weg.length - 1];
  const tx = (ziel % size) + 0.5;
  const ty = ((ziel / size) | 0) + 0.5;

  // Der Weg kann durch neue Gebäude ungültig geworden sein.
  if (sim.nav.blockiert[ziel]) {
    r.weg = [];
    return 'blockiert';
  }

  const dx = tx - r.x;
  const dy = ty - r.y;
  const dist = Math.hypot(dx, dy);
  const schritt = TEMPO * sim.boni.gehen * dt;

  if (Math.abs(dx) > Math.abs(dy)) r.richtung = dx > 0 ? 'right' : 'left';
  else if (Math.abs(dy) > 1e-6) r.richtung = dy > 0 ? 'down' : 'up';

  if (dist <= schritt) {
    r.x = tx;
    r.y = ty;
    r.weg.pop();
    return r.weg.length ? 'laeuft' : 'angekommen';
  }
  r.x += (dx / dist) * schritt;
  r.y += (dy / dist) * schritt;
  return 'laeuft';
}

/** Setzt ein Laufziel; bei Misserfolg wird die Aufgabe abgebrochen. */
function laufeZu(sim: Simulation, r: Resident, x: number, y: number): boolean {
  if (Math.floor(r.x) === Math.floor(x) && Math.floor(r.y) === Math.floor(y)) {
    r.weg = [];
    return true;
  }
  return sim.wegPlanen(r, x, y);
}

// ---------------------------------------------------------------------------
// Aufgabenwahl
// ---------------------------------------------------------------------------

function neueAufgabe(kind: Task['kind'], tx: number, ty: number, text: string): Task {
  return { kind, tx, ty, phase: 'hin', arbeit: 0, text };
}

/**
 * Obergrenze, ab der das Dorf eine Ware nicht weiter anhäuft.
 *
 * Sie liegt bewusst über dem Bau- und dem Nachwuchsbedarf: läge sie darunter,
 * könnte sich ein Dorf seine nächsten Gebäude oder Kinder nie leisten. Der
 * Markt benutzt dieselbe Grenze, damit nie weggekauft wird, was gebraucht wird.
 * Für Nahrungsmittel ist der Wert ein Nahrungswert, sonst eine Stückzahl.
 */
export function sammelObergrenze(sim: Simulation, id: ResourceId): number {
  const def = RESOURCES[id];
  if (!def.lagert) return Infinity;
  if (def.nahrung > 0) {
    return Math.max(sim.state.policy.nahrungsziel * 1.5, sim.state.residents.length * 10);
  }
  // Keine einzelne Ware darf das Lager dominieren, und der Vorrat wächst nicht
  // mit jedem neuen Lagerhaus endlos weiter.
  return Math.min(sim.kapazitaet * 0.35, 250);
}

/**
 * Lohnt sich das Sammeln dieser Ware gerade? Ohne diese Prüfung füllen
 * Sammler das Lager mit einer einzigen Ware und blockieren alles andere.
 */
export function lohntSichSammeln(sim: Simulation, id: ResourceId): boolean {
  const def = RESOURCES[id];
  if (!def.lagert) return true;
  const bestand = menge(sim.state.store, id);
  // Ist das Lager fast voll, kommt nur noch dazu, was wirklich knapp ist.
  if (sim.belegung >= sim.kapazitaet * 0.95) return bestand < sim.kapazitaet * 0.1;
  if (def.nahrung > 0) return sim.nahrung < sammelObergrenze(sim, id);
  return bestand < sammelObergrenze(sim, id);
}

/** Produziert ein Gebäude gerade etwas, das im Lager gebraucht wird? */
export function lohntSichProduktion(sim: Simulation, rezept: Rezept): boolean {
  const ausgaben = Object.keys(rezept.aus) as ResourceId[];
  return ausgaben.some((id) => lohntSichSammeln(sim, id));
}

function freierKnoten(sim: Simulation, r: Resident, arten: NodeKind[]): ResourceNode | null {
  let best: ResourceNode | null = null;
  let bestWert = -Infinity;
  const erlaubt = arten.filter((a) => lohntSichSammeln(sim, KNOTEN_ARBEIT[a].gibt));
  if (!erlaubt.length) return null;
  for (const node of sim.state.nodes) {
    if (node.amount <= 0) continue;
    if (node.reservedBy !== null && node.reservedBy !== r.id) continue;
    if (node.geschuetzt) continue;
    if (!erlaubt.includes(node.kind)) continue;
    const d = Math.hypot(node.x - r.x, node.y - r.y);
    if (d > 45) continue;
    // Nähe zählt am stärksten, damit keine sinnlosen Märsche entstehen.
    const wert = -d + (node.amount > 6 ? 3 : 0);
    if (wert > bestWert) {
      bestWert = wert;
      best = node;
    }
  }
  return best;
}

/** Summe der bereits unterwegs befindlichen Baumaterialien einer Baustelle. */
function unterwegs(sim: Simulation, b: Building): Store {
  const out: Store = {};
  for (const r of sim.state.residents) {
    if (r.task?.kind === 'bauen' && r.task.buildingId === b.id) addiere(out, r.inventar);
  }
  return out;
}

function offeneLieferung(sim: Simulation, b: Building): Store {
  const fehlt = sim.fehlendeMaterialien(b);
  const weg = unterwegs(sim, b);
  const out: Store = {};
  for (const [id, n] of Object.entries(fehlt) as [ResourceId, number][]) {
    const rest = n - menge(weg, id);
    if (rest > 1e-6) out[id] = Math.min(rest, menge(sim.state.store, id));
  }
  return out;
}

function baustelleFuer(sim: Simulation, r: Resident): Building | null {
  let best: Building | null = null;
  let bestD = Infinity;
  for (const b of sim.state.buildings) {
    if (b.status !== 'baustelle') continue;
    const helfer = sim.state.residents.filter((x) => x.task?.kind === 'bauen' && x.task.buildingId === b.id).length;
    if (helfer >= 3) continue;
    const braucht = !istLeer(offeneLieferung(sim, b)) || b.bauarbeit > 0;
    if (!braucht) continue;
    const d = Math.hypot(b.x - r.x, b.y - r.y);
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best;
}

/** Was der Markt gerade verkaufen kann: echte Überschüsse, keine Fantasieerlöse. */
export function marktRezept(sim: Simulation, b: Building): Rezept | null {
  const s = sim.state;
  let bestId: ResourceId | null = null;
  let bestWert = 0;
  for (const id of Object.keys(RESOURCES) as ResourceId[]) {
    const def = RESOURCES[id];
    if (!def.lagert || def.wert <= 0) continue;
    // Verkauft wird nur, was das Dorf selbst als Überschuss ansieht: die
    // Schwelle, ab der seine Sammler die Ware nicht mehr heranschaffen.
    // So verkauft der Markt nie die Baustoffe weg, die gerade gebraucht werden.
    let reserve = sammelObergrenze(sim, id) * 0.8;
    if (def.nahrung > 0) {
      if (sim.nahrung <= sammelObergrenze(sim, id) * 0.9) continue;
      reserve = 0;
    }
    if (id === 'holz') reserve = Math.max(reserve, s.policy.holzreserve);
    const ueberschuss = verfuegbar(s, id) - reserve;
    if (ueberschuss < 5) continue;
    const wert = ueberschuss * def.wert;
    if (wert > bestWert) {
      bestWert = wert;
      bestId = id;
    }
  }
  if (!bestId) return null;
  const def = BUILDING_BY_ID[b.type];
  const anzahl = Math.min(5, Math.floor(Math.max(0, verfuegbar(s, bestId) - sammelObergrenze(sim, bestId) * 0.8) || verfuegbar(s, bestId) / 4));
  if (anzahl < 1) return null;
  // Der Markt zahlt bewusst nur den Warenwert: Münzen sollen ein knappes
  // Mittel bleiben und keine zweite, unsichtbare Produktionsquelle werden.
  const erloes = Math.round(anzahl * RESOURCES[bestId].wert * sim.boni.handel * stufenfaktor(def, b.stufe));
  return { ein: { [bestId]: anzahl } as Store, aus: { muenzen: erloes }, dauer: 18 };
}

function rezeptFuer(sim: Simulation, b: Building): Rezept | null {
  const def = BUILDING_BY_ID[b.type];
  if (def.id === 'markt') return marktRezept(sim, b);
  return def.rezept ?? null;
}

function waehleAufgabe(sim: Simulation, r: Resident): void {
  const s = sim.state;

  // 1. Grundbedürfnisse gehen vor.
  if (r.saettigung < 50 && nahrungswert(s.store) > 0.5) {
    const lager = sim.naechsteAbgabe(r.x, r.y);
    if (lager) {
      const e = sim.eingang(lager);
      const t = neueAufgabe('essen', e.x, e.y, 'Geht essen');
      t.buildingId = lager.id;
      r.task = t;
      r.haltezeit = 8;
      return;
    }
  }
  if (r.energie < 22) {
    const heim = r.wohnung ? sim.gebaeude(r.wohnung) : null;
    const ziel = heim ?? sim.naechsteAbgabe(r.x, r.y);
    if (ziel) {
      const e = sim.eingang(ziel);
      const t = neueAufgabe('ruhen', e.x, e.y, 'Geht nach Hause');
      t.buildingId = ziel.id;
      r.task = t;
      r.haltezeit = 10;
      return;
    }
  }
  const geselligkeitsschwelle = r.traits.includes('gesellig') ? 55 : 42;
  if (r.zufriedenheit < geselligkeitsschwelle) {
    const treff = s.buildings.find(
      (b) => b.status === 'aktiv' && ['brunnen', 'taverne', 'markt'].includes(b.type),
    );
    if (treff) {
      const e = sim.eingang(treff);
      const t = neueAufgabe('geselligkeit', e.x, e.y, 'Trifft sich mit anderen');
      t.buildingId = treff.id;
      r.task = t;
      r.haltezeit = 12;
      return;
    }
  }

  // 2. Baustellen: Baumeister zuerst, sonst wer gerade frei ist.
  if (r.beruf === 'baumeister' || !r.arbeitsplatz) {
    const site = baustelleFuer(sim, r);
    if (site) {
      const t = neueAufgabe('bauen', site.x, site.y, 'Arbeitet an einer Baustelle');
      t.buildingId = site.id;
      t.phase = istLeer(offeneLieferung(sim, site)) ? 'arbeit' : 'hol';
      r.task = t;
      r.haltezeit = 6;
      return;
    }
  }

  // 3. Fester Arbeitsplatz.
  if (r.arbeitsplatz) {
    const b = sim.gebaeude(r.arbeitsplatz);
    if (b && b.status === 'aktiv') {
      const rezept = rezeptFuer(sim, b);
      if (rezept && !lohntSichProduktion(sim, rezept)) {
        r.status = `${BUILDING_BY_ID[b.type].name}: das Lager ist gefüllt`;
      } else if (rezept) {
        const braucht = !istLeer(rezept.ein);
        if (!braucht || reserviere(s, rezept.ein)) {
          const e = sim.eingang(b);
          const t = neueAufgabe('produzieren', e.x, e.y, BUILDING_BY_ID[b.type].name);
          t.buildingId = b.id;
          t.phase = braucht ? 'hol' : 'hin';
          t.arbeit = rezept.dauer;
          r.task = t;
          r.haltezeit = 5;
          r.status = '';
          return;
        }
        r.status = `Wartet auf Material für ${BUILDING_BY_ID[b.type].name}`;
      } else if (b.type === 'markt') {
        r.status = 'Kein Überschuss zu verkaufen';
      }
    } else if (!b) {
      r.arbeitsplatz = null;
    }
  }

  // 4. Rohstoffe sammeln.
  const arten = BERUF_KNOTEN[r.beruf];
  if (arten) {
    const node = freierKnoten(sim, r, arten);
    if (node) {
      node.reservedBy = r.id;
      const t = neueAufgabe('sammeln', node.x, node.y, KNOTEN_TEXT[node.kind]);
      t.nodeId = node.id;
      t.arbeit = KNOTEN_ARBEIT[node.kind].sekunden;
      r.task = t;
      r.haltezeit = 6;
      r.status = '';
      return;
    }
    const genug = arten.every((a) => !lohntSichSammeln(sim, KNOTEN_ARBEIT[a].gibt));
    r.status = genug
      ? 'Das Dorf hat genug davon im Lager'
      : `Findet keinen freien ${KNOTEN_TEXT[arten[0]].split(' ').pop() ?? 'Rohstoff'} in der Nähe`;
  }

  // 5. Notfalls Beeren sammeln, damit niemand untätig verhungert.
  const notnahrung = freierKnoten(sim, r, ['beerenstrauch']);
  if (notnahrung && sim.nahrung < s.policy.nahrungsziel) {
    notnahrung.reservedBy = r.id;
    const t = neueAufgabe('sammeln', notnahrung.x, notnahrung.y, KNOTEN_TEXT.beerenstrauch);
    t.nodeId = notnahrung.id;
    t.arbeit = KNOTEN_ARBEIT.beerenstrauch.sekunden;
    r.task = t;
    r.haltezeit = 6;
    return;
  }

  // 6. Bummeln: ein kurzer Gang durchs Dorf statt Stillstand.
  const zx = Math.round(r.x) + ((sim.state.tick + r.id) % 9) - 4;
  const zy = Math.round(r.y) + ((sim.state.tick * 7 + r.id) % 9) - 4;
  const t = neueAufgabe('bummeln', zx, zy, 'Schlendert durchs Dorf');
  r.task = t;
  r.haltezeit = 6;
}

// ---------------------------------------------------------------------------
// Aufgabenausführung
// ---------------------------------------------------------------------------

function beendeAufgabe(sim: Simulation, r: Resident): void {
  if (r.task?.nodeId != null) {
    const node = sim.knoten(r.task.nodeId);
    if (node && node.reservedBy === r.id) node.reservedBy = null;
  }
  r.task = null;
  r.weg = [];
  r.zustand = 'idle';
}

/** Bricht ab und gibt alle Ansprüche frei; auch beim Laden und Berufswechsel. */
export function brichAufgabeAb(sim: Simulation, r: Resident): void {
  const t = r.task;
  if (t?.kind === 'produzieren' && t.phase === 'hol' && t.buildingId) {
    const b = sim.gebaeude(t.buildingId);
    const rezept = b ? rezeptFuer(sim, b) : null;
    if (rezept) gibReservierungFrei(sim.state, rezept.ein);
  }
  beendeAufgabe(sim, r);
}

/**
 * Wählt eine erreichbare Abgabestelle und plant den Weg dorthin.
 *
 * Es reicht nicht, die nächstgelegene zu nehmen: liegt sie hinter neuen
 * Gebäuden, scheitert die Wegplanung immer wieder an derselben Stelle und der
 * Bewohner kommt nie an. Deshalb werden die nächsten Kandidaten der Reihe nach
 * probiert, bis ein Weg steht.
 */
function laufeZurAbgabe(sim: Simulation, r: Resident, t: Task): Building | null {
  const kandidaten = sim
    .abgabestellen()
    .map((b) => ({ b, d: (b.x - r.x) ** 2 + (b.y - r.y) ** 2 }))
    .sort((a, c) => a.d - c.d)
    .slice(0, 4);
  for (const { b } of kandidaten) {
    const e = sim.eingang(b);
    if (Math.floor(r.x) === e.x && Math.floor(r.y) === e.y) {
      r.weg = [];
      r.wegFehler = 0;
      t.tx = e.x;
      t.ty = e.y;
      return b;
    }
    if (sim.wegPlanen(r, e.x, e.y)) {
      t.tx = e.x;
      t.ty = e.y;
      t.buildingId = t.kind === 'essen' ? b.id : t.buildingId;
      return b;
    }
  }
  return null;
}

function liefereAb(sim: Simulation, r: Resident): void {
  const { angenommen, verworfen } = lagerEin(sim.state, r.inventar, sim.kapazitaet);
  if (!istLeer(angenommen)) sim.sfx('lieferung', r.x, r.y);
  if (!istLeer(verworfen)) {
    r.status = 'Das Lager ist voll';
    if (!sim.state.hinweise.includes('lager-voll')) sim.state.hinweise.push('lager-voll');
  }
  r.inventar = {};
}

function fuehreAus(sim: Simulation, r: Resident, dt: number): void {
  const t = r.task!;
  const tempo = tempoVon(sim, r);

  switch (t.kind) {
    // -- Sammeln ----------------------------------------------------------
    case 'sammeln': {
      const node = t.nodeId != null ? sim.knoten(t.nodeId) : undefined;
      if (!node || (node.amount <= 0 && t.phase !== 'rueck' && t.phase !== 'abgabe')) {
        if (getragen(r.inventar) > 0) {
          t.phase = 'rueck';
        } else {
          beendeAufgabe(sim, r);
          return;
        }
      }
      if (t.phase === 'hin') {
        r.zustand = 'walk';
        if (!r.weg.length && !laufeZu(sim, r, t.tx, t.ty)) {
          if (r.wegFehler > 2) {
            r.status = 'Findet keinen Weg zum Arbeitsplatz';
            beendeAufgabe(sim, r);
          }
          return;
        }
        if (bewege(sim, r, dt) === 'angekommen') t.phase = 'arbeit';
        return;
      }
      if (t.phase === 'arbeit') {
        r.zustand = 'gather';
        t.arbeit -= dt * tempo;
        lerne(sim, r, dt);
        if (t.arbeit > 0) return;
        const info = KNOTEN_ARBEIT[node!.kind];
        const ertrag = sim.boni.ertrag[info.gibt] ?? 1;
        node!.amount -= 1;
        const gewonnen = 1 * ertrag;
        r.inventar[info.gibt] = menge(r.inventar, info.gibt) + gewonnen;
        addiere(sim.state.statistik.gewonnen, { [info.gibt]: gewonnen } as Store);
        sim.sfx(info.gibt === 'holz' ? 'holz' : 'stein', r.x, r.y);
        if (node!.amount <= 0) {
          node!.reservedBy = null;
          if (node!.kind === 'fels') sim.markiereNavAlt();
        }
        if (getragen(r.inventar) >= tragkraft(sim, r) || node!.amount <= 0) {
          t.phase = 'rueck';
        } else {
          t.arbeit = info.sekunden;
        }
        return;
      }
      if (t.phase === 'rueck') {
        r.zustand = 'carry';
        if (!r.weg.length && !laufeZurAbgabe(sim, r, t)) {
          r.status = 'Kein Lager erreichbar';
          if (r.wegFehler > 2) beendeAufgabe(sim, r);
          return;
        }
        if (bewege(sim, r, dt) === 'angekommen') {
          liefereAb(sim, r);
          beendeAufgabe(sim, r);
        }
        return;
      }
      beendeAufgabe(sim, r);
      return;
    }

    // -- Produzieren -------------------------------------------------------
    case 'produzieren': {
      const b = t.buildingId != null ? sim.gebaeude(t.buildingId) : undefined;
      if (!b || b.status !== 'aktiv') {
        brichAufgabeAb(sim, r);
        return;
      }
      const def = BUILDING_BY_ID[b.type];
      if (t.phase === 'hol') {
        r.zustand = 'walk';
        const rezept = rezeptFuer(sim, b);
        if (!rezept) {
          brichAufgabeAb(sim, r);
          return;
        }
        if (!r.weg.length && !laufeZurAbgabe(sim, r, t)) {
          if (r.wegFehler > 2) brichAufgabeAb(sim, r);
          return;
        }
        if (bewege(sim, r, dt) === 'angekommen') {
          addiere(r.inventar, entnimmReserviert(sim.state, rezept.ein));
          t.phase = 'hin';
          const ziel = sim.eingang(b);
          t.tx = ziel.x;
          t.ty = ziel.y;
          r.weg = [];
        }
        return;
      }
      if (t.phase === 'hin') {
        r.zustand = 'walk';
        if (!r.weg.length && !laufeZu(sim, r, t.tx, t.ty)) {
          if (r.wegFehler > 2) brichAufgabeAb(sim, r);
          return;
        }
        if (bewege(sim, r, dt) === 'angekommen') {
          addiere(b.eingang, r.inventar);
          r.inventar = {};
          t.phase = 'arbeit';
        }
        return;
      }
      if (t.phase === 'arbeit') {
        r.zustand = def.rezept || b.type === 'markt' ? 'craft' : 'gather';
        t.arbeit -= dt * tempo;
        b.zyklus = t.arbeit;
        lerne(sim, r, dt);
        if (t.arbeit > 0) return;

        const rezept = b.type === 'markt' ? marktRezept(sim, b) : def.rezept;
        if (!rezept) {
          beendeAufgabe(sim, r);
          return;
        }
        // Eingangsgüter verbrauchen: sie liegen physisch im Gebäude.
        for (const [id, n] of Object.entries(rezept.ein) as [ResourceId, number][]) {
          const da = menge(b.eingang, id);
          if (da + 1e-6 < n) {
            // Material ist verschwunden: Zyklus sauber abbrechen.
            beendeAufgabe(sim, r);
            return;
          }
          b.eingang[id] = da - n;
          addiere(sim.state.statistik.verbraucht, { [id]: n } as Store);
        }
        const faktor = stufenfaktor(def, b.stufe);
        for (const [id, n] of Object.entries(rezept.aus) as [ResourceId, number][]) {
          const ertrag = n * faktor * (sim.boni.ertrag[id] ?? 1);
          r.inventar[id] = menge(r.inventar, id) + ertrag;
          addiere(sim.state.statistik.gewonnen, { [id]: ertrag } as Store);
        }
        sim.sfx(b.type === 'markt' ? 'handel' : 'werkstatt', r.x, r.y);
        t.phase = 'rueck';
        r.weg = [];
        return;
      }
      if (t.phase === 'rueck') {
        r.zustand = 'carry';
        if (!r.weg.length && !laufeZurAbgabe(sim, r, t)) {
          if (r.wegFehler > 2) beendeAufgabe(sim, r);
          return;
        }
        if (bewege(sim, r, dt) === 'angekommen') {
          liefereAb(sim, r);
          beendeAufgabe(sim, r);
        }
        return;
      }
      beendeAufgabe(sim, r);
      return;
    }

    // -- Bauen -------------------------------------------------------------
    case 'bauen': {
      const b = t.buildingId != null ? sim.gebaeude(t.buildingId) : undefined;
      if (!b || b.status !== 'baustelle') {
        if (getragen(r.inventar) > 0) {
          t.kind = 'sammeln';
          t.phase = 'rueck';
          return;
        }
        beendeAufgabe(sim, r);
        return;
      }
      if (t.phase === 'hol') {
        r.zustand = 'walk';
        if (!r.weg.length && !laufeZurAbgabe(sim, r, t)) {
          if (r.wegFehler > 2) beendeAufgabe(sim, r);
          return;
        }
        if (bewege(sim, r, dt) === 'angekommen') {
          const offen = offeneLieferung(sim, b);
          const nehmen: Store = {};
          let platz = tragkraft(sim, r);
          for (const [id, n] of Object.entries(offen) as [ResourceId, number][]) {
            if (platz <= 0) break;
            const wieviel = Math.min(n, platz);
            if (wieviel > 1e-6) {
              nehmen[id] = wieviel;
              platz -= wieviel;
            }
          }
          if (istLeer(nehmen)) {
            // Nichts abzuholen: entweder bauen oder Aufgabe beenden.
            t.phase = istLeer(sim.fehlendeMaterialien(b)) ? 'arbeit' : 'hin';
            if (t.phase === 'hin') {
              beendeAufgabe(sim, r);
              return;
            }
          } else {
            addiere(r.inventar, entnimmReserviert(sim.state, nehmen));
            t.phase = 'hin';
          }
          const ziel = sim.eingang(b);
          t.tx = ziel.x;
          t.ty = ziel.y;
          r.weg = [];
        }
        return;
      }
      if (t.phase === 'hin') {
        r.zustand = 'carry';
        if (!r.weg.length && !laufeZu(sim, r, t.tx, t.ty)) {
          if (r.wegFehler > 2) beendeAufgabe(sim, r);
          return;
        }
        if (bewege(sim, r, dt) === 'angekommen') {
          addiere(b.geliefert, r.inventar);
          addiere(sim.state.statistik.verbaut, r.inventar);
          r.inventar = {};
          sim.sfx('lieferung', r.x, r.y);
          t.phase = istLeer(offeneLieferung(sim, b)) ? 'arbeit' : 'hol';
        }
        return;
      }
      if (t.phase === 'arbeit') {
        if (!istLeer(sim.fehlendeMaterialien(b))) {
          t.phase = 'hol';
          r.weg = [];
          return;
        }
        r.zustand = 'build';
        b.bauarbeit -= dt * tempo;
        lerne(sim, r, dt);
        if (b.bauarbeit <= 0) {
          fertigstellen(sim, b);
          beendeAufgabe(sim, r);
        }
        return;
      }
      beendeAufgabe(sim, r);
      return;
    }

    // -- Bedürfnisse -------------------------------------------------------
    case 'essen': {
      if (t.phase === 'hin') {
        r.zustand = 'walk';
        if (!r.weg.length && !laufeZurAbgabe(sim, r, t)) {
          r.status = 'Kommt nicht zum Vorratslager';
          if (r.wegFehler > 2) beendeAufgabe(sim, r);
          return;
        }
        if (bewege(sim, r, dt) === 'angekommen') {
          t.phase = 'arbeit';
          t.arbeit = 2.5;
        }
        return;
      }
      r.zustand = 'eat';
      if (getragen(r.inventar) > 0) liefereAb(sim, r);
      t.arbeit -= dt;
      if (t.arbeit > 0) return;
      const bedarf = ((100 - r.saettigung) / 60) * sim.boni.nahrungsbedarf;
      const gegessen = issVomLager(sim, bedarf);
      r.saettigung = Math.min(100, r.saettigung + gegessen * 60);
      if (gegessen <= 1e-6) {
        r.status = 'Findet nichts zu essen';
        if (!sim.state.hinweise.includes('hunger')) sim.state.hinweise.push('hunger');
      }
      beendeAufgabe(sim, r);
      return;
    }
    case 'ruhen': {
      if (t.phase === 'hin') {
        r.zustand = 'walk';
        if (!r.weg.length && !laufeZu(sim, r, t.tx, t.ty)) {
          if (r.wegFehler > 2) beendeAufgabe(sim, r);
          return;
        }
        if (bewege(sim, r, dt) === 'angekommen') {
          t.phase = 'arbeit';
          sim.sfx('tuer', r.x, r.y);
        }
        return;
      }
      r.zustand = 'rest';
      r.energie = Math.min(100, r.energie + 9 * dt);
      if (r.energie >= 96) {
        sim.sfx('tuer-zu', r.x, r.y);
        beendeAufgabe(sim, r);
      }
      return;
    }
    case 'geselligkeit': {
      if (t.phase === 'hin') {
        r.zustand = 'walk';
        if (!r.weg.length && !laufeZu(sim, r, t.tx, t.ty)) {
          if (r.wegFehler > 2) beendeAufgabe(sim, r);
          return;
        }
        if (bewege(sim, r, dt) === 'angekommen') {
          t.phase = 'arbeit';
          t.arbeit = 8;
        }
        return;
      }
      r.zustand = 'socialize';
      t.arbeit -= dt;
      r.zufriedenheit = Math.min(100, r.zufriedenheit + 1.2 * dt);
      if (t.arbeit <= 0) {
        knuepfeBeziehungen(sim, r);
        beendeAufgabe(sim, r);
      }
      return;
    }
    default: {
      r.zustand = 'walk';
      if (!r.weg.length && !laufeZu(sim, r, t.tx, t.ty)) {
        beendeAufgabe(sim, r);
        return;
      }
      if (bewege(sim, r, dt) === 'angekommen') beendeAufgabe(sim, r);
    }
  }
}

/**
 * Sicherheitsnetz gegen Feststecken: Wer mehrfach hintereinander keinen Weg
 * findet oder auf einer inzwischen bebauten Kachel steht, wird auf das nächste
 * freie Feld gesetzt. Ohne das könnte ein Bewohner dauerhaft in einer Mauer
 * stehen, wenn ein Gebäude seinen letzten Durchgang schließt.
 */
function befreieWennEingeschlossen(sim: Simulation, r: Resident, dt: number): void {
  const tx = Math.floor(r.x);
  const ty = Math.floor(r.y);
  const steht = tx >= 0 && ty >= 0 && tx < sim.nav.size && ty < sim.nav.size;
  const blockiert = !steht || sim.nav.blockiert[ty * sim.nav.size + tx] === 1;

  if (!blockiert && r.wegFehler <= 4) {
    r.steckt = 0;
    return;
  }
  // Kurz durch eine frisch bebaute Kachel zu laufen ist kein Feststecken.
  // Erst wer mehrere Sekunden nicht weiterkommt, wird umgesetzt.
  r.steckt += dt;
  if (r.steckt < 3) return;
  r.steckt = 0;

  const ziel = freiesFeldNahe(sim, tx, ty);
  if (ziel) {
    r.x = ziel.x + 0.5;
    r.y = ziel.y + 0.5;
    r.status = 'Musste einen neuen Weg suchen';
  }
  r.weg = [];
  r.wegFehler = 0;
  if (r.task) beendeAufgabe(sim, r);
}

function freiesFeldNahe(sim: Simulation, x: number, y: number): { x: number; y: number } | null {
  for (let radius = 0; radius <= 6; radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (radius > 0 && Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= sim.nav.size || ny >= sim.nav.size) continue;
        if (sim.nav.blockiert[ny * sim.nav.size + nx] === 0) return { x: nx, y: ny };
      }
    }
  }
  return null;
}

/** Nimmt Nahrungswerte aus dem Lager, Verderbliches zuerst. */
function issVomLager(sim: Simulation, bedarf: number): number {
  let offen = bedarf;
  let gegessen = 0;
  for (const id of FOOD_IDS) {
    if (offen <= 1e-6) break;
    const wert = RESOURCES[id].nahrung;
    const da = menge(sim.state.store, id);
    if (da <= 0) continue;
    const einheiten = Math.min(da, offen / wert);
    sim.state.store[id] = da - einheiten;
    addiere(sim.state.statistik.verbraucht, { [id]: einheiten } as Store);
    gegessen += einheiten * wert;
    offen -= einheiten * wert;
  }
  return gegessen;
}

function knuepfeBeziehungen(sim: Simulation, r: Resident): void {
  for (const andere of sim.state.residents) {
    if (andere.id === r.id || andere.stage === 'kind') continue;
    if (Math.hypot(andere.x - r.x, andere.y - r.y) > 3) continue;
    const zuwachs = r.traits.includes('gesellig') ? 4 : 2;
    r.beziehungen[andere.id] = Math.min(100, (r.beziehungen[andere.id] ?? 0) + zuwachs);
    andere.beziehungen[r.id] = Math.min(100, (andere.beziehungen[r.id] ?? 0) + zuwachs);
  }
}

export function fertigstellen(sim: Simulation, b: Building): void {
  const def = BUILDING_BY_ID[b.type];
  b.status = 'aktiv';
  b.bauarbeit = 0;
  sim.markiereNavAlt();
  sim.markiereBoniAlt();
  sim.sfx('bau-fertig', b.x, b.y);
  sim.protokoll(`${def.name} fertiggestellt.`, 'erfolg');
  if (def.wohnplaetze) sim.state.statistik.haeuserGebaut++;
}

// ---------------------------------------------------------------------------
// Bedürfnisse und Einstieg
// ---------------------------------------------------------------------------

function bedarf(sim: Simulation, r: Resident, dt: number): void {
  const genuegsam = r.traits.includes('genuegsam') ? 0.88 : 1;
  r.saettigung = Math.max(0, r.saettigung - dt * 1.0 * sim.boni.nahrungsbedarf * genuegsam);
  const arbeitet = r.zustand !== 'rest' && r.zustand !== 'idle';
  r.energie = Math.max(0, r.energie - dt * (arbeitet ? 0.35 : 0.18));

  let ziel = 50 + sim.boni.zufriedenheit;
  if (r.wohnung) {
    const heim = sim.gebaeude(r.wohnung);
    if (heim) ziel += BUILDING_BY_ID[heim.type].wohnqualitaet ?? 0;
  } else {
    ziel -= 18;
  }
  ziel += sim.zufriedenheitAn(r.x, r.y) * 0.6;
  // Gegessen wird ab 45; die Strafe setzt erst darunter ein, sonst stünde das
  // Dorf dauerhaft im Malus, obwohl die Versorgung funktioniert.
  if (r.saettigung < 12) ziel -= 30;
  else if (r.saettigung < 25) ziel -= 10;
  if (r.traits.includes('naturverbunden') && r.zustand === 'gather') ziel += 6;
  r.zufriedenheit += (Math.max(0, Math.min(100, ziel)) - r.zufriedenheit) * 0.05 * dt;
  r.zufriedenheit = Math.max(0, Math.min(100, r.zufriedenheit));
}

export function aktualisiereBewohner(sim: Simulation, r: Resident, dt: number): void {
  r.alter += dt;
  bedarf(sim, r, dt);
  befreieWennEingeschlossen(sim, r, dt);

  if (r.stage === 'kind') {
    // Kinder arbeiten nicht: sie bleiben in der Nähe ihres Zuhauses.
    r.zustand = r.weg.length ? 'walk' : 'idle';
    r.haltezeit -= dt;
    if (r.haltezeit <= 0) {
      const heim = r.wohnung ? sim.gebaeude(r.wohnung) : null;
      const cx = heim ? heim.x : Math.round(r.x);
      const cy = heim ? heim.y : Math.round(r.y);
      sim.wegPlanen(r, cx + ((r.id + sim.state.tick) % 5) - 2, cy + ((r.id * 3 + sim.state.tick) % 5) - 2);
      r.haltezeit = 6;
    }
    bewege(sim, r, dt);
    return;
  }

  r.haltezeit = Math.max(0, r.haltezeit - dt);

  // Wird der Hunger dringend, darf eine laufende Aufgabe unterbrochen werden.
  // Sonst hungern Bewohner mitten in einem langen Sammel- und Tragezyklus vor
  // sich hin, obwohl das Lager voll ist.
  if (
    r.saettigung < 22 &&
    r.task &&
    r.task.kind !== 'essen' &&
    r.task.kind !== 'ruhen' &&
    nahrungswert(sim.state.store) > 0.5
  ) {
    brichAufgabeAb(sim, r);
    r.haltezeit = 0;
  }

  if (!r.task) {
    waehleAufgabe(sim, r);
    return;
  }
  fuehreAus(sim, r, dt);
}

export { KNOTEN_ARBEIT, BERUF_KNOTEN };
