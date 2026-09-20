# Claude-Superprompt: Wurzelhain – Ein Dorf lebt weiter

> Anwendung: Gib Claude Zugriff auf dieses Repository und lass ihn diesen gesamten Prompt sowie `docs/ASSET-KATALOG.md` und `docs/asset-inventory.json` lesen. Der folgende Text ist ein Implementierungsauftrag, kein Auftrag für ein weiteres Konzept. Die dokumentierten Asset-Fakten sind geprüft; Spielregeln, Werte und Rollen sind bewusst entworfene Vorgaben. Die vorhandenen `docs/contact-0.png` bis `contact-5.png` zeigen sämtliche unterschiedlichen PNG-Sheets als Übersicht.

---

Du bist ein erfahrener Browsergame-Entwickler mit Verantwortung für Simulation, Game Design, Pixel-Art-Integration, UX, Audio und Qualität. Entwickle in diesem Repository **Wurzelhain**, ein vollständiges, deutschsprachiges Idle-Dorfspiel mit autonom lebenden Bewohnern. Arbeite in funktionierenden Etappen, implementiere und teste selbstständig. Liefere ein ausführbares Spiel, keine Landingpage, kein Dashboard mit simulierten Zahlen und keine Sammlung unverbundener Demos.

## 1. Spielerlebnis und Leitidee

„Ich beobachte mein kleines Dorf beim Leben, helfe ihm durch kluge Entscheidungen und entdecke immer neue Möglichkeiten.“

Eine sonnige Pixelwelt füllt den Bildschirm. Bewohner laufen aus ihren Häusern, fällen ausgewählte Bäume, tragen Vorräte heim, bestellen Felder, lernen Berufe, treffen Freunde und gründen Familien. Bei Wohnraummangel schlagen sie neue Häuser vor und bauen diese innerhalb des freigegebenen Budgets selbst. Das Dorf wächst sichtbar vom kleinen Lager zu mehreren verbundenen Siedlungsvierteln mit Feldern, Marktplatz, Hafen und Handwerk. Der Spieler entscheidet über Prioritäten, Forschung, Flächennutzung, Vorräte und große Bauvorhaben. Gute Steuerung beschleunigt das Wachstum; das Dorf funktioniert auch beim entspannten Zuschauen.

Das Spiel soll langfristig motivieren durch sichtbare Veränderung, kurze Erfolgserlebnisse, interessante Engpässe, liebenswerte Bewohner und strategische Entscheidungen. Keine Pflicht zum Dauerklicken, keine bezahlten Wartezeitverkürzungen, keine bestrafenden Login-Streaks. Ein ruhiger Dorfmodus ist Standard. Optionales Abenteuer erschließt zusätzliche Assets und Inhalte, ohne den Aufbau zu verdrängen.

Die ersten 60 Sekunden müssen Holzfällen, einen sichtbaren Transport und eine sinnvolle Spielerentscheidung zeigen. Nach wenigen Minuten entsteht das erste neue Haus. Nach etwa 20–30 Minuten ist aus dem Startlager ein erkennbares Dorf geworden. Das sind durch Playtests zu bestätigende Zielwerte.

## 2. Verbindlicher Asset-Befund

Im Ausgangsordner liegen **320 Originaldateien**: `maingamesprites` 208, `ui` 38, `font` 7, `sfx` 62, `music` 5. Es existierte bei der Bestandsaufnahme noch kein Spielcode. Vorhandene Änderungen und Löschungen in Git respektieren; keine alten Retro-Asset-Ordner wiederherstellen.

Lies das vollständige Inventar. Jede Datei muss einen begründeten Status erhalten: Laufzeit, Variante, Referenz, Quelldaten oder Duplikat. Nutze die gesamte gestalterische Bandbreite über Fortschritt, Biome, Fraktionen, Sammlung und Expeditionen. Lade nicht jede Datei beim Start. Templates, Dokumente und identische Kopien sind kein zusätzlicher Spielinhalt.

Asset-Basis: `maingamesprites/MiniWorldSprites/`. In diesem Prompt abgekürzte Grafikpfade beziehen sich darauf. Beachte Groß-/Kleinschreibung, Leerzeichen, Klammern und Unicode: Vercel läuft nicht mit den toleranten Windows-Pfadannahmen. `Börg.png`, `Horse(32x32).png`, `Assasin…` und `ShortBig.png` sind tatsächliche Namen. Keine vermeintlichen Schreibfehler in Quellpfaden korrigieren.

### 2.1 Sprite-Pipeline zuerst

Erstelle vor der eigentlichen Welt eine entwicklungsinterne Asset-Galerie mit Originalsheet, Pixelraster, Crop-Vorschau und Animationsplayer. Erzeuge danach ein typisiertes Manifest mit `source`, `rect`, `anchor`, `footprint`, `blockingTiles`, `entrance`, `variant`, `animations` und Herkunft. Speichere geprüfte Ausschnitte explizit. Sheet-Abmessungen allein beweisen weder Framegröße noch Semantik.

Viele kleine Grafiken orientieren sich an 16 × 16. Es gibt größere Figuren, Reittiere, Drachen, Gebäudegruppen und unregelmäßige Zeilen. Beispiele aus dem Inventar: FarmerCyan 80 × 192, Horse 128 × 192, RedKnight 128 × 384, Drachen 128 × 256, Wood/Keep 96 × 64. Keine globale Regel „jedes Sprite 16 × 16, jede Zeile vier Frames“. Gebäude enthalten häufig Baustufen und Varianten; diese nicht als flackernde Animation abspielen. Kollisionsfläche und Bildgröße unabhängig definieren; Baumkrone darf einen Nachbarn optisch überdecken.

Shade nennt als Animationsrichtwerte: Idle 300 ms, Walk 200 ms, Attack 100 ms, Shield Idle 300 ms, Shield Take Damage 100 ms. Verwende diese zunächst als Frame-Dauern, prüfe den visuellen Rhythmus im Player und dokumentiere Abweichungen. Die Zuordnung konkreter Reihen und Framezahlen muss aus jedem Sheet ermittelt werden. Nicht jede Figur besitzt alle fünf Animationen. Fehlende Holzfäller-, Bau-, Schlaf- oder Kinderanimationen nicht erfinden: vorhandene passende Bewegung mit Werkzeugicon, kleiner Partikelwirkung oder Text kombinieren. Kinder erhalten eine klar dokumentierte, dezente Darstellung aus vorhandenem Material; keine angeblich vorhandenen Baby-Sprites behaupten.

