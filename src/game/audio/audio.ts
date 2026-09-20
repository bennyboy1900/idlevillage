import type { Einstellungen } from '../persistence/save';

/**
 * Audio-Cues des Spiels.
 *
 * Für Holzfällen, Steinklopfen, Werkstattarbeit, Forschung und Oberfläche gibt
 * es in `sfx/` keine passenden Dateien. Diese Cues werden deshalb als kurze
 * Web-Audio-Töne erzeugt und sind unten ausdrücklich als `prozedural`
 * gekennzeichnet. Kampfgeräusche werden nicht als Dorfarbeit zweckentfremdet.
 */
export interface CueDef {
  id: string;
  /** Dateien aus sfx/, zufällig ohne unmittelbare Wiederholung. */
  dateien?: string[];
  /** Prozedurale Alternative: Grundton, Dauer, Klangform. */
  prozedural?: { frequenz: number; dauer: number; art: OscillatorType; gain: number; gleiten?: number };
  kategorie: 'effekte' | 'atmosphaere';
  /** Mindestabstand zwischen zwei Abspielungen in Sekunden. */
  cooldown: number;
  lautstaerke: number;
  /** Räumlich gedämpft oder global. */
  raeumlich: boolean;
  hinweis: string;
}

const sfx = (name: string) => `/assets/audio/sfx/${name}`;

export const CUES: CueDef[] = [
  {
    id: 'lieferung',
    dateien: [sfx('03-crate-open-1.wav'), sfx('03-crate-open-2.wav'), sfx('03-crate-open-3.wav')],
    kategorie: 'effekte',
    cooldown: 0.45,
    lautstaerke: 0.5,
    raeumlich: true,
    hinweis: 'Warenlieferung am Lager; begrenzt, damit es kein Geräuschteppich wird.',
  },
  {
    id: 'auftrag',
    dateien: [sfx('01-chest-open-1.wav'), sfx('01-chest-open-2.wav'), sfx('01-chest-open-3.wav'), sfx('01-chest-open-4.wav')],
    kategorie: 'effekte',
    cooldown: 1,
    lautstaerke: 0.6,
    raeumlich: false,
    hinweis: 'Erfüllter Auftrag und geöffnete Belohnungstruhe.',
  },
  {
    id: 'handel',
    dateien: [sfx('04-sack-open-1.wav'), sfx('04-sack-open-2.wav'), sfx('04-sack-open-3.wav')],
    kategorie: 'effekte',
    cooldown: 2,
    lautstaerke: 0.4,
    raeumlich: true,
    hinweis: 'Verkauf am Markt; bewusst selten.',
  },
  {
    id: 'tuer',
    dateien: [sfx('05-door-open-1.mp3'), sfx('05-door-open-2.mp3')],
    kategorie: 'effekte',
    cooldown: 1.2,
    lautstaerke: 0.35,
    raeumlich: true,
    hinweis: 'Sichtbarer Hauseintritt in Kameranähe.',
  },
  {
    id: 'tuer-zu',
    dateien: [sfx('06-door-close-1.mp3'), sfx('06-door-close-2.mp3')],
    kategorie: 'effekte',
    cooldown: 1.2,
    lautstaerke: 0.3,
    raeumlich: true,
    hinweis: 'Zugehöriges Türschließen.',
  },
  { id: 'holz', prozedural: { frequenz: 210, dauer: 0.09, art: 'triangle', gain: 0.5, gleiten: 120 }, kategorie: 'effekte', cooldown: 0.5, lautstaerke: 0.3, raeumlich: true, hinweis: 'prozedural: kurzer Axtschlag; keine passende Datei vorhanden.' },
  { id: 'stein', prozedural: { frequenz: 320, dauer: 0.07, art: 'square', gain: 0.35, gleiten: 180 }, kategorie: 'effekte', cooldown: 0.6, lautstaerke: 0.25, raeumlich: true, hinweis: 'prozedural: Meißelschlag; keine passende Datei vorhanden.' },
  { id: 'werkstatt', prozedural: { frequenz: 520, dauer: 0.08, art: 'sawtooth', gain: 0.25, gleiten: 380 }, kategorie: 'effekte', cooldown: 0.9, lautstaerke: 0.22, raeumlich: true, hinweis: 'prozedural: Werkbankgeräusch.' },
  { id: 'bau-fertig', prozedural: { frequenz: 440, dauer: 0.35, art: 'triangle', gain: 0.5, gleiten: 660 }, kategorie: 'effekte', cooldown: 0.4, lautstaerke: 0.45, raeumlich: true, hinweis: 'prozedural: Bauabschluss als kleiner Aufwärtsklang.' },
  { id: 'forschung', prozedural: { frequenz: 660, dauer: 0.4, art: 'sine', gain: 0.45, gleiten: 990 }, kategorie: 'effekte', cooldown: 0.5, lautstaerke: 0.4, raeumlich: false, hinweis: 'prozedural: Forschung abgeschlossen.' },
  { id: 'familie', prozedural: { frequenz: 520, dauer: 0.5, art: 'sine', gain: 0.4, gleiten: 780 }, kategorie: 'effekte', cooldown: 1, lautstaerke: 0.4, raeumlich: true, hinweis: 'prozedural: Nachwuchs im Dorf.' },
  { id: 'ereignis', prozedural: { frequenz: 330, dauer: 0.3, art: 'triangle', gain: 0.4, gleiten: 495 }, kategorie: 'effekte', cooldown: 1, lautstaerke: 0.35, raeumlich: false, hinweis: 'prozedural: neues Ereignis.' },
  { id: 'champion', prozedural: { frequenz: 294, dauer: 0.6, art: 'triangle', gain: 0.45, gleiten: 588 }, kategorie: 'effekte', cooldown: 1, lautstaerke: 0.45, raeumlich: false, hinweis: 'prozedural: ein Champion bietet Hilfe an.' },
  { id: 'klick', prozedural: { frequenz: 880, dauer: 0.045, art: 'sine', gain: 0.3 }, kategorie: 'effekte', cooldown: 0.05, lautstaerke: 0.2, raeumlich: false, hinweis: 'prozedural: dezenter Oberflächenklick.' },
  { id: 'fehler', prozedural: { frequenz: 220, dauer: 0.16, art: 'square', gain: 0.25, gleiten: 150 }, kategorie: 'effekte', cooldown: 0.2, lautstaerke: 0.25, raeumlich: false, hinweis: 'prozedural: abgelehnte Aktion.' },
];

