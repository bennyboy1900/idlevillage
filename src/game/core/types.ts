/** Gemeinsame Typen der Simulation. Der gesamte Zustand ist JSON-serialisierbar. */

export const SAVE_VERSION = 3;

/** Simulationsschritte pro Sekunde. Fester Zeitschritt, unabhängig von der Bildrate. */
export const TICKS_PER_SECOND = 10;
export const SECONDS_PER_TICK = 1 / TICKS_PER_SECOND;

/** Kantenlänge einer Kachel in Pixeln der Originalgrafiken. */
export const TILE = 16;

export type ResourceId =
  | 'holz'
  | 'stein'
  | 'bretter'
  | 'erz'
  | 'barren'
  | 'getreide'
  | 'mehl'
  | 'wolle'
  | 'stoff'
  | 'kraeuter'
  | 'trank'
  | 'werkzeug'
  | 'kristall'
  | 'beeren'
  | 'brot'
  | 'fisch'
  | 'eier'
  | 'fleisch'
  | 'muenzen'
  | 'forschung'
  | 'ansehen';

export type Store = Partial<Record<ResourceId, number>>;

export type TerrainId =
  | 'wasser'
  | 'tiefwasser'
  | 'ufer'
  | 'wiese'
  | 'grasnarbe'
  | 'trockengras'
  | 'schnee'
  | 'fels';

export type NodeKind = 'baum' | 'nadelbaum' | 'totholz' | 'winterbaum' | 'palme' | 'kaktus' | 'fels' | 'erzfels' | 'kristallfels' | 'beerenstrauch' | 'kraut';

/** Ein abbaubares Weltobjekt. */
export interface ResourceNode {
  id: number;
  kind: NodeKind;
  x: number;
  y: number;
  /** Verbleibende Einheiten; 0 bedeutet abgeerntet. */
  amount: number;
  /** Nachwachsen: Fortschritt in Sekunden, null wenn nicht nachwachsend. */
  regrow: number | null;
  /** Grafikvariante innerhalb des Sheets. */
  variant: number;
  /** Bewohner-ID mit Anspruch auf diesen Knoten. */
  reservedBy: number | null;
  /** Geschützte Knoten werden vom Autobau nie geräumt. */
  geschuetzt: boolean;
}

export type BuildingId = string;

export type BuildingStatus = 'baustelle' | 'aktiv' | 'pausiert';

export interface Building {
  id: number;
  type: BuildingId;
  /** Linke obere Kachel des Fußabdrucks. */
  x: number;
  y: number;
  stufe: number;
  status: BuildingStatus;
  /** Bereits gelieferte Baumaterialien. */
  geliefert: Store;
  /** Verbleibende reine Bauarbeit in Sekunden. */
  bauarbeit: number;
  /** Bewohner-IDs, die hier arbeiten. */
  arbeiter: number[];
  /** Bewohner-IDs, die hier wohnen. */
  bewohner: number[];
  /** Fortschritt des laufenden Produktionszyklus in Sekunden. */
  zyklus: number;
  /** Puffer für Eingangsgüter eines laufenden Zyklus. */
  eingang: Store;
  /** Vom Dorf selbst geplant (Autobau) statt vom Spieler gesetzt. */
  autobau: boolean;
}

export type LifeStage = 'kind' | 'erwachsen' | 'aeltester';

export type JobId =
  | 'traeger'
  | 'holzfaeller'
  | 'steinmetz'
  | 'bauer'
  | 'fischer'
  | 'bergmann'
  | 'handwerker'
  | 'haendler'
  | 'gelehrter'
  | 'hirte'
  | 'kraeutlerin'
  | 'wache'
  | 'baumeister';

export type ResidentStateId =
  | 'idle'
  | 'chooseTask'
  | 'walk'
  | 'gather'
  | 'carry'
  | 'deposit'
  | 'build'
  | 'craft'
  | 'eat'
  | 'rest'
  | 'socialize'
  | 'flee';

export type TraitId =
  | 'fleissig'
  | 'gesellig'
  | 'genuegsam'
  | 'neugierig'
  | 'naturverbunden'
  | 'sorgfaeltig';

export type TaskKind =
  | 'sammeln'
  | 'bauen'
  | 'produzieren'
  | 'essen'
  | 'ruhen'
  | 'geselligkeit'
  | 'bummeln';

export interface Task {
  kind: TaskKind;
  /** Zielknoten beim Sammeln. */
  nodeId?: number;
  /** Zielgebäude beim Bauen, Produzieren, Ruhen. */
  buildingId?: number;
  /** Geplante Zielkachel. */
  tx: number;
  ty: number;
  /** Phase innerhalb der Aufgabe. */
  phase: 'hol' | 'hin' | 'arbeit' | 'rueck' | 'abgabe';
  /** Verbleibende Arbeitszeit der aktuellen Phase in Sekunden. */
  arbeit: number;
  /** Menschenlesbare Beschreibung für das Bewohnerpanel. */
  text: string;
}