`AllAssetsPreview.png` und `ColoredBuildingsPreview.png` sind Referenzübersichten. `Buildings/Enemy/Orc/AllBuildings-Preview.png` ist das einzige separate Orc-Gebäude-Sheet im Ordner: verwendbare Teilbilder daraus einzeln prüfen und ausschneiden; es gibt keine belegten Orc-Unterdateien für jeden Gebäudetyp. `Templates/*` sind Entwicklungshilfen. `OtherLinks.docx` enthält Danksagung und Links, keinen zusätzlichen Animationsplan.

### 2.2 Gebäude und Fraktionen

`Buildings/Wood/` hat Barracks, CaveV2, Chapels, Docks, Houses, Huts, Keep, Market, Resources, Taverns, Tower, Tower2 und Workshops. `Buildings/{Cyan,Lime,Purple,Red}/` enthält jeweils die gleichnamig vorangestellten Sheets für Barracks, Chapels, Docks, Houses, Huts, Keep, Market, Resources, Ship, Taverns, Tower, Well, Workshops. Für Wood den Brunnen aus `Miscellaneous/Well.png` verwenden.

Holz ist die frühe Dorfästhetik. Farbvarianten sind zunächst freischaltbare Viertelstile und später verbündete Siedlungen: Cyan für Küste/Handel, Lime für Landwirtschaft, Purple für Forschung, Red für Verteidigung. Farbe allein verleiht keinen versteckten Bonus; Spezialisierungen entstehen durch explizite Gebäude und Politik. Kein identisches Haus viermal als künstlich neuer Gebäudetyp verkaufen.

Shades Gebäudeguide liefert die semantische Grundlage. Ordne bestätigte Crops folgenden Funktionen zu. Wo kein eigenständiger passender Crop existiert, nutze ein Modul in einem passenden Gebäude und kennzeichne die Umdeutung im Manifest.

| Gruppe | Inhalt und spielerische Funktion |
|---|---|
| Huts / Houses | Hütten, Hütten im Wald, Familienhäuser; Wohnplätze, Haushalte, Wohnqualität; Baustufen sichtbar |
| Keep | Rathaus, später Burg; Siedlungsstufen, Bauverwaltung und große Forschung |
| Taverns | Taverne; Freizeit, Zufriedenheit, Reisende, Spezialisten |
| Resources | Sägewerk, Mine/Steinbruch, Silo/Mühle, Ranch; tatsächlich passende Motive vor Auswahl prüfen |
| CaveV2 | Erzhöhle mit begrenzter Förderleistung und späterem Ausbau |
| Workshops | Schmiede, Werkstatt, Alchemie; Werkzeuge, Bretter-Verarbeitung, Ausrüstung und Tränke |
| Market | Getreide-, Obst-, Fisch-, Fleisch- und Ausrüstungshandel; Stände teilen Marktlogistik |
| Chapels | Kapelle/Heiligtum; Gemeinschaft, Heilung, später heilende Expeditionseinheiten |
| Barracks | Kaserne, Garnison, Bogenschießplatz, Stall; Gefängnis als optionales spätes Expeditionsmodul |
| Tower / Tower2 | Wachturm, Mauern und Verteidigung; im friedlichen Modus Aussicht und Sicherheit |
| Docks | Hafen und Werft; Fischerei, Handelswege, Bootsbau |
| Enemy/Mausoleum | Untotenruine als Expeditionsziel |
| Enemy/SpearWall | Palisaden und Sperren; korrekt erreichbare Durchgänge einplanen |

Kein freischaltbares Gebäude ohne Wirkung. Jede Definition hat Kosten, Bauzeit, Voraussetzungen, Beschäftigung, Kapazität, Input/Output, Upgradepfad, Grafik und verständlichen Statustext.

### 2.3 Welt, Ressourcen, Tiere und Figuren

`Ground/Grass`, `TexturedGrass`, `Shore`, `Cliff`, `Cliff-Water`, `DeadGrass`, `Winter` bilden Wiesen, Küste, Klippen, trockenes Land und Schnee. Terrainübergänge kartieren; keine zufällig aneinandergesetzten Klippen. Pfade als passende Bodencrops oder zurückhaltende prozedurale Pixeltextur umsetzen; ein eigenständiges Wegeset ist nicht belegt.

`Nature/Trees`, `PineTrees`, `DeadTrees`, `WinterTrees`, `WinterDeadTrees`, `CoconutTrees`, `Cactus`, `Rocks`, `Wheatfield`, `Tumbleweed`: lebende Rohstoffwelt. Baumstumpf und Wachstum nutzen, Stein-/Erzfarben begründet zuordnen, Weizenwachstum animieren. Farbe beweist keine bestimmte Erzart: die Zuordnung ist eine Spieldefinition. Nachwachsende Wälder benötigen Zeit und freien Boden; Felsen wachsen nicht minütlich magisch nach. Langfristige Steinversorgung über Steinbruch und neu erschlossene Lager.

`Animals/Chicken`, `Chick`, `Sheep`, `HornedSheep`, `Pig`, `Boar`, `Horse(32x32)`, `MarineAnimals`: Eier, Wolle, Ranch, Wildtiere, Transport, Küstenleben. Tiervermehrung durch Stallkapazität und Futter begrenzen. Keine tägliche Klickpflicht zum Füttern.

Arbeiter aus `Characters/Workers/{CyanWorker,LimeWorker,PurpleWorker,RedWorker}/Farmer{Farbe}.png`; FarmerTemplate als neutrale Basis. Derselbe Bewohner kann seinen Beruf wechseln, Name und Beziehungen bleiben bestehen. Werkzeug- oder Berufsicons machen Rollen unabhängig von Kleidungsfarbe verständlich.

Soldatenfamilien: Swordsman, Spearman, Axeman, Assasin, Bowman, Mage, Musketeer, Knights sowie Ballista. Alle vier Farbfamilien und vorhandene Templates in Manifest/Galerie berücksichtigen. Wachen patrouillieren und helfen außerhalb von Alarmphasen; Abenteuertruppen bleiben eine begrenzte Fraktion der Bevölkerung.

