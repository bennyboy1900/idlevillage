# Stand, Messwerte und bekannte Grenzen

Ehrlicher Zwischenbericht. Was hier als „läuft“ steht, wurde ausgeführt und
geprüft. Was fehlt, steht als fehlend da – nicht als Schaltfläche ohne Funktion.

## Umgesetzte Etappen

| Etappe | Stand |
|---|---|
| 1. Inventar und Galerie | **fertig** – alle 320 Dateien mit begründetem Status, gemessene Rasterfakten, Asset-Galerie mit Raster, Crop-Vorschau und Animationsplayer, Cue-Katalog zum Anhören. |
| 2. Spielbarer Kern | **fertig** – Welt, sechs Bewohner, Sammeln/Transport/Lager/Nahrung, Kamera, Auswahl, Hausbau, echtes Speichern. |
| 3. Autonomie | **fertig** – Prioritäten, Bedürfnisse, Haushalte, Nachwuchs, Autobau mit Budget und Bauplatzsuche, 30-Minuten-Lauf ohne Eingriff geprüft. |
| 4. Wirtschaft und Hub | **weitgehend** – Produktionsketten, Forschung, Handel, Dorfplatz mit Brunnen, Auftragsbrett und Wegweisern, Ausbaustufen, Aufträge, Ranch. Kein interaktiver Einstieg (Tutorial). |
| 5. Weltinhalt | **teilweise** – sechs Regionen mit eigener Geländeerzeugung und Rohstoffen sind erschließbar; Champions sind als Berater nutzbar. **Expeditionen, Kämpfe, Schiffe und Gegner fehlen.** |
| 6. Fertigstellung | **teilweise** – Touchbedienung, Audio, Offline-Nachrechnung, Balancing und Produktionsbuild stehen. Kein Test auf echtem iPad/Safari, kein Deployment. |

## Gemessene Ergebnisse

### 30 Minuten ohne Spielereingriff

Seed 2024, Standardeinstellungen, keine Eingaben. Vollständiger Verlauf in
`docs/balance-bericht.json` (`npm run balance` erzeugt ihn neu).

| Minute | Einwohner | Wohnplätze | Nahrung | Holz | Stein | Münzen | Gebäude | Zufriedenheit |
|---|---|---|---|---|---|---|---|---|
| 1 | 8 | 8 | 84 | 33 | 45 | 42 | 7 | 57 |
| 10 | 12 | 20 | 117 | 97 | 63 | 196 | 17 | 66 |
| 20 | 15 | 20 | 155 | 3 | 110 | 354 | 19 | 55 |
| 30 | 17 | 20 | 166 | 50 | 135 | 696 | 20 | 56 |

Am Ende stehen unter anderem fünf Lagerhäuser, fünf Hütten, drei Äcker,
Sägewerk, Mühle, Backhaus und Markt. 92 Brote wurden gebacken, drei Kinder
geboren, acht Familien zugezogen, zwölf Aufträge erfüllt. Der kurze Holzengpass
um Minute 20 entsteht, weil Bau und Backhaus gleichzeitig Holz ziehen; das Dorf
erholt sich ohne Eingriff.

### Abnahmekriterien

`npm test` – 38 Prüfungen in vier Dateien, alle grün.

* **Erhaltung.** Über 20 Minuten gilt je Ware: Startbestand + gewonnen = Lager +
  getragen + verbaut + verbraucht + verworfen. Reservierungen werden nie als
  zusätzliche Güter gezählt und übersteigen nie den Bestand.
* **Nichtnegativität.** Keine Ressource wird negativ, auch nicht offline.
* **Determinismus.** Gleicher Seed, gleiche Befehle, gleiche Schrittzahl ergeben
  einen byteidentischen Zustand.
* **A/B-Lauf.** Bei identischem Seed fördert „Handwerk“ messbar mehr Stein und
  setzt mehr Steinmetze ein, „Vorräte“ mehr Bauern. Ein höherer Bauanteil führt
  zu mehr Bauten, eine hohe Holzreserve lässt das Holz liegen.
* **Autobau.** Nie mehr als zwei Baustellen, Wohnplätze erst nach
  Fertigstellung, Budget und Mindestreserve eingehalten.
* **Kein Softlock.** Mit komplett leergeräumtem Lager sammelt das Dorf binnen
  zehn Minuten wieder Nahrung und Holz. Notration gegen Münzen ist möglich.
* **Feststecken.** Über zwei Minuten bewegt sich jeder Bewohner oder arbeitet
  ortsfest; niemand bleibt länger als drei Sekunden ohne Weg.
* **Speichern.** Export/Import über JSON, Ablehnung beschädigter, fremder und
  zu neuer Stände mit verständlichem Grund, dreifaches schnelles Neuladen ohne
  doppelte Erträge, verwaiste Reservierungen werden beim Laden aufgelöst.
