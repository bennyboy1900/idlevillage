import type { CSSProperties, ReactNode } from 'react';
import { RESSOURCE_ICON, SHEET_BY_KEY, framePosition, sheetMasse } from '../assets/manifest';
import { RESOURCES } from '../game/content/resources';
import type { ResourceId, Store } from '../game/core/types';

/**
 * Zeigt einen Ausschnitt eines Originalsheets als Symbol. Es werden echte
 * Pixelgrafiken verwendet, keine großen Emojis als Ersatz.
 */
export function Icon({ name, groesse = 20, titel }: { name: string; groesse?: number; titel?: string }) {
  const eintrag = RESSOURCE_ICON[name];
  const sheet = eintrag ? SHEET_BY_KEY[eintrag.sheet] : undefined;
  if (!eintrag || !sheet) {
    return (
      <span className="marke" style={{ fontSize: Math.round(groesse * 0.55) }}>
        {name.slice(0, 2)}
      </span>
    );
  }
  const [breite, hoehe] = sheetMasse(eintrag.sheet);
  const pos = framePosition(eintrag.sheet, eintrag.frame);
  // Ganzzahliger Maßstab hält die Pixel scharf.
  const skala = Math.max(1, Math.round(groesse / sheet.fw));
  const stil: CSSProperties = {
    display: 'inline-block',
    width: sheet.fw * skala,
    height: sheet.fh * skala,
    backgroundImage: `url("${sheet.url}")`,
    backgroundSize: `${breite * skala}px ${hoehe * skala}px`,
    backgroundPosition: `${-pos.x * skala}px ${-pos.y * skala}px`,
    backgroundRepeat: 'no-repeat',
    imageRendering: 'pixelated',
    verticalAlign: 'middle',
    flex: '0 0 auto',
  };
  return <span role="img" aria-label={titel ?? name} title={titel ?? name} style={stil} />;
}

export function zahl(wert: number, stellen = 0): string {
  if (!Number.isFinite(wert)) return '–';
  const abs = Math.abs(wert);
  if (abs >= 1_000_000) return `${(wert / 1_000_000).toFixed(1)} Mio`;
  if (abs >= 10_000) return `${(wert / 1000).toFixed(1)} Tsd`;
  return wert.toLocaleString('de-DE', { maximumFractionDigits: stellen, minimumFractionDigits: 0 });
}

export function rate(wert: number): string {
  if (Math.abs(wert) < 0.05) return '±0';
  return `${wert > 0 ? '+' : ''}${wert.toFixed(1)}/min`;
}

/** Kostenliste mit Markierung dessen, was gerade fehlt. */
export function Kosten({ kosten, vorrat }: { kosten: Store; vorrat: Store }) {
  const eintraege = Object.entries(kosten) as [ResourceId, number][];
  if (!eintraege.length) return <span className="leise">Keine Kosten</span>;
  return (
    <div className="kosten">
      {eintraege.map(([id, n]) => {
        const da = vorrat[id] ?? 0;
        const fehlt = da < n;
        return (
          <span key={id} className={fehlt ? 'fehlt' : undefined}>
            <Icon name={id} groesse={16} titel={RESOURCES[id].name} /> {Math.round(n)}
            {fehlt ? ` (${Math.floor(da)} da)` : ''}
          </span>
        );
      })}
    </div>
  );
}

export function Balken({ anteil, beschriftung }: { anteil: number; beschriftung?: string }) {
  const wert = Math.max(0, Math.min(1, anteil));
  return (
    <div>
      <div
        className="balken"
        role="progressbar"
        aria-valuenow={Math.round(wert * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={beschriftung}
      >
        <i style={{ width: `${wert * 100}%` }} />
      </div>
      {beschriftung ? <div className="leise">{beschriftung}</div> : null}
    </div>
  );
}

export function Feld({ titel, kinder }: { titel: string; kinder: ReactNode }) {
  return (
    <div>
      <h3>{titel}</h3>
      {kinder}
    </div>
  );
}

export function Regler({
  titel,
  wert,
  min,
  max,
  schritt,
  einheit,
  hinweis,
  onAendern,
}: {
  titel: string;
  wert: number;
  min: number;
  max: number;
  schritt: number;
  einheit?: string;
  hinweis?: string;
  onAendern: (wert: number) => void;
}) {
  const id = `regler-${titel.replace(/\s+/g, '-')}`;
  return (
    <div className="regler">
      <label htmlFor={id}>
        {titel}: <strong className="zahl">{zahl(wert, 2)}{einheit ?? ''}</strong>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={schritt}
        value={wert}
        onChange={(e) => onAendern(Number(e.target.value))}
      />
      {hinweis ? <span className="leise">{hinweis}</span> : null}
    </div>
  );
}