Champions: Arthax, Börg, Gangblanc, Grum, Kanji, Katan, Okomo, Zhinja. Gib jedem eine eigene kleine Quest und nachvollziehbare Spezialisierung, beispielsweise Bauleitung, Bergbau, Handel, Diplomatie, Forstwirtschaft, Forschung, Landwirtschaft und Erkundung. Diese Rollen sind neue Spielideen, keine überlieferte Asset-Lore. Boni nicht unbeschränkt stapeln; maximal drei aktive Berater.

Monster vollständig über Biome/Expeditionen einbinden: Slime, SlimeBlue, MegaSlimeGreen/Blue, KingSlimeGreen/Blue; Orc, ArcherGoblin, ClubGoblin, FarmerGoblin, SpearGoblin, KamikazeGoblin, OrcMage, OrcShaman, Minotaur; Skeleton-Soldier und Necromancer; PirateCaptain, PirateGrunt, PirateGunner; RedDemon, ArmouredRedDemon, PurpleDemon; Mammoth, Wendigo, Yeti; GiantCrab; Black/Blue/Red/White/YellowDragon. FarmerGoblin kann einen neutralen Handelsposten betreiben. Gegner müssen nicht dauerhaft das Dorf angreifen, um sinnvoll genutzt zu werden.

`Objects/ArrowShort`, `ArrowLong`, `Axe`, `BallistaBolt`, `Bullet`, `FireballProjectile`, `ShortBig`, `Spear`, `SwordShort`: passende Projektile/Ausrüstung; Pfeile und Geschosse ausgehend von echten Aktionen, keine dauerhaften zufälligen Effekte.

`Miscellaneous/Bridge`, `Boat`, `TransportShip`, `WarShip`, `PirateShip`, `Portal`, `Well`, `Chests`, `QuestBoard`, `Signs`, `StreetSigns`, `Tombstones`: begehbare Brücke, Fischerboot, Handelsroute, Seeexpedition, Piratenbegegnung, späteres Reiseziel, Brunnen, Lager/Belohnung, Aufträge, lesbare Dorfstruktur und Gedenkgarten. Diese Objekte erhalten physische Plätze und Interaktionen.

## 3. Kernsimulation: Bewohner mit nachvollziehbarem Leben

Trenne Simulationsmodell und Grafik strikt. Ein Einwohner hat ID, Name, Lebensphase, Haushalt, Wohnort, Beruf, Fähigkeiten, zwei Charakterzüge, Energie, Sättigung, Zufriedenheit, Beziehungen, aktuellen Auftrag, Inventar und Reservierungen. Im Bewohnerpanel steht konkret: „Mira bringt 4 Holz zum Lager“ oder „Wartet auf freien Platz im Sägewerk“.

Implementiere Zustände wie `idle`, `chooseTask`, `walk`, `gather`, `carry`, `deposit`, `build`, `craft`, `eat`, `rest`, `socialize`, `flee`. Nutzenbewertung wählt Aufgaben anhand Versorgungslage, Entfernung, Berufsgewicht, Fähigkeit und persönlichem Bedarf. Mindesthaltezeiten verhindern hektisches Wechseln. Wege nicht jeden Renderframe neu berechnen.

Material ist physisch nachvollziehbar: Ein Holzfäller reserviert einen Baum und einen Lagerplatz, läuft hin, arbeitet, trägt Holz, liefert es ab. HUD-Vorräte steigen erst bei Ablieferung. Ein Baum darf nicht von zehn Bewohnern gleichzeitig doppelt ausgezahlt werden. Transportaufträge erlauben Arbeitsteilung. Im späteren Spiel verbessern Lager, Wege, Pferde und Quartierslogistik den Durchsatz.

Alle Reservierungen haben Besitzer und werden bei Abbruch, Berufswechsel, Unzugänglichkeit und Laden konsistent freigegeben oder wiederhergestellt. Scheitert ein Weg, folgt begrenztes Neuplanen, danach ein anderer Auftrag und ein erklärbarer Hinweis. NPCs dürfen nicht dauerhaft in Mauern oder Häusern feststecken.

Haushalte entstehen aus erwachsenen Bewohnern mit positiver Beziehung und freiem Wohnraum. Wachstum braucht Nahrungsreserve, stabile Zufriedenheit und Wohnplätze. Als Startwerte: mindestens zwei zufriedene Erwachsene, Zufriedenheit über 65/100, zwei Tage Nahrungspuffer und ein freier Familienplatz; frühestens nach 12 aktiven Minuten ein Kind je berechtigtem Haushalt, 20 Minuten Haushalts-Cooldown. Kinder werden nach etwa 24 aktiven Minuten zu arbeitsfähigen Erwachsenen. Diese beschleunigte Spielzeit ist kein realistisches Lebensmodell. Kinder arbeiten nicht. Früh helfen auch gelegentliche Einwanderer gegen lange Bevölkerungslücken.

Bewohner altern im Kernspiel nicht automatisch zu einem Verlust der gesamten Bevölkerung. Spätes Generationen-/Ruhestandssystem kann Fähigkeiten an Lehrlinge weitergeben. Nahrungsknappheit reduziert Wachstum und Produktivität; im Standardmodus keine irreversible Todesspirale. Hunger bleibt sichtbar und lösbar, nicht bedeutungslos.

Charakterzüge mit kleinen Effekten: fleißig, gesellig, genügsam, neugierig, naturverbunden, sorgfältig. Skills steigen langsam durch echte Arbeit; maximal moderate Boni. Freizeit am Brunnen, Taverne und Markt; sichtbares Heimgehen, kurze Gespräche mit Icons, Tiere laufen in erlaubten Bereichen. Der Spieler kann Namen ändern, Lieblingsbewohner markieren und der Kamera folgen lassen.

## 4. Autonomer Dorfbau und Spielersteuerung

Vier verständliche Strategien: Ausgewogen, Wachstum, Vorräte, Handwerk. Zusätzliche Regler für Bauanteil, Holzreserve und Nahrungsziel. Zeige die Auswirkungen vor dem Umschalten. Keine Einzel-NPC-Mikroverwaltung nötig; manuelle Berufszuweisung optional.

