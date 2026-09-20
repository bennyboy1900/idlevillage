import { RESOURCES, RESOURCE_IDS } from '../game/content/resources';
import { QUEST_BY_ID } from '../game/content/quests';
import { HINWEIS_TEXT, auftragsFortschritt, bauBedarf, ereignisName, nahrungsbilanz } from '../game/simulation/village';
import { BUILDING_BY_ID } from '../game/content/buildings';
import type { ResourceId } from '../game/core/types';
import type { Spielcontroller, Tempo } from './spielcontroller';
import { Balken, Icon, rate, zahl } from './bausteine';

export type Bereich = 'dorf' | 'bauen' | 'forschung' | 'handel' | 'welt' | null;

/** Ressourcen, die immer sichtbar sind; weitere erscheinen erst mit Bestand. */
const KERN: ResourceId[] = ['holz', 'stein', 'muenzen'];
const WEITERE: ResourceId[] = ['bretter', 'erz', 'barren', 'werkzeug', 'stoff', 'forschung'];

export function Ressourcenleiste({
  ctrl,
  kompakt,
  onLager,
}: {
  ctrl: Spielcontroller;
  kompakt: boolean;
  onLager: () => void;
}) {
  const sim = ctrl.sim;
  const s = sim.state;
  const nahrung = sim.nahrung;
  const bilanz = nahrungsbilanz(sim);
  const sichtbar = [...KERN, ...(kompakt ? [] : WEITERE.filter((id) => (s.store[id] ?? 0) >= 1))];

  return (
    <div className="ressourcen" role="status" aria-label="Vorräte des Dorfes">
      <button className="ressource" onClick={onLager} title="Lager öffnen" style={{ border: 0 }}>
        <Icon name="nahrung" groesse={16} titel="Nahrung" />
        <span className="wert">{zahl(nahrung)}</span>
        <span className={`rate ${bilanz >= 0 ? 'plus' : 'minus'}`}>{rate(bilanz)}</span>
      </button>
      {sichtbar.map((id) => (
        <span key={id} className="ressource" title={`${RESOURCES[id].name}: ${RESOURCES[id].beschreibung}`}>
          <Icon name={id} groesse={16} titel={RESOURCES[id].name} />
          <span className="wert">{zahl(s.store[id] ?? 0)}</span>
          <span className={`rate ${(s.raten[id] ?? 0) >= 0 ? 'plus' : 'minus'}`}>{rate(s.raten[id] ?? 0)}</span>
        </span>
      ))}
      <span className="ressource" title="Einwohner und Wohnplätze">
        <Icon name="einwohner" groesse={16} titel="Einwohner" />
        <span className="wert">
          {s.residents.length}/{sim.wohnplaetze}
        </span>
      </span>
      <span className="ressource" title="Durchschnittliche Zufriedenheit">
        <Icon name="zufriedenheit" groesse={16} titel="Zufriedenheit" />
        <span className="wert">{Math.round(sim.zufriedenheit)}</span>
      </span>
      <span className="rechts">
        <span className="ressource" title="Lagerauslastung">
          <span className="wert">
            {Math.round(sim.belegung)}/{Math.round(sim.kapazitaet)}
          </span>
        </span>
        <Tempowahl ctrl={ctrl} />
      </span>
    </div>
  );
}

function Tempowahl({ ctrl }: { ctrl: Spielcontroller }) {
  const stufen: { wert: Tempo; text: string; titel: string }[] = [
    { wert: 0, text: '❚❚', titel: 'Pause' },
    { wert: 1, text: '1×', titel: 'Normales Tempo' },
    { wert: 2, text: '2×', titel: 'Doppeltes Tempo' },
    { wert: 3, text: '3×', titel: 'Dreifaches Tempo' },
  ];
  return (
    <span className="reihe" role="group" aria-label="Spieltempo">
      {stufen.map((s) => (
        <button
          key={s.wert}
          className="knopf klein"
          aria-pressed={ctrl.tempo === s.wert}
          title={s.titel}
          style={ctrl.tempo === s.wert ? { background: 'var(--akzent)', color: 'var(--tinte)' } : undefined}
          onClick={() => ctrl.setzeTempo(s.wert)}
        >
          {s.text}
        </button>
      ))}
    </span>
  );
}