export const CUE_BY_ID = Object.fromEntries(CUES.map((c) => [c.id, c]));

export const MUSIK = {
  dorf: {
    url: '/assets/audio/music/Goblins-Den-Regular.wav',
    name: 'Goblins’ Den',
    hinweis:
      'Ruhiger Erkundungstrack. Die Eignung als Dorfhintergrund ist Geschmackssache, deshalb ist Dorfmusik standardmäßig leise und abschaltbar.',
  },
  expedition: {
    url: '/assets/audio/music/Goblins-Dance-Battle.wav',
    name: 'Goblins’ Dance',
    hinweis: 'Kampf- und Expeditionsmusik.',
  },
} as const;

/** Höchstzahl gleichzeitig hörbarer Effekte. */
const MAX_STIMMEN = 12;

export class AudioMixer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private kanal: Record<'musik' | 'effekte' | 'atmosphaere', GainNode | null> = {
    musik: null,
    effekte: null,
    atmosphaere: null,
  };
  private puffer = new Map<string, AudioBuffer>();
  private laden = new Map<string, Promise<AudioBuffer | null>>();
  private letzteDatei = new Map<string, string>();
  private letzteZeit = new Map<string, number>();
  private stimmen = 0;
  private musikQuelle: AudioBufferSourceNode | null = null;
  private musikGain: GainNode | null = null;
  private aktuelleMusik: string | null = null;
  einstellungen: Einstellungen;
  /** Kamerablickpunkt in Weltkacheln, für räumliche Dämpfung. */
  hoererX = 0;
  hoererY = 0;
  /** Sichtradius in Kacheln; darüber hinaus wird nichts mehr abgespielt. */
  hoerweite = 26;

  constructor(einstellungen: Einstellungen) {
    this.einstellungen = einstellungen;
  }

  get bereit(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  /** Audio darf erst nach einer echten Nutzerinteraktion starten. */
  async freischalten(): Promise<void> {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      for (const name of ['musik', 'effekte', 'atmosphaere'] as const) {
        const g = this.ctx.createGain();
        g.connect(this.master);
        this.kanal[name] = g;
      }
      this.aktualisiereLautstaerke();
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  aktualisiereLautstaerke(werte: Einstellungen = this.einstellungen): void {
    this.einstellungen = werte;
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(werte.master, t, 0.05);
    this.kanal.musik?.gain.setTargetAtTime(werte.musik, t, 0.05);
    this.kanal.effekte?.gain.setTargetAtTime(werte.effekte, t, 0.05);
    this.kanal.atmosphaere?.gain.setTargetAtTime(werte.atmosphaere, t, 0.05);
  }

  /** Bei verstecktem Tab schweigt das Spiel. */
  async sichtbarkeit(sichtbar: boolean): Promise<void> {
    if (!this.ctx) return;
    if (sichtbar) await this.ctx.resume();
    else await this.ctx.suspend();
  }

  private async hole(url: string): Promise<AudioBuffer | null> {
    if (this.puffer.has(url)) return this.puffer.get(url)!;
    if (this.laden.has(url)) return this.laden.get(url)!;
    const p = (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const daten = await res.arrayBuffer();
        const buffer = await this.ctx!.decodeAudioData(daten);
        this.puffer.set(url, buffer);
        return buffer;
      } catch {
        return null;
      } finally {
        this.laden.delete(url);
      }
    })();
    this.laden.set(url, p);
    return p;
  }

  /** Spielt einen Cue, sofern Kanal, Cooldown, Stimmenzahl und Abstand passen. */
  spiele(id: string, x?: number, y?: number): void {
    const def = CUE_BY_ID[id];
    if (!def || !this.ctx || !this.master || this.ctx.state !== 'running') return;
    const jetzt = this.ctx.currentTime;
    if (jetzt - (this.letzteZeit.get(id) ?? -99) < def.cooldown) return;
    if (this.stimmen >= MAX_STIMMEN) return;

    let daempfung = 1;
    if (def.raeumlich && x !== undefined && y !== undefined) {
      const d = Math.hypot(x - this.hoererX, y - this.hoererY);
      if (d > this.hoerweite) return;
      daempfung = Math.max(0, 1 - d / this.hoerweite) ** 1.5;
    }
    if (daempfung <= 0.02) return;
    this.letzteZeit.set(id, jetzt);

    const ziel = this.kanal[def.kategorie];
    if (!ziel) return;

    if (def.prozedural) {
      this.spieleTon(def, ziel, daempfung);
      return;
    }
    const dateien = def.dateien ?? [];
    if (!dateien.length) return;
    const letzte = this.letzteFuer(id, dateien);
    void this.hole(letzte).then((buffer) => {
      if (!buffer || !this.ctx || this.ctx.state !== 'running') return;
      const quelle = this.ctx.createBufferSource();
      quelle.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.value = def.lautstaerke * daempfung;
      quelle.connect(gain).connect(ziel);
      this.stimmen++;
      quelle.onended = () => {
        this.stimmen--;
      };
      quelle.start();
    });
  }

  /** Wählt eine Variante und vermeidet die unmittelbare Wiederholung. */
  private letzteFuer(id: string, dateien: string[]): string {
    const vorher = this.letzteDatei.get(id);
    const auswahl = dateien.length > 1 ? dateien.filter((d) => d !== vorher) : dateien;
    const gewaehlt = auswahl[Math.floor(Math.random() * auswahl.length)];
    this.letzteDatei.set(id, gewaehlt);
    return gewaehlt;
  }

  private spieleTon(def: CueDef, ziel: GainNode, daempfung: number): void {
    const ctx = this.ctx!;
    const p = def.prozedural!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = p.art;
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(p.frequenz, t);
    if (p.gleiten) osc.frequency.exponentialRampToValueAtTime(p.gleiten, t + p.dauer);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(p.gain * def.lautstaerke * daempfung, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + p.dauer);
    osc.connect(gain).connect(ziel);
    this.stimmen++;
    osc.onended = () => {
      this.stimmen--;
    };
    osc.start(t);
    osc.stop(t + p.dauer + 0.02);
  }

  /** Musik wird erst auf Anforderung geladen, nie beim Spielstart. */
  async musik(art: keyof typeof MUSIK | null, crossfade = 2): Promise<void> {
    if (!this.ctx || !this.kanal.musik) return;
    const url = art ? MUSIK[art].url : null;
    if (this.aktuelleMusik === url) return;
    this.aktuelleMusik = url;

    const alteQuelle = this.musikQuelle;
    const alterGain = this.musikGain;
    if (alterGain && alteQuelle) {
      const t = this.ctx.currentTime;
      alterGain.gain.setValueAtTime(alterGain.gain.value, t);
      alterGain.gain.linearRampToValueAtTime(0.0001, t + crossfade);
      alteQuelle.stop(t + crossfade + 0.1);
    }
    this.musikQuelle = null;
    this.musikGain = null;
    if (!url) return;

    const buffer = await this.hole(url);
    if (!buffer || this.aktuelleMusik !== url || !this.ctx) return;
    const quelle = this.ctx.createBufferSource();
    quelle.buffer = buffer;
    quelle.loop = true;
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.8, t + crossfade);
    quelle.connect(gain).connect(this.kanal.musik);
    quelle.start();
    this.musikQuelle = quelle;
    this.musikGain = gain;
  }
}