Autobau nur in freigegebenen Wohn-, Produktions- und Landwirtschaftszonen. Standard: höchstens 25 % frei verfügbarer Baustoffe, feste Mindestreserve und zwei parallele Baustellen. „Verfügbar“ bedeutet Lagerbestand minus bereits reservierte Aufträge. Großprojekte wie Burg, Portal und Expeditionen benötigen eine bewusste Spieleraktion.

Beispiel: 80 % Wohnraum belegt und positive Nahrungsbilanz → Hausbedarf → erreichbaren Bauplatz suchen → Kosten reservieren → Materialien anliefern → Baufortschritt → neues Haus → Kapazität aktivieren. Nicht vor Fertigstellung Wohnplätze vergeben. Bei Baustopp Restmaterial korrekt behandeln; kein Duplizieren durch Abriss. UI zeigt „Dorf plant ein Haus: 18/30 Holz geliefert“ und bietet Pause/Standortwechsel vor Baubeginn.

Bauplätze bewerten nach Zugang, Entfernung zu Arbeit/Lager, Nachbarschaft und freien Wegen. Mindestens ein erreichbarer Eingang; Brücken, Küstenzugänge und zentrale Wege freihalten. Bäume nur nach Freigabe räumen; Schutzgebiete bleiben unangetastet. Spieler kann Gebäude selbst platzieren, verschieben mit klaren Kosten, verbessern, pausieren und abreißen. Vor jeder kostenpflichtigen Aktion Kosten und Effekt zeigen.

## 5. Wirtschaft und Produktionsketten

Frühe Ressourcen: Holz, Stein, Nahrung, Münzen. Später Bretter, Getreide, Mehl, Brot, Fisch, Eier, Wolle, Stoff, Erz, Barren, Werkzeuge, Kräuter, Tränke, Kristalle, Forschung und Ansehen. Aggregierte Nahrung im HUD; Untertypen im Lager und für Rezepte sauber bilanzieren. Nahrungseinheiten niemals zugleich als Brot und zusätzlich als allgemeines Essen speichern.

| Produktionskette | Nutzen |
|---|---|
| Baum → Holz → Bretter | Gebäude, Werkstatt, Schiffe |
| Fels → Stein; Mine → Erz → Barren | Ausbau, Schmiede, Verteidigung |
| Weizen → Getreide → Mehl → Brot | Effiziente Versorgung großer Haushalte |
| Küste → Fisch; Ranch → Eier | Nahrungsvielfalt und Resilienz |
| Schaf → Wolle → Stoff | Wohnkomfort, Handel, Ausrüstung |
| Kräuter + Wasserzugang → Trank | Heilung / Expeditionen |
| Barren + Holz → Werkzeuge | Langfristiger Produktivitätsbonus; begrenzter Verschleiß |
| Überschüsse → Markt/Schiff → Münzen | Forschung, Spezialisierung, importierte Engpassgüter |

Wasser ist anfangs Versorgungsreichweite des Brunnens, kein ständig anzuklickender Behälter. Forschung entsteht durch beschäftigte Gelehrte im späteren Rathaus-/Alchemie-Modul; keine frei erfundene Bibliotheksgrafik voraussetzen.

Startvorschlag: 6 Erwachsene, 2 Hütten mit zusammen 8 Plätzen, zentraler Lagerplatz mit 200 Gesamtkapazität, 60 Holz, 35 Stein, 80 Nahrung, 20 Münzen. Zusätzlich ein Brunnen und erste erreichbare Rohstoffe. Neues Haus 30 Holz + 10 Stein, 45 Sekunden reine Bauarbeit, 4 Plätze. Holzarbeit anfangs 1 Einheit je 3 Arbeitssekunden; Laufen reduziert effektiven Ertrag. Stein 1 je 5 Sekunden. Bewohner essen im Mittel 1 Nahrung je 60 Simulationssekunden. Frühe Nahrungsarbeit muss einschließlich Transport zuverlässig mindestens das Doppelte des Startverbrauchs leisten können.

Diese Werte sind Balancehypothesen. Simuliere 30 Minuten ohne Spielereingriff und mit sinnvoller Steuerung. Passe sie datengetrieben an. Kein Engpass darf ein unlösbares Softlock erzeugen: Notration gegen Münzen, begrenzte Einwanderung und Abbau mit einfachen Werkzeugen bleiben möglich. Falls Geld und Nahrung null sind, ermöglichen grundlegende Nahrungsjobs weiterhin Erholung.

Einkommen entsteht aus tatsächlichen Verkäufen, Dienstleistungen und späteren Handelsverträgen. Kein zweiter unsichtbarer Idle-Multiplikator zusätzlich zu derselben NPC-Produktion. Für Leistungsdarstellung gleitende Netto-Raten inklusive Verbrauch verwenden. Jede Zahl hat eine Erklärung.

## 6. Fortschritt und langfristiger Inhalt

Sechs aufeinander aufbauende Kapitel, mit überprüfbaren Bedingungen und sichtbar neuen Möglichkeiten:

| Kapitel | Freischaltungen | Zielgefühl |
|---|---|---|
| Lager, 0–10 Minuten | Sammeln, Lager, Brunnen, Hütten, erste Priorität | „Hier passiert wirklich etwas.“ |
| Dorf, 10–40 Minuten | Familien, Felder, Sägewerk, automatische Häuser, Wege | „Meine Gemeinschaft wächst.“ |
| Handwerksort, 40–120 Minuten | Steinbruch, Mühle, Werkstatt, Markt, Taverne, Ranch | „Die Ketten greifen ineinander.“ |
| Handelsstadt, 2–6 Stunden | Schmiede, Hafen, Nachbardörfer, Quartiere, Spezialisten | „Ich gestalte meine Wirtschaft.“ |
| Grenzland, 6–15 Stunden | Winter/Trockenzone, Wachen, Expeditionen, Heiligtum | „Die Welt hat Geheimnisse.“ |
| Siedlungsbund, ab 15 Stunden | Portal, Drachenziele, Kolonien, Vermächtnis | „Mein Dorf ist Teil einer größeren Welt.“ |

Zeitangaben sind unverbindliche Balanceziele für aktives und nachgerechnetes Spiel. Freischaltungen bevorzugt an Leistung knüpfen: Einwohner, stabile Versorgung, Forschung, Lieferungen, erkundete Gebiete. Keine bloße Timerwand.

