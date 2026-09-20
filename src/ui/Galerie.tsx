import { useEffect, useRef, useState } from 'react';
import { SHEETS, frameAnzahl, spalten, zeilen, type SheetDef } from '../assets/manifest';

/**
 * Entwicklungsinterne Asset-Galerie: Originalsheet, Pixelraster,
 * Crop-Vorschau und ein Animationsplayer. Sie ist aus dem Startmenü
 * erreichbar und dient dazu, Framegrößen und Zeilenbedeutung zu prüfen,
 * statt sie aus der Sheet-Größe zu raten.
 */
export function Galerie({ onZurueck }: { onZurueck: () => void }) {
  const [gewaehlt, setGewaehlt] = useState<SheetDef>(SHEETS[0]);
  const [raster, setRaster] = useState(true);
  const [animZeile, setAnimZeile] = useState(0);
  const [animDauer, setAnimDauer] = useState(300);
  const [animFrames, setAnimFrames] = useState(5);

  return (
    <div className="startmenue" style={{ alignItems: 'start', background: '#1d2a26' }}>
      <div className="tafel" style={{ width: 'min(1100px, 100%)', padding: 18, margin: '16px auto' }}>
        <div className="panel-kopf">
          <h2>Asset-Galerie</h2>
          <button className="knopf klein leise" onClick={onZurueck}>
            Zurück
          </button>
        </div>
        <p className="leise">
          {SHEETS.length} registrierte Sheets. Alle Rastermaße stammen aus der Messung der Originaldateien; der
          Test <code>tests/manifest.test.ts</code> prüft sie gegen die echten PNGs.
        </p>

        <div className="reihe" style={{ margin: '10px 0' }}>
          <label>
            Sheet:{' '}
            <select
              value={gewaehlt.key}
              onChange={(e) => {
                const s = SHEETS.find((x) => x.key === e.target.value)!;
                setGewaehlt(s);
                setAnimZeile(0);
              }}
              style={{ minHeight: 44 }}
            >
              {SHEETS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.key}
                </option>
              ))}
            </select>
          </label>
          <label className="reihe">
            <input type="checkbox" checked={raster} onChange={(e) => setRaster(e.target.checked)} /> Pixelraster
          </label>
        </div>

        <p>
          <strong>{gewaehlt.source}</strong>
          <br />
          <span className="leise">{gewaehlt.hinweis}</span>
          <br />
          <span className="leise">
            Frame {gewaehlt.fw}×{gewaehlt.fh} · {spalten(gewaehlt.key)} Spalten × {zeilen(gewaehlt.key)} Zeilen ={' '}
            {frameAnzahl(gewaehlt.key)} Frames
          </span>
        </p>

        <h3>Originalsheet</h3>
        <Sheetansicht sheet={gewaehlt} raster={raster} />

        <h3>Animationsplayer</h3>
        <div className="reihe">
          <label>
            Zeile:{' '}
            <input
              type="number"
              min={0}
              max={zeilen(gewaehlt.key) - 1}
              value={animZeile}
              onChange={(e) => setAnimZeile(Number(e.target.value))}
              style={{ width: 70, minHeight: 44 }}
            />
          </label>
          <label>
            Frames:{' '}
            <input
              type="number"
              min={1}
              max={spalten(gewaehlt.key)}
              value={animFrames}
              onChange={(e) => setAnimFrames(Number(e.target.value))}
              style={{ width: 70, minHeight: 44 }}
            />
          </label>
          <label>
            ms je Frame:{' '}
            <input
              type="number"
              min={40}
              max={1000}
              step={10}
              value={animDauer}
              onChange={(e) => setAnimDauer(Number(e.target.value))}
              style={{ width: 90, minHeight: 44 }}
            />
          </label>
          <span className="leise">Shade nennt: Idle 300, Walk 200, Attack 100 ms.</span>
        </div>
        <Animationsplayer sheet={gewaehlt} zeile={animZeile} frames={animFrames} dauer={animDauer} />

        <h3>Crop-Vorschau</h3>
        <div className="galerie-raster">
          {Array.from({ length: Math.min(96, frameAnzahl(gewaehlt.key)) }, (_, i) => (
            <div key={i} className="galerie-feld">
              <Frameansicht sheet={gewaehlt} frame={i} skala={4} />
              <div>
                Frame {i} · Z{Math.floor(i / spalten(gewaehlt.key))} S{i % spalten(gewaehlt.key)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Sheetansicht({ sheet, raster }: { sheet: SheetDef; raster: boolean }) {
  const skala = 4;
  return (
    <div style={{ overflow: 'auto', background: '#2e2a30', padding: 8, borderRadius: 3 }}>
      <div
        style={{
          position: 'relative',
          width: spalten(sheet.key) * sheet.fw * skala,
          height: zeilen(sheet.key) * sheet.fh * skala,
          backgroundImage: `url("${sheet.url}")`,
          backgroundSize: `${spalten(sheet.key) * sheet.fw * skala}px ${zeilen(sheet.key) * sheet.fh * skala}px`,
          imageRendering: 'pixelated',
        }}
      >
        {raster && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.35) 1px, transparent 1px)',
              backgroundSize: `${sheet.fw * skala}px ${sheet.fh * skala}px`,
            }}
          />
        )}
      </div>
    </div>
  );
}

function Frameansicht({ sheet, frame, skala }: { sheet: SheetDef; frame: number; skala: number }) {
  const cols = spalten(sheet.key);
  const x = (frame % cols) * sheet.fw;
  const y = Math.floor(frame / cols) * sheet.fh;
  return (
    <div
      style={{
        width: sheet.fw * skala,
        height: sheet.fh * skala,
        backgroundImage: `url("${sheet.url}")`,
        backgroundSize: `${cols * sheet.fw * skala}px ${zeilen(sheet.key) * sheet.fh * skala}px`,
        backgroundPosition: `${-x * skala}px ${-y * skala}px`,
        imageRendering: 'pixelated',
        margin: '0 auto',
      }}
    />
  );
}

function Animationsplayer({
  sheet,
  zeile,
  frames,
  dauer,
}: {
  sheet: SheetDef;
  zeile: number;
  frames: number;
  dauer: number;
}) {
  const [frame, setFrame] = useState(0);
  const timer = useRef(0);
  useEffect(() => {
    timer.current = window.setInterval(() => setFrame((f) => (f + 1) % Math.max(1, frames)), dauer);
    return () => window.clearInterval(timer.current);
  }, [frames, dauer]);

  const cols = spalten(sheet.key);
  const index = zeile * cols + (frame % Math.max(1, frames));
  if (index >= frameAnzahl(sheet.key)) {
    return <p className="hinweis">Zeile {zeile} liegt außerhalb des Sheets.</p>;
  }
  return (
    <div className="reihe">
      <Frameansicht sheet={sheet} frame={index} skala={8} />
      <span className="leise">
        Frame {index} · {Math.round(1000 / dauer)} Bilder je Sekunde
      </span>
    </div>
  );
}
