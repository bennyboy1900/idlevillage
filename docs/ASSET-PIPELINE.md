# Asset-Pipeline und gemessene Rasterfakten

Dieses Dokument hält fest, **wie** die Sprite-Ausschnitte bestimmt wurden und
**was** dabei herauskam. Grundsatz: Sheet-Abmessungen beweisen weder Framegröße
noch Bedeutung. Jede Angabe unten wurde an der Originaldatei gemessen, nicht aus
der Dateigröße abgeleitet.

## Werkzeuge

Für die Prüfung gibt es einen abhängigkeitsfreien PNG-Leser und -Schreiber
(`scripts/pnglib.mjs`, `scripts/pngwrite.mjs`), damit die Messung ohne externe
Bildbibliothek reproduzierbar bleibt:

```bash
# Belegung und engste Hülle je Rasterzelle im Terminal
node scripts/inspect-sheet.mjs maingamesprites/MiniWorldSprites/Nature/Trees.png 16 16

# Dominante Farbe je Zelle: unterscheidet Farbvarianten von Animationsframes
node scripts/cell-color.mjs maingamesprites/MiniWorldSprites/Nature/Rocks.png 16 16

# Hochskalierte Rastervorschau als PNG, zur Sichtprüfung
node scripts/preview-sheet.mjs <quelle> <ziel.png> 16 16 8
```

Im Spiel selbst zeigt die **Asset-Galerie** (Startmenü → Asset-Galerie) für
jedes registrierte Sheet das Originalbild mit Pixelraster, jeden Frame einzeln
und einen Animationsplayer mit einstellbarer Zeile, Framezahl und Frame-Dauer.

`tests/manifest.test.ts` prüft bei jedem Testlauf gegen die echten PNGs:
jede registrierte Quelle existiert, die hinterlegten Bildmaße stimmen, jeder
verwendete Frame liegt im Bild, und keine Pflichtanimation ist leer.

## Ergebnisse der Messung

### Figuren: 5 Spalten × 12 Zeilen

Die Arbeiter- und Soldatensheets im Format 80 × 192 sind ein Raster aus
16 × 16-Frames mit fester Bedeutung. Ermittelt wurde das über zwei Schritte:
Belegungsraster (Zeilen 8–11 haben nur drei gefüllte Spalten) und einen
Pixelvergleich jeder Zeile mit jeder anderen, einmal direkt und einmal
horizontal gespiegelt.

| Zeilen | Animation | Frames | Richtungen |
|---|---|---|---|
| 0–3 | Idle | 5 | unten, oben, links, rechts |
| 4–7 | Walk | 5 | unten, oben, links, rechts |
| 8–11 | Arbeit/Angriff | 3 | unten, oben, links, rechts |

Belege: Zeile 0 ist exakt spiegelsymmetrisch (Frontansicht), Zeilen 10 und 11
sind exakte Spiegelbilder voneinander (Seitenansichten links/rechts), und die
Paare (2, 6) sowie (3, 7) unterscheiden sich nur um 20–22 Pixel – dieselbe
Blickrichtung einmal stehend, einmal gehend.

**Frame-Dauern.** Shade nennt Idle 300 ms, Walk 200 ms, Attack 100 ms. Idle und
Arbeit wurden übernommen (Arbeit auf 160 ms gestreckt, weil drei Frames bei
100 ms unruhig flimmern). Walk läuft mit **140 ms** statt 200 ms: bei 16 × 16
und einer Laufgeschwindigkeit von 2,2 Kacheln je Sekunde wirken 200 ms wie
Schlittern. Das ist eine bewusste, hier dokumentierte Abweichung.

**Fehlende Animationen.** Es gibt keine eigenen Holzfäller-, Bau-, Schlaf- oder
Kinderanimationen. Statt sie zu erfinden, nutzt das Spiel die vorhandene
Arbeits-/Angriffsanimation für jede Handarbeit und stellt Kinder aus der
neutralen `FarmerTemplate.png` verkleinert dar. Es wird an keiner Stelle
behauptet, es gäbe Baby-Sprites.

