// Voegt de uitkomsten van de beoordeling van een woordenlijst (zie BEOORDELEN.md) samen tot de lijsten die bouw.mjs gebruikt.
//
//   node tools/woordenlijst/voegsamen.mjs <taal> <uitvoerbestand van de beoordelaar> [meer bestanden]
//
// Elk uitvoerbestand heeft secties "## blok", "## ruw", "## rar", "## toe" en "## eng" met woorden in gevouwen vorm. De woorden worden bij de bestaande
// lijsten in tools/woordtuin/<taal>/ gevoegd (blokkeerlijst.txt, ruw.txt, rar.txt, toegestaan.txt, engels-maar-lokaal.txt). Een woord dat in twee
// secties staat, houdt de strengste: blok, dan ruw, dan rar, dan toe, dan eng.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TALEN, isAlfabet } from '../../js/shared/talen.js';

const [taal, ...bestanden] = process.argv.slice(2);
if (!TALEN[taal] || !bestanden.length) { console.error('Gebruik: node tools/woordenlijst/voegsamen.mjs <taal> <bestand> [...]'); process.exit(1); }
const map = fileURLToPath(new URL(`../woordtuin/${taal}/`, import.meta.url));
mkdirSync(map, { recursive: true });

const SECTIES = [
  ['blok', 'blokkeerlijst.txt', 'Woorden die NIET in Woordtuin mogen, ook al staan ze in de woordenlijst: namen, vreemde woorden, afkortingen, geluiden, woorden die groepen mensen beledigen en onzin. Met de hand beoordeeld (zie tools/woordenlijst/BEOORDELEN.md).'],
  ['ruw', 'ruw.txt', 'Grove woorden. Ze zijn gewoon woorden van de taal, dus ze tellen mee als een speler ze speelt, maar de computer speelt ze nooit en ze komen niet voor in een tip.'],
  ['rar', 'rar.txt', 'Geldige woorden die niet alledaags zijn (verouderd, dialect, vakterm of zeer zeldzaam): een speler mag ze spelen, de computer en de tips niet.'],
  ['toe', 'toegestaan.txt', 'Gewone woorden die het spellingswoordenboek mist en die toch meetellen.'],
  ['eng', 'engels-maar-lokaal.txt', 'Woorden die in het Engels vaker voorkomen dan in deze taal, maar die gewoon woorden van deze taal zijn: ze worden niet als Engels geweigerd.'],
];
const rang = Object.fromEntries(SECTIES.map(([k], i) => [k, i]));
const lees = (f) => (existsSync(f) ? readFileSync(f, 'utf8').split('\n').flatMap((l) => l.replace(/#.*/, '').trim().split(/\s+/)).filter(Boolean) : []);

const sets = Object.fromEntries(SECTIES.map(([k, f]) => [k, new Set(lees(join(map, f)))]));
const fouten = [];
for (const bestand of bestanden) {
  let sectie = null;
  readFileSync(bestand, 'utf8').split('\n').forEach((regel, i) => {
    const r = regel.trim();
    if (!r || (r.startsWith('#') && !r.startsWith('##'))) return;
    if (r.startsWith('##')) { sectie = r.slice(2).trim().split(/\s+/)[0]; if (!(sectie in rang)) fouten.push(`${bestand}:${i + 1}: onbekende sectie "${sectie}"`); return; }
    if (!(sectie in rang)) return;
    for (const w of r.replace(/\s#.*$/, '').split(/\s+/)) {
      if (!isAlfabet(w, taal)) { fouten.push(`${bestand}:${i + 1}: "${w}" is geen gevouwen woord van ${taal} (kleine letters van het alfabet, zonder accenten)`); continue; }
      sets[sectie].add(w);
    }
  });
}
// een woord in één sectie: de strengste wint
const eindig = Object.fromEntries(SECTIES.map(([k]) => [k, new Set()]));
let dubbel = 0;
const alle = new Set(Object.values(sets).flatMap((s) => [...s]));
for (const w of alle) {
  const in_ = SECTIES.map(([k]) => k).filter((k) => sets[k].has(w));
  if (in_.length > 1) dubbel++;
  eindig[in_[0]].add(w);
}
for (const [k, f, uitleg] of SECTIES) {
  const woorden = [...eindig[k]].sort();
  let uit = uitleg.match(/.{1,150}(\s|$)/g).map((x) => `# ${x.trim()}`).join('\n') + '\n\n';
  for (let i = 0; i < woorden.length; i += 14) uit += woorden.slice(i, i + 14).join(' ') + '\n';
  writeFileSync(join(map, f), uit);
}
console.log(`${taal}: ${SECTIES.map(([k]) => `${k} ${eindig[k].size}`).join(', ')}${dubbel ? ` (${dubbel} woorden stonden in twee secties: de strengste telt)` : ''}`);
if (fouten.length) { console.error(`${fouten.length} problemen:\n  ${fouten.slice(0, 40).join('\n  ')}`); process.exit(1); }
