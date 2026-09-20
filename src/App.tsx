import { useCallback, useEffect, useRef, useState } from 'react';
import { neuesSpiel } from './game/simulation/state';
import { laden, speichern, type Slot } from './game/persistence/save';
import { Spielcontroller } from './ui/spielcontroller';
import { Spielansicht } from './ui/Spielansicht';
import { Startmenue } from './ui/Startmenue';
import { Galerie } from './ui/Galerie';

type Ansicht = 'menue' | 'spiel' | 'galerie';

export default function App() {
  const [ansicht, setAnsicht] = useState<Ansicht>('menue');
  const [ctrl, setCtrl] = useState<Spielcontroller | null>(null);
  const [fehler, setFehler] = useState('');
  const audioFrei = useRef(false);

  // Audio darf erst nach einer echten Nutzerinteraktion starten.
  useEffect(() => {
    const frei = () => {
      if (audioFrei.current || !ctrl) return;
      audioFrei.current = true;
      void ctrl.mixer.freischalten();
    };
    window.addEventListener('pointerdown', frei);
    window.addEventListener('keydown', frei);
    return () => {
      window.removeEventListener('pointerdown', frei);
      window.removeEventListener('keydown', frei);
    };
  }, [ctrl]);

  const starte = useCallback((neuer: Spielcontroller) => {
    setCtrl((alt) => {
      alt?.stop();
      return neuer;
    });
    neuer.start();
    setAnsicht('spiel');
  }, []);

  const fortsetzen = useCallback(
    async (slot: Slot) => {
      try {
        const stand = await laden(slot);
        if (!stand) {
          setFehler('Dieser Spielstand ließ sich nicht lesen – auch die Sicherung nicht.');
          return;
        }
        const gespeichertAm = stand.gespeichertAm;
        const neuer = new Spielcontroller(stand, slot);
        // Offline-Fortschritt genau einmal, bevor die Schleife läuft.
        neuer.rechneOffline(gespeichertAm);
        starte(neuer);
      } catch (e) {
        setFehler(`Laden fehlgeschlagen: ${e instanceof Error ? e.message : 'unbekannter Fehler'}`);
      }
    },
    [starte],
  );

  const neuStarten = useCallback(
    async (slot: Slot, name: string, seed: number, modus: 'friedlich' | 'abenteuer') => {
      const stand = neuesSpiel({ seed, dorfname: name, modus });
      try {
        await speichern(slot, stand);
      } catch {
        setFehler('Der Spielstand konnte nicht angelegt werden. Das Spiel läuft, speichert aber nicht.');
      }
      starte(new Spielcontroller(stand, slot));
    },
    [starte],
  );

  useEffect(() => () => ctrl?.stop(), [ctrl]);

  if (ansicht === 'galerie') return <Galerie onZurueck={() => setAnsicht('menue')} />;

  if (ansicht === 'spiel' && ctrl) {
    return (
      <Spielansicht
        ctrl={ctrl}
        onHauptmenue={() => {
          ctrl.stop();
          setCtrl(null);
          setAnsicht('menue');
        }}
      />
    );
  }

  return (
    <>
      <Startmenue
        onFortsetzen={(slot) => void fortsetzen(slot)}
        onNeu={(slot, name, seed, modus) => void neuStarten(slot, name, seed, modus)}
        onGalerie={() => setAnsicht('galerie')}
      />
      {fehler && (
        <div className="ueberlagerung" onClick={() => setFehler('')}>
          <div className="dialog tafel" onClick={(e) => e.stopPropagation()}>
            <h2>Es gab ein Problem</h2>
            <p className="hinweis">{fehler}</p>
            <button className="knopf" onClick={() => setFehler('')}>
              Verstanden
            </button>
          </div>
        </div>
      )}
    </>
  );
}