### Küste: echtes Autotiling aus `Cliff-Water.png`

80 × 96 sind **nicht** 30 beliebige Kacheln, sondern ein klassischer
3 × 3-Blob mit vier Innenecken; die Zeilen 3–5 wiederholen die Zeilen 0–2.

| Frame | Bedeutung | Frame | Bedeutung |
|---|---|---|---|
| 0 / 1 / 2 | Nordwest / Nord / Nordost | 3 / 4 | Innenecke oben links / rechts |
| 5 / 6 / 7 | West / Mitte / Ost | 8 / 9 | Innenecke unten links / rechts |
| 10 / 11 / 12 | Südwest / Süd / Südost | 13 / 14 | leer |

Das Spiel wertet für jede Landkachel alle acht Nachbarn aus und legt bei Bedarf
Innenecken über die Mittelkachel. `Cliff.png` (112 × 144) enthält dieselbe
Struktur dreimal – grau, hellgrau, sandfarben – plus Findlinge, zwei
Höhleneingänge und Steinwegstücke; das Hochland nutzt den ersten Satz.

### Boden ist eine Farbpalette, kein Grasset

`Grass.png` (80 × 16) enthält fünf **flächige Grundfarben**: Wasser, helles
Gras, Gras, Sand, Wasser. `Winter.png` (128 × 16) ist eine Abstufung von Wasser
bis Schnee, `Shore.png` eine Sandfolge. Die eigentliche Grasoptik entsteht aus
diesen Flächen plus sparsamen Büscheln aus `TexturedGrass.png`.

Ein eigenständiges Wegeset gibt es nicht. Als Pfadmaterial sind die
Steinplatten aus `Cliff.png` (Zeile 4 senkrecht, Zeile 5 waagerecht) im
Manifest vorgemerkt.

### Gebäude: was wirklich in den Sheets steckt

| Datei | Raster | Befund |
|---|---|---|
| `Huts.png` 80 × 16 | 5 × 1 à 16 × 16 | Fünf vollständige Hütten; die erste hat eine offene Front. |
| `Houses.png` 48 × 64 | 3 × 4 à 16 × 16 | Zwölf vollständige Häuser: vier Bauzeilen à drei Varianten, Zeile 3 mit Steinsockel und Schornstein. |
| `Keep.png` 96 × 64 | 3 × 2 à **32 × 32** | Drei Burgen; die untere Sheethälfte wiederholt die obere. |
| `Chapels.png` 48 × 32 | 3 × 1 à **16 × 32** | Drei Kapellen, oben Turm, unten Eingang mit weißem Sockel. |
| `Tower.png` 48 × 96 | 3 × 3 à **16 × 32** | Wachtürme und Mauerstücke. |
| `Barracks.png` 64 × 80 | 4 × 2 à **16 × 32** | Zeile 0 Kaserne, Zeile 1 Stall mit dunklem Tor. Die unterste 16-Pixel-Zeile bleibt ungenutzt. |
| `Resources.png` 48 × 80 | 3 × 5 à 16 × 16 | Zeile 0 Speicher, 1 Scheune, 2 offene Werkbank, 3 Steinbruch, 4 Erzmine mit sichtbarer Ader. |
| `Workshops.png` 48 × 48 | 3 × 3 à 16 × 16 | Zeile 0 Schmiede mit Amboss, 1 Alchemie mit Flaschen, 2 schlichte Werkstatt. |
| `Market.png` 48 × 64 | 3 × 4 à 16 × 16 | Vier Zeilen Marktstände mit unterschiedlichen Waren. |
| `Rocks.png` 48 × 64 | 3 × 4 à 16 × 16 | Drei Größen je Zeile; die vier Zeilen sind **Farbvarianten** (grau, gelbgrün, grün, weiß), keine Animation. |
| `Trees.png` 64 × 16 | 4 × 1 à 16 × 16 | Frame 0 ist ein niedriger Busch/Setzling, 1–3 sind gewachsene Bäume. |
| `Wheatfield.png` 64 × 16 | 4 × 1 à 16 × 16 | Vier aufsteigende Wachstumsstufen (Belegung 59 → 75 %). |

