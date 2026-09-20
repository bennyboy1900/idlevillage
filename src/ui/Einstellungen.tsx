import { useState } from 'react';
import { exportiere, importiere, speichern } from '../game/persistence/save';
import { CUES, MUSIK } from '../game/audio/audio';
import type { Spielcontroller } from './spielcontroller';
import { Regler } from './bausteine';

export function Einstellungsdialog({
  ctrl,
  onSchliessen,
  onHauptmenue,
}: {
  ctrl: Spielcontroller;
  onSchliessen: () => void;
  onHauptmenue: () => void;
}) {
  const [tab, setTab] = useState<'audio' | 'anzeige' | 'stand' | 'credits'>('audio');
  const [importText, setImportText] = useState('');
  const [importFehler, setImportFehler] = useState('');
  const e = ctrl.einstellungen;

  return (
    <div className="ueberlagerung" onClick={onSchliessen}>
      <div className="dialog tafel" onClick={(ev) => ev.stopPropagation()} role="dialog" aria-label="Einstellungen">
        <div className="panel-kopf">
          <h2>Einstellungen</h2>
          <button className="knopf klein leise" onClick={onSchliessen}>
            Schließen
          </button>
        </div>
        <div className="reihe" role="tablist">
          {(['audio', 'anzeige', 'stand', 'credits'] as const).map((t) => (
            <button key={t} className="knopf klein" role="tab" aria-pressed={tab === t} onClick={() => setTab(t)}>
              {t === 'audio' ? 'Ton' : t === 'anzeige' ? 'Anzeige' : t === 'stand' ? 'Spielstand' : 'Credits'}
            </button>
          ))}
        </div>

        {tab === 'audio' && (
          <div>
            <p className="leise">
              Ton startet erst nach einer Interaktion – so verlangen es die Browser. Musik wird nur auf Anforderung
              geladen.
            </p>
            <Regler titel="Gesamt" wert={e.master} min={0} max={1} schritt={0.05} onAendern={(w) => ctrl.setzeEinstellungen({ master: w })} />
            <Regler titel="Musik" wert={e.musik} min={0} max={1} schritt={0.05} onAendern={(w) => ctrl.setzeEinstellungen({ musik: w })} />
            <Regler titel="Effekte" wert={e.effekte} min={0} max={1} schritt={0.05} onAendern={(w) => ctrl.setzeEinstellungen({ effekte: w })} />
            <Regler titel="Atmosphäre" wert={e.atmosphaere} min={0} max={1} schritt={0.05} onAendern={(w) => ctrl.setzeEinstellungen({ atmosphaere: w })} />
            <div className="reihe">
              <button className="knopf klein" onClick={() => void ctrl.mixer.musik('dorf')}>
                Dorfmusik an
              </button>
              <button className="knopf klein" onClick={() => void ctrl.mixer.musik(null)}>
                Musik aus
              </button>
            </div>
            <p className="leise">
              {MUSIK.dorf.name}: {MUSIK.dorf.hinweis}
            </p>
            <h3>Cue-Katalog</h3>
            <table className="werte">
              <tbody>
                {CUES.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.id}</strong> – {c.hinweis}
                    </td>
                    <td>
                      <button className="knopf klein" onClick={() => ctrl.mixer.spiele(c.id)}>
                        Hören
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'anzeige' && (
          <div>
            <label className="reihe" style={{ margin: '12px 0' }}>
              <input
                type="checkbox"
                checked={e.reduzierteBewegung}
                onChange={(ev) => ctrl.setzeEinstellungen({ reduzierteBewegung: ev.target.checked })}
              />
              Reduzierte Bewegung (Figurenanimationen anhalten)
            </label>
            <table className="werte">
              <tbody>
                <tr>
                  <td>Bilder je Sekunde</td>
                  <td>{ctrl.fps}</td>
                </tr>
                <tr>
                  <td>Simulationsschritte je Sekunde</td>
                  <td>{ctrl.schritteProSekunde}</td>
                </tr>
                <tr>
                  <td>Bewohner</td>
                  <td>{ctrl.sim.state.residents.length}</td>
                </tr>
                <tr>
                  <td>Gebäude</td>
                  <td>{ctrl.sim.state.buildings.length}</td>
                </tr>
                <tr>
                  <td>Rohstoffe in der Welt</td>
                  <td>{ctrl.sim.state.nodes.length}</td>
                </tr>
              </tbody>
            </table>
            <p className="leise">
              Steuerung: Ziehen bewegt die Kamera, Tippen wählt aus, zwei Finger zoomen. Mit den Pfeiltasten lässt
              sich die Kamera ebenfalls bewegen, „+“ und „−“ zoomen, „Esc“ schließt die Auswahl.
            </p>
          </div>
        )}

        {tab === 'stand' && (
          <div>
            <p className="leise">
              Automatisch gespeichert wird alle 30 Sekunden und bei jedem Wechsel in den Hintergrund. Der jeweils
              letzte gültige Stand bleibt als Sicherung erhalten.
            </p>
            {!ctrl.darfSpeichern && (
              <p className="hinweis">
                Ein anderer Tab führt dieses Spiel. Dieser Tab speichert nicht, um Spielstände nicht zu überschreiben.
              </p>
            )}
            <div className="reihe">
              <button
                className="knopf"
                onClick={async () => {
                  const ok = await ctrl.speichereJetzt();
                  ctrl.melde(ok ? 'Gespeichert.' : 'Nicht gespeichert.', ok ? 'erfolg' : 'warnung');
                }}
              >
                Jetzt speichern
              </button>
              <button
                className="knopf"
                onClick={() => {
                  const text = exportiere(ctrl.sim.state);
                  const blob = new Blob([text], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${ctrl.sim.state.dorfname}-wurzelhain.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Exportieren
              </button>
            </div>
            <h3>Importieren</h3>
            <textarea
              value={importText}
              onChange={(ev) => setImportText(ev.target.value)}
              placeholder="Exportierten JSON-Text hier einfügen"
              style={{ width: '100%', minHeight: 100 }}
            />
            {importFehler && <p className="hinweis">{importFehler}</p>}
            <button
              className="knopf"
              onClick={async () => {
                const ergebnis = importiere(importText);
                if (!ergebnis.ok) {
                  setImportFehler(ergebnis.fehler);
                  return;
                }
                setImportFehler('');
                await speichern(ctrl.slot, ergebnis.state);
                ctrl.melde('Import gespeichert. Das Spiel wird neu geladen.', 'erfolg');
                window.location.reload();
              }}
            >
              Import prüfen und übernehmen
            </button>
            <h3>Zurück</h3>
            <button
              className="knopf"
              onClick={async () => {
                await ctrl.speichereJetzt();
                onHauptmenue();
              }}
            >
              Speichern und zum Hauptmenü
            </button>
          </div>
        )}

        {tab === 'credits' && <Credits />}
      </div>
    </div>
  );
}

export function Credits() {
  return (
    <div>
      <h3>Grafik</h3>
      <p>
        <strong>MiniWorld Sprites</strong> von Shade – 16×16-Pixelgrafik für Welt, Gebäude, Figuren und Monster.
        Shades Guide erlaubt die Nutzung in kommerziellen und nichtkommerziellen Projekten sowie Bearbeitung,
        verlangt keine Credits und untersagt den Verkauf der Assets als solche. Der Dank an Shade steht hier
        trotzdem. Quelle:{' '}
        <a href="https://merchant-shade.itch.io/16x16-mini-world-sprites" target="_blank" rel="noreferrer">
          merchant-shade.itch.io
        </a>
      </p>
      <h3>Musik</h3>
      <p>
        <strong>Minifantasy Dungeon Music</strong> von Leohpaz. Die beiliegende Lizenzdatei erlaubt die Nutzung im
        Projekt, untersagt aber den separaten Verkauf oder die kostenlose Weiterverteilung des Assetpacks. Credits
        sind freiwillig. Quelle:{' '}
        <a href="https://www.patreon.com/leohpaz" target="_blank" rel="noreferrer">
          patreon.com/leohpaz
        </a>
      </p>
      <h3>Oberfläche, Schrift und Effekte</h3>
      <p>
        Für die Ordner <code>ui/</code>, <code>font/</code> und <code>sfx/</code> liegt in diesem Repository keine
        eigene Lizenzdatei vor. Herkunft und Lizenzstatus sind damit <strong>noch zu ergänzen</strong>. Die
        Aussagen oben gelten ausdrücklich nur für die jeweils genannten Ordner und nicht pauschal für alle
        Dateien. Das Spiel bietet bewusst keinen Download der Assetpacks an.
      </p>
      <h3>Prozedurale Töne</h3>
      <p>
        Für Holzfällen, Steinklopfen, Werkstattarbeit, Bauabschluss, Forschung und Oberflächenklicks gibt es keine
        passenden Dateien im Projekt. Diese Geräusche werden zur Laufzeit als kurze Web-Audio-Töne erzeugt.
      </p>
    </div>
  );
}
