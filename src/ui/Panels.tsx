import { useState, type ReactElement } from 'react';
import { BUILDINGS, BUILDING_BY_ID, KATEGORIE_NAME, type BuildingKategorie } from '../game/content/buildings';
import { AST_NAME, RESEARCH, RESEARCH_BY_ID, type Forschungsast } from '../game/content/research';
import { QUESTS } from '../game/content/quests';
import { CHAMPIONS, MAX_BERATER, REGIONS } from '../game/content/world-content';
import { RESOURCES, RESOURCE_IDS } from '../game/content/resources';
import { JOB_INFO, JOB_IDS, TRAIT_INFO } from '../game/content/names';
import type { JobId, ResourceId, StrategyId } from '../game/core/types';
import { istFreigeschaltet, nahrungsbilanz, nahrungspufferZiel, verfuegbareGebaeude } from '../game/simulation/village';
import { kostenVorschau, notration } from '../game/simulation/commands';
import { statusText } from '../game/simulation/sim';
import type { Spielcontroller } from './spielcontroller';
import { Balken, Icon, Kosten, Regler, zahl } from './bausteine';
import { Lagerliste } from './Hud';

export interface PanelProps {
  ctrl: Spielcontroller;
  onSchliessen: () => void;
  onBaumodus: (typ: string | null) => void;
  bauTyp: string | null;
  onKameraAuf: (x: number, y: number) => void;
}

