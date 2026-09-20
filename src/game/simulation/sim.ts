import {
  SECONDS_PER_TICK,
  TICKS_PER_SECOND,
  type Building,
  type GameState,
  type LogEntry,
  type ResourceId,
  type ResourceNode,
  type Resident,
  type Store,
} from '../core/types';
import { BUILDING_BY_ID, stufenfaktor, type BuildingDef } from '../content/buildings';
import { RESOURCES, nahrungswert, lagerbelegung } from '../content/resources';
import { generateWorld, idx, nodeNachwachszeit, terrainBlockiert, TERRAIN, type World } from '../world/terrain';
import { createNavGrid, rebuildNav, begehbar, findePfad, nachbarKachel, type NavGrid } from '../world/nav';
import { berechneBoni, type Boni } from './boni';
import { addiere, gibReservierungFrei, kopiere, lagerEin, menge, verfuegbar } from './store';
import { aktualisiereBewohner } from './residents';
import { dorfSysteme } from './village';

/** Ereignis für Audio und Oberfläche; wird je Tick eingesammelt und geleert. */
export interface Cue {
  art: 'sfx' | 'meldung';
  id: string;
  /** Weltposition in Kacheln, für räumliche Dämpfung. */
  x?: number;
  y?: number;
  text?: string;
}

export class Simulation {
  state: GameState;
  world: World;
  nav: NavGrid;
  boni: Boni;
  cues: Cue[] = [];

  private navDirty = true;
  private boniDirty = true;
  /** Lagerstände beim letzten Ratenfenster, für gleitende Netto-Raten. */
  private ratenBasis: Store = {};
  private ratenTick = 0;

  constructor(state: GameState) {
    this.state = state;
    this.world = generateWorld(state.seed, state.regionen);
    this.nav = createNavGrid(this.world);
    this.boni = berechneBoni(state);
    this.rebuild();
  }

  // -- Ableitungen ---------------------------------------------------------

  /**
   * Grundkapazität ohne Gebäude. Das Start-Lagerhaus bringt die ersten 150,
   * zusammen also die im Entwurf genannten 200 Gesamtkapazität.
   */
  get kapazitaet(): number {
    return 50 + this.boni.lager;
  }

  get belegung(): number {
    return lagerbelegung(this.state.store);
  }

  get nahrung(): number {
    return nahrungswert(this.state.store);
  }

  get einwohner(): number {
    return this.state.residents.length;
  }

  get erwachsene(): Resident[] {
    return this.state.residents.filter((r) => r.stage !== 'kind');
  }

  get wohnplaetze(): number {
    let n = 0;
    for (const b of this.state.buildings) {
      if (b.status !== 'aktiv') continue;
      const def = BUILDING_BY_ID[b.type];
      if (def?.wohnplaetze) n += def.wohnplaetze;
    }
    return n;
  }

  /** Durchschnittliche Zufriedenheit der Erwachsenen. */
  get zufriedenheit(): number {
    const leute = this.erwachsene;
    if (!leute.length) return 50;
    return leute.reduce((s, r) => s + r.zufriedenheit, 0) / leute.length;
  }

  markiereNavAlt(): void {
    this.navDirty = true;
  }

  markiereBoniAlt(): void {
    this.boniDirty = true;
  }

  rebuild(): void {
    rebuildNav(this.nav, this.world, this.state.buildings, this.state.nodes);
    this.navDirty = false;
  }

  /** Baut Welt und Navigation nach einer Regionserschließung neu auf. */
  weltNeuAufbauen(): void {
    this.world = generateWorld(this.state.seed, this.state.regionen);
    this.nav = createNavGrid(this.world);
    this.rebuild();
  }

  protokoll(text: string, art: LogEntry['art'] = 'info'): void {
    this.state.log.push({ tick: this.state.tick, text, art });
    if (this.state.log.length > 120) this.state.log.splice(0, this.state.log.length - 120);
    this.cues.push({ art: 'meldung', id: art, text });
  }

  sfx(id: string, x?: number, y?: number): void {
    this.cues.push({ art: 'sfx', id, x, y });
  }

  // -- Zugriff auf Welt ----------------------------------------------------

  gebaeude(id: number): Building | undefined {
    return this.state.buildings.find((b) => b.id === id);
  }

  knoten(id: number): ResourceNode | undefined {
    return this.state.nodes.find((n) => n.id === id);
  }

  def(b: Building): BuildingDef {
    return BUILDING_BY_ID[b.type];
  }

  /** Aktive Abgabestellen; Lieferungen zählen erst hier als Vorrat. */
  abgabestellen(): Building[] {
    return this.state.buildings.filter((b) => b.status === 'aktiv' && BUILDING_BY_ID[b.type]?.abgabe);
  }

