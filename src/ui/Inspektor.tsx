import { BUILDING_BY_ID, ausbaukosten, stufenfaktor } from '../game/content/buildings';
import { RESOURCES } from '../game/content/resources';
import { JOB_INFO, TRAIT_INFO } from '../game/content/names';
import { gebaeudeStatusText } from '../game/simulation/village';
import { statusText } from '../game/simulation/sim';
import { kostenVorschau } from '../game/simulation/commands';
import type { ResourceId } from '../game/core/types';
import type { Auswahl } from '../game/render/scene';
import type { Spielcontroller } from './spielcontroller';
import { Balken, Icon, Kosten, zahl } from './bausteine';

export function Inspektor({
  ctrl,
  auswahl,
  onSchliessen,
  onKameraAuf,
  onVerschieben,
}: {
  ctrl: Spielcontroller;
  auswahl: Auswahl;
  onSchliessen: () => void;
  onKameraAuf: (x: number, y: number) => void;
  onVerschieben: (id: number) => void;
}) {
  const sim = ctrl.sim;

  if (auswahl.art === 'gebaeude') {
    const b = sim.gebaeude(auswahl.id);
    if (!b) return null;
    const def = BUILDING_BY_ID[b.type];
    const ausbau = kostenVorschau(sim, { art: 'ausbauen', id: b.id });
    return (
      <aside className="inspektor tafel" aria-label={`Gebäude ${def.name}`}>
        <div className="panel-kopf">
          <h2>{def.name}</h2>
          <button className="knopf klein leise" onClick={onSchliessen}>
            Schließen
          </button>
        </div>
        <p className="leise">{def.beschreibung}</p>
        <p>
          <span className="marke">Stufe {b.stufe}</span>{' '}
          <span className={`marke ${b.status === 'aktiv' ? 'gut' : ''}`}>{b.status}</span>{' '}
          <span className="marke">Leistung {Math.round(stufenfaktor(def, b.stufe) * 100)} %</span>
        </p>
        <p>{gebaeudeStatusText(sim, b)}</p>

        {b.status === 'baustelle' && (
          <Balken
            anteil={1 - b.bauarbeit / (def.bauarbeit || 1)}
            beschriftung={`Bauarbeit: noch ${Math.max(0, Math.ceil(b.bauarbeit))} s`}
          />
        )}

        {def.rezept && (
          <p className="leise">
            Rezept: {formatiere(def.rezept.ein)} → {formatiere(def.rezept.aus)} je {def.rezept.dauer} s
          </p>
        )}

        {b.arbeiter.length > 0 && (
          <>
            <h3>Arbeiter</h3>
            {b.arbeiter.map((id) => {
              const r = sim.state.residents.find((x) => x.id === id);
              return r ? (
                <div key={id} className="leise">
                  {r.name} – {statusText(sim, r)}
                </div>
              ) : null;
            })}
          </>
        )}
        {b.bewohner.length > 0 && (
          <>
            <h3>Bewohner</h3>
            {b.bewohner.map((id) => {
              const r = sim.state.residents.find((x) => x.id === id);
              return r ? (
                <div key={id} className="leise">
                  {r.name}
                </div>
              ) : null;
            })}
          </>
        )}

        <h3>Aktionen</h3>
        {b.stufe < def.maxStufe && b.status === 'aktiv' && (
          <div style={{ marginBottom: 8 }}>
            <Kosten kosten={ausbaukosten(def, b.stufe)} vorrat={sim.state.store} />
            <button
              className="knopf klein haupt"
              disabled={!ausbau.bezahlbar}
              onClick={() => ctrl.befehl({ art: 'ausbauen', id: b.id })}
            >
              Auf Stufe {b.stufe + 1} ausbauen
            </button>
          </div>
        )}
        <div className="reihe">
          <button className="knopf klein" onClick={() => onKameraAuf(b.x, b.y)}>
            Zeigen
          </button>
          {b.status !== 'baustelle' && (
            <button
              className="knopf klein"
              onClick={() => ctrl.befehl({ art: 'pausieren', id: b.id, wert: b.status === 'aktiv' })}
            >
              {b.status === 'aktiv' ? 'Betrieb pausieren' : 'Betrieb fortsetzen'}
            </button>
          )}
          <button className="knopf klein" onClick={() => onVerschieben(b.id)}>
            Verschieben (25 % der Kosten)
          </button>
          <button
            className="knopf klein"
            onClick={() => {
              const text =
                b.status === 'baustelle'
                  ? 'Baustelle abbrechen? Geliefertes Material geht zurück ins Lager.'
                  : 'Wirklich abreißen? Die Hälfte der Baustoffe kommt zurück.';
              if (window.confirm(text)) {
                ctrl.befehl({ art: 'abreissen', id: b.id });
                onSchliessen();
              }
            }}
          >
            Abreißen
          </button>
        </div>
      </aside>
    );
  }

  if (auswahl.art === 'bewohner') {
    const r = sim.state.residents.find((x) => x.id === auswahl.id);
    if (!r) return null;
    return (
      <aside className="inspektor tafel" aria-label={`Bewohner ${r.name}`}>
        <div className="panel-kopf">
          <h2>{r.name}</h2>
          <button className="knopf klein leise" onClick={onSchliessen}>
            Schließen
          </button>
        </div>
        <p>
          <span className="marke">{r.stage === 'kind' ? 'Kind' : JOB_INFO[r.beruf].name}</span>{' '}
          {r.berufFixiert ? <span className="marke">Beruf festgelegt</span> : null}
        </p>
        <p>
          <strong>{statusText(sim, r)}</strong>
        </p>
        <table className="werte">
          <tbody>
            <tr>
              <td>Sättigung</td>
              <td>{Math.round(r.saettigung)}</td>
            </tr>
            <tr>
              <td>Energie</td>
              <td>{Math.round(r.energie)}</td>
            </tr>
            <tr>
              <td>Zufriedenheit</td>
              <td>{Math.round(r.zufriedenheit)}</td>
            </tr>
            <tr>
              <td>Trägt</td>
              <td>
                {Object.entries(r.inventar)
                  .filter(([, n]) => (n ?? 0) > 0.01)
                  .map(([id, n]) => `${Math.round(n ?? 0)} ${RESOURCES[id as ResourceId].name}`)
                  .join(', ') || 'nichts'}
              </td>
            </tr>
          </tbody>
        </table>
        <p className="leise">
          {r.traits.map((t) => `${TRAIT_INFO[t].name}: ${TRAIT_INFO[t].text}`).join(' · ')}
        </p>
        <div className="reihe">
          <button className="knopf klein" onClick={() => onKameraAuf(r.x, r.y)}>
            Kamera folgen
          </button>
          <button
            className="knopf klein"
            onClick={() => ctrl.befehl({ art: 'favorit', bewohner: r.id, wert: !r.favorit })}
          >
            {r.favorit ? 'Liebling entfernen' : 'Als Liebling merken'}
          </button>
        </div>
      </aside>
    );
  }

  if (auswahl.art === 'knoten') {
    const n = sim.knoten(auswahl.id);
    if (!n) return null;
    return (
      <aside className="inspektor tafel" aria-label="Rohstoff">
        <div className="panel-kopf">
          <h2>{n.kind}</h2>
          <button className="knopf klein leise" onClick={onSchliessen}>
            Schließen
          </button>
        </div>
        <table className="werte">
          <tbody>
            <tr>
              <td>Verbleibend</td>
              <td>{zahl(n.amount)}</td>
            </tr>
            <tr>
              <td>Reserviert</td>
              <td>
                {n.reservedBy !== null
                  ? sim.state.residents.find((r) => r.id === n.reservedBy)?.name ?? 'ja'
                  : 'frei'}
              </td>
            </tr>
            <tr>
              <td>Geschützt</td>
              <td>{n.geschuetzt ? 'ja' : 'nein'}</td>
            </tr>
          </tbody>
        </table>
        {n.amount <= 0 && n.regrow !== null && <p className="leise">Wächst gerade nach.</p>}
        {n.geschuetzt && <p className="leise">Schutzgebiet: dieser Bewuchs wird nicht gerodet.</p>}
      </aside>
    );
  }

  const t = sim.world.terrain[auswahl.y * sim.world.size + auswahl.x];
  return (
    <aside className="inspektor tafel" aria-label="Kachel">
      <div className="panel-kopf">
        <h2>
          Kachel {auswahl.x}/{auswahl.y}
        </h2>
        <button className="knopf klein leise" onClick={onSchliessen}>
          Schließen
        </button>
      </div>
      <p className="leise">Untergrund-Kennung {t}. Hier ist gerade nichts gebaut.</p>
      <p className="leise">
        Im Bereich „Bauen“ ein Gebäude wählen und diese Kachel antippen, um hier zu bauen.
      </p>
      <Icon name="bauen" groesse={32} titel="Bauen" />
    </aside>
  );
}

function formatiere(store: Partial<Record<ResourceId, number>>): string {
  const teile = (Object.entries(store) as [ResourceId, number][]).map(([id, n]) => `${n} ${RESOURCES[id].name}`);
  return teile.length ? teile.join(' + ') : 'nichts';
}
