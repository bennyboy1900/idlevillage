import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type Phaser from 'phaser';
import { starteRenderer, type Auswahl, type WeltSzene } from '../game/render/scene';
import { BUILDING_BY_ID } from '../game/content/buildings';
import { RESOURCES } from '../game/content/resources';
import { formatiereDauer } from '../game/simulation/offline';
import type { ResourceId } from '../game/core/types';
import type { Spielcontroller } from './spielcontroller';
import { Lagerliste, Meldungen, Navigation, Ressourcenleiste, Zielspalte, type Bereich } from './Hud';
import { panelFuer } from './Panels';
import { Inspektor } from './Inspektor';
import { Einstellungsdialog } from './Einstellungen';
import { Icon, zahl } from './bausteine';

/** Löst ein Rendern aus, wenn sich der Spielzustand ändert. */
function useSpielstand(ctrl: Spielcontroller) {
  return useSyncExternalStore(ctrl.abonniere, ctrl.schnappschuss, ctrl.schnappschuss);
}

export function Spielansicht({ ctrl, onHauptmenue }: { ctrl: Spielcontroller; onHauptmenue: () => void }) {
  useSpielstand(ctrl);
  const behaelter = useRef<HTMLDivElement>(null);
  const spiel = useRef<Phaser.Game | null>(null);
  const szene = useRef<(() => WeltSzene | undefined) | null>(null);
  const [bereich, setBereich] = useState<Bereich>(null);
  const [auswahl, setAuswahl] = useState<Auswahl | null>(null);
  const [bauTyp, setBauTyp] = useState<string | null>(null);
  const [bauplatz, setBauplatz] = useState<{ x: number; y: number; ok: boolean; grund: string } | null>(null);
  const [verschiebt, setVerschiebt] = useState<number | null>(null);
  const [zeigeEinstellungen, setZeigeEinstellungen] = useState(false);
  const [zeigeLager, setZeigeLager] = useState(false);
  const [kompakt, setKompakt] = useState(window.innerWidth < 900);

  // -- Renderer starten ----------------------------------------------------
  useEffect(() => {
    if (!behaelter.current) return;
    const { game, szene: hole } = starteRenderer(behaelter.current, ctrl.sim, {
      onAuswahl: (a) => {
        setAuswahl(a);
        hole()?.zeigeAuswahl(a);
      },
      onBauplatz: (x, y, ok, grund) => setBauplatz({ x, y, ok, grund }),
      onKamera: (x, y) => {
        ctrl.mixer.hoererX = x;
        ctrl.mixer.hoererY = y;
      },
    });
    spiel.current = game;
    szene.current = hole;
    return () => {
      game.destroy(true);
      spiel.current = null;
    };
  }, [ctrl]);

  // -- Fenstergröße, Sichtbarkeit, Audio ----------------------------------
  useEffect(() => {
    const beiGroesse = () => setKompakt(window.innerWidth < 900);
    window.addEventListener('resize', beiGroesse);
    window.addEventListener('orientationchange', beiGroesse);
    const beiSichtbar = () => {
      void ctrl.mixer.sichtbarkeit(!document.hidden);
      if (document.hidden) void ctrl.speichereJetzt();
    };
    document.addEventListener('visibilitychange', beiSichtbar);
    const beiVerlassen = () => void ctrl.speichereJetzt();
    window.addEventListener('pagehide', beiVerlassen);
    return () => {
      window.removeEventListener('resize', beiGroesse);
      window.removeEventListener('orientationchange', beiGroesse);
      document.removeEventListener('visibilitychange', beiSichtbar);
      window.removeEventListener('pagehide', beiVerlassen);
    };
  }, [ctrl]);

  // Der Baumodus lebt in der Szene, damit die Vorschau mitläuft.
  useEffect(() => {
    const s = szene.current?.();
    if (s) s.bauTyp = bauTyp;
    if (!bauTyp) setBauplatz(null);
  }, [bauTyp]);

  useEffect(() => {
    const s = szene.current?.();
    if (s) s.reduzierteBewegung = ctrl.einstellungen.reduzierteBewegung;
  }, [ctrl.einstellungen.reduzierteBewegung]);

  const kameraAuf = useCallback((x: number, y: number) => {
    szene.current?.()?.kameraAuf(x, y);
  }, []);

  const bestaetigeBau = useCallback(() => {
    if (!bauplatz || !bauTyp) return;
    if (verschiebt !== null) {
      const ergebnis = ctrl.befehl({ art: 'verschieben', id: verschiebt, x: bauplatz.x, y: bauplatz.y });
      if (ergebnis.ok) {
        setVerschiebt(null);
        setBauTyp(null);
      }
      return;
    }
    const ergebnis = ctrl.befehl({ art: 'bauen', typ: bauTyp, x: bauplatz.x, y: bauplatz.y });
    if (ergebnis.ok) {
      ctrl.melde(ergebnis.meldung, 'bau');
      setBauplatz(null);
    }
  }, [bauplatz, bauTyp, ctrl, verschiebt]);

  const Panel = useMemo(() => (bereich ? panelFuer(bereich) : null), [bereich]);
  const bericht = ctrl.offlineBericht;

  return (
    <div className="spiel">
      <Ressourcenleiste ctrl={ctrl} kompakt={kompakt} onLager={() => setZeigeLager(true)} />

      <div className="buehne">
        <div className="welt" ref={behaelter} />

        {!bereich && <Zielspalte ctrl={ctrl} />}

        {auswahl && !bereich && !bauTyp && (
          <Inspektor
            ctrl={ctrl}
            auswahl={auswahl}
            onSchliessen={() => {
              setAuswahl(null);
              szene.current?.()?.zeigeAuswahl(null);
            }}
            onKameraAuf={kameraAuf}
            onVerschieben={(id) => {
              const b = ctrl.sim.gebaeude(id);
              if (!b) return;
              setVerschiebt(id);
              setBauTyp(b.type);
              setAuswahl(null);
              ctrl.melde('Neuen Standort antippen und bestätigen.', 'info');
            }}
          />
        )}

        {Panel && (
          <Panel
            ctrl={ctrl}
            onSchliessen={() => setBereich(null)}
            onBaumodus={(typ) => {
              setBauTyp(typ);
              setVerschiebt(null);
              if (typ && kompakt) setBereich(null);
            }}
            bauTyp={bauTyp}
            onKameraAuf={kameraAuf}
          />
        )}

        {bauTyp && bauplatz && (
          <div className="tafel" style={{ position: 'absolute', left: '50%', bottom: 16, transform: 'translateX(-50%)', padding: 12, zIndex: 9, width: 'min(420px, calc(100% - 24px))' }}>
            <strong>
              {verschiebt !== null ? 'Umzug: ' : ''}
              {BUILDING_BY_ID[bauTyp].name} bei {bauplatz.x}/{bauplatz.y}
            </strong>
            <p className={bauplatz.ok ? 'leise' : 'hinweis'} style={{ marginTop: 6 }}>
              <Icon name={bauplatz.ok ? 'ja' : 'nein'} groesse={16} titel={bauplatz.ok ? 'möglich' : 'nicht möglich'} />{' '}
              {bauplatz.grund}
            </p>
            <div className="reihe">
              <button className="knopf haupt" disabled={!bauplatz.ok} onClick={bestaetigeBau}>
                {verschiebt !== null ? 'Hierher verschieben' : 'Hier bauen'}
              </button>
              <button
                className="knopf leise"
                onClick={() => {
                  setBauTyp(null);
                  setVerschiebt(null);
                }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}

        <Meldungen ctrl={ctrl} />
      </div>

      <Navigation aktiv={bereich} onWechsel={setBereich} onEinstellungen={() => setZeigeEinstellungen(true)} />

      {zeigeLager && (
        <div className="ueberlagerung" onClick={() => setZeigeLager(false)}>
          <div className="dialog tafel" onClick={(e) => e.stopPropagation()}>
            <div className="panel-kopf">
              <h2>Lager</h2>
              <button className="knopf klein leise" onClick={() => setZeigeLager(false)}>
                Schließen
              </button>
            </div>
            <Lagerliste ctrl={ctrl} />
          </div>
        </div>
      )}

      {zeigeEinstellungen && (
        <Einstellungsdialog
          ctrl={ctrl}
          onSchliessen={() => setZeigeEinstellungen(false)}
          onHauptmenue={onHauptmenue}
        />
      )}

      {bericht && (
        <div className="ueberlagerung">
          <div className="dialog tafel">
            <h2>Während deiner Abwesenheit</h2>
            <p className="leise">
              Nachgerechnet wurden {formatiereDauer(bericht.sekunden)}
              {bericht.abgeschnitten > 60
                ? ` – ${formatiereDauer(bericht.abgeschnitten)} lagen über dem aktuellen Limit von ${ctrl.sim.boni.offlineStunden} Stunden.`
                : '.'}
            </p>
            <h3>Gewonnen</h3>
            <ZeileStore store={bericht.gewinn} />
            <h3>Verbraucht</h3>
            <ZeileStore store={bericht.verlust} />
            <p>
              Neue Gebäude: {bericht.haeuser} · Neue Bewohner: {bericht.neueBewohner}
            </p>
            {bericht.engpaesse.length > 0 && (
              <p className="hinweis">Engpässe bei der Rückkehr: {bericht.engpaesse.join(', ')}</p>
            )}
            <p className="leise">
              Die Nachrechnung nutzt dieselben Rezepte und Kapazitäten wie das laufende Spiel, rechnet aber in
              Ein-Sekunden-Blöcken. Transporte wirken dadurch als Durchsatz statt als einzelne Wege.
            </p>
            <button className="knopf haupt" onClick={() => ctrl.schliesseBericht()}>
              Weiterspielen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ZeileStore({ store }: { store: Partial<Record<ResourceId, number>> }) {
  const eintraege = Object.entries(store) as [ResourceId, number][];
  if (!eintraege.length) return <p className="leise">nichts</p>;
  return (
    <div className="kosten">
      {eintraege.map(([id, n]) => (
        <span key={id}>
          <Icon name={id} groesse={16} titel={RESOURCES[id].name} /> {zahl(n)} {RESOURCES[id].name}
        </span>
      ))}
    </div>
  );
}
