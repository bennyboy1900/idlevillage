import { SECONDS_PER_TICK, TICKS_PER_SECOND, type GameState } from '../game/core/types';
import { Simulation, type Cue } from '../game/simulation/sim';
import { fuehreBefehlAus, type Befehl, type BefehlErgebnis } from '../game/simulation/commands';
import { offlineNachrechnen, type OfflineBericht } from '../game/simulation/offline';
import { AudioMixer } from '../game/audio/audio';
import {
  TabFuehrung,
  ladeEinstellungen,
  speichereEinstellungen,
  speichern,
  type Einstellungen,
  type Slot,
} from '../game/persistence/save';

export type Tempo = 0 | 1 | 2 | 3;

export interface Meldung {
  id: number;
  text: string;
  art: 'info' | 'bau' | 'familie' | 'warnung' | 'erfolg' | 'fehler';
}

/**
 * Bindeglied zwischen Simulation, Renderer, Audio und Oberfläche.
 * Die Simulation läuft mit festem Zeitschritt; das Bild interpoliert über
 * requestAnimationFrame, und React bekommt nur gedrosselte Schnappschüsse.
 */
export class Spielcontroller {
  sim: Simulation;
  mixer: AudioMixer;
  einstellungen: Einstellungen;
  slot: Slot;
  tempo: Tempo = 1;
  meldungen: Meldung[] = [];
  /** Wächst bei jeder für die Oberfläche relevanten Änderung. */
  version = 0;
  offlineBericht: OfflineBericht | null = null;
  darfSpeichern = true;

  private raf = 0;
  private letzteZeit = 0;
  private akku = 0;
  private letzterSpeicher = 0;
  private fuehrung: TabFuehrung;
  private zuhoerer = new Set<() => void>();
  private meldungsId = 1;
  private fpsFenster: number[] = [];
  fps = 0;
  /** Simulationsschritte in der letzten Sekunde, für die Leistungsanzeige. */
  schritteProSekunde = 0;
  private schrittZaehler = 0;
  private schrittFenster = 0;

  constructor(state: GameState, slot: Slot) {
    this.sim = new Simulation(state);
    this.slot = slot;
    this.einstellungen = ladeEinstellungen();
    this.mixer = new AudioMixer(this.einstellungen);
    this.fuehrung = new TabFuehrung((fuehrend) => {
      this.darfSpeichern = fuehrend;
      if (!fuehrend) {
        this.melde('Ein anderer Tab führt dieses Spiel. Hier wird nicht gespeichert.', 'warnung');
      }
      this.benachrichtige();
    });
    void this.fuehrung.start();
  }

  // -- Abonnement für React -----------------------------------------------

  abonniere = (cb: () => void): (() => void) => {
    this.zuhoerer.add(cb);
    return () => this.zuhoerer.delete(cb);
  };

  schnappschuss = (): number => this.version;

  private benachrichtige() {
    this.version++;
    for (const cb of this.zuhoerer) cb();
  }

  melde(text: string, art: Meldung['art'] = 'info') {
    const id = this.meldungsId++;
    this.meldungen.push({ id, text, art });
    // Höchstens drei gleichzeitig, und sie räumen sich selbst wieder ab.
    while (this.meldungen.length > 3) this.meldungen.shift();
    window.setTimeout(() => this.verwerfeMeldung(id), art === 'fehler' ? 7000 : 4500);
    this.benachrichtige();
  }

  verwerfeMeldung(id: number) {
    this.meldungen = this.meldungen.filter((m) => m.id !== id);
    this.benachrichtige();
  }

  // -- Schleife ------------------------------------------------------------