Mindestens 24 funktionale Gebäudetypen/Module mit jeweils sinnvollen Verbesserungen, 36 Forschungsprojekte in sechs Ästen, 30 abwechslungsreiche Aufträge, 12 Ereignisse, 8 Champions und 6 Regionen. Varianten zählen nicht als neue Mechanik. Daten definieren Inhalt, gemeinsam implementierte Systeme führen ihn aus.

Forschungsäste: Versorgung, Forst/Bergbau, Handwerk, Gemeinschaft, Handel, Erkundung. Beispiele: Tragekörbe +2 Kapazität; Aufforstung; befestigte Wege; Mühlenantrieb; Werkzeugpflege; Lehrlingsausbildung; größere Familienhäuser; Marktkarren; Quartierslager; Schiffsbau; Winterkleidung; Heilkräuter; Diplomatie; Portalstabilisierung. Zeige konkrete Vorher-/Nachherwerte, maximal fünf Upgrade-Stufen pro normalem Gebäude und abnehmende Grenzerträge.

Aufträge kombinieren echte Aktionen: Nahrungspuffer aufbauen, ein Haus fertigstellen, Brücke erschließen, Wolle liefern, Bewohner ausbilden, Schutzwald anlegen, Handelsvertrag erfüllen. Frühe Aufgaben bleiben auch nach Überspringen erreichbar. Ereignisse: Händler, Erntefest, Reisende, Tiernachwuchs, Erzfund, Regenperiode, Bauwettbewerb, Marktansturm, gestrandetes Schiff, Goblinhandel, Sternennacht, Wintervorbereitung. Keine Pflichttermine nach realem Kalender.

Regionen: Wiesenwald, felsiges Hochland, Küste, trockenes Grenzland, Winterwald, alte Ruinen/Portalgebiet. Begrenzte, seedbasierte Welt mit 32 × 32-Tile-Chunks; Startfläche etwa 64 × 64 Tiles. Erweiterungen öffnen benachbarte Landstücke gegen erfüllte Ziele. Nachbargebiete müssen erreichbar sein. Welt nicht völlig zufällig mit Ressourcen zuschütten: Waldgruppen, freie Bauflächen, Ufer, Landmarken und Wegekomposition.

Expeditionen sind kurze vorbereitete Unternehmungen mit sichtbarer Truppe, Vorräten, Risiko und Belohnung. Automatische, verständliche Kämpfe; Rückzug statt Totalverlust im Standardmodus. Ausrüstung und Heilung schaffen zusätzliche Nachfrage. Jeder Gegnerfamilie mindestens ein passendes Ziel und Bestiariumeintrag geben. Drachen bilden späte Herausforderungen, keine Überfälle nach fünf Minuten.

Vermächtnis ist freiwillige Neugründung einer weiteren Siedlung. Zeige exakt, was erhalten bleibt und was zurückgesetzt wird. Bestehendes Dorf als besuchbaren Snapshot erhalten. Bonus wächst begrenzt über Entdeckungen und Meilensteine, nicht durch endlose exponentielle Stapelung. Erst nach stabil implementiertem Kern ergänzen.

## 7. Attraktiver Dorfhub und HUD

Der Hub ist ein echter belebter Dorfplatz in der Spielwelt: Brunnen im Zentrum, QuestBoard daneben, Taverne und Markt am Rand, Wegweiser, Bäume, sichtbare Lagerkisten. Morgens laufen Bewohner zur Arbeit; mittags treffen sie sich am Platz. Antippen von Brunnen, Auftragsbrett, Taverne oder Rathaus öffnet die passende Funktion. Dieselben Funktionen bleiben über das HUD erreichbar.

Desktop/Querformat: oben kompakte Ressourcenleiste mit Bestand, Nettofluss und Bevölkerung; links schmale Ziel-/Ereignisanzeige; rechts kontextbezogenes Inspektorpanel; unten fünf Hauptbereiche Dorf, Bauen, Forschung, Handel, Welt. Mindestens etwa 70 % der Fläche bleibt ohne geöffnetes Panel Welt. Auf kleinen Displays nur die wichtigsten Ressourcen zeigen, weitere per Antippen.

iPad-Hochformat: oben höchstens zwei kompakte Zeilen, unten Navigation, Details als Bottom Sheet mit halber oder voller Höhe. Kein dauerhaftes breites Seitenpanel. Panels schließen ohne Weltklicks auszulösen. Fenster skalieren über Nine-Slice, nicht durch Strecken des gesamten UI-Sheets.

Nutze `ui/PNG/` als kanonischen UI-Satz. Die 19 gleichnamigen Dateien direkt unter `ui/` sind per SHA-256 identisch. Hauptbestandteile: Main_tiles/Decorative_cracks für dezente Rahmen, Buttons für Zustände, Main_menu für Start, Inventory fürs Lager, Craft für Rezepte, Shop für Handel, Equipment für Expeditionen, Settings für Optionen, Levels für Forschung, character_panel für Bewohner, Action_panel und Circle_menu für Aktionen, Win_loose für Expeditionsergebnis, Icons für Symbole. Numbers/Numbers_levels sowie Text1/Text2 sind optionale Stilreferenzen; dynamische deutsche Beschriftungen als echten Text rendern.

`User Interface/BoxSelector.png` und `Highlighted-Boxes.png` für Auswahl, Bauvorschau und Reichweiten. Grün/Rot nie als einziges Feedback; zusätzlich Häkchen, Kreuz und Grund anzeigen. `UiIcons` und `Icons-Essentials` für kompakte Welt- und Ressourcensymbole. Keine riesigen Emojis als Ersatz für vorhandene Spielgrafik.

`font/ttf/monogram-extended.ttf` für Überschriften und kompakte Zahlen, deutsche Zeichen prüfen. Für längere Erklärungen gut lesbare Systemschrift oder ausreichend große Monogram-Schrift. Normale und kursive TTF sowie Bitmapdateien bewusst einordnen; Bitmap-JSON sind Quelldaten und nicht ungeprüft ein Phaser-BitmapFont-Format.

Farbwelt: natürliche Grüntöne und türkisfarbenes Wasser, warme Holzrahmen, helle Pergamentflächen, zurückhaltende Akzentfarbe. Scharfe Pixel, konsistente Schatten, keine Hochglanz-Glaseffekte. Zoom auf ganze Pixelmaßstäbe einrasten lassen. Tag/Nacht durch sanfte Tönung, abends warme Fensterpunkte; Dunkelheit darf Lesbarkeit nicht zerstören. Wetter und Partikel sparsam, reduzierte Bewegung anbieten.

