// Browserlauf gegen den Produktionsbuild: startet ein neues Dorf, spielt eine
// Weile zu und legt Screenshots sowie ein Konsolenprotokoll ab.
//   node scripts/screenshots.mjs [basisUrl] [zielordner]
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASIS = process.argv[2] ?? 'http://localhost:4173';
const ZIEL = process.argv[3] ?? 'screenshots';
mkdirSync(ZIEL, { recursive: true });

const ANSICHTEN = [
  { name: 'desktop', width: 1440, height: 900, isMobile: false },
  { name: 'ipad-quer', width: 1180, height: 820, isMobile: true },
  { name: 'ipad-hoch', width: 820, height: 1180, isMobile: true },
  { name: 'klein', width: 1024, height: 768, isMobile: false },
];

// Der vorinstallierte Chromium liegt fest im Image; die npm-Version von
// Playwright erwartet unter Umständen einen anderen Build-Ordner.
const CHROMIUM = process.env.CHROMIUM_PFAD ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: CHROMIUM });
const fehler = [];
const bericht = [];

for (const ansicht of ANSICHTEN) {
  const kontext = await browser.newContext({
    viewport: { width: ansicht.width, height: ansicht.height },
    deviceScaleFactor: 2,
    hasTouch: ansicht.isMobile,
    isMobile: false,
    locale: 'de-DE',
  });
  const seite = await kontext.newPage();
  seite.on('console', (m) => {
    if (m.type() === 'error') fehler.push(`[${ansicht.name}] ${m.text()}`);
  });
  seite.on('pageerror', (e) => fehler.push(`[${ansicht.name}] ${e.message}`));
  seite.on('requestfailed', (r) => fehler.push(`[${ansicht.name}] Anfrage fehlgeschlagen: ${r.url()}`));
  seite.on('response', (r) => {
    if (r.status() >= 400) fehler.push(`[${ansicht.name}] ${r.status()} für ${r.url()}`);
  });

  await seite.goto(BASIS, { waitUntil: 'networkidle' });
  await seite.screenshot({ path: `${ZIEL}/${ansicht.name}-00-startmenue.png` });

  // Neues Dorf mit festem Seed gründen.
  await seite.getByRole('button', { name: 'Neues Dorf' }).first().click();
  await seite.getByLabel(/Seed/).fill('4242');
  await seite.getByRole('button', { name: 'Dorf gründen' }).click();
  await seite.waitForTimeout(3500);
  await seite.screenshot({ path: `${ZIEL}/${ansicht.name}-01-startdorf.png` });

  // Bauen-Panel öffnen.
  await seite.locator('.navigation .tab', { hasText: 'Bauen' }).click();
  await seite.waitForTimeout(600);
  await seite.screenshot({ path: `${ZIEL}/${ansicht.name}-02-bauen.png` });
  await seite.getByRole('button', { name: 'Bereich schließen' }).click();

  // Dreifaches Tempo, dann eine Weile zusehen.
  await seite.locator('button[title="Dreifaches Tempo"]').click();
  await seite.waitForTimeout(25000);
  await seite.screenshot({ path: `${ZIEL}/${ansicht.name}-03-gewachsen.png` });

  // Dorfpanel mit Bewohnern.
  await seite.locator('.navigation .tab', { hasText: 'Dorf' }).click();
  await seite.waitForTimeout(400);
  await seite.locator('.panel button', { hasText: 'Bewohner' }).first().click();
  await seite.waitForTimeout(400);
  await seite.screenshot({ path: `${ZIEL}/${ansicht.name}-04-bewohner.png` });

  const stand = await seite.evaluate(() => {
    const leiste = document.querySelector('.ressourcen');
    return leiste ? leiste.textContent : 'keine Leiste';
  });
  bericht.push(`${ansicht.name} (${ansicht.width}x${ansicht.height}): ${stand}`);

  await kontext.close();
}

await browser.close();

writeFileSync(
  `${ZIEL}/bericht.txt`,
  `Browserlauf gegen ${BASIS}\n\n${bericht.join('\n')}\n\nKonsolenfehler und fehlende Assets:\n${
    fehler.length ? fehler.join('\n') : 'keine'
  }\n`,
);
console.log(bericht.join('\n'));
console.log(`\nFehler: ${fehler.length ? `\n${fehler.join('\n')}` : 'keine'}`);
if (fehler.length) process.exitCode = 1;
