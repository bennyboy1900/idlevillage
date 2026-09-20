# Wurzelhain

Ein deutschsprachiges Idle-Dorfspiel im Browser. Bewohner laufen aus ihren
Hütten, fällen Bäume, tragen Holz ins Lager, bestellen Äcker, mahlen Getreide,
backen Brot, gründen Haushalte und bauen sich neue Häuser, wenn der Wohnraum
knapp wird. Der Spieler setzt Prioritäten, forscht, baut selbst und erschließt
neue Regionen – zuschauen genügt aber auch.

Grafik: **MiniWorld Sprites** von Shade. Musik: **Minifantasy Dungeon Music**
von Leohpaz. Näheres unter [Credits und Lizenzen](#credits-und-lizenzen).

## Schnellstart

```bash
npm install
npm run dev        # Entwicklungsserver auf http://localhost:5173
```

Weitere Skripte:

| Befehl | Wirkung |
|---|---|
| `npm run assets` | Bereitet aus den Originalordnern die Laufzeitassets in `public/assets/` auf und schreibt `docs/asset-status.json`. Läuft automatisch vor `dev` und `build`. |
| `npm run build` | Assets, Typprüfung und Produktionsbuild nach `dist/`. |
| `npm run preview` | Liefert den Produktionsbuild lokal aus (Port 4173). |
| `npm test` | Alle Prüfungen: Simulation, Manifest, Persistenz, Balance. |
| `npm run balance` | Nur der Balancelauf; schreibt `docs/balance-bericht.json`. |
| `npm run typecheck` | TypeScript ohne Testlauf. |
| `node scripts/screenshots.mjs [url] [ordner]` | Browserlauf gegen den Produktionsbuild: Screenshots in vier Auflösungen plus Konsolen- und Asset-Protokoll. |
| `node scripts/inspect-sheet.mjs <png> [bw] [bh]` | Belegungsraster eines Spritesheets im Terminal. |
| `node scripts/preview-sheet.mjs <png> <ziel> [bw] [bh] [faktor]` | Hochskalierte Rastervorschau als PNG. |

Die Asset-Galerie (Originalsheet, Pixelraster, Crop-Vorschau, Animationsplayer)
ist im Spiel über **Startmenü → Asset-Galerie** erreichbar.

## Bedienung

* **Ziehen** bewegt die Kamera, **Tippen** wählt aus, **zwei Finger** zoomen um
  ihren Mittelpunkt. Ein Ziehen löst nie einen Kauf aus.
* **Pfeiltasten** bewegen die Kamera, **+/−** zoomen, **Esc** schließt die Auswahl.
* Unten führen fünf Bereiche zu Dorf, Bauen, Forschung, Handel und Welt.
* Im Baumodus ein Gebäude wählen, eine Kachel antippen und über die große
  Schaltfläche bestätigen. Grün heißt frei, Rot nennt den Grund; der blaue
  Rahmen markiert den Eingang, der erreichbar bleiben muss.

## Was das Spiel tut

**Bewohner mit nachvollziehbarem Leben.** Jeder hat Namen, Lebensphase,
Haushalt, Wohnung, Beruf, zwei Charakterzüge, Energie, Sättigung,
Zufriedenheit, Beziehungen und einen konkreten Auftrag. Das Panel schreibt
„Bringt 7 Beeren zum Lager“ oder „Wartet auf Material für Sägewerk“, nicht
„arbeitet“.

**Material ist physisch.** Ein Holzfäller reserviert einen Baum, läuft hin,
schlägt, trägt und liefert ab. Der Vorrat im HUD steigt erst bei der Abgabe.
Ein Baum wird nicht doppelt ausgezahlt; Reservierungen haben Besitzer und
werden bei Abbruch, Berufswechsel und Laden freigegeben.

**Das Dorf baut selbst.** Bei knappem Wohnraum, vollem Lager, fehlendem
Sägewerk oder ungenutztem Getreide plant es das passende Gebäude, sucht einen
erreichbaren Platz, reserviert die Kosten und liefert an. Wohnplätze entstehen
erst mit der Fertigstellung.

**Wirtschaft mit echten Ketten.** Baum → Holz → Bretter, Weizen → Getreide →
Mehl → Brot, Fels → Stein, Erz → Barren → Werkzeuge, Wolle → Stoff, Kräuter →
Tränke, Überschüsse → Markt → Münzen. Münzen entstehen nur aus tatsächlichen
Verkäufen; es gibt keinen zweiten unsichtbaren Multiplikator auf dieselbe
Arbeit.

**Fortschritt.** 36 Forschungsprojekte in sechs Ästen, 30 Aufträge, 12
Ereignisse, 8 Champions als Berater (höchstens drei gleichzeitig), 6 Regionen
und 30 Gebäudetypen mit Ausbaustufen und abnehmenden Grenzerträgen.

**Speichern.** Drei Plätze in IndexedDB, Autosave alle 30 Sekunden und bei
jedem Wechsel in den Hintergrund, letzter gültiger Stand als Sicherung,
Import/Export als geprüftes JSON, Schutz gegen gleichzeitig schreibende Tabs.
Offline-Fortschritt wird beim Wiederöffnen nachgerechnet (anfangs 8 Stunden,
mit Forschung bis 24).

## Architektur

```text
src/game/core/          Seed-RNG, Rauschen, gemeinsame Typen
src/game/content/       Ressourcen, Gebäude, Forschung, Aufträge, Regionen, Namen
src/game/world/         Geländeerzeugung, Rohstoffe, Navigationsgitter, A*
src/game/simulation/    Zustand, Lager, Boni, Bewohner-KI, Dorfsysteme, Befehle, Offline
src/game/render/        Phaser-Szene, Autotiling, Kamera, Eingabe
src/game/audio/         Cue-Katalog, Mixer, Musikzustände
src/game/persistence/   IndexedDB, Prüfung, Migration, Tab-Führung
src/assets/             Geprüftes Sprite-Manifest
src/ui/                 React-HUD, Panels, Inspektor, Galerie, Einstellungen
scripts/                Asset-Aufbereitung, PNG-Werkzeuge, Browserlauf
tests/                  Simulation, Manifest, Persistenz, Balance
```

Die Simulation läuft mit **festem Zeitschritt** von 10 Schritten je Sekunde und
ist vollständig deterministisch: gleicher Seed, gleiche Befehle und gleiche
Schrittzahl ergeben denselben Zustand, unabhängig von der Bildrate. Gerendert
wird mit `requestAnimationFrame`; React bekommt nur etwa fünf Schnappschüsse je
Sekunde. Das Gelände wird nicht gespeichert, sondern aus dem Seed neu berechnet.

Phaser zeichnet das Gelände einmalig in 32×32-Kachel-Texturen und hält nur
Sprites im sichtbaren Bereich. Gebäude, Bäume und Bewohner werden nach ihrem
Fußpunkt sortiert, damit Baumkronen Nachbarn überdecken dürfen, ohne dass die
Kollisionsfläche mitwächst.

## Assets

`npm run assets` verarbeitet alle **320 Originaldateien** und vergibt jeder
einen begründeten Status: `laufzeit`, `variante`, `referenz`, `quelldaten` oder
`duplikat`. Die 19 Dateien direkt unter `ui/` sind SHA-256-identische Kopien
von `ui/PNG/` und werden nicht doppelt ausgeliefert. Das vollständige Protokoll
steht in `docs/asset-status.json`, die gemessenen Rasterfakten in
[`docs/ASSET-PIPELINE.md`](docs/ASSET-PIPELINE.md).

Die Originalordner bleiben unverändert; `public/assets/` ist Build-Ausgabe und
steht in `.gitignore`.

## Veröffentlichen auf Vercel

* Framework: **Vite**, Build `npm run build`, Output `dist` (siehe `vercel.json`).
* Der Build erzeugt die Assets selbst, es muss nichts eingecheckt werden.
* Es gibt keine Serverlogik und keine SPA-Rewrites: Das Spiel ist eine einzige
  Seite, Deep Links sind nicht nötig.
* Alle Laufzeitpfade sind root-relativ und ASCII-sicher. Dateinamen mit
  Leerzeichen, Klammern oder Umlauten (`Börg.png`, `Horse(32x32).png`,
  `User Interface/`) werden beim Aufbereiten umbenannt; die Quellpfade bleiben
  wie sie sind.

## Credits und Lizenzen

* **MiniWorld Sprites – Shade.** Shades Guide erlaubt Nutzung in kommerziellen
  und nichtkommerziellen Projekten sowie Bearbeitung, verlangt keine Credits
  und untersagt den Verkauf der Assets als solche.
  <https://merchant-shade.itch.io/16x16-mini-world-sprites>
* **Minifantasy Dungeon Music – Leohpaz.** Die beiliegende
  `music/.../Licensing.txt` erlaubt die Projektnutzung, untersagt aber den
  separaten Verkauf und die kostenlose Weiterverteilung des Assetpacks.
  <https://www.patreon.com/leohpaz>
* Für `ui/`, `font/` und `sfx/` liegt in diesem Repository **keine eigene
  Lizenzdatei** vor. Herkunft und Lizenzstatus sind damit **noch zu ergänzen**.
  Die Aussagen oben gelten ausdrücklich nur für die jeweils genannten Ordner.
* Das Spiel bietet keinen Download der Assetpacks an.

## Stand und bekannte Grenzen

Was funktioniert, was fehlt und was ungetestet ist, steht ehrlich und im Detail
in [`docs/STAND.md`](docs/STAND.md). Kurz: Aufbau, Wirtschaft, Autonomie,
Forschung, Handel, Regionen, Speichern und Offline-Fortschritt laufen;
Expeditionen, Kämpfe und das Vermächtnissystem sind **nicht** implementiert.
