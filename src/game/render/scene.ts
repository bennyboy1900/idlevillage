import Phaser from 'phaser';
import { TILE, type Building, type ResourceNode, type Resident } from '../core/types';
import { BUILDING_BY_ID } from '../content/buildings';
import {
  CHARACTER_ANIM,
  FIELD_FRAMES,
  GRASS_DETAIL,
  HIGHLIGHT,
  NODE_SPRITES,
  SAPLING,
  SHEETS,
  type Richtung,
} from '../../assets/manifest';
import { TERRAIN, UNERSCHLOSSEN, idx, istWasser } from '../world/terrain';
import { blobFrames, CLIFF_SATZ, COAST_SATZ, type Nachbarn } from './autotile';
import type { Simulation } from '../simulation/sim';
import { TAG_SEKUNDEN } from '../simulation/village';

/** Kachelkantenlänge einer Chunk-Textur. */
const CHUNK = 32;

export interface Auswahl {
  art: 'gebaeude' | 'bewohner' | 'knoten' | 'kachel';
  id: number;
  x: number;
  y: number;
}

export interface SzeneBruecke {
  /** Wird bei jeder Auswahl in der Welt aufgerufen. */
  onAuswahl: (auswahl: Auswahl | null) => void;
  /** Baumodus: gewählte Kachel bestätigen. */
  onBauplatz: (x: number, y: number, erlaubt: boolean, grund: string) => void;
  /** Für räumliches Audio und Kamerastand. */
  onKamera: (x: number, y: number, zoom: number) => void;
}

export class WeltSzene extends Phaser.Scene {
  sim!: Simulation;
  bruecke!: SzeneBruecke;
  /** Aktiver Bautyp im Baumodus, sonst null. */
  bauTyp: string | null = null;
  reduzierteBewegung = false;

  private chunks = new Map<string, Phaser.GameObjects.RenderTexture>();
  private knotenSprites = new Map<number, Phaser.GameObjects.Image>();
  private gebaeudeSprites = new Map<number, Phaser.GameObjects.Container>();
  private bewohnerSprites = new Map<number, Phaser.GameObjects.Sprite>();
  /** Rein dekorative Hoftiere; sie stehen in keiner Simulationsbilanz. */
  private tierSprites = new Map<string, { sprite: Phaser.GameObjects.Sprite; zx: number; zy: number }>();
  private auswahlRahmen!: Phaser.GameObjects.Image;
  private bauVorschau!: Phaser.GameObjects.Container;
  private nachtOverlay!: Phaser.GameObjects.Rectangle;
  private zonenGrafik!: Phaser.GameObjects.Graphics;
  private navVersion = -1;
  private zeigerRunter = { x: 0, y: 0, zeit: 0, gezogen: false };
  private pinchStart = 0;
  private pinchZoom = 1;

  constructor() {
    super('welt');
  }

  init(daten: { sim: Simulation; bruecke: SzeneBruecke }) {
    this.sim = daten.sim;
    this.bruecke = daten.bruecke;
  }

  preload() {
    for (const sheet of SHEETS) {
      this.load.spritesheet(sheet.key, sheet.url, { frameWidth: sheet.fw, frameHeight: sheet.fh });
    }
  }

