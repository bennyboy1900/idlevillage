import type { JobId, TraitId } from '../core/types';

export const VORNAMEN = [
  'Mira', 'Jorn', 'Elke', 'Ruben', 'Hanna', 'Tobi', 'Lena', 'Falk', 'Nore', 'Arik',
  'Silke', 'Bram', 'Ida', 'Gero', 'Maja', 'Piet', 'Rike', 'Sven', 'Thea', 'Udo',
  'Wilma', 'Yann', 'Zora', 'Bente', 'Cord', 'Dora', 'Emil', 'Frieda', 'Gunnar', 'Helma',
  'Imke', 'Jakob', 'Karla', 'Lasse', 'Meike', 'Niko', 'Onno', 'Paula', 'Quirin', 'Rosa',
  'Sören', 'Tilda', 'Ulf', 'Vera', 'Wanda', 'Xenia', 'Yara', 'Zeno', 'Anke', 'Bodo',
];

export const NACHNAMEN = [
  'Ahorn', 'Birkner', 'Steinbach', 'Waldhuber', 'Moorfeld', 'Gerstner', 'Hügel', 'Rieth',
  'Kienzle', 'Lohmann', 'Brunner', 'Fichtner', 'Seewald', 'Ackermann', 'Hammerl', 'Winter',
  'Sommer', 'Rothaus', 'Eichner', 'Farnbach',
];

export const DORFNAMEN = [
  'Wurzelhain', 'Immergrün', 'Ulmenbach', 'Sonnenfurt', 'Kieselgrund', 'Moosstett',
  'Lichtental', 'Altwasser', 'Weidenau', 'Steinbrück',
];

export const TRAIT_INFO: Record<TraitId, { name: string; text: string }> = {
  fleissig: { name: 'fleißig', text: 'Arbeitet 8 % schneller, ruht dafür etwas länger.' },
  gesellig: { name: 'gesellig', text: 'Knüpft schneller Beziehungen, braucht aber Gesellschaft.' },
  genuegsam: { name: 'genügsam', text: 'Verbraucht 12 % weniger Nahrung.' },
  neugierig: { name: 'neugierig', text: 'Lernt Fähigkeiten 25 % schneller.' },
  naturverbunden: { name: 'naturverbunden', text: 'Ist beim Sammeln in der Natur zufriedener.' },
  sorgfaeltig: { name: 'sorgfältig', text: 'Trägt eine Einheit mehr und verliert nichts.' },
};

export const JOB_INFO: Record<JobId, { name: string; text: string; icon: string }> = {
  traeger: { name: 'Träger', text: 'Holt, bringt und räumt auf. Das Rückgrat jeder Lieferkette.', icon: '📦' },
  holzfaeller: { name: 'Holzfäller', text: 'Fällt freigegebene Bäume und bringt das Holz ins Lager.', icon: '🪓' },
  steinmetz: { name: 'Steinmetz', text: 'Bricht Stein an Findlingen und im Steinbruch.', icon: '⛏️' },
  bauer: { name: 'Bauer', text: 'Bestellt Äcker und erntet Getreide.', icon: '🌾' },
  fischer: { name: 'Fischer', text: 'Fischt am Hafen und von Booten aus.', icon: '🐟' },
  bergmann: { name: 'Bergmann', text: 'Fördert Erz aus Stollen und Erzfelsen.', icon: '⛰️' },
  handwerker: { name: 'Handwerker', text: 'Arbeitet in Sägewerk, Mühle, Schmiede und Werkstatt.', icon: '🔨' },
  haendler: { name: 'Händler', text: 'Verkauft Überschüsse und betreut Reisende.', icon: '⚖️' },
  gelehrter: { name: 'Gelehrte', text: 'Erarbeitet Forschungspunkte im Rathaus und in der Stube.', icon: '📜' },
  hirte: { name: 'Hirte', text: 'Versorgt Tiere auf der Ranch.', icon: '🐑' },
  kraeutlerin: { name: 'Kräutlerin', text: 'Zieht Kräuter und braut Tränke.', icon: '🌿' },
  wache: { name: 'Wache', text: 'Patrouilliert und begleitet Expeditionen.', icon: '🛡️' },
  baumeister: { name: 'Baumeister', text: 'Bevorzugt Baustellen vor allem anderen.', icon: '🏗️' },
};

export const JOB_IDS = Object.keys(JOB_INFO) as JobId[];