  naechsteAbgabe(x: number, y: number): Building | null {
    let best: Building | null = null;
    let bestD = Infinity;
    for (const b of this.abgabestellen()) {
      const d = (b.x - x) ** 2 + (b.y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    return best;
  }

  /** Eingangskachel eines Gebäudes; dorthin laufen Bewohner. */
  eingang(b: Building): { x: number; y: number } {
    const def = BUILDING_BY_ID[b.type];
    const ziel = { x: b.x + def.eingang.dx, y: b.y + def.eingang.dy };
    return nachbarKachel(this.nav, ziel.x, ziel.y) ?? ziel;
  }

  neueId(): number {
    return this.state.naechsteId++;
  }

  // -- Baustellen ----------------------------------------------------------

  /**
   * Prüft, ob ein Fußabdruck frei ist. Gibt den Grund zurück, damit die
   * Oberfläche nicht nur Rot, sondern auch ein Warum zeigen kann.
   */
  bauplatzPruefen(def: BuildingDef, x: number, y: number): { ok: boolean; grund: string } {
    for (let dy = 0; dy < def.h; dy++) {
      for (let dx = 0; dx < def.w; dx++) {
        const tx = x + dx;
        const ty = y + dy;
        if (tx < 0 || ty < 0 || tx >= this.world.size || ty >= this.world.size) {
          return { ok: false, grund: 'Außerhalb der Karte.' };
        }
        const t = this.world.terrain[idx(this.world.size, tx, ty)];
        if (def.ueberWasser) {
          if (t !== TERRAIN.wasser) return { ok: false, grund: 'Brücken brauchen flaches Wasser.' };
        } else if (terrainBlockiert(t)) {
          return { ok: false, grund: 'Der Untergrund trägt kein Gebäude.' };
        }
        if (this.state.buildings.some((b) => this.deckt(b, tx, ty))) {
          return { ok: false, grund: 'Hier steht bereits ein Gebäude.' };
        }
        const node = this.state.nodes.find((n) => n.amount > 0 && n.x === tx && n.y === ty);
        if (node) {
          if (node.geschuetzt) return { ok: false, grund: 'Schutzgebiet: dieser Bewuchs bleibt stehen.' };
          if (!this.state.policy.rodenErlaubt) {
            return { ok: false, grund: 'Roden ist nicht freigegeben.' };
          }
        }
      }
    }
    if (def.amWasser && !this.amWasser(def, x, y)) {
      return { ok: false, grund: 'Dieses Gebäude muss direkt am Wasser stehen.' };
    }
    const e = { x: x + def.eingang.dx, y: y + def.eingang.dy };
    if (!def.ueberWasser && !begehbar(this.nav, e.x, e.y)) {
      return { ok: false, grund: 'Der Eingang wäre nicht erreichbar.' };
    }
    return { ok: true, grund: 'Bauplatz frei.' };
  }

  private amWasser(def: BuildingDef, x: number, y: number): boolean {
    for (let dy = -1; dy <= def.h; dy++) {
      for (let dx = -1; dx <= def.w; dx++) {
        const tx = x + dx;
        const ty = y + dy;
        if (tx < 0 || ty < 0 || tx >= this.world.size || ty >= this.world.size) continue;
        const t = this.world.terrain[idx(this.world.size, tx, ty)];
        if (t === TERRAIN.wasser || t === TERRAIN.tiefwasser) return true;
      }
    }
    return false;
  }

  deckt(b: Building, x: number, y: number): boolean {
    const def = BUILDING_BY_ID[b.type];
    return x >= b.x && x < b.x + def.w && y >= b.y && y < b.y + def.h;
  }

  gebaeudeAn(x: number, y: number): Building | undefined {
    return this.state.buildings.find((b) => this.deckt(b, x, y));
  }

  /** Legt eine Baustelle an und reserviert die Kosten. */
  baustelleAnlegen(typ: string, x: number, y: number, autobau: boolean): Building | null {
    const def = BUILDING_BY_ID[typ];
    if (!def) return null;
    if (!this.bauplatzPruefen(def, x, y).ok) return null;
    const kosten = kopiere(def.kosten);
    if (!this.reserviereKosten(kosten)) return null;

    // Bewuchs auf dem Fußabdruck wird geräumt, sofern freigegeben.
    for (const node of this.state.nodes) {
      if (node.amount > 0 && !node.geschuetzt && node.x >= x && node.x < x + def.w && node.y >= y && node.y < y + def.h) {
        node.amount = 0;
        node.regrow = null;
        node.reservedBy = null;
      }
    }

    const b: Building = {
      id: this.neueId(),
      type: typ,
      x,
      y,
      stufe: 1,
      status: 'baustelle',
      geliefert: {},
      bauarbeit: def.bauarbeit * this.boni.bauzeit,
      arbeiter: [],
      bewohner: [],
      zyklus: 0,
      eingang: {},
      autobau,
    };
    this.state.buildings.push(b);
    this.markiereNavAlt();
    this.protokoll(
      autobau ? `Das Dorf plant ${def.name === 'Hütte' ? 'eine Hütte' : `ein ${def.name}`}.` : `${def.name}: Baustelle eingerichtet.`,
      'bau',
    );
    return b;
  }

  private reserviereKosten(kosten: Store): boolean {
    for (const [id, n] of Object.entries(kosten) as [ResourceId, number][]) {
      if (verfuegbar(this.state, id) < n) return false;
    }
    addiere(this.state.reserviert, kosten);
    return true;
  }

  /** Noch fehlende Baumaterialien einer Baustelle. */
  fehlendeMaterialien(b: Building): Store {
    const def = BUILDING_BY_ID[b.type];
    const out: Store = {};
    for (const [id, n] of Object.entries(def.kosten) as [ResourceId, number][]) {
      const offen = n - menge(b.geliefert, id);
      if (offen > 1e-6) out[id] = offen;
    }
    return out;
  }

  /**
   * Entfernt ein Gebäude. Gelieferte Materialien kehren ins Lager zurück,
   * offene Zusagen werden freigegeben. Nichts wird dabei vervielfacht.
   */
  abreissen(id: number): boolean {
    const i = this.state.buildings.findIndex((b) => b.id === id);
    if (i < 0) return false;
    const b = this.state.buildings[i];
    const def = BUILDING_BY_ID[b.type];

    if (b.status === 'baustelle') {
      // Noch nicht abgeholte Zusagen auflösen.
      const offen: Store = {};
      for (const [rid, n] of Object.entries(def.kosten) as [ResourceId, number][]) {
        const rest = n - menge(b.geliefert, rid);
        if (rest > 0) offen[rid] = rest;
      }
      gibReservierungFrei(this.state, offen);
      lagerEin(this.state, b.geliefert, this.kapazitaet);
    } else {
      // Rückbau bringt die Hälfte der Baustoffe zurück.
      const rueck: Store = {};
      for (const [rid, n] of Object.entries(def.kosten) as [ResourceId, number][]) rueck[rid] = n * 0.5;
      lagerEin(this.state, rueck, this.kapazitaet);
    }

    for (const r of this.state.residents) {
      if (r.arbeitsplatz === b.id) r.arbeitsplatz = null;
      if (r.wohnung === b.id) r.wohnung = null;
      if (r.task?.buildingId === b.id) {
        r.task = null;
        r.zustand = 'idle';
        r.weg = [];
      }
    }
    this.state.buildings.splice(i, 1);
    this.markiereNavAlt();
    this.markiereBoniAlt();
    this.protokoll(`${def.name} wurde abgerissen.`, 'bau');
    return true;
  }

  // -- Tick ----------------------------------------------------------------

  /** Zeitschritt des laufenden Ticks in Sekunden. */
  dt = SECONDS_PER_TICK;

  /**
   * Ein Simulationsschritt. Online wird immer mit dem festen Zeitschritt
   * gerechnet; die Offline-Nachrechnung nutzt größere Blöcke.
   */
  tick(dt: number = SECONDS_PER_TICK): void {
    const s = this.state;
    this.dt = dt;
    s.tick++;
    s.zeit += dt;

    if (this.navDirty) this.rebuild();
    if (this.boniDirty) {
      this.boni = berechneBoni(s);
      this.boniDirty = false;
    }

    this.nachwachsen();
    for (const r of s.residents) aktualisiereBewohner(this, r, dt);
    dorfSysteme(this);
    this.raten();
  }

  /** Führt mehrere Schritte aus; für Offline-Nachrechnung und Tests. */
  schritte(n: number, dt: number = SECONDS_PER_TICK): void {
    for (let i = 0; i < n; i++) this.tick(dt);
  }

  /** true, wenn in diesem Schritt eine Intervallgrenze überschritten wurde. */
  faellig(intervallSekunden: number): boolean {
    const z = this.state.zeit;
    return Math.floor(z / intervallSekunden) > Math.floor((z - this.dt) / intervallSekunden);
  }

  private nachwachsen(): void {
    // Nur ein Teil der Knoten je Tick, gleichmäßig über die Sekunde verteilt.
    const s = this.state;
    const schritte = Math.max(1, Math.round(TICKS_PER_SECOND * (SECONDS_PER_TICK / this.dt)));
    const teil = s.tick % schritte;
    for (let i = teil; i < s.nodes.length; i += schritte) {
      const node = s.nodes[i];
      if (node.amount > 0) continue;
      const zeit = nodeNachwachszeit(node.kind);
      if (zeit === null) continue;
      node.regrow = (node.regrow ?? 0) + this.dt * schritte * this.boni.nachwachsen;
      if (node.regrow >= zeit) {
        // Nachwachsen braucht freien Boden.
        if (this.gebaeudeAn(node.x, node.y)) {
          node.regrow = zeit * 0.9;
          continue;
        }
        node.amount = node.kind === 'beerenstrauch' ? 8 : node.kind === 'kraut' ? 5 : 14;
        node.regrow = null;
        if (node.kind === 'fels') this.markiereNavAlt();
      }
    }
  }

  /** Gleitende Netto-Raten je Minute, inklusive Verbrauch. */
  private raten(): void {
    const s = this.state;
    const sekunden = s.zeit - this.ratenTick;
    if (sekunden < 5) return;
    this.ratenTick = s.zeit;
    for (const id of Object.keys(RESOURCES) as ResourceId[]) {
      const jetzt = menge(s.store, id);
      const vorher = this.ratenBasis[id] ?? jetzt;
      const rate = ((jetzt - vorher) / sekunden) * 60;
      // Glättung, damit einzelne Lieferungen die Anzeige nicht springen lassen.
      s.raten[id] = (s.raten[id] ?? 0) * 0.6 + rate * 0.4;
      this.ratenBasis[id] = jetzt;
    }
  }

  /** Wirkungsradius-Bonus eines Gebäudetyps an einer Position. */
  zufriedenheitAn(x: number, y: number): number {
    let bonus = 0;
    for (const b of this.state.buildings) {
      if (b.status !== 'aktiv') continue;
      const def = BUILDING_BY_ID[b.type];
      if (!def.zufriedenheit || !def.reichweite) continue;
      const d = Math.hypot(b.x - x, b.y - y);
      if (d <= def.reichweite) bonus += def.zufriedenheit * stufenfaktor(def, b.stufe);
    }
    return bonus;
  }

  /**
   * Plant einen Weg und legt ihn im Bewohner ab.
   *
   * Positionen liegen auf Kachelmitten (x.5), deshalb wird die Standkachel mit
   * `floor` bestimmt. Mit `round` läge der Start eine Kachel weiter und könnte
   * im gesperrten Gebiet liegen – dort findet die Suche dann nie einen Weg.
   */
  wegPlanen(r: Resident, zx: number, zy: number): boolean {
    const ziel = nachbarKachel(this.nav, Math.floor(zx), Math.floor(zy));
    if (!ziel) {
      r.wegFehler++;
      return false;
    }
    const pfad = findePfad(this.nav, Math.floor(r.x), Math.floor(r.y), ziel.x, ziel.y);
    if (!pfad) {
      r.wegFehler++;
      return false;
    }
    r.weg = pfad;
    r.wegFehler = 0;
    return true;
  }
}

/** Kurzer, konkreter Statustext für das Bewohnerpanel. */
export function statusText(sim: Simulation, r: Resident): string {
  const t = r.task;
  if (!t) return r.status || 'Sucht eine Aufgabe';
  const ware = (store: Store) =>
    (Object.entries(store) as [ResourceId, number][])
      .filter(([, n]) => n > 0.01)
      .map(([id, n]) => `${Math.round(n)} ${RESOURCES[id].name}`)
      .join(' und ');

  switch (t.kind) {
    case 'sammeln': {
      if (t.phase === 'hin') return `Geht zum Arbeitsplatz: ${t.text}`;
      if (t.phase === 'arbeit') return t.text;
      return `Bringt ${ware(r.inventar) || 'die Ernte'} zum Lager`;
    }
    case 'produzieren': {
      const b = t.buildingId ? sim.gebaeude(t.buildingId) : undefined;
      const name = b ? BUILDING_BY_ID[b.type].name : 'Werkstatt';
      if (t.phase === 'hol') return `Holt Material für ${name}`;
      if (t.phase === 'hin') return `Geht zur Arbeit: ${name}`;
      if (t.phase === 'arbeit') return `Arbeitet im ${name}`;
      return `Bringt ${ware(r.inventar) || 'die Arbeit'} zum Lager`;
    }
    case 'bauen': {
      const b = t.buildingId ? sim.gebaeude(t.buildingId) : undefined;
      const name = b ? BUILDING_BY_ID[b.type].name : 'Baustelle';
      if (t.phase === 'hol') return `Holt Baumaterial für ${name}`;
      if (t.phase === 'hin') return `Bringt ${ware(r.inventar)} zur Baustelle`;
      return `Baut am ${name}`;
    }
    case 'essen':
      return t.phase === 'arbeit' ? 'Isst eine Mahlzeit' : 'Geht essen';
    case 'ruhen':
      return t.phase === 'arbeit' ? 'Schläft zu Hause' : 'Geht nach Hause';
    case 'geselligkeit':
      return t.phase === 'arbeit' ? 'Unterhält sich' : 'Trifft sich mit anderen';
    default:
      return 'Schlendert durchs Dorf';
  }
}
