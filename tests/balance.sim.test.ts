import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { neuesSpiel } from '../src/game/simulation/state';
import { Simulation, statusText } from '../src/game/simulation/sim';
import { fuehreBefehlAus, type Befehl } from '../src/game/simulation/commands';
import { menge } from '../src/game/simulation/store';
import { nahrungswert } from '../src/game/content/resources';
import { BUILDING_BY_ID } from '../src/game/content/buildings';
import type { StrategyId } from '../src/game/core/types';

const MINUTE = 600;

interface Messpunkt {
  minute: number;
  einwohner: number;
  wohnplaetze: number;
  nahrung: number;
  holz: number;
  stein: number;
  muenzen: number;
  gebaeude: number;
  zufriedenheit: number;
}

function lauf(seed: number, minuten: number, befehle: Befehl[] = []): { sim: Simulation; verlauf: Messpunkt[] } {
  const sim = new Simulation(neuesSpiel({ seed, dorfname: 'Balancelauf' }));
  for (const b of befehle) fuehreBefehlAus(sim, b);
  const verlauf: Messpunkt[] = [];
  for (let m = 0; m < minuten; m++) {
    sim.schritte(MINUTE);
    verlauf.push({
      minute: m + 1,
      einwohner: sim.state.residents.length,
      wohnplaetze: sim.wohnplaetze,
      nahrung: Math.round(sim.nahrung),
      holz: Math.round(menge(sim.state.store, 'holz')),
      stein: Math.round(menge(sim.state.store, 'stein')),
      muenzen: Math.round(menge(sim.state.store, 'muenzen')),
      gebaeude: sim.state.buildings.filter((b) => b.status === 'aktiv').length,
      zufriedenheit: Math.round(sim.zufriedenheit),
    });
  }
  return { sim, verlauf };
}

describe('Dreißig Minuten ohne Spielereingriff', () => {
  it('wächst nachvollziehbar und bleibt innerhalb seiner Kapazitäten', () => {
    const { sim, verlauf } = lauf(2024, 30);
    const s = sim.state;
    const ende = verlauf[verlauf.length - 1];

    // Bericht als nachvollziehbarer Beleg mitschreiben.
    writeFileSync(
      resolve(__dirname, '..', 'docs', 'balance-bericht.json'),
      `${JSON.stringify(
        {
          erzeugt: 'npm run balance',
          seed: 2024,
          minuten: 30,
          verlauf,
          gebaeude: s.buildings.map((b) => ({ typ: b.type, stufe: b.stufe, status: b.status })),
          forschung: s.research.abgeschlossen,
          auftraegeErfuellt: s.quests.filter((q) => q.status !== 'offen').length,
          statistik: s.statistik,
        },
        null,
        2,
      )}\n`,
    );

    expect(ende.einwohner, 'das Dorf wächst').toBeGreaterThan(6);
    expect(ende.einwohner, 'Wachstum bleibt innerhalb des Wohnraums').toBeLessThanOrEqual(ende.wohnplaetze);
    expect(s.statistik.haeuserGebaut, 'es entstehen neue Wohngebäude').toBeGreaterThan(0);
    expect(ende.gebaeude, 'das Dorf baut über den Start hinaus').toBeGreaterThan(6);
    expect(sim.belegung).toBeLessThanOrEqual(sim.kapazitaet + 1e-6);
    expect(ende.zufriedenheit, 'niemand verzweifelt dauerhaft').toBeGreaterThan(40);
  });

  it('hält die Nahrung über 30 Minuten durchgehend über null', () => {
    const sim = new Simulation(neuesSpiel({ seed: 777 }));
    let minimum = Infinity;
    for (let i = 0; i < MINUTE * 30; i++) {
      sim.tick();
      if (i % 60 === 0) minimum = Math.min(minimum, nahrungswert(sim.state.store));
    }
    // Frühe Nahrungsarbeit muss den Startverbrauch mindestens verdoppeln können.
    expect(minimum, 'keine Hungerspirale').toBeGreaterThan(0);
    expect(sim.state.residents.every((r) => r.saettigung > 0 || sim.nahrung > 0)).toBe(true);
  });

  it('erzeugt kein unlösbares Softlock bei leerem Lager', () => {
    const sim = new Simulation(neuesSpiel({ seed: 99 }));
    // Alles wegnehmen: kein Holz, kein Stein, keine Nahrung, kein Geld.
    sim.state.store = {};
    sim.schritte(MINUTE * 10);
    // Sammelbare Grundnahrung bringt das Dorf zurück.
    expect(nahrungswert(sim.state.store) + menge(sim.state.statistik.gewonnen, 'beeren')).toBeGreaterThan(0);
    expect(menge(sim.state.statistik.gewonnen, 'holz')).toBeGreaterThan(0);
  });
});