/** Linke Spalte: laufende Ziele, Ereignisse und Engpässe. */
export function Zielspalte({ ctrl }: { ctrl: Spielcontroller }) {
  const sim = ctrl.sim;
  const s = sim.state;
  const offen = s.quests.filter((q) => q.status === 'offen');
  offen.sort((a, b) => b.fortschritt - a.fortschritt);
  const naechste = offen.slice(0, 3);
  const bedarf = bauBedarf(sim);
  const baustellen = s.buildings.filter((b) => b.status === 'baustelle');

  return (
    <div className="saeule-links">
      {s.hinweise.length > 0 && (
        <div className="tafel" style={{ padding: 10 }}>
          <strong className="pixelschrift">Engpass</strong>
          {s.hinweise.slice(0, 2).map((h) => (
            <p key={h} className="hinweis" style={{ marginTop: 6 }}>
              {HINWEIS_TEXT[h] ?? h}
            </p>
          ))}
        </div>
      )}

      {baustellen.length > 0 && (
        <div className="tafel" style={{ padding: 10 }}>
          <strong className="pixelschrift">Baustellen</strong>
          {baustellen.map((b) => {
            const def = BUILDING_BY_ID[b.type];
            const fehlt = sim.fehlendeMaterialien(b);
            const geliefert = Object.entries(def.kosten).map(([id, n]) => {
              const da = n - ((fehlt as Record<string, number>)[id] ?? 0);
              return `${Math.round(da)}/${n} ${RESOURCES[id as ResourceId].name}`;
            });
            const materialFertig = Object.keys(fehlt).length === 0;
            return (
              <div key={b.id} style={{ marginTop: 6 }}>
                <div className="leise">
                  {def.name}: {materialFertig ? 'Bauarbeit läuft' : geliefert.join(', ')}
                </div>
                <Balken
                  anteil={materialFertig ? 1 - b.bauarbeit / (def.bauarbeit || 1) : 0.15}
                  beschriftung={materialFertig ? `noch ${Math.max(0, Math.ceil(b.bauarbeit))} s` : undefined}
                />
              </div>
            );
          })}
        </div>
      )}

      {bedarf && baustellen.length < 2 && (
        <div className="tafel" style={{ padding: 10 }}>
          <strong className="pixelschrift">Dorfplanung</strong>
          <p className="leise" style={{ margin: '4px 0 0' }}>
            {bedarf.grund}. Als Nächstes: {BUILDING_BY_ID[bedarf.typ]?.name}.
          </p>
        </div>
      )}

      {s.events.length > 0 && (
        <div className="tafel" style={{ padding: 10 }}>
          <strong className="pixelschrift">Ereignisse</strong>
          {s.events.map((e) => (
            <div key={e.id} className="leise">
              {ereignisName(e.id)} · noch {Math.ceil(e.restzeit)} s
            </div>
          ))}
        </div>
      )}

      {naechste.length > 0 && (
        <div className="tafel" style={{ padding: 10 }}>
          <strong className="pixelschrift">Aufträge</strong>
          {naechste.map((q) => {
            const def = QUEST_BY_ID[q.id];
            const { ist, soll } = auftragsFortschritt(sim, q.id);
            return (
              <div key={q.id} style={{ marginTop: 6 }}>
                <div style={{ fontSize: 13 }}>{def.name}</div>
                <Balken anteil={q.fortschritt} beschriftung={`${zahl(ist)} / ${zahl(soll)}`} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Navigation({
  aktiv,
  onWechsel,
  onEinstellungen,
}: {
  aktiv: Bereich;
  onWechsel: (bereich: Bereich) => void;
  onEinstellungen: () => void;
}) {
  // Die Symbole sind Ausschnitte der vorhandenen Pixelgrafik, keine Emojis.
  const tabs: { id: Exclude<Bereich, null>; text: string; icon: string }[] = [
    { id: 'dorf', text: 'Dorf', icon: 'dorf' },
    { id: 'bauen', text: 'Bauen', icon: 'bauen' },
    { id: 'forschung', text: 'Forschung', icon: 'forschung_tab' },
    { id: 'handel', text: 'Handel', icon: 'handel' },
    { id: 'welt', text: 'Welt', icon: 'welt' },
  ];
  return (
    <nav className="navigation" aria-label="Hauptbereiche">
      {tabs.map((t) => (
        <button
          key={t.id}
          className="tab"
          aria-pressed={aktiv === t.id}
          onClick={() => onWechsel(aktiv === t.id ? null : t.id)}
        >
          <Icon name={t.icon} groesse={16} titel={t.text} />
          {t.text}
        </button>
      ))}
      <button className="tab" onClick={onEinstellungen} aria-label="Einstellungen">
        <Icon name="einstellungen" groesse={16} titel="Einstellungen" />
        Optionen
      </button>
    </nav>
  );
}

export function Meldungen({ ctrl }: { ctrl: Spielcontroller }) {
  if (!ctrl.meldungen.length) return null;
  return (
    <div className="meldungen" aria-live="polite">
      {ctrl.meldungen.map((m) => (
        <button key={m.id} className={`meldung ${m.art}`} onClick={() => ctrl.verwerfeMeldung(m.id)}>
          {m.text}
        </button>
      ))}
    </div>
  );
}

/** Lagerübersicht mit allen Untertypen; die HUD-Zeile bleibt dadurch kurz. */
export function Lagerliste({ ctrl }: { ctrl: Spielcontroller }) {
  const s = ctrl.sim.state;
  const zeilen = RESOURCE_IDS.filter((id) => (s.store[id] ?? 0) > 0.01 || (s.reserviert[id] ?? 0) > 0);
  return (
    <table className="werte">
      <tbody>
        {zeilen.map((id) => (
          <tr key={id}>
            <td>
              <Icon name={id} groesse={16} titel={RESOURCES[id].name} /> {RESOURCES[id].name}
              {(s.reserviert[id] ?? 0) > 0 ? (
                <span className="leise"> · {Math.round(s.reserviert[id] ?? 0)} zugesagt</span>
              ) : null}
              {RESOURCES[id].nahrung > 0 ? (
                <span className="leise"> · {RESOURCES[id].nahrung} Nahrung je Einheit</span>
              ) : null}
            </td>
            <td>{zahl(s.store[id] ?? 0)}</td>
          </tr>
        ))}
        {!zeilen.length && (
          <tr>
            <td colSpan={2} className="leise">
              Das Lager ist leer.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