* **Offline.** Negative Zeitdifferenzen zählen als null, große werden auf das
  Limit gekürzt. Für 1 Minute, 1 Stunde und 8 Stunden bleiben Lager- und
  Wohnraumgrenzen eingehalten, und das Offline-Wachstum liegt im Rahmen des
  Online-Wachstums derselben Dauer. Es werden keine alten Geräusche nachgespielt.
* **Manifest.** Jede registrierte Sprite-Quelle existiert, die hinterlegten
  Bildmaße stimmen mit den PNG-Kopfdaten überein, jeder verwendete Frame liegt
  im Bild, keine Pflichtanimation ist leer, alle 320 Quelldateien haben einen
  Status, und die 19 Duplikate werden nur einmal ausgeliefert.

### Browserlauf

`node scripts/screenshots.mjs` startet den Produktionsbuild in Chromium,
gründet ein Dorf mit festem Seed, öffnet Panels, spielt bei dreifachem Tempo zu
und protokolliert Konsolenfehler und fehlgeschlagene Anfragen.

Geprüft in **1440 × 900**, **1180 × 820**, **820 × 1180** und **1024 × 768**,
jeweils mit `deviceScaleFactor` 2. Ergebnis: **keine Konsolenfehler, keine
fehlenden Assets, kein 404** in allen vier Auflösungen. Im Hochformat erscheinen
Panels als Bottom Sheet, die Ressourcenleiste bleibt zweizeilig, die Welt bleibt
sichtbar.

### Leistung

Gemessen wird der Simulationsdurchsatz, nicht die Bildrate: eine
Simulationsminute eines gewachsenen Dorfes läuft mehr als fünfmal schneller als
Echtzeit (Prüfung in `tests/balance.sim.test.ts`). Das ist die Reserve, die das
dreifache Spieltempo braucht.

**Nicht gemessen:** Bildrate auf echter Hardware. Es gab in dieser Umgebung nur
headless Chromium ohne GPU. Die Aussagen „60 FPS auf Desktop“ und „30 FPS bei
150 Bewohnern auf einem iPad“ sind deshalb **unbelegt** und stehen bewusst nicht
als Ergebnis da. Die Oberfläche zeigt unter Einstellungen → Anzeige die aktuelle
Bildrate und Schrittzahl, damit sich das auf echter Hardware sofort prüfen lässt.

## Was fehlt

* **Expeditionen und Kämpfe.** Monster, Soldaten, Ballista, Projektile, Schiffe
  und Piraten sind als Assets aufbereitet und in der Galerie sichtbar, aber es
  gibt keine Expeditionsmechanik, keine Kämpfe und kein Bestiarium. Die
  Kaserne bildet Wachen aus, die wie andere Bewohner arbeiten; sie
  patrouillieren nicht.
* **Vermächtnis.** Kein Neugründungssystem.
* **Interaktiver Einstieg.** Kein Tutorial; die Oberfläche erklärt sich über
  Hinweistexte, Kostenvorschauen und die Dorfplanungsanzeige.
* **Bauzonen-Editor.** Zonen sind im Modell und im Renderer vorhanden, der
  Autobau respektiert sie, aber es gibt keine Oberfläche zum Aufziehen. Ohne
  Zonen baut das Dorf im Umkreis des Dorfplatzes.
* **Regionsinhalte.** Erschlossene Regionen liefern eigenes Gelände und eigene
  Rohstoffe, aber keine eigenen Gebäude, Gegner oder Ereignisketten.
* **Wege und Brücken.** Brücken sind baubar, ein Wegebau-System fehlt; die
  Steinweg-Crops sind im Manifest vorgemerkt, aber nicht verlegt.
* **Komprimierte Audioformate.** Ohne Encoder in dieser Umgebung bleiben die
  Ableitungen WAV (siehe `ASSET-PIPELINE.md`).

## Ungetestet

* **Echtes Safari und echtes iPad.** Nur Chromium stand zur Verfügung. Touch,
  Pinch und Gestenschwellen sind mit emulierten Berührungen geprüft, was einen
  Gerätetest nicht ersetzt. Besonders Audiofreischaltung, Wechsel in den
  Hintergrund und der Save-Export gehören auf echter Hardware geprüft.
* **Musikwirkung.** Die beiden Tracks wurden nicht abgehört.
* **Deployment.** Ein erfolgreicher lokaler Produktionsbuild und ein Lauf gegen
  `vite preview` sind kein durchgeführtes Deployment auf Vercel.

## Nächste sinnvolle Schritte

1. Expeditionen als vorbereitete Unternehmung: Truppe zusammenstellen, Vorräte
   mitgeben, automatischer Kampf mit Rückzug statt Totalverlust, Bestiarium.
2. Bauzonen-Editor mit Ziehen auf der Karte, damit die vorhandene Zonenlogik
   auch bedienbar wird.
3. Wegebau aus den Steinweg-Crops, gekoppelt an die Forschung „Befestigte Wege“.
4. Kurzer interaktiver Einstieg über die ersten drei Minuten, jederzeit
   überspringbar.
5. Gerätetest auf iPad und Safari, danach Bildraten und Grenzen hier eintragen.