Baustufen und Varianten werden **nicht** als Animation abgespielt. Jedes
Gebäude wählt eine seedstabile Variante aus seiner Liste; nur der Acker
wechselt seinen Frame, und zwar entlang seines echten Erntefortschritts.

### Umdeutungen

Wo kein eigenständiger passender Crop existiert, nutzt das Spiel ein anderes
Motiv und kennzeichnet das im Gebäudedatensatz (`umdeutung`), in der Bauliste
und damit auch in der Oberfläche:

| Gebäude | Verwendete Grafik | Grund |
|---|---|---|
| Mühle | Scheune aus `Resources.png` | Kein Mühlen-Crop vorhanden. |
| Backhaus | Werkstatt aus `Workshops.png` | Kein Backofen-Crop vorhanden. |
| Weberei | Werkstatt aus `Workshops.png` | Kein Webstuhl-Crop vorhanden. |
| Gelehrtenstube | Alchemievariante aus `Workshops.png` | Keine Bibliotheksgrafik vorhanden. |
| Ranch | Offene Werkbank aus `Resources.png` | Kein Stallgebäude vorhanden; Hühner und Schafe laufen davor. |
| Kräutergarten | Ackerstufe aus `Wheatfield.png` | Kein Kräuterbeet vorhanden. |

### Symbole

`Icons-Essentials.png` (4 × 4) enthält Zeile 0 Münzen in vier Metallen, Zeile 1
Tränke in vier Farben, Zeile 2 Getreidegarbe, Herz, Kopf und Schädel, Zeile 3
Steine mit verschiedenen Adern. `UiIcons.png` (4 × 12) enthält Werkzeuge,
Rechenzeichen, Ausrufe- und Fragezeichen, Haken und Kreuze, Pfeile in acht
Richtungen, farbige Kreuze, Brief, Sprechblase und Zahnräder.

Die Oberfläche nutzt diese echten Ausschnitte als Ressourcen- und
Navigationssymbole. Wo für eine Ware kein Symbol existiert, steht ein
Weltsprite (Baum für Holz, Schaf für Wolle, Huhn für Eier) oder eine kleine
Textmarke – **keine großen Emojis als Ersatz für vorhandene Spielgrafik**.

## Audio

`npm run assets` erzeugt aus den WAV-Dateien kleinere Ableitungen: Effekte in
22,05 kHz Mono, Musik in 32 kHz Mono. Aus 15 MiB Effekten und 28 MiB Musik
werden so rund 9,8 MiB.

**In dieser Umgebung stand kein mp3- oder ogg-Encoder zur Verfügung** (weder
`ffmpeg` noch `lame` noch `oggenc`). Die Ableitungen bleiben deshalb WAV. Das
ist in allen Zielbrowsern inklusive Safari abspielbar, aber deutlich größer als
eine komprimierte Fassung. Musik wird ausschließlich auf Anforderung geladen,
nie beim Spielstart.

Für Holzfällen, Steinklopfen, Werkstattarbeit, Bauabschluss, Forschung und
Oberflächenklicks gibt es **keine passenden Dateien** im Projekt. Diese Cues
werden als kurze Web-Audio-Töne erzeugt und sind im Cue-Katalog
(Einstellungen → Ton) ausdrücklich als `prozedural` gekennzeichnet.
Kampfgeräusche werden nicht als Dorfarbeit zweckentfremdet; sie bleiben
ungenutzt, bis es passende Aktionen gibt.

Die Musikdateien wurden **nicht abgehört** – in dieser Umgebung gibt es keine
Wiedergabe. Ob `Goblins_Den_(Regular)` als Dorfhintergrund trägt, ist deshalb
offen; Dorfmusik ist standardmäßig leise und über die Einstellungen an- und
abschaltbar.
