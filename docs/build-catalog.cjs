const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const rows = JSON.parse(fs.readFileSync(path.join(__dirname, 'asset-inventory.json'), 'utf8').replace(/^\uFEFF/, ''));
const purpose = p => {
 if(p.startsWith('ui/') && !p.startsWith('ui/PNG/')) return 'SHA-256-identisches Duplikat; nur ui/PNG laden.';
 if(p.startsWith('ui/PNG/')) return ({Action_panel:'Aktionsleiste',Buttons:'Button-Zustände',character_panel:'Bewohnerprofil',Circle_menu:'Kontextmenü',Craft:'Produktionsrezepte',Decorative_cracks:'Panelränder / sparsame Dekoration',Equipment:'Ausrüstung',Icons:'Ressourcen- und Aktionssymbole',Inventory:'Lager',Levels:'Forschung / Meilensteine',Main_menu:'Startmenü',Main_tiles:'Nine-Slice-Panelbausteine',Numbers_levels:'Optionale Schmuckzahlen; dynamische Zahlen als Text',Numbers:'Optionale Schmuckzahlen; dynamische Zahlen als Text',Settings:'Einstellungen',Shop:'Handel',Text1:'Referenz für Schriftgestaltung; deutsche Texte dynamisch',Text2:'Referenz für Schriftgestaltung; deutsche Texte dynamisch',Win_loose:'Expeditionsabschluss'})[path.basename(p,'.png')];
 if(p.startsWith('font/')) return p.endsWith('.ttf') ? 'Lokale UI-Schrift; extended für deutsche Texte bevorzugen.' : 'Bitmap-Schrift/Quelldaten; optionaler Renderer, Format vor Nutzung prüfen.';
 if(p.startsWith('sfx/')) return 'Audiofamilie '+path.basename(p).slice(0,2)+'; konkrete Ereignisse siehe Superprompt, Abschnitt Audio.';
 if(p.includes('/Music/')) return p.includes('(Battle)')?'Expeditions-/Kampfmusik; situativ laden.':'Ruhigerer Erkundungs-/Höhlen-Track; Dorf-Eignung durch Anhören prüfen.';
 if(p.startsWith('music/')) return 'Lizenz, Danksagung oder Urheberlink; Dokumentation, kein Laufzeitasset.';
 if(p.endsWith('OtherLinks.docx')) return 'Shade: Danksagung und Links; kein zusätzlicher Animationsguide.';
 if(p.includes('/Templates/')) return 'Layout-/Rasterreferenz für Entwicklung; kein Weltobjekt.';
 if(p.includes('/User Interface/')) return ({'BoxSelector.png':'Auswahlrahmen','Highlighted-Boxes.png':'Bauplatz-, Reichweiten- und Fehlerfarben','Icons-Essentials.png':'Grundressourcen, Nahrung, Münzen, Tränke','UiIcons.png':'Werkzeuge, Navigation und Status'})[path.basename(p)];
 if(p.includes('/Buildings/Enemy/Orc/')) return 'Einzige Orc-Gebäudeübersicht; geprüfte Einzel-Crops für Lager, sonst Referenz im Bestiarium.';
 if(p.includes('Preview.png')) return 'Visuelle Referenz / Asset-Galerie; nicht als vollständiges Welt-Sprite rendern.';
 if(p.includes('/Buildings/')) {
 const b=path.basename(p,'.png').replace(/^(Cyan|Lime|Purple|Red)/,'');
 return ({Barracks:'Kaserne, Garnison, Schießplatz, Stall/Gefängnis nach visuell bestätigten Varianten',CaveV2:'Höhle / Erzlager',Chapels:'Kapelle / Heiligtum',Docks:'Werft / Hafen',Houses:'Wohnhäuser und Baustufen',Huts:'Starthütten und Baustufen',Keep:'Rathaus/Burg und Verteidigungsteile',Market:'Fleisch-, Getreide-, Fisch-, Obst- und Ausrüstungshandel nach Crop-Prüfung',Resources:'Sägewerk, Mine/Steinbruch, Silo/Mühle und Ranch nach Crop-Prüfung',Taverns:'Taverne und Baustufen',Tower:'Wachtürme / Mauerteile',Tower2:'Alternative steinerne Verteidigung',Well:'Brunnen',Workshops:'Schmiede, Alchemie und Werkstatt',Ship:'Fraktionsschiffe',Mausoleum:'Untoten-Expeditionsziel',SpearWall:'Palisade / feindliche Sperre'})[b] || 'Gebäudevariante';
 }
 if(p.includes('/Characters/Workers/')) return p.includes('Template')?'Neutrale Arbeiterbasis / Vorschau und optionale Farbvarianten.':'Dorfbewohner: Sammeln, Transport, Bauen, Landwirtschaft und Freizeit.';
 if(p.includes('/Characters/Soldiers/')) return 'Wache / Expedition: '+path.basename(p,'.png')+'; Templates als neutrale Basis, Farben als Fraktionen.';
 if(p.includes('/Characters/Champions/')) return 'Benannter Spezialist mit eigener Quest und passivem Dorfbonus: '+path.basename(p,'.png');
 if(p.includes('/Characters/Monsters/')) return 'Biom-Begegnung / Bestiarium / Expedition: '+path.basename(p,'.png')+'; FarmerGoblin auch Handelspartner.';
 if(p.includes('/Animals/')) return ({Boar:'Wildtier / Waldbegegnung',Chick:'Jungtier / Ranchwachstum',Chicken:'Eierproduktion / Dorfleben',HornedSheep:'Seltene Ranchrasse',Sheep:'Wolle',Pig:'Ranch / Nahrung',MarineAnimals:'Meerestiere / Küstenleben / Fischerei','Horse(32x32)':'Pferde / Stall / Transport'})[path.basename(p,'.png')];
 if(p.includes('/Ground/')) return 'Terrain / Übergänge für '+path.basename(p,'.png')+'; Kanten und Varianten einzeln kartieren.';
 if(p.includes('/Nature/')) return ({Trees:'Holz, Setzlinge und Wachstumszustände',PineTrees:'Nadelwald / Hochland',DeadTrees:'Totholz / trockene Zone',WinterTrees:'Winterwald / Varianten',WinterDeadTrees:'Winterliches Totholz',CoconutTrees:'Küstenholz / Kokosnüsse',Cactus:'Trockenzone / seltene Zutat',Rocks:'Stein / Erz / Kristall nach Farbvariante',Wheatfield:'Acker-Wachstumsstufen',Tumbleweed:'Trockenzonen-Dekoration'})[path.basename(p,'.png')];
 if(p.includes('/Objects/')) return 'Projektil / Ausrüstung / Aktionssymbol: '+path.basename(p,'.png')+'; ShortBig ist tatsächlicher Dateiname.';
 if(p.includes('/Miscellaneous/')) return ({Boat:'Kleine Fischerboote',Bridge:'Begehbare Brücken',Chests:'Lagerdarstellung / Expeditionsbelohnung',PirateShip:'Piratenbegegnung',Portal:'Späte Expedition / neues Siedlungsgebiet',QuestBoard:'Auftragsbrett im Dorfhub',Signs:'Gebäudeschilder',StreetSigns:'Wegweiser',Tombstones:'Gedenkgarten / Ruine',TransportShip:'Handels- und Siedlertransport',WarShip:'Seeexpedition',Well:'Dorfbrunnen'})[path.basename(p,'.png')];
 throw new Error('Nicht zugeordnet: '+p);
};
for (const r of rows) {
 r.usage=purpose(r.path);
 if(r.path.endsWith('.wav')) {
  const b=fs.readFileSync(path.join(root,r.path)); let rate=0, data=0;
  for(let o=12;o+8<=b.length;) {const id=b.toString('ascii',o,o+4), n=b.readUInt32LE(o+4); if(id==='fmt '){r.channels=b.readUInt16LE(o+10);r.sampleRate=b.readUInt32LE(o+12);rate=b.readUInt32LE(o+16);} if(id==='data')data=n; o+=8+n+(n%2);}
  if(rate)r.durationSeconds=Number((data/rate).toFixed(3));
 }
}
fs.writeFileSync(path.join(__dirname,'asset-inventory.json'),JSON.stringify(rows,null,2)+'\n');
let out='# Vollständiger Asset-Katalog\n\n320 Originaldateien, lokal geprüft. Abmessungen sind Sheet-Größen, keine garantierten Frame-Größen. Rollen sind Design-Zuordnungen. WAV-Längen stammen aus den Dateiköpfen; Audio wurde nicht probegehört. Die vier MP3-Türsounds sind ohne gemessene Dauer erfasst.\n\n';
out+='Alle Pfade beziehen sich auf das Repository. Die SHA-256-Hashes im JSON weisen die 19 identischen UI-Paare nach. Kein Original wurde verändert.\n\n';
for(const group of ['maingamesprites','ui','font','sfx','music']) {
 out+='## '+group+'\n\n| Datei | Größe / Dauer | Verwendung |\n|---|---|---|\n';
 for(const r of rows.filter(x=>x.path.startsWith(group+'/')))out+='| `'+r.path+'` | '+(r.width?r.width+' × '+r.height:r.durationSeconds?r.durationSeconds+' s':r.bytes+' Bytes')+' | '+r.usage+' |\n';
 out+='\n';
}
fs.writeFileSync(path.join(__dirname,'ASSET-KATALOG.md'),out);
console.log(JSON.stringify({files:rows.length,unmapped:rows.filter(x=>!x.usage).length,wav:rows.filter(x=>x.durationSeconds).length,music:rows.filter(x=>x.path.includes('/Music/'))},null,2));