  start() {
    this.letzteZeit = performance.now();
    const schleife = (jetzt: number) => {
      this.raf = requestAnimationFrame(schleife);
      const delta = Math.min(0.25, (jetzt - this.letzteZeit) / 1000);
      this.letzteZeit = jetzt;

      this.fpsFenster.push(delta);
      if (this.fpsFenster.length > 30) this.fpsFenster.shift();
      const mittel = this.fpsFenster.reduce((a, b) => a + b, 0) / this.fpsFenster.length;
      this.fps = mittel > 0 ? Math.round(1 / mittel) : 0;

      if (this.tempo > 0) {
        this.akku += delta * this.tempo;
        // Höchstens ein halbes Sekundenbudget je Bild nachholen.
        let schritte = 0;
        while (this.akku >= SECONDS_PER_TICK && schritte < TICKS_PER_SECOND * 3) {
          this.sim.tick();
          this.akku -= SECONDS_PER_TICK;
          schritte++;
          this.schrittZaehler++;
        }
        if (this.akku > SECONDS_PER_TICK * 20) this.akku = 0;
        this.verarbeiteCues();
      }

      this.schrittFenster += delta;
      if (this.schrittFenster >= 1) {
        this.schritteProSekunde = Math.round(this.schrittZaehler / this.schrittFenster);
        this.schrittZaehler = 0;
        this.schrittFenster = 0;
      }

      // Oberfläche mit etwa 5 Hz auffrischen statt bei jedem Bild.
      if (jetzt - this.letzterUiStand > 200) {
        this.letzterUiStand = jetzt;
        this.benachrichtige();
      }
      // Autosave alle 30 Sekunden.
      if (jetzt - this.letzterSpeicher > 30000) {
        this.letzterSpeicher = jetzt;
        void this.speichereJetzt();
      }
    };
    this.raf = requestAnimationFrame(schleife);
  }

  private letzterUiStand = 0;

  stop() {
    cancelAnimationFrame(this.raf);
    this.fuehrung.stop();
  }

  private verarbeiteCues() {
    const cues: Cue[] = this.sim.cues;
    for (const cue of cues) {
      if (cue.art === 'sfx') this.mixer.spiele(cue.id, cue.x, cue.y);
      else if (cue.text && (cue.id === 'erfolg' || cue.id === 'warnung' || cue.id === 'familie')) {
        this.melde(cue.text, cue.id as Meldung['art']);
      }
    }
    cues.length = 0;
  }

  // -- Befehle -------------------------------------------------------------

  befehl(befehl: Befehl): BefehlErgebnis {
    const ergebnis = fuehreBefehlAus(this.sim, befehl);
    this.mixer.spiele(ergebnis.ok ? 'klick' : 'fehler');
    if (!ergebnis.ok) this.melde(ergebnis.meldung, 'fehler');
    this.benachrichtige();
    return ergebnis;
  }

  setzeTempo(tempo: Tempo) {
    this.tempo = tempo;
    this.benachrichtige();
  }

  setzeEinstellungen(werte: Partial<Einstellungen>) {
    this.einstellungen = { ...this.einstellungen, ...werte };
    speichereEinstellungen(this.einstellungen);
    this.mixer.aktualisiereLautstaerke(this.einstellungen);
    this.benachrichtige();
  }

  // -- Speichern -----------------------------------------------------------

  async speichereJetzt(): Promise<boolean> {
    if (!this.darfSpeichern) return false;
    try {
      await speichern(this.slot, this.sim.state);
      return true;
    } catch (fehler) {
      this.melde(
        `Speichern fehlgeschlagen: ${fehler instanceof Error ? fehler.message : 'unbekannter Fehler'}`,
        'warnung',
      );
      return false;
    }
  }

  /** Rechnet die Abwesenheit nach; wird einmal direkt nach dem Laden gerufen. */
  rechneOffline(gespeichertAm: number) {
    const stunden = this.sim.boni.offlineStunden;
    const bericht = offlineNachrechnen(this.sim, Date.now() - gespeichertAm, stunden);
    if (bericht.sekunden > 60) {
      this.offlineBericht = bericht;
      this.benachrichtige();
    }
  }

  schliesseBericht() {
    this.offlineBericht = null;
    this.benachrichtige();
  }
}