Startmenü über einer kleinen lebenden Dorfszene: Fortsetzen, Neues Dorf, Einstellungen, Credits. Neue Spiele erhalten Seed, Dorfnamen und Modus. Drei lokale Speicherplätze. Ein kompakter interaktiver Einstieg begleitet Sammeln, Hausbau, Prioritäten und Forschung; immer überspringbar.

## 8. Sounddesign mit den vorhandenen Dateien

Vor Umsetzung alle Audiofamilien anhören, Pegel und Loopgrenzen prüfen. Die Zuordnung unten beruht auf Dateinamen und Metadaten, nicht auf bereits erfolgtem Hörtest. Sound soll die Dorfwelt unterstützen und nicht bei hundert Bewohnern zu einem Geräuschteppich werden.

Alle Effekte liegen in `sfx/`. Verwende Varianten zufällig ohne unmittelbare Wiederholung; leichte Pegel-/Tonhöhenvariation nur bei passenden Geräuschen. Ereignisse als benannte Audio-Cues kapseln.

| Familie / Dateien | Einsatz |
|---|---|
| 01_chest_open_1–4.wav | Truhe/Expeditionsbelohnung öffnen, besondere Lageraktion |
| 02_chest_close_1–3.wav | Physische Truhe schließen; nicht jedes UI-Panel laut schließen |
| 03_crate_open_1–3.wav | Größere Warenlieferung oder Werkstattkiste |
| 04_sack_open_1–3.wav | Saatgut, Nahrungs-/Getreidelieferung; stark begrenzen |
| 05_door_open_1–2.mp3 | Nahe sichtbare Hauseintritte |
| 06_door_close_1–2.mp3 | Passendes Türschließen nach Eintritt |
| 07_human_atk_sword_1–3.wav | Nahkampfangriff menschlicher Einheit |
| 08_human_charge_1–2.wav | Start einer aufgeladenen menschlichen Fähigkeit |
| 09_human_charging_1_loop.wav / _2_loop.wav | Nur während tatsächlicher Aufladung; bei Abbruch sofort ausblenden |
| 10_human_special_atk_1–2.wav | Spezialangriff/Championfähigkeit |
| 11_human_damage_1–3.wav | Menschliche Einheit getroffen, nicht bei Hunger |
| 12_human_jump_1–3.wav | Passende sichtbare Abenteuer-/Freudenaktion, wenn Animation glaubwürdig ist |
| 13_human_jump_land_1–2.wav | Zugehörige Landung; kein zufälliges Ambient-Geräusch |
| 14_human_death_spin.wav | Besiegte Expeditionseinheit, gegebenenfalls bewusstloser Rückzug |
| 15_human_dash_1–2.wav | Sichtbarer Sprint/Ausweichfähigkeit im Abenteuer |
| 16_human_walk_stone_1–3.wav | Schritte auf Stein in Kameranähe, nicht auf jedem Gras-Tile |
| 17_orc_atk_sword_1–3.wav | Orc-Nahkampf |
| 18_orc_charge.wav | Beginn Orc-Fähigkeit |
| 19_orc_charging_loop.wav | Zugehörige Aufladung mit sauberem Stop |
| 20_orc_special_atk.wav | Orc-Spezialfähigkeit |
| 21_orc_damage_1–3.wav | Orc-Treffer |
| 22_orc_jump_1–2.wav | Passende Orc-Sprungaktion |
| 23_orc_jump_land.wav | Orc-Landung |
| 24_orc_death_spin.wav | Orc besiegt |
| 25_orc_walk_stone_1–3.wav | Stein-Schritte entsprechender Gegner in Nähe |
| 26_sword_hit_1–3.wav | Bestätigter Nahkampftreffer, mit Stimm-Cue abgestimmt |
| 27_sword_miss_1–3.wav | Fehlschlag/Schwung ohne Treffer |

Nicht alle Sounds müssen in der ersten Minute hörbar sein. Fehlende Holz-, Stein-, Vogel-, Wasser- oder UI-Klicksounds sind nicht als vorhandene Dateien ausgeben. Für dezente Klicks/Bauabschluss optional einfache kurze Web-Audio-Töne erzeugen und als prozedural dokumentieren. Keine Schwerttreffer als lautes permanentes Holzfällen missbrauchen. Sprung-/Dash-Sounds können in der Audio-Galerie bleiben, solange keine passende Aktion implementiert ist; keine überflüssige Mechanik nur wegen eines Sounds bauen.

Musik: `music/Minifantasy_Dungeon_Music/Music/Goblins_Den_(Regular).wav` (57,6 s, Stereo, 44,1 kHz) für Erkundung/Höhlen und nach Hörtest eventuell leisen Dorfhintergrund. `Goblins_Dance_(Battle).wav` (52,645 s) für Kämpfe. Die zwei WAVs umfassen zusammen rund 27,8 MiB: nicht vor Spielstart vollständig laden oder dekodieren. Für Webauslieferung geeignete komprimierte Derivate erzeugen, Originale erhalten, Safari-fähiges Format anbieten und real testen. 1,5–3 Sekunden Crossfade, Loopnaht prüfen, Musikpausen zulassen.

Master/Musik/Effekte/Atmosphäre getrennt regeln und speichern. Startlautstärke zurückhaltend. Audio erst durch eine Nutzerinteraktion freischalten, suspendierten AudioContext nach Rückkehr behandeln. Maximal etwa 12 gleichzeitige Effekte und 2–3 hörbare Schrittereignisse pro Sekunde im Nahbereich. Gebäude-/Liefer-Cooldowns, räumliche Dämpfung, keine Offscreen-Schrittflut. Hintergrundtab schaltet Audio stumm/pausiert; Offline-Nachrechnung spielt keine tausend alten Sounds nach.

## 9. Technische Architektur und Vercel

Implementiere TypeScript mit Vite, React für DOM-UI und Phaser für Welt/Animation/Kamera. Wähle eine zum Implementierungszeitpunkt stabile, kompatible Phaser-Version und fixiere Abhängigkeiten im Lockfile. Keine Server-Simulation und keine laufende Vercel-Funktion für das Idle-Spiel nötig. DOM-UI empfängt gedrosselte Snapshots; React darf nicht jede NPC-Bewegung rendern.

