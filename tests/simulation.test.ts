import { describe, expect, it } from 'vitest';
import { neuesSpiel } from '../src/game/simulation/state';
import { Simulation } from '../src/game/simulation/sim';
import { fuehreBefehlAus, type Befehl } from '../src/game/simulation/commands';
import { RESOURCE_IDS, RESOURCES, nahrungswert } from '../src/game/content/resources';
import { BUILDING_BY_ID } from '../src/game/content/buildings';
import type { ResourceId, Store } from '../src/game/core/types';
import { menge } from '../src/game/simulation/store';

const MINUTE = 600; // Ticks bei 10 Schritten je Sekunde

function neueSim(seed = 4242) {
  return new Simulation(neuesSpiel({ seed, dorfname: 'Prüfdorf' }));
}

function summe(store: Store): number {
  let n = 0;
  for (const id of RESOURCE_IDS) n += menge(store, id);
  return n;
}

describe('Startzustand', () => {
  it('startet mit sechs Erwachsenen, Wohnraum, Lager und Vorräten', () => {
    const sim = neueSim();
    expect(sim.state.residents).toHaveLength(6);
    expect(sim.state.residents.every((r) => r.stage === 'erwachsen')).toBe(true);
    expect(sim.wohnplaetze).toBe(8);
    expect(sim.kapazitaet).toBe(200);
    expect(nahrungswert(sim.state.store)).toBe(80);
    expect(menge(sim.state.store, 'holz')).toBe(60);
    expect(menge(sim.state.store, 'stein')).toBe(35);
    expect(sim.abgabestellen().length).toBeGreaterThan(0);
  });

  it('stellt erreichbare Rohstoffe in der Nähe bereit', () => {
    const sim = neueSim();
    const nah = sim.state.nodes.filter(
      (n) => Math.hypot(n.x - 64, n.y - 64) < 14 && n.amount > 0 && !n.geschuetzt,
    );
    expect(nah.filter((n) => n.kind === 'baum').length).toBeGreaterThan(3);
    expect(nah.length).toBeGreaterThan(10);
  });
});

describe('Erste Minuten', () => {
  it('liefert innerhalb einer Minute echtes Material ins Lager', () => {
    const sim = neueSim();
    sim.schritte(MINUTE);
    // Geerntetes Holz ist entweder im Lager oder bereits verbaut.
    const gewonnen = menge(sim.state.statistik.gewonnen, 'holz');
    expect(gewonnen, 'in der ersten Minute wird Holz geschlagen').toBeGreaterThan(5);
    // Startbestand 60 plus das, was in der ersten Minute dazukam bzw. schon
    // in Baustellen steckt.
    expect(menge(sim.state.store, 'holz') + menge(sim.state.statistik.verbaut, 'holz')).toBeGreaterThanOrEqual(60);
    // Mindestens ein Bewohner hat sichtbar gearbeitet oder getragen.
    expect(sim.state.residents.some((r) => r.task !== null)).toBe(true);
  });

  it('baut binnen weniger Minuten selbstständig ein Wohngebäude', () => {
    const sim = neueSim();
    sim.schritte(MINUTE * 8);
    const wohn = sim.state.buildings.filter((b) => BUILDING_BY_ID[b.type].wohnplaetze);
    expect(wohn.length).toBeGreaterThan(2);
    expect(sim.state.statistik.haeuserGebaut).toBeGreaterThan(0);
  });
});

