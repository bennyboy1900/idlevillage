import { useEffect, useState } from 'react';
import { DORFNAMEN } from '../game/content/names';
import { SLOTS, loeschen, slotUebersicht, type Slot, type SlotInfo } from '../game/persistence/save';
import { formatiereDauer } from '../game/simulation/offline';
import { Credits } from './Einstellungen';

export function Startmenue({
  onFortsetzen,
  onNeu,
  onGalerie,
}: {
  onFortsetzen: (slot: Slot) => void;
  onNeu: (slot: Slot, name: string, seed: number, modus: 'friedlich' | 'abenteuer') => void;
  onGalerie: () => void;
}) {
  const [slots, setSlots] = useState<(SlotInfo | null)[]>([]);
  const [ansicht, setAnsicht] = useState<'start' | 'neu' | 'credits'>('start');
  const [zielSlot, setZielSlot] = useState<Slot>(0);
  const [name, setName] = useState(DORFNAMEN[0]);
  const [seedText, setSeedText] = useState('');
  const [modus, setModus] = useState<'friedlich' | 'abenteuer'>('friedlich');
  const [laedt, setLaedt] = useState(true);

  const aktualisiere = () => {
    void slotUebersicht()
      .then(setSlots)
      .catch(() => setSlots([null, null, null]))
      .finally(() => setLaedt(false));
  };
  useEffect(aktualisiere, []);

  return (
    <div className="startmenue">
      <div className="startkarte tafel">
        <h1>Wurzelhain</h1>
        <p className="unterzeile">Ein Dorf lebt weiter – auch wenn du nur zuschaust.</p>

        {ansicht === 'start' && (
          <>
            <div className="slots">
              {laedt && <p className="leise">Spielstände werden gelesen …</p>}
              {!laedt &&
                SLOTS.map((slot) => {
                  const info = slots[slot];
                  return (
                    <div key={slot} className="karte">
                      <div className="zeile">
                        <span className="titel">
                          Platz {slot + 1}
                          {info ? `: ${info.dorfname}` : ''}
                        </span>
                        {info ? (
                          <span className="marke">
                            {info.einwohner} Einwohner · {formatiereDauer(info.spielzeit)}
                          </span>
                        ) : (
                          <span className="marke">frei</span>
                        )}
                      </div>
                      <div className="reihe" style={{ marginTop: 8 }}>
                        {info ? (
                          <>
                            <button className="knopf haupt" onClick={() => onFortsetzen(slot)}>
                              Fortsetzen
                            </button>
                            <button
                              className="knopf klein leise"
                              onClick={() => {
                                if (window.confirm(`Platz ${slot + 1} wirklich löschen?`)) {
                                  void loeschen(slot).then(aktualisiere);
                                }
                              }}
                            >
                              Löschen
                            </button>
                          </>
                        ) : (
                          <button
                            className="knopf haupt"
                            onClick={() => {
                              setZielSlot(slot);
                              setAnsicht('neu');
                            }}
                          >
                            Neues Dorf
                          </button>
                        )}
                        {info && (
                          <button
                            className="knopf klein"
                            onClick={() => {
                              setZielSlot(slot);
                              setAnsicht('neu');
                            }}
                          >
                            Überschreiben
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
            <div className="reihe" style={{ justifyContent: 'center' }}>
              <button className="knopf klein" onClick={onGalerie}>
                Asset-Galerie
              </button>
              <button className="knopf klein" onClick={() => setAnsicht('credits')}>
                Credits
              </button>
            </div>
          </>
        )}

        {ansicht === 'neu' && (
          <div style={{ textAlign: 'left' }}>
            <h2>Neues Dorf auf Platz {zielSlot + 1}</h2>
            <label style={{ display: 'block', margin: '8px 0' }}>
              Dorfname
              <input
                value={name}
                maxLength={24}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', minHeight: 44 }}
              />
            </label>
            <label style={{ display: 'block', margin: '8px 0' }}>
              Seed (leer lassen für Zufall)
              <input
                value={seedText}
                onChange={(e) => setSeedText(e.target.value.replace(/[^0-9]/g, ''))}
                inputMode="numeric"
                style={{ width: '100%', minHeight: 44 }}
              />
            </label>
            <fieldset style={{ border: '1px solid var(--holz-hell)', borderRadius: 3, margin: '8px 0' }}>
              <legend>Modus</legend>
              <label className="reihe">
                <input
                  type="radio"
                  checked={modus === 'friedlich'}
                  onChange={() => setModus('friedlich')}
                />
                Friedlich – Aufbau ohne Überfälle, keine Todesspirale
              </label>
              <label className="reihe">
                <input
                  type="radio"
                  checked={modus === 'abenteuer'}
                  onChange={() => setModus('abenteuer')}
                />
                Abenteuer – zusätzlich Expeditionen und Gegner in den Randregionen
              </label>
            </fieldset>
            <div className="reihe">
              <button
                className="knopf haupt"
                onClick={() =>
                  onNeu(
                    zielSlot,
                    name,
                    seedText ? Number(seedText) >>> 0 : Math.floor(Math.random() * 0xffffffff),
                    modus,
                  )
                }
              >
                Dorf gründen
              </button>
              <button className="knopf leise" onClick={() => setAnsicht('start')}>
                Zurück
              </button>
              <button
                className="knopf klein"
                onClick={() => setName(DORFNAMEN[Math.floor(Math.random() * DORFNAMEN.length)])}
              >
                Namen würfeln
              </button>
            </div>
          </div>
        )}

        {ansicht === 'credits' && (
          <div style={{ textAlign: 'left' }}>
            <Credits />
            <button className="knopf" onClick={() => setAnsicht('start')}>
              Zurück
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