  create() {
    this.cameras.main.setBackgroundColor('#2a8f9a');
    this.erzeugeAnimationen();

    this.zonenGrafik = this.add.graphics().setDepth(5);

    this.auswahlRahmen = this.add
      .image(0, 0, 'boxselector', 0)
      .setOrigin(0, 0)
      .setVisible(false)
      .setDepth(100000);

    this.bauVorschau = this.add.container(0, 0).setVisible(false).setDepth(100001);

    this.nachtOverlay = this.add
      .rectangle(0, 0, 4096, 4096, 0x0a1440, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(200000);

    const mitte = this.sim.state.buildings[0] ?? { x: 64, y: 64 };
    this.cameras.main.setZoom(2);
    this.cameras.main.centerOn((mitte.x + 0.5) * TILE, (mitte.y + 0.5) * TILE);
    this.cameras.main.roundPixels = true;

    this.richteEingabeEin();
    this.scale.on('resize', () => this.passeOverlayAn());
    this.passeOverlayAn();
  }

  // -- Animationen ---------------------------------------------------------

  private erzeugeAnimationen() {
    const figuren = SHEETS.filter((s) => s.key.startsWith('worker-') || s.key === 'guard');
    const { spalten, idle, walk, arbeit } = CHARACTER_ANIM;
    for (const sheet of figuren) {
      for (const [art, def] of [
        ['idle', idle],
        ['walk', walk],
        ['arbeit', arbeit],
      ] as const) {
        for (const [richtung, zeile] of Object.entries(def.zeilen) as [Richtung, number][]) {
          const key = `${sheet.key}-${art}-${richtung}`;
          if (this.anims.exists(key)) continue;
          const start = zeile * spalten;
          this.anims.create({
            key,
            frames: this.anims.generateFrameNumbers(sheet.key, {
              start,
              end: start + def.frames - 1,
            }),
            frameRate: 1000 / def.dauer,
            repeat: -1,
          });
        }
      }
    }
    // Tiere: vier Frames je Zeile, Zeile 0 nach unten gewandt.
    for (const key of ['chicken', 'sheep', 'pig', 'chick']) {
      const animKey = `${key}-idle`;
      if (this.anims.exists(animKey)) continue;
      this.anims.create({
        key: animKey,
        frames: this.anims.generateFrameNumbers(key, { start: 0, end: 3 }),
        frameRate: 4,
        repeat: -1,
      });
    }
  }

  // -- Gelände -------------------------------------------------------------

  private chunkKey(cx: number, cy: number) {
    return `${cx}:${cy}`;
  }

  /** Zeichnet einen 32x32-Kachelblock einmalig in eine Textur. */
  private baueChunk(cx: number, cy: number): Phaser.GameObjects.RenderTexture {
    const welt = this.sim.world;
    const rt = this.add
      .renderTexture(cx * CHUNK * TILE, cy * CHUNK * TILE, CHUNK * TILE, CHUNK * TILE)
      .setOrigin(0, 0)
      .setDepth(0);

    const holeTerrain = (x: number, y: number) =>
      x < 0 || y < 0 || x >= welt.size || y >= welt.size ? UNERSCHLOSSEN : welt.terrain[idx(welt.size, x, y)];

    rt.beginDraw();
    for (let ty = 0; ty < CHUNK; ty++) {
      for (let tx = 0; tx < CHUNK; tx++) {
        const wx = cx * CHUNK + tx;
        const wy = cy * CHUNK + ty;
        const px = tx * TILE;
        const py = ty * TILE;
        const t = holeTerrain(wx, wy);
        if (t === UNERSCHLOSSEN) continue;

        // 1. Grundfarbe.
        const basis = this.basisFrame(t);
        rt.batchDrawFrame(basis.sheet, basis.frame, px, py);

        // 2. Küstenübergang, wo Land an Wasser grenzt.
        if (!istWasser(t) && t !== TERRAIN.fels) {
          const nb = this.nachbarn(wx, wy, (tt) => !istWasser(tt) && tt !== UNERSCHLOSSEN);
          if (!this.alleWahr(nb)) {
            const { haupt, ecken } = blobFrames(COAST_SATZ, nb);
            rt.batchDrawFrame('cliffwater', haupt, px, py);
            for (const ecke of ecken) rt.batchDrawFrame('cliffwater', ecke, px, py);
          } else {
            // 3. Sparsame Grasbüschel als Detail.
            const detail = welt.detail[idx(welt.size, wx, wy)];
            if (detail === 0 && t === TERRAIN.wiese) {
              rt.batchDrawFrame(GRASS_DETAIL.sheet, GRASS_DETAIL.frames[(wx + wy) % GRASS_DETAIL.frames.length], px, py);
            }
          }
        }

        // 4. Klippen im Hochland erhalten eigene Kanten.
        if (t === TERRAIN.fels) {
          const nb = this.nachbarn(wx, wy, (tt) => tt === TERRAIN.fels);
          const { haupt, ecken } = blobFrames(CLIFF_SATZ, nb);
          rt.batchDrawFrame('cliff', haupt, px, py);
          for (const ecke of ecken) rt.batchDrawFrame('cliff', ecke, px, py);
        }
      }
    }
    rt.endDraw();
    return rt;
  }

  private basisFrame(t: number): { sheet: string; frame: number } {
    switch (t) {
      case TERRAIN.tiefwasser:
        return { sheet: 'grass', frame: 4 };
      case TERRAIN.wasser:
        return { sheet: 'grass', frame: 0 };
      case TERRAIN.ufer:
        return { sheet: 'grass', frame: 3 };
      case TERRAIN.grasnarbe:
        return { sheet: 'grass', frame: 1 };
      case TERRAIN.trockengras:
        return { sheet: 'deadgrass', frame: 0 };
      case TERRAIN.schnee:
        return { sheet: 'winter', frame: 5 };
      case TERRAIN.fels:
        return { sheet: 'grass', frame: 1 };
      default:
        return { sheet: 'grass', frame: 2 };
    }
  }

  private nachbarn(x: number, y: number, passt: (t: number) => boolean): Nachbarn {
    const welt = this.sim.world;
    const t = (dx: number, dy: number) => {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= welt.size || ny >= welt.size) return UNERSCHLOSSEN;
      return welt.terrain[idx(welt.size, nx, ny)];
    };
    return {
      n: passt(t(0, -1)),
      s: passt(t(0, 1)),
      w: passt(t(-1, 0)),
      e: passt(t(1, 0)),
      nw: passt(t(-1, -1)),
      ne: passt(t(1, -1)),
      sw: passt(t(-1, 1)),
      se: passt(t(1, 1)),
    };
  }