Strukturvorschlag:

```text
src/game/core/          IDs, Seed-RNG, Uhr, Events, Commands
src/game/simulation/    Economy, Jobs, Residents, Families, Construction
src/game/world/         Generation, Chunks, Navigation, Occupancy
src/game/content/       Buildings, Recipes, Research, Quests, Regions
src/game/render/        Phaser-Szenen, Sprites, Kamera, Effekte
src/game/audio/         Cue-Katalog, Mixer, Musikzustände
src/game/persistence/   Save-Schema, Migrationen, Offline-Nachrechnung
src/ui/                HUD, Panels, Touch-Steuerung, Einstellungen
src/assets/            Manifest und geprüfte Frame-Definitionen
public/assets/         Nur benötigte Laufzeitassets/Derivate
scripts/               Asset-Prüfung, Aufbereitung, Balance-Simulation
tests/                 Simulations- und Browserprüfungen
```

Deterministischer Fixed-Timestep, beispielsweise 10 Simulationsschritte pro Sekunde; Bedürfnisse und Wirtschaft bei Bedarf gröber. Rendern interpoliert mit requestAnimationFrame. Keine `setInterval`-Kette pro Einwohner. Chunk-Culling, räumlicher Index, gecachte Wege, begrenzte Wegsuche pro Tick, Sprite-/Partikel-Pooling. Fußpunkt-Y-Sortierung mit separaten Terrain-/Objekt-/Overlay-Layern. Weltwechsel lädt Biome und Gegner nach Bedarf.

Ziel: 60 FPS auf geeignetem Desktop, stabile 30 FPS bei 150 Bewohnern auf einem repräsentativen iPad; Hardware und Messbedingungen dokumentieren. Begrenze Pixeldichte, reduziere Effekte adaptiv und simuliere entfernte Siedlungen aggregiert. Keine unbegrenzte Welt oder unbegrenzte Einwohnerzahl versprechen.

`npm install`, `npm run dev`, `npm run build`, `npm run preview`, `npm test`, `npm run test:e2e` dokumentieren. Vercel: Framework Vite, Build `npm run build`, Output `dist`. Bei reinem Single-Screen-Spiel kein unnötiges SPA-Rewrite; bei echten Client-Routen Deep-Link-Fallback korrekt einrichten. Asset-Kopieren/Aufbereitung reproduzierbar im Build, URLs root-relativ, keine C:\-Pfade im Laufzeitcode. Lokal den Produktionsbuild mit derselben Asset-Struktur prüfen.

## 10. iPad und Zugänglichkeit

Pointer Events für Maus, Stift und Touch. Ein Finger bewegt die Kamera, Tippen wählt aus, zwei Finger zoomen um ihren Mittelpunkt. Unterscheide Tap und Drag per Schwelle; ein Drag darf kein Gebäude kaufen. Bauplatz per Tippen wählen und über große Schaltfläche bestätigen. Long Press optional für Zusatzinformation; keine Funktion ausschließlich über Hover oder Rechtsklick.

Mindestens 44 × 44 CSS-Pixel für Interaktionsziele. Safe-Area-Insets, dynamische Viewporthöhe, Quer-/Hochformat und Größenwechsel berücksichtigen. `touch-action` nur im passenden Weltbereich einschränken; UI-Listen bleiben normal scrollbar. Vergrößerung und lesbare Schriften in Menüs ermöglichen. Browsergesten nicht global sperren. Pinch über UI darf keine Weltaktion auslösen. Controls mit Tastatur bedienbar, Fokus sichtbar, Dialog-Fokus korrekt, Labels für Screenreader.

Prüfe 1024 × 768, 768 × 1024, 1180 × 820 und einen kleinen Desktop. WebKit-Emulation ist hilfreich, ersetzt aber keinen echten Safari/iPad-Test; benenne diese Lücke ehrlich, falls kein Gerät verfügbar ist. Audio, Hintergrundwechsel und Save-Export auf Safari besonders prüfen.

## 11. Speichern und echter Idle-Fortschritt

IndexedDB für versionierte Spielstände, kleine Einstellungen optional in localStorage. Autosave alle 30 Sekunden und vor wichtigen Übergängen; `visibilitychange`/`pagehide` nur als zusätzliche Gelegenheit, nicht als einzige Save-Garantie. Letzten gültigen Backupstand halten. Import/Export als JSON mit Schema-, Werte- und Größenprüfung, verständlichen Fehlern und ohne Ausführung importierter Inhalte. Mehrere Tabs durch Lock/Leader-Verfahren vor konkurrierenden Schreibvorgängen schützen.

Offline-Fortschritt wird beim Wiederöffnen berechnet; der Browser läuft auf dem gesperrten iPad nicht garantiert weiter. Anfangslimit 8 Stunden, später bis 24 Stunden durch Ausbau. Negative Zeitdifferenzen auf null und extreme Differenzen auf das Limit begrenzen. Lokale Uhrmanipulation ist im Singleplayer kein sicher verhinderbarer Vorgang; keine betrügerische Sicherheitszusage machen.

Offline-Nachrechnung verarbeitet Produktion, Konsum, Lagergrenzen, endliche Rohstoffe, Baukosten, Arbeitsplätze und freigegebenen Autobau. In begrenzten Zeitblöcken oder bis zum nächsten relevanten Ereignis rechnen, nicht Millionen Frames nachholen. Familienwachstum berücksichtigen, ohne Bevölkerung explosionsartig zu vervielfachen. Transporte dürfen näherungsweise Durchsatzfaktoren verwenden; die Näherung transparent dokumentieren. Online und Offline verwenden dieselben Rezepte und Kapazitätsregeln.

Keine doppelten Erträge nach Reload: Timestamp und berechneter Zustand gemeinsam atomar speichern; Nachrechnung gegen parallele Tabs sichern. Ein Bericht zeigt Nettogewinne, Verbrauch, fertiggestellte Häuser, neue Bewohner und Engpässe. Kein Verlustzwang durch Abwesenheit im friedlichen Modus. Bei zurückgekehrter Aufmerksamkeit existiert ein konsistenter Weltzustand mit korrekten Positionen und freigegebenen Reservierungen.