describe('Abnahmekriterien der Wirtschaft', () => {
  it('hält Ressourcen nichtnegativ und erfüllt die Erhaltungsgleichung', () => {
    const sim = neueSim(99);
    sim.schritte(MINUTE * 20);
    const s = sim.state;

    for (const id of RESOURCE_IDS) {
      expect(menge(s.store, id), `${id} darf nicht negativ werden`).toBeGreaterThanOrEqual(-1e-6);
      expect(menge(s.reserviert, id)).toBeGreaterThanOrEqual(-1e-6);
    }

    // gewonnen + Startbestand = Lager + getragen + verbaut + verbraucht + verworfen
    const start: Store = { holz: 60, stein: 35, beeren: 60, fisch: 10, muenzen: 20 };
    const getragen: Store = {};
    for (const r of s.residents) {
      for (const id of RESOURCE_IDS) getragen[id] = menge(getragen, id) + menge(r.inventar, id);
    }
    const inBaustellen: Store = {};
    for (const b of s.buildings) {
      for (const id of RESOURCE_IDS) {
        inBaustellen[id] = menge(inBaustellen, id) + menge(b.geliefert, id) + menge(b.eingang, id);
      }
    }
    for (const id of RESOURCE_IDS) {
      const links = menge(start, id) + menge(s.statistik.gewonnen, id);
      const rechts =
        menge(s.store, id) +
        menge(getragen, id) +
        menge(s.statistik.verbraucht, id) +
        menge(s.statistik.verworfen, id) +
        // Verbautes liegt entweder in der Baustelle oder ist im fertigen Haus.
        Math.max(menge(s.statistik.verbaut, id), menge(inBaustellen, id));
      expect(Math.abs(links - rechts), `Erhaltung für ${RESOURCES[id as ResourceId].name}`).toBeLessThan(
        Math.max(1, links * 0.02),
      );
    }
  });

  it('zählt Reservierungen nicht als zusätzliche Güter', () => {
    const sim = neueSim(7);
    sim.schritte(MINUTE * 5);
    for (const id of RESOURCE_IDS) {
      expect(menge(sim.state.reserviert, id)).toBeLessThanOrEqual(menge(sim.state.store, id) + 1e-6);
    }
  });

  it('vergibt Wohnplätze erst nach Fertigstellung', () => {
    const sim = neueSim(11);
    sim.schritte(MINUTE * 10);
    for (const b of sim.state.buildings) {
      if (b.status !== 'aktiv') expect(b.bewohner).toHaveLength(0);
    }
  });

  it('hält den Autobau im Budget und bei höchstens zwei Baustellen', () => {
    const sim = neueSim(21);
    for (let i = 0; i < MINUTE * 20; i++) {
      sim.tick();
      const baustellen = sim.state.buildings.filter((b) => b.status === 'baustelle').length;
      expect(baustellen).toBeLessThanOrEqual(2);
    }
  });
});

describe('Determinismus', () => {
  it('ergibt bei gleichem Seed und gleichen Befehlen denselben Zustand', () => {
    const befehle: { beiTick: number; befehl: Befehl }[] = [
      { beiTick: 300, befehl: { art: 'strategie', wert: 'vorraete' } },
      { beiTick: 900, befehl: { art: 'bauanteil', wert: 0.5 } },
      { beiTick: 1800, befehl: { art: 'nahrungsziel', wert: 160 } },
    ];
    const lauf = () => {
      const sim = neueSim(1234);
      for (let i = 0; i < MINUTE * 6; i++) {
        for (const b of befehle) if (b.beiTick === i) fuehreBefehlAus(sim, b.befehl);
        sim.tick();
      }
      // gespeichertAm ist Wandzeit und gehört nicht zum Simulationszustand.
      return JSON.stringify({ ...sim.state, gespeichertAm: 0 });
    };
    expect(lauf()).toBe(lauf());
  });
});

describe('Strategien wirken', () => {
  it('führt bei gleichem Seed zu messbar anderen Beständen', () => {
    const laufMit = (strategie: 'vorraete' | 'handwerk') => {
      const sim = neueSim(555);
      fuehreBefehlAus(sim, { art: 'strategie', wert: strategie });
      sim.schritte(MINUTE * 15);
      return {
        nahrung: nahrungswert(sim.state.store),
        stein: menge(sim.state.statistik.gewonnen, 'stein'),
        gesamt: summe(sim.state.statistik.gewonnen),
      };
    };
    const vorraete = laufMit('vorraete');
    const handwerk = laufMit('handwerk');
    expect(handwerk.stein).toBeGreaterThan(vorraete.stein);
    expect(vorraete.nahrung).not.toBe(handwerk.nahrung);
  });
});