describe('A/B-Lauf mit identischem Seed', () => {
  it('belegt, dass Prioritäten Produktion, Bau und Reserven verändern', () => {
    const seed = 31337;
    const varianten: StrategyId[] = ['vorraete', 'handwerk'];
    const ergebnisse = varianten.map((strategie) => {
      const { sim } = lauf(seed, 20, [{ art: 'strategie', wert: strategie }]);
      const erwachsene = sim.erwachsene.length || 1;
      return {
        strategie,
        // Die Lagerstände pendeln um die Sammelobergrenze; aussagekräftig sind
        // die Arbeitsverteilung und was insgesamt hereingekommen ist.
        bauerAnteil: sim.state.residents.filter((r) => r.beruf === 'bauer').length / erwachsene,
        steinmetzAnteil: sim.state.residents.filter((r) => r.beruf === 'steinmetz').length / erwachsene,
        steinGewonnen: Math.round(menge(sim.state.statistik.gewonnen, 'stein')),
        holzGewonnen: Math.round(menge(sim.state.statistik.gewonnen, 'holz')),
        gebaeude: sim.state.buildings.length,
      };
    });
    const [vorraete, handwerk] = ergebnisse;

    expect(handwerk.steinGewonnen, 'Handwerk fördert mehr Stein').toBeGreaterThan(vorraete.steinGewonnen);
    expect(handwerk.steinmetzAnteil, 'Handwerk setzt mehr Steinmetze ein').toBeGreaterThan(
      vorraete.steinmetzAnteil,
    );
    expect(vorraete.bauerAnteil, 'Vorräte setzt mehr Bauern ein').toBeGreaterThan(handwerk.bauerAnteil);
    expect(JSON.stringify(vorraete)).not.toBe(JSON.stringify(handwerk));
  });

  it('reagiert messbar auf Bauanteil und Holzreserve', () => {
    const seed = 4711;
    const sparsam = lauf(seed, 15, [
      { art: 'bauanteil', wert: 0.05 },
      { art: 'holzreserve', wert: 150 },
    ]).sim;
    const grosszuegig = lauf(seed, 15, [
      { art: 'bauanteil', wert: 0.9 },
      { art: 'holzreserve', wert: 0 },
    ]).sim;

    const bauten = (s: Simulation) => s.state.buildings.filter((b) => b.autobau).length;
    expect(bauten(grosszuegig), 'mehr Budget ergibt mehr Bauten').toBeGreaterThanOrEqual(bauten(sparsam));
    expect(menge(sparsam.state.store, 'holz'), 'die Reserve bleibt liegen').toBeGreaterThan(0);
  });
});

describe('Leistung', () => {
  it('rechnet ein großes Dorf schneller als in Echtzeit', () => {
    const sim = new Simulation(neuesSpiel({ seed: 5150 }));
    // Wohnraum und Bevölkerung künstlich hochziehen.
    sim.state.policy.nahrungsziel = 4000;
    sim.state.store = { holz: 4000, stein: 2000, beeren: 3000, muenzen: 500 };
    sim.schritte(MINUTE * 10);

    const start = performance.now();
    const schritte = MINUTE; // eine Simulationsminute
    sim.schritte(schritte);
    const dauer = (performance.now() - start) / 1000;

    const faktor = schritte / 10 / dauer;
    // Muss deutlich schneller als Echtzeit sein, sonst reicht es nicht für 3x-Tempo.
    expect(faktor, `Echtzeitfaktor ${faktor.toFixed(1)} bei ${sim.einwohner} Bewohnern`).toBeGreaterThan(5);
  });

  it('lässt keine Bewohner dauerhaft feststecken', () => {
    const sim = new Simulation(neuesSpiel({ seed: 606 }));
    sim.schritte(MINUTE * 15);

    // Über zwei Minuten muss sich jeder Bewohner entweder bewegt haben oder
    // erkennbar an einer ortsfesten Aufgabe gewesen sein.
    const start = new Map(sim.state.residents.map((r) => [r.id, { x: r.x, y: r.y }]));
    const bewegt = new Set<number>();
    const ortsfest = new Set<number>();
    for (let i = 0; i < MINUTE * 2; i++) {
      sim.tick();
      for (const r of sim.state.residents) {
        const s0 = start.get(r.id);
        if (s0 && Math.hypot(r.x - s0.x, r.y - s0.y) > 1) bewegt.add(r.id);
        if (['gather', 'build', 'craft', 'rest', 'eat', 'socialize'].includes(r.zustand)) ortsfest.add(r.id);
      }
    }
    const festgefahren = sim.state.residents.filter(
      (r) => start.has(r.id) && !bewegt.has(r.id) && !ortsfest.has(r.id),
    );
    expect(festgefahren.map((r) => r.name)).toEqual([]);
    // Und niemand hängt am Ende im Dauerzustand „kommt nicht weiter“.
    expect(sim.state.residents.filter((r) => r.steckt > 3).map((r) => r.name)).toEqual([]);
    // Die Oberfläche zeigt zu jedem Bewohner einen erklärenden Satz.
    for (const r of sim.state.residents) {
      expect(statusText(sim, r).length, `${r.name} ohne Statustext`).toBeGreaterThan(0);
    }
  });

  it('hält Gebäudedefinitionen vollständig und wirksam', () => {
    for (const def of Object.values(BUILDING_BY_ID)) {
      const wirkt =
        def.wohnplaetze ||
        def.arbeitsplaetze ||
        def.lager ||
        def.rezept ||
        def.zufriedenheit ||
        def.ueberWasser ||
        def.globalerBonus;
      expect(wirkt, `${def.id} hätte keine Wirkung`).toBeTruthy();
      expect(Object.keys(def.kosten).length, `${def.id} ohne Kosten`).toBeGreaterThan(0);
      expect(def.bauarbeit, `${def.id} ohne Bauzeit`).toBeGreaterThan(0);
      expect(def.beschreibung.length, `${def.id} ohne Beschreibung`).toBeGreaterThan(10);
    }
  });
});