## 12. Umsetzung in überprüfbaren Etappen

1. Inventar und Galerie: Pfade, Duplikate, Raster, Animationen, Crop-Manifest und Audio-Cues prüfen. Dokumentierte Originale erhalten.
2. Spielbarer Kern: schöne kleine Welt, 6 Bewohner, Sammeln/Transport/Lager/Nahrung, Kamera, Auswahl, Hausbau, echtes Speichern. Bereits hier muss Zuschauen Spaß machen.
3. Autonomie: Prioritäten, Bedürfnisse, Haushalte, Nachwuchs, Bauzonen und zuverlässiger Autobau. Unbeaufsichtigten Lauf testen.
4. Wirtschaft/Hub: Produktionsketten, Forschung, Handel, Dorfplatz, Upgrades, Aufträge, Tierhaltung.
5. Weltinhalt: Regionen, Schiffe, Spezialisten, Expeditionen, Gegner, Varianten und optionales Vermächtnis.
6. Fertigstellung: Touch/Safari, Audio, Performance, Offline-Nachrechnung, Balancing, Produktionsbuild und vollständige Anleitung.

Jede Etappe auf der vorherigen aufbauen. Nicht nach Etappe 2 aufhören und die restlichen Funktionen nur als Buttons vortäuschen. Falls eine Sitzung endet, einen konkreten Fortschrittsstand mit funktionierenden Features, Fehlern und nächsten Arbeitsschritten speichern, sodass die Umsetzung weitergeführt werden kann. Nicht ungeprüft „vollständig fertig“ behaupten.

## 13. Abnahmekriterien

- Frischer Spielstand zeigt ohne Klickspam reale Bewohnerarbeit und eine stabile Versorgung. Nach 30 Minuten unbeaufsichtigtem Spiel existieren nachvollziehbare Ressourcen, Hausbau und Wachstum innerhalb der Kapazitäten.
- A/B-Simulationslauf mit identischem Seed belegt, dass Prioritäten Auswirkungen auf Produktion, Bau und Reserven haben.
- Ressourcen bleiben nichtnegativ und erfüllen Erhaltung: gewonnen = Lager + getragen + verbaut/verbraucht + explizit verworfen; Reservierungen werden nicht als zusätzliche Güter gezählt.
- Automatischer Hausbau blockiert keinen Eingang, schafft Wohnraum erst nach Fertigstellung und hält Budgetgrenzen ein. Abbruch/Berufswechsel führen nicht zu verlorenen Reservierungen.
- Same-seed + gleiche Commands + gleiche Simulationsschritte ergeben denselben Simulationszustand, unabhängig von Render-FPS.
- Laden, dreifaches schnelles Reload, zwei Tabs, beschädigter Import, Speicherfehler und Offline-Fortschritt für 1 Minute/1 Stunde/8 Stunden/über Limit sind geprüft.
- Nahrungsmangel, volles Lager, fehlender Weg, erschöpfter Rohstoff und fehlender Arbeiter ergeben hilfreiche Statusmeldungen und bleiben lösbar.
- Touch-Test: Auswahl, Drag, Pinch, Bauen, Panel-Scroll, Orientierung und Audiofreischaltung ohne Fehlkäufe oder festhängende Gesten.
- Screenshots aus Startdorf, ausgebautem Dorf, Hub und iPad-Hochformat prüfen: keine ganzen Spritesheets als Einzelbilder, keine abgeschnittenen Gebäude, keine mikroskopischen Texte, keine unscharfen Pixelränder.
- Jede registrierte Sprite-Quelle existiert; jeder Crop bleibt in den Bildgrenzen; keine leeren Pflichtanimationen. Alle 320 Quelldateien haben einen dokumentierten Verwendungsstatus, aber Duplikate werden nicht mehrfach ausgeliefert.
- Build und passende Unit-/Integration-/Browserprüfungen bestehen. Es gibt keine nichtfunktionalen Kernbuttons, keine Console-Fehler im normalen Ablauf und keine fehlenden Asset-Requests.
- Endbericht nennt tatsächlich getestete Browser/Geräte, gemessene Performance, bekannte Grenzen und Vercel-Einstellungen. Ein lokaler erfolgreicher Build ist noch kein durchgeführtes Deployment.

## 14. Herkunft, Credits und technische Referenzen

Shades vom Nutzer bereitgestellter Guide erlaubt die Nutzung in kommerziellen und nichtkommerziellen Projekten sowie Bearbeitung, verlangt keine Credits und untersagt den Verkauf der Assets als solche. Credits an Shade trotzdem freundlich aufnehmen. Lokaler MiniWorld-Link aus OtherLinks.docx: https://merchant-shade.itch.io/16x16-mini-world-sprites .

Musik hat eine eigene `music/Minifantasy_Dungeon_Music/Licensing.txt`: Projektnutzung erlaubt; Assetpack nicht separat verkaufen oder kostenlos weiterverteilen; Credits freiwillig. Urheberlink in der vorhandenen URL-Datei: https://www.patreon.com/leohpaz . Diese Aussagen beschreiben die vorhandenen Hinweise, keine pauschale Lizenz für andere Ordner. Für `ui`, `font` und `sfx` liegt hier keine eigene Lizenzdatei vor; Herkunft/Lizenzstatus in Credits/Assetdokumentation als noch zu ergänzen markieren. Nicht fälschlich sämtliche Dateien unter Shades Bedingungen stellen. Keine eigenständige Assetpack-Downloadfunktion veröffentlichen.

Technische Quellen für die Implementierung, beim tatsächlichen Einbau gegen die gewählte Version prüfen:

- [Vite auf Vercel](https://vercel.com/docs/frameworks/frontend/vite): unterstützter Deploymentweg für das statische Frontend.
- [Phaser-Kameras](https://docs.phaser.io/phaser/concepts/cameras): Kamera-/Pixelrundung als Grundlage scharfer Darstellung.
- [MDN Web Audio Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) und [Autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay): Audiofreischaltung und Browserrestriktionen.

**Beginne jetzt mit Repositoryprüfung und Asset-Galerie, implementiere danach den spielbaren Kern und arbeite bis zum vollständigen, getesteten Browsergame weiter. Stelle nur Fragen, wenn eine echte Blockade besteht; wähle normale technische und gestalterische Details selbstständig im Sinne dieses Auftrags.**