function Kopf({ titel, onSchliessen }: { titel: string; onSchliessen: () => void }) {
  return (
    <div className="panel-kopf">
      <h2>{titel}</h2>
      <button className="knopf klein leise" onClick={onSchliessen} aria-label="Bereich schließen">
        Schließen
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dorf
// ---------------------------------------------------------------------------

const STRATEGIEN: { id: StrategyId; name: string; text: string; wirkung: string }[] = [
  { id: 'ausgewogen', name: 'Ausgewogen', text: 'Holz, Stein und Nahrung zu gleichen Teilen.', wirkung: '35 % Holz · 20 % Stein · 35 % Nahrung · 10 % Träger' },
  { id: 'wachstum', name: 'Wachstum', text: 'Mehr Nahrung, damit Familien wachsen.', wirkung: '35 % Holz · 10 % Stein · 45 % Nahrung · 10 % Träger' },
  { id: 'vorraete', name: 'Vorräte', text: 'Sicherheit vor Tempo: großer Nahrungspuffer.', wirkung: '25 % Holz · 15 % Stein · 50 % Nahrung · 10 % Träger' },
  { id: 'handwerk', name: 'Handwerk', text: 'Baustoffe für Werkstätten und Ausbau.', wirkung: '40 % Holz · 30 % Stein · 30 % Nahrung' },
];

export function DorfPanel({ ctrl, onSchliessen, onKameraAuf }: PanelProps) {
  const sim = ctrl.sim;
  const s = sim.state;
  const [tab, setTab] = useState<'steuerung' | 'bewohner' | 'lager' | 'protokoll'>('steuerung');
  const [gewaehlt, setGewaehlt] = useState<number | null>(null);

  return (
    <aside className="panel tafel" aria-label="Dorf">
      <Kopf titel={s.dorfname} onSchliessen={onSchliessen} />
      <div className="reihe" role="tablist">
        {(['steuerung', 'bewohner', 'lager', 'protokoll'] as const).map((t) => (
          <button key={t} className="knopf klein" aria-pressed={tab === t} role="tab" onClick={() => setTab(t)}>
            {t === 'steuerung' ? 'Steuerung' : t === 'bewohner' ? 'Bewohner' : t === 'lager' ? 'Lager' : 'Protokoll'}
          </button>
        ))}
      </div>

      {tab === 'steuerung' && (
        <div>
          <h3>Strategie</h3>
          <div className="karten">
            {STRATEGIEN.map((st) => (
              <button
                key={st.id}
                className="karte"
                aria-pressed={s.policy.strategie === st.id}
                onClick={() => ctrl.befehl({ art: 'strategie', wert: st.id })}
              >
                <div className="zeile">
                  <span className="titel">{st.name}</span>
                  {s.policy.strategie === st.id ? <span className="marke gut">aktiv</span> : null}
                </div>
                <p className="text">{st.text}</p>
                <p className="text">
                  <strong>Verteilung nach dem Umschalten:</strong> {st.wirkung}
                </p>
              </button>
            ))}
          </div>

          <h3>Regler</h3>
          <Regler
            titel="Bauanteil"
            wert={s.policy.bauanteil}
            min={0}
            max={1}
            schritt={0.05}
            einheit=""
            hinweis={`Höchstens ${Math.round(s.policy.bauanteil * 100)} % der frei verfügbaren Baustoffe gehen in neue Baustellen. Dringende Engpässe (kein Lager, volles Lager, kein Wohnraum) dürfen diese Grenze überschreiten, halten aber die Mindestreserve ein.`}
            onAendern={(w) => ctrl.befehl({ art: 'bauanteil', wert: w })}
          />
          <Regler
            titel="Holzreserve"
            wert={s.policy.holzreserve}
            min={0}
            max={200}
            schritt={5}
            hinweis="Diese Menge Holz rührt der Autobau nie an."
            onAendern={(w) => ctrl.befehl({ art: 'holzreserve', wert: w })}
          />
          <Regler
            titel="Nahrungsziel"
            wert={s.policy.nahrungsziel}
            min={20}
            max={600}
            schritt={10}
            hinweis={`Aktuell ${Math.round(sim.nahrung)} Nahrung im Lager, Bilanz ${nahrungsbilanz(sim).toFixed(1)}/min. Für Nachwuchs sind ${Math.round(nahrungspufferZiel(sim))} nötig (zwei Spieltage).`}
            onAendern={(w) => ctrl.befehl({ art: 'nahrungsziel', wert: w })}
          />

          <div className="reihe" style={{ marginTop: 10 }}>
            <button className="knopf klein" onClick={() => ctrl.befehl({ art: 'autobau', wert: !s.policy.autobau })}>
              Autobau: {s.policy.autobau ? 'an' : 'pausiert'}
            </button>
            <button className="knopf klein" onClick={() => ctrl.befehl({ art: 'roden', wert: !s.policy.rodenErlaubt })}>
              Roden: {s.policy.rodenErlaubt ? 'freigegeben' : 'gesperrt'}
            </button>
            <button
              className="knopf klein"
              onClick={() => {
                const e = notration(ctrl.sim);
                ctrl.melde(e.meldung, e.ok ? 'info' : 'fehler');
              }}
              title="Notration gegen Münzen kaufen, wenn die Nahrung ausgeht"
            >
              Notration kaufen (10 Münzen)
            </button>
          </div>
        </div>
      )}

      {tab === 'bewohner' && (
        <div>
          <p className="leise">
            {s.residents.length} Einwohner, davon {s.residents.filter((r) => r.stage === 'kind').length} Kinder.
            Kinder arbeiten nicht.
          </p>
          <div className="karten">
            {s.residents.map((r) => (
              <div key={r.id} className="karte" aria-pressed={gewaehlt === r.id}>
                <button
                  style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}
                  onClick={() => setGewaehlt(gewaehlt === r.id ? null : r.id)}
                >
                  <div className="zeile">
                    <span className="titel">
                      {r.favorit ? '★ ' : ''}
                      {r.name}
                    </span>
                    <span className="marke">{r.stage === 'kind' ? 'Kind' : JOB_INFO[r.beruf].name}</span>
                  </div>
                  <p className="text">{statusText(sim, r)}</p>
                </button>
                {gewaehlt === r.id && (
                  <div style={{ marginTop: 8 }}>
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
                          <td>Wohnung</td>
                          <td>{r.wohnung ? BUILDING_BY_ID[sim.gebaeude(r.wohnung)?.type ?? '']?.name ?? '–' : 'keine'}</td>
                        </tr>
                        <tr>
                          <td>Fähigkeit {JOB_INFO[r.beruf].name}</td>
                          <td>{Math.round(r.faehigkeiten[r.beruf] ?? 0)}</td>
                        </tr>
                      </tbody>
                    </table>
                    <p className="leise">
                      Charakter: {r.traits.map((t) => TRAIT_INFO[t].name).join(', ')} –{' '}
                      {r.traits.map((t) => TRAIT_INFO[t].text).join(' ')}
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
                      <button
                        className="knopf klein"
                        onClick={() => {
                          const name = window.prompt('Neuer Name', r.name);
                          if (name) ctrl.befehl({ art: 'umbenennen', bewohner: r.id, name });
                        }}
                      >
                        Umbenennen
                      </button>
                    </div>
                    {r.stage !== 'kind' && (
                      <label style={{ display: 'block', marginTop: 8 }}>
                        Beruf festlegen:{' '}
                        <select
                          value={r.berufFixiert ? r.beruf : ''}
                          onChange={(e) =>
                            ctrl.befehl({
                              art: 'beruf',
                              bewohner: r.id,
                              beruf: e.target.value ? (e.target.value as JobId) : null,
                            })
                          }
                        >
                          <option value="">Dorfplanung entscheidet</option>
                          {JOB_IDS.map((j) => (
                            <option key={j} value={j}>
                              {JOB_INFO[j].name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'lager' && (
        <div>
          <p className="leise">
            Belegt: {Math.round(sim.belegung)} von {Math.round(sim.kapazitaet)} Plätzen. Münzen, Forschung und
            Ansehen brauchen keinen Lagerplatz.
          </p>
          <Balken anteil={sim.belegung / sim.kapazitaet} />
          <Lagerliste ctrl={ctrl} />
        </div>
      )}

      {tab === 'protokoll' && (
        <div className="protokoll">
          {[...s.log].reverse().map((e, i) => (
            <div key={`${e.tick}-${i}`} className={e.art}>
              <span className="leise">{Math.floor(e.tick / 600)} min · </span>
              {e.text}
            </div>
          ))}
          {!s.log.length && <span className="leise">Noch nichts passiert.</span>}
        </div>
      )}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Bauen
// ---------------------------------------------------------------------------

export function BauenPanel({ ctrl, onSchliessen, onBaumodus, bauTyp }: PanelProps) {
  const sim = ctrl.sim;
  const verfuegbar = verfuegbareGebaeude(sim);
  const kategorien = [...new Set(BUILDINGS.map((b) => b.kategorie))] as BuildingKategorie[];

  return (
    <aside className="panel tafel" aria-label="Bauen">
      <Kopf titel="Bauen" onSchliessen={onSchliessen} />
      <p className="leise">
        Gebäude auswählen, dann eine Kachel in der Welt antippen. Grün bedeutet frei, Rot zeigt den Grund an. Der
        blaue Rahmen markiert den Eingang; er muss erreichbar bleiben.
      </p>
      {bauTyp && (
        <div className="hinweis" style={{ margin: '8px 0' }}>
          Baumodus: {BUILDING_BY_ID[bauTyp].name}.{' '}
          <button className="knopf klein" onClick={() => onBaumodus(null)}>
            Abbrechen
          </button>
        </div>
      )}
      {kategorien.map((kat) => {
        const liste = BUILDINGS.filter((b) => b.kategorie === kat);
        return (
          <div key={kat}>
            <h3>{KATEGORIE_NAME[kat]}</h3>
            <div className="karten">
              {liste.map((def) => {
                const frei = verfuegbar.includes(def);
                const { bezahlbar } = kostenVorschau(sim, { art: 'bauen', typ: def.id, x: 0, y: 0 });
                const vorhanden = sim.state.buildings.filter((b) => b.type === def.id).length;
                return (
                  <button
                    key={def.id}
                    className="karte"
                    aria-pressed={bauTyp === def.id}
                    disabled={!frei}
                    onClick={() => onBaumodus(bauTyp === def.id ? null : def.id)}
                  >
                    <div className="zeile">
                      <span className="titel">{def.name}</span>
                      <span className="marke">{vorhanden > 0 ? `${vorhanden}× gebaut` : 'neu'}</span>
                    </div>
                    <p className="text">{def.beschreibung}</p>
                    <Kosten kosten={def.kosten} vorrat={sim.state.store} />
                    <p className="text">
                      Bauzeit {Math.round(def.bauarbeit * sim.boni.bauzeit)} s
                      {def.wohnplaetze ? ` · ${def.wohnplaetze} Wohnplätze` : ''}
                      {def.arbeitsplaetze ? ` · ${def.arbeitsplaetze} Arbeitsplätze` : ''}
                      {def.lager ? ` · Lager +${def.lager}` : ''}
                      {def.rezept
                        ? ` · ${formatRezept(def.rezept.ein)} → ${formatRezept(def.rezept.aus)} je ${def.rezept.dauer} s`
                        : ''}
                      {` · bis Stufe ${def.maxStufe}`}
                    </p>
                    {def.umdeutung ? <p className="text">Grafik: {def.umdeutung}</p> : null}
                    {!frei ? (
                      <p className="text">
                        <strong>Noch gesperrt:</strong> {sperrgrund(sim, def.id)}
                      </p>
                    ) : !bezahlbar ? (
                      <p className="text">Die Baustoffe reichen noch nicht.</p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </aside>
  );
}

function formatRezept(store: Partial<Record<ResourceId, number>>): string {
  const teile = (Object.entries(store) as [ResourceId, number][]).map(([id, n]) => `${n} ${RESOURCES[id].name}`);
  return teile.length ? teile.join(' + ') : 'nichts';
}

function sperrgrund(sim: Spielcontroller['sim'], id: string): string {
  const def = BUILDING_BY_ID[id];
  const b = def.benoetigt;
  if (!b) return 'unbekannt';
  if (b.forschung && !sim.state.research.abgeschlossen.includes(b.forschung)) {
    return `Forschung „${RESEARCH_BY_ID[b.forschung]?.name}“ fehlt.`;
  }
  if (b.einwohner && sim.state.residents.length < b.einwohner) return `Ab ${b.einwohner} Einwohnern.`;
  if (b.gebaeude) return `Braucht zuerst: ${BUILDING_BY_ID[b.gebaeude]?.name}.`;
  if (b.region) return `Region ${b.region} muss erschlossen sein.`;
  return 'Voraussetzung fehlt.';
}

// ---------------------------------------------------------------------------
// Forschung
// ---------------------------------------------------------------------------

export function ForschungPanel({ ctrl, onSchliessen }: PanelProps) {
  const sim = ctrl.sim;
  const s = sim.state;
  const aeste = [...new Set(RESEARCH.map((r) => r.ast))] as Forschungsast[];
  const aktiv = s.research.aktiv ? RESEARCH_BY_ID[s.research.aktiv] : null;

  return (
    <aside className="panel tafel" aria-label="Forschung">
      <Kopf titel="Forschung" onSchliessen={onSchliessen} />
      <p className="leise">
        Forschungspunkte entstehen durch beschäftigte Gelehrte im Rathaus und in der Gelehrtenstube. Vorrat:{' '}
        {zahl(s.store.forschung ?? 0)} Punkte.
      </p>
      {aktiv && (
        <div className="tafel" style={{ padding: 10, margin: '8px 0' }}>
          <strong>{aktiv.name}</strong>
          <Balken
            anteil={s.research.fortschritt / aktiv.kosten}
            beschriftung={`${Math.round(s.research.fortschritt)} / ${aktiv.kosten} Punkte`}
          />
          <p className="leise">{aktiv.wirkung}</p>
        </div>
      )}
      {aeste.map((ast) => (
        <div key={ast}>
          <h3>{AST_NAME[ast]}</h3>
          <div className="karten">
            {RESEARCH.filter((r) => r.ast === ast).map((def) => {
              const fertig = s.research.abgeschlossen.includes(def.id);
              const offen = def.braucht.filter((id) => !s.research.abgeschlossen.includes(id));
              return (
                <button
                  key={def.id}
                  className="karte"
                  disabled={fertig || offen.length > 0 || s.research.aktiv === def.id}
                  aria-pressed={s.research.aktiv === def.id}
                  onClick={() => ctrl.befehl({ art: 'forschung', id: def.id })}
                >
                  <div className="zeile">
                    <span className="titel">{def.name}</span>
                    <span className={`marke ${fertig ? 'gut' : ''}`}>
                      {fertig ? 'erforscht' : `${def.kosten} Punkte`}
                    </span>
                  </div>
                  <p className="text">{def.beschreibung}</p>
                  <p className="text">
                    <strong>Wirkung:</strong> {def.wirkung}
                  </p>
                  {offen.length > 0 && (
                    <p className="text">Zuerst nötig: {offen.map((id) => RESEARCH_BY_ID[id].name).join(', ')}</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Handel
// ---------------------------------------------------------------------------

export function HandelPanel({ ctrl, onSchliessen }: PanelProps) {
  const sim = ctrl.sim;
  const s = sim.state;
  const maerkte = s.buildings.filter((b) => b.type === 'markt' && b.status === 'aktiv');
  const werften = s.buildings.filter((b) => b.type === 'werft' && b.status === 'aktiv');

  return (
    <aside className="panel tafel" aria-label="Handel">
      <Kopf titel="Handel" onSchliessen={onSchliessen} />
      <p className="leise">
        Münzen entstehen ausschließlich aus echten Verkäufen und Dienstleistungen. Es gibt keinen zusätzlichen
        unsichtbaren Multiplikator auf dieselbe Arbeit.
      </p>
      <table className="werte">
        <tbody>
          <tr>
            <td>Märkte</td>
            <td>{maerkte.length}</td>
          </tr>
          <tr>
            <td>Werften</td>
            <td>{werften.length}</td>
          </tr>
          <tr>
            <td>Handelsbonus</td>
            <td>{Math.round(sim.boni.handel * 100)} %</td>
          </tr>
          <tr>
            <td>Münzen je Minute</td>
            <td>{(s.raten.muenzen ?? 0).toFixed(1)}</td>
          </tr>
          <tr>
            <td>Ansehen</td>
            <td>{zahl(s.store.ansehen ?? 0)}</td>
          </tr>
        </tbody>
      </table>

      <h3>Überschüsse</h3>
      <p className="leise">
        Der Markt verkauft, was über der Reserve liegt. Ohne Überschuss bleibt der Stand still – das ist kein
        Fehler, sondern fehlende Produktion.
      </p>
      <table className="werte">
        <tbody>
          {RESOURCE_IDS.filter((id) => RESOURCES[id].lagert && (s.store[id] ?? 0) > 25).map((id) => (
            <tr key={id}>
              <td>
                <Icon name={id} groesse={16} titel={RESOURCES[id].name} /> {RESOURCES[id].name} · {RESOURCES[id].wert.toFixed(1)} Münzen je Einheit
              </td>
              <td>{zahl(s.store[id] ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Berater</h3>
      <p className="leise">Höchstens {MAX_BERATER} Berater gleichzeitig. Boni stapeln sich nicht unbegrenzt.</p>
      <div className="karten">
        {CHAMPIONS.map((c) => {
          const bekannt = s.champions.includes(c.id);
          const aktiv = s.beraterAktiv.includes(c.id);
          return (
            <button
              key={c.id}
              className="karte"
              disabled={!bekannt}
              aria-pressed={aktiv}
              onClick={() => {
                const neu = aktiv
                  ? s.beraterAktiv.filter((x) => x !== c.id)
                  : [...s.beraterAktiv, c.id].slice(-MAX_BERATER);
                ctrl.befehl({ art: 'berater', ids: neu });
              }}
            >
              <div className="zeile">
                <span className="titel">
                  {c.name} – {c.rolle}
                </span>
                <span className={`marke ${aktiv ? 'gut' : ''}`}>
                  {aktiv ? 'Berater' : bekannt ? 'verfügbar' : 'unbekannt'}
                </span>
              </div>
              <p className="text">{c.beschreibung}</p>
              <p className="text">Quest: {c.quest}</p>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Welt
// ---------------------------------------------------------------------------

export function WeltPanel({ ctrl, onSchliessen, onKameraAuf }: PanelProps) {
  const sim = ctrl.sim;
  const s = sim.state;
  return (
    <aside className="panel tafel" aria-label="Welt">
      <Kopf titel="Welt" onSchliessen={onSchliessen} />
      <h3>Regionen</h3>
      <div className="karten">
        {REGIONS.map((def) => {
          const offen = s.regionen.includes(def.id);
          const forschungFehlt = def.forschung && !s.research.abgeschlossen.includes(def.forschung);
          const { bezahlbar } = kostenVorschau(sim, { art: 'region', id: def.id });
          return (
            <div key={def.id} className="karte">
              <div className="zeile">
                <span className="titel">{def.name}</span>
                <span className={`marke ${offen ? 'gut' : ''}`}>{offen ? 'erschlossen' : 'verschlossen'}</span>
              </div>
              <p className="text">{def.beschreibung}</p>
              {!offen && (
                <>
                  <Kosten kosten={def.kosten} vorrat={s.store} />
                  {forschungFehlt && (
                    <p className="text">Zuerst forschen: {RESEARCH_BY_ID[def.forschung!].name}</p>
                  )}
                  <button
                    className="knopf klein haupt"
                    disabled={!!forschungFehlt || !bezahlbar}
                    onClick={() => ctrl.befehl({ art: 'region', id: def.id })}
                  >
                    Erschließen
                  </button>
                </>
              )}
              {offen && (
                <button className="knopf klein" onClick={() => onKameraAuf(def.x + def.w / 2, def.y + def.h / 2)}>
                  Ansehen
                </button>
              )}
            </div>
          );
        })}
      </div>

      <h3>Aufträge</h3>
      <div className="karten">
        {QUESTS.map((def) => {
          const eintrag = s.quests.find((q) => q.id === def.id);
          const fertig = eintrag?.status !== 'offen' && !!eintrag;
          return (
            <div key={def.id} className="karte">
              <div className="zeile">
                <span className="titel">{def.name}</span>
                <span className={`marke ${fertig ? 'gut' : ''}`}>
                  {fertig ? 'erfüllt' : `Kapitel ${def.kapitel}`}
                </span>
              </div>
              <p className="text">{def.text}</p>
              {!fertig && <Balken anteil={eintrag?.fortschritt ?? 0} />}
              <Kosten kosten={def.belohnung} vorrat={s.store} />
            </div>
          );
        })}
      </div>
    </aside>
  );
}

export function panelFuer(bereich: string): (props: PanelProps) => ReactElement {
  switch (bereich) {
    case 'bauen':
      return BauenPanel;
    case 'forschung':
      return ForschungPanel;
    case 'handel':
      return HandelPanel;
    case 'welt':
      return WeltPanel;
    default:
      return DorfPanel;
  }
}

export { istFreigeschaltet };