export interface Resident {
  id: number;
  name: string;
  stage: LifeStage;
  /** Alter in Simulationssekunden. */
  alter: number;
  haushalt: number;
  /** Gebäude-ID der Wohnung, null bei Obdachlosigkeit. */
  wohnung: number | null;
  /** Gebäude-ID des Arbeitsplatzes. */
  arbeitsplatz: number | null;
  beruf: JobId;
  /** Vom Spieler festgelegter Beruf wird nicht automatisch geändert. */
  berufFixiert: boolean;
  faehigkeiten: Partial<Record<JobId, number>>;
  traits: TraitId[];
  energie: number;
  saettigung: number;
  zufriedenheit: number;
  /** Beziehungswerte zu anderen Bewohnern. */
  beziehungen: Record<number, number>;
  x: number;
  y: number;
  zustand: ResidentStateId;
  richtung: 'down' | 'up' | 'left' | 'right';
  task: Task | null;
  /** Getragene Güter. */
  inventar: Store;
  /** Restliche Sperrzeit gegen hektischen Aufgabenwechsel in Sekunden. */
  haltezeit: number;
  /** Aktueller Weg als Kachelliste, rückwärts abgearbeitet. */
  weg: number[];
  /** Fehlgeschlagene Wegplanungen hintereinander. */
  wegFehler: number;
  /** Sekunden, die der Bewohner schon nicht vom Fleck kommt. */
  steckt: number;
  favorit: boolean;
  /** Letzte Statusmeldung für das Panel. */
  status: string;
}

export interface Household {
  id: number;
  mitglieder: number[];
  /** Simulationssekunden bis zur nächsten möglichen Geburt. */
  cooldown: number;
}

export type StrategyId = 'ausgewogen' | 'wachstum' | 'vorraete' | 'handwerk';

export interface Policy {
  strategie: StrategyId;
  /** Anteil frei verfügbarer Baustoffe für den Autobau (0..1). */
  bauanteil: number;
  /** Holz, das der Autobau nie antastet. */
  holzreserve: number;
  /** Angestrebter Nahrungspuffer in Nahrungswerten. */
  nahrungsziel: number;
  autobau: boolean;
  /** Freigegebene Bauzonen als Rechtecke in Kacheln. */
  zonen: Zone[];
  /** Baumfällen nur in freigegebenen Gebieten. */
  rodenErlaubt: boolean;
}

export interface Zone {
  id: number;
  art: 'wohnen' | 'produktion' | 'landwirtschaft' | 'schutz';
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ResearchState {
  abgeschlossen: string[];
  /** Laufendes Projekt. */
  aktiv: string | null;
  /** Investierte Forschungspunkte im laufenden Projekt. */
  fortschritt: number;
}

export interface QuestState {
  id: string;
  status: 'offen' | 'erfuellt' | 'abgeholt';
  fortschritt: number;
}

export interface WorldEvent {
  id: string;
  /** Verbleibende Dauer in Simulationssekunden. */
  restzeit: number;
  daten?: Record<string, number>;
}

export interface LogEntry {
  tick: number;
  text: string;
  art: 'info' | 'bau' | 'familie' | 'warnung' | 'erfolg';
}

export interface Snapshot {
  tick: number;
  /** Nettorate je Ressource pro Minute, gleitend. */
  raten: Store;
}

export interface GameState {
  version: number;
  seed: number;
  dorfname: string;
  modus: 'friedlich' | 'abenteuer';
  /** Anzahl ausgeführter Simulationsschritte. */
  tick: number;
  /** Vergangene Simulationszeit in Sekunden. */
  zeit: number;
  /** Wandzeit-Stempel des letzten Speicherns, für Offline-Nachrechnung. */
  gespeichertAm: number;

  weltgroesse: number;
  /** Freigeschaltete Regions-IDs. */
  regionen: string[];

  store: Store;
  /** Für Baustellen und Rezepte bereits zugesagte Güter. */
  reserviert: Store;

  residents: Resident[];
  haushalte: Household[];
  buildings: Building[];
  nodes: ResourceNode[];

  policy: Policy;
  research: ResearchState;
  quests: QuestState[];
  events: WorldEvent[];
  champions: string[];
  /** Höchstens drei aktive Berater. */
  beraterAktiv: string[];

  log: LogEntry[];
  /** Zähler für stabile IDs. */
  naechsteId: number;
  /** Statistik für Berichte und Abnahmekriterien. */
  statistik: {
    gewonnen: Store;
    verbraucht: Store;
    verbaut: Store;
    /** Bei vollem Lager nicht angenommene Güter. */
    verworfen: Store;
    haeuserGebaut: number;
    geburten: number;
    zugezogen: number;
  };
  /** Gleitende Raten, nur Anzeige. */
  raten: Store;
  /** Engpassmeldungen für das HUD. */
  hinweise: string[];
}