  private alleWahr(nb: Nachbarn): boolean {
    return nb.n && nb.s && nb.w && nb.e && nb.nw && nb.ne && nb.sw && nb.se;
  }

  /** Entfernt alle Chunk-Texturen, etwa nach einer Regionserschließung. */
  weltNeuZeichnen() {
    for (const rt of this.chunks.values()) rt.destroy();
    this.chunks.clear();
  }

  // -- Eingabe -------------------------------------------------------------

  private richteEingabeEin() {
    const kamera = this.cameras.main;

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.zeigerRunter = { x: p.x, y: p.y, zeit: this.time.now, gezogen: false };
      if (this.input.pointer2?.isDown) {
        this.pinchStart = Phaser.Math.Distance.Between(
          this.input.pointer1.x,
          this.input.pointer1.y,
          this.input.pointer2.x,
          this.input.pointer2.y,
        );
        this.pinchZoom = kamera.zoom;
      }
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      // Zwei Finger: um ihren Mittelpunkt zoomen.
      if (this.input.pointer1?.isDown && this.input.pointer2?.isDown) {
        const d = Phaser.Math.Distance.Between(
          this.input.pointer1.x,
          this.input.pointer1.y,
          this.input.pointer2.x,
          this.input.pointer2.y,
        );
        if (this.pinchStart > 0) {
          const ziel = Phaser.Math.Clamp((d / this.pinchStart) * this.pinchZoom, 1, 5);
          const mitteX = (this.input.pointer1.x + this.input.pointer2.x) / 2;
          const mitteY = (this.input.pointer1.y + this.input.pointer2.y) / 2;
          this.zoomeAufPunkt(ziel, mitteX, mitteY);
        }
        this.zeigerRunter.gezogen = true;
        return;
      }
      if (!p.isDown) return;
      const dx = p.x - this.zeigerRunter.x;
      const dy = p.y - this.zeigerRunter.y;
      // Schwelle: ein Ziehen darf kein Gebäude kaufen.
      if (Math.hypot(dx, dy) > 8) this.zeigerRunter.gezogen = true;
      if (!this.zeigerRunter.gezogen) return;
      kamera.scrollX -= (p.x - p.prevPosition.x) / kamera.zoom;
      kamera.scrollY -= (p.y - p.prevPosition.y) / kamera.zoom;
    });

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      this.pinchStart = 0;
      if (this.zeigerRunter.gezogen) return;
      if (this.time.now - this.zeigerRunter.zeit > 900) return;
      const welt = kamera.getWorldPoint(p.x, p.y);
      this.waehleAn(Math.floor(welt.x / TILE), Math.floor(welt.y / TILE));
    });

    this.input.on(
      'wheel',
      (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
        const ziel = Phaser.Math.Clamp(kamera.zoom * (dy > 0 ? 0.85 : 1.18), 1, 5);
        this.zoomeAufPunkt(ziel, p.x, p.y);
      },
    );

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      const schritt = 64 / kamera.zoom;
      if (e.key === 'ArrowLeft') kamera.scrollX -= schritt;
      if (e.key === 'ArrowRight') kamera.scrollX += schritt;
      if (e.key === 'ArrowUp') kamera.scrollY -= schritt;
      if (e.key === 'ArrowDown') kamera.scrollY += schritt;
      if (e.key === '+') this.zoomeAufPunkt(Math.min(5, kamera.zoom + 1), this.scale.width / 2, this.scale.height / 2);
      if (e.key === '-') this.zoomeAufPunkt(Math.max(1, kamera.zoom - 1), this.scale.width / 2, this.scale.height / 2);
      if (e.key === 'Escape') this.bruecke.onAuswahl(null);
    });
  }

  private zoomeAufPunkt(ziel: number, bildschirmX: number, bildschirmY: number) {
    const kamera = this.cameras.main;
    // Ganzzahlige Maßstäbe halten die Pixel scharf.
    const gerundet = Math.round(Phaser.Math.Clamp(ziel, 1, 5) * 2) / 2;
    const vorher = kamera.getWorldPoint(bildschirmX, bildschirmY);
    kamera.setZoom(gerundet);
    const nachher = kamera.getWorldPoint(bildschirmX, bildschirmY);
    kamera.scrollX += vorher.x - nachher.x;
    kamera.scrollY += vorher.y - nachher.y;
  }

  kameraAuf(x: number, y: number) {
    this.cameras.main.pan((x + 0.5) * TILE, (y + 0.5) * TILE, 400, 'Sine.easeInOut');
  }

  private waehleAn(x: number, y: number) {
    if (this.bauTyp) {
      const def = BUILDING_BY_ID[this.bauTyp];
      const pruefung = this.sim.bauplatzPruefen(def, x, y);
      this.bruecke.onBauplatz(x, y, pruefung.ok, pruefung.grund);
      return;
    }
    const bewohner = this.sim.state.residents.find(
      (r) => Math.abs(r.x - (x + 0.5)) < 0.8 && Math.abs(r.y - (y + 0.5)) < 0.9,
    );
    if (bewohner) {
      this.bruecke.onAuswahl({ art: 'bewohner', id: bewohner.id, x, y });
      return;
    }
    const gebaeude = this.sim.gebaeudeAn(x, y);
    if (gebaeude) {
      this.bruecke.onAuswahl({ art: 'gebaeude', id: gebaeude.id, x, y });
      return;
    }
    const knoten = this.sim.state.nodes.find((n) => n.amount > 0 && n.x === x && n.y === y);
    if (knoten) {
      this.bruecke.onAuswahl({ art: 'knoten', id: knoten.id, x, y });
      return;
    }
    this.bruecke.onAuswahl({ art: 'kachel', id: -1, x, y });
  }

  zeigeAuswahl(auswahl: Auswahl | null) {
    if (!auswahl) {
      this.auswahlRahmen.setVisible(false);
      return;
    }
    this.auswahlRahmen.setPosition(auswahl.x * TILE, auswahl.y * TILE).setVisible(true);
  }

  // -- Aktualisierung ------------------------------------------------------

  update() {
    const kamera = this.cameras.main;
    this.aktualisiereChunks();
    this.aktualisiereKnoten();
    this.aktualisiereGebaeude();
    this.aktualisiereBewohner();
    this.aktualisiereTiere();
    this.aktualisiereZonen();
    this.aktualisiereTageszeit();
    this.aktualisiereBauVorschau();

    const mitte = kamera.getWorldPoint(this.scale.width / 2, this.scale.height / 2);
    this.bruecke.onKamera(mitte.x / TILE, mitte.y / TILE, kamera.zoom);
  }

  private sichtbarerBereich(rand = 2) {
    const kamera = this.cameras.main;
    const links = kamera.worldView.x / TILE - rand;
    const oben = kamera.worldView.y / TILE - rand;
    return {
      x0: Math.floor(links),
      y0: Math.floor(oben),
      x1: Math.ceil(links + kamera.worldView.width / TILE + rand * 2),
      y1: Math.ceil(oben + kamera.worldView.height / TILE + rand * 2),
    };
  }

  private aktualisiereChunks() {
    if (this.navVersion !== this.sim.nav.version) {
      this.navVersion = this.sim.nav.version;
    }
    const b = this.sichtbarerBereich(CHUNK / 2);
    const cx0 = Math.max(0, Math.floor(b.x0 / CHUNK));
    const cy0 = Math.max(0, Math.floor(b.y0 / CHUNK));
    const cx1 = Math.min(Math.ceil(this.sim.world.size / CHUNK) - 1, Math.floor(b.x1 / CHUNK));
    const cy1 = Math.min(Math.ceil(this.sim.world.size / CHUNK) - 1, Math.floor(b.y1 / CHUNK));
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const key = this.chunkKey(cx, cy);
        if (!this.chunks.has(key)) this.chunks.set(key, this.baueChunk(cx, cy));
      }
    }
  }

  private aktualisiereKnoten() {
    const b = this.sichtbarerBereich();
    const gesehen = new Set<number>();
    for (const node of this.sim.state.nodes) {
      if (node.x < b.x0 || node.x > b.x1 || node.y < b.y0 || node.y > b.y1) continue;
      const sichtbar = node.amount > 0 || node.regrow !== null;
      if (!sichtbar) continue;
      gesehen.add(node.id);
      let sprite = this.knotenSprites.get(node.id);
      const def = NODE_SPRITES[node.kind];
      const nachwachsend = node.amount <= 0;
      const sheet = nachwachsend ? SAPLING.sheet : def.sheet;
      const frame = nachwachsend ? SAPLING.frame : def.frames[node.variant % def.frames.length];
      if (!sprite) {
        sprite = this.add.image(0, 0, sheet, frame).setOrigin(0, 1);
        this.knotenSprites.set(node.id, sprite);
      }
      if (sprite.texture.key !== sheet || sprite.frame.name !== String(frame)) {
        sprite.setTexture(sheet, frame);
      }
      sprite.setPosition(node.x * TILE, (node.y + 1) * TILE);
      sprite.setDepth((node.y + 1) * TILE);
      sprite.setAlpha(nachwachsend ? 0.85 : 1);
      // Reservierte Knoten bekommen einen dezenten Farbstich.
      sprite.setTint(node.reservedBy !== null ? 0xfff0c0 : 0xffffff);
    }
    for (const [id, sprite] of this.knotenSprites) {
      if (!gesehen.has(id)) {
        sprite.destroy();
        this.knotenSprites.delete(id);
      }
    }
  }

  private aktualisiereGebaeude() {
    const b = this.sichtbarerBereich(4);
    const gesehen = new Set<number>();
    for (const bau of this.sim.state.buildings) {
      const def = BUILDING_BY_ID[bau.type];
      if (bau.x < b.x0 - def.w || bau.x > b.x1 || bau.y < b.y0 - def.bildHoehe || bau.y > b.y1) continue;
      gesehen.add(bau.id);
      let container = this.gebaeudeSprites.get(bau.id);
      if (!container) {
        container = this.erzeugeGebaeude(bau);
        this.gebaeudeSprites.set(bau.id, container);
      }
      this.pflegeGebaeude(container, bau);
    }
    for (const [id, c] of this.gebaeudeSprites) {
      if (!gesehen.has(id)) {
        c.destroy(true);
        this.gebaeudeSprites.delete(id);
      }
    }
  }

  private erzeugeGebaeude(bau: Building): Phaser.GameObjects.Container {
    const def = BUILDING_BY_ID[bau.type];
    const varianten = def.varianten ?? [def.sprite.frame];
    const frame = varianten[bau.id % varianten.length];
    const container = this.add.container(bau.x * TILE, (bau.y + def.h) * TILE);
    const bild = this.add.image(0, 0, def.sprite.sheet, frame).setOrigin(0, 1);
    bild.setName('bild');
    container.add(bild);

    const balken = this.add.graphics().setName('balken');
    container.add(balken);
    return container;
  }

  private pflegeGebaeude(container: Phaser.GameObjects.Container, bau: Building) {
    const def = BUILDING_BY_ID[bau.type];
    container.setPosition(bau.x * TILE, (bau.y + def.h) * TILE);
    container.setDepth((bau.y + def.h) * TILE - 1);

    const bild = container.getByName('bild') as Phaser.GameObjects.Image;
    // Äcker zeigen ihren Wachstumsstand.
    if (bau.type === 'feld' && bau.status === 'aktiv') {
      const rezept = def.rezept!;
      const anteil = 1 - Math.max(0, Math.min(1, bau.zyklus / rezept.dauer));
      const stufe = FIELD_FRAMES[Math.min(FIELD_FRAMES.length - 1, Math.floor(anteil * FIELD_FRAMES.length))];
      if (bild.frame.name !== String(stufe)) bild.setFrame(stufe);
    }
    bild.setAlpha(bau.status === 'baustelle' ? 0.45 : bau.status === 'pausiert' ? 0.7 : 1);
    bild.setTint(bau.status === 'pausiert' ? 0x9999aa : 0xffffff);

    const balken = container.getByName('balken') as Phaser.GameObjects.Graphics;
    balken.clear();
    if (bau.status === 'baustelle') {
      const gesamt = def.bauarbeit || 1;
      const fortschritt = Math.max(0, Math.min(1, 1 - bau.bauarbeit / gesamt));
      const breite = def.w * TILE;
      balken.fillStyle(0x1a1a22, 0.8).fillRect(0, -def.bildHoehe * TILE - 5, breite, 3);
      balken.fillStyle(0x86c66a, 1).fillRect(0, -def.bildHoehe * TILE - 5, breite * fortschritt, 3);
    }
  }

  private aktualisiereBewohner() {
    const b = this.sichtbarerBereich(3);
    const gesehen = new Set<number>();
    for (const r of this.sim.state.residents) {
      if (r.x < b.x0 || r.x > b.x1 || r.y < b.y0 || r.y > b.y1) continue;
      gesehen.add(r.id);
      let sprite = this.bewohnerSprites.get(r.id);
      const sheet = this.sheetFuer(r);
      if (!sprite) {
        sprite = this.add.sprite(0, 0, sheet, 0).setOrigin(0.5, 0.9);
        this.bewohnerSprites.set(r.id, sprite);
      }
      sprite.setPosition(r.x * TILE, r.y * TILE);
      sprite.setDepth(r.y * TILE);
      // Kinder werden aus vorhandenem Material dezent verkleinert dargestellt.
      sprite.setScale(r.stage === 'kind' ? 0.72 : 1);
      sprite.setTint(r.favorit ? 0xffe9a8 : 0xffffff);

      const art = this.animationsart(r);
      const key = `${sheet}-${art}-${r.richtung}`;
      if (this.reduzierteBewegung) {
        sprite.anims.stop();
        const anim = this.anims.get(`${sheet}-idle-${r.richtung}`);
        if (anim) sprite.setFrame(anim.frames[0].frame.name);
      } else if (sprite.anims.currentAnim?.key !== key && this.anims.exists(key)) {
        sprite.play(key, true);
      }
    }
    for (const [id, sprite] of this.bewohnerSprites) {
      if (!gesehen.has(id)) {
        sprite.destroy();
        this.bewohnerSprites.delete(id);
      }
    }
  }

  /**
   * Hühner und Schafe laufen rund um aktive Ranches. Sie sind Ausstattung,
   * keine Simulationseinheiten: ihre Bewegung ändert keine Bestände.
   */
  private aktualisiereTiere() {
    const b = this.sichtbarerBereich(3);
    const gesehen = new Set<string>();
    const ranches = this.sim.state.buildings.filter((x) => x.type === 'ranch' && x.status === 'aktiv');
    for (const ranch of ranches) {
      if (ranch.x < b.x0 - 4 || ranch.x > b.x1 || ranch.y < b.y0 - 4 || ranch.y > b.y1) continue;
      const stufe = ranch.stufe;
      for (let i = 0; i < 2 + stufe; i++) {
        const key = `${ranch.id}:${i}`;
        gesehen.add(key);
        let eintrag = this.tierSprites.get(key);
        if (!eintrag) {
          const art = i % 2 === 0 ? 'chicken' : 'sheep';
          const sprite = this.add.sprite(0, 0, art, 0).setOrigin(0.5, 0.9);
          sprite.play(`${art}-idle`, true);
          eintrag = { sprite, zx: ranch.x + 0.5, zy: ranch.y + 1.5 };
          this.tierSprites.set(key, eintrag);
          sprite.setPosition(eintrag.zx * TILE, eintrag.zy * TILE);
        }
        // Gemächliches Umherlaufen im erlaubten Umkreis der Ranch.
        const dx = eintrag.zx - eintrag.sprite.x / TILE;
        const dy = eintrag.zy - eintrag.sprite.y / TILE;
        if (Math.hypot(dx, dy) < 0.12) {
          const winkel = ((this.sim.state.tick + i * 37 + ranch.id * 11) % 360) * (Math.PI / 180);
          const radius = 1 + ((i * 7) % 3) * 0.6;
          const zx = ranch.x + 0.5 + Math.cos(winkel) * radius;
          const zy = ranch.y + 1.2 + Math.sin(winkel) * radius * 0.6;
          if (begehbarKachel(this.sim, zx, zy)) {
            eintrag.zx = zx;
            eintrag.zy = zy;
          }
        } else {
          const schritt = 0.35 * (this.game.loop.delta / 1000);
          const laenge = Math.hypot(dx, dy) || 1;
          eintrag.sprite.x += (dx / laenge) * schritt * TILE;
          eintrag.sprite.y += (dy / laenge) * schritt * TILE;
          eintrag.sprite.setFlipX(dx < 0);
        }
        eintrag.sprite.setDepth(eintrag.sprite.y);
        if (this.reduzierteBewegung) eintrag.sprite.anims.stop();
      }
    }
    for (const [key, eintrag] of this.tierSprites) {
      if (!gesehen.has(key)) {
        eintrag.sprite.destroy();
        this.tierSprites.delete(key);
      }
    }
  }

  private sheetFuer(r: Resident): string {
    if (r.beruf === 'wache') return 'guard';
    if (r.stage === 'kind') return 'worker-template';
    const nach = ['worker-cyan', 'worker-lime', 'worker-purple', 'worker-red'];
    return nach[r.id % nach.length];
  }

  private animationsart(r: Resident): 'idle' | 'walk' | 'arbeit' {
    switch (r.zustand) {
      case 'walk':
      case 'carry':
        return 'walk';
      case 'gather':
      case 'build':
      case 'craft':
        return 'arbeit';
      default:
        return 'idle';
    }
  }

  private aktualisiereZonen() {
    this.zonenGrafik.clear();
    const farben: Record<string, number> = {
      wohnen: 0xffd27f,
      produktion: 0x8fd0ff,
      landwirtschaft: 0xb6f08a,
      schutz: 0x9be3c0,
    };
    for (const zone of this.sim.state.policy.zonen) {
      this.zonenGrafik.lineStyle(1, farben[zone.art] ?? 0xffffff, 0.8);
      this.zonenGrafik.strokeRect(zone.x * TILE, zone.y * TILE, zone.w * TILE, zone.h * TILE);
    }
  }

  private aktualisiereTageszeit() {
    // Ein Spieltag dauert TAG_SEKUNDEN; die Nacht tönt sanft, ohne die
    // Lesbarkeit zu zerstören.
    const anteil = (this.sim.state.zeit % TAG_SEKUNDEN) / TAG_SEKUNDEN;
    const nacht = Math.max(0, Math.cos(anteil * Math.PI * 2) * -1);
    this.nachtOverlay.setFillStyle(0x0a1440, nacht * 0.3);
  }

  private passeOverlayAn() {
    this.nachtOverlay.setSize(this.scale.width, this.scale.height);
  }

  private aktualisiereBauVorschau() {
    if (!this.bauTyp) {
      this.bauVorschau.setVisible(false);
      return;
    }
    const zeiger = this.input.activePointer;
    const welt = this.cameras.main.getWorldPoint(zeiger.x, zeiger.y);
    const x = Math.floor(welt.x / TILE);
    const y = Math.floor(welt.y / TILE);
    const def = BUILDING_BY_ID[this.bauTyp];
    const pruefung = this.sim.bauplatzPruefen(def, x, y);

    this.bauVorschau.removeAll(true);
    for (let dy = 0; dy < def.h; dy++) {
      for (let dx = 0; dx < def.w; dx++) {
        this.bauVorschau.add(
          this.add
            .image((x + dx) * TILE, (y + dy) * TILE, 'highlight', pruefung.ok ? HIGHLIGHT.gruen : HIGHLIGHT.rot)
            .setOrigin(0, 0)
            .setAlpha(0.75),
        );
      }
    }
    const varianten = def.varianten ?? [def.sprite.frame];
    this.bauVorschau.add(
      this.add
        .image(x * TILE, (y + def.h) * TILE, def.sprite.sheet, varianten[0])
        .setOrigin(0, 1)
        .setAlpha(0.6),
    );
    // Eingangskachel deutlich markieren: der Weg muss frei bleiben.
    this.bauVorschau.add(
      this.add
        .image((x + def.eingang.dx) * TILE, (y + def.eingang.dy) * TILE, 'highlight', HIGHLIGHT.blau)
        .setOrigin(0, 0)
        .setAlpha(0.5),
    );
    this.bauVorschau.setVisible(true);
  }
}

function begehbarKachel(sim: Simulation, x: number, y: number): boolean {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (tx < 0 || ty < 0 || tx >= sim.nav.size || ty >= sim.nav.size) return false;
  return sim.nav.blockiert[ty * sim.nav.size + tx] === 0;
}

/** Startet Phaser in einem vorhandenen Container. */
export function starteRenderer(
  parent: HTMLElement,
  sim: Simulation,
  bruecke: SzeneBruecke,
): { game: Phaser.Game; szene: () => WeltSzene | undefined } {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#2a8f9a',
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER,
      width: parent.clientWidth || 800,
      height: parent.clientHeight || 600,
    },
    // Die Pixeldichte wird begrenzt: mehr Schärfe brächte hier nur Last.
    resolution: Math.min(2, window.devicePixelRatio || 1),
    scene: [WeltSzene],
    audio: { noAudio: true },
    banner: false,
  } as Phaser.Types.Core.GameConfig);

  game.scene.start('welt', { sim, bruecke });
  return { game, szene: () => game.scene.getScene('welt') as WeltSzene | undefined };
}

export type { Building, ResourceNode };
