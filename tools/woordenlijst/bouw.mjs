// Stap B van de woordenlijst-pipeline: van kandidaten (extract.py) naar het woordenboek van één taal voor Woordtuin.
//
//   node tools/woordenlijst/bouw.mjs <taal> <map met <taal>.kand.tsv>
//
// Dit is dezelfde werkwijze als voor het Nederlands (zie docs/NIEUW-SPEL-VOOR-TWEE.md), voor elke taal:
//   1. woorden die het spellingswoordenboek van de taal kent (extract.py), gevouwen tot letters van het alfabet (js/shared/talen.js), 3 tot 7 letters;
//   2. alleen woorden die in het echt voorkomen: genoeg in ondertitels én (waar wordfreq die heeft) in wordfreq. De grenzen zijn
//      relatief aan de grootte van de ondertitelverzameling, zodat elke taal even streng is als het Nederlands;
//   3. geen woorden die vooral Engels zijn (tools/woordtuin/<taal>/engels-maar-lokaal.txt zijn de uitzonderingen);
//   4. blokkeerlijst.txt valt af (namen, afkortingen, vreemde woorden, beledigingen die groepen kwetsen; met de hand beoordeeld);
//   5. toegestaan.txt komt er altijd bij.
//   (rar.txt: geldige woorden die niet alledaags zijn, ook al zijn ze frequent: de computer speelt ze niet, een speler wel.)
//   "alledaags" (de computer speelt alleen die, en tips komen daaruit): vaak voorkomend, niet grof (ruw.txt) en niet vooral Engels.
//
// Uitvoer: js/games/woordtuin/talen/<taal>.js

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TALEN, vouw, isAlfabet } from '../../js/shared/talen.js';

const [taal, bron] = [process.argv[2], process.argv[3] || '.'];
const t = TALEN[taal];
if (!t) { console.error(`Onbekende taal: ${taal}`); process.exit(1); }
const map = fileURLToPath(new URL(`../woordtuin/${taal}/`, import.meta.url));
const uitDir = fileURLToPath(new URL('../../js/games/woordtuin/talen/', import.meta.url));
const lijstTokens = (f) => (existsSync(f) ? readFileSync(f, 'utf8').split('\n').flatMap((l) => l.replace(/#.*/, '').trim().split(/\s+/)).filter(Boolean) : []);

// Het Nederlands is de maat: 20 keer in 263 miljoen ondertitelwoorden, en 250 keer voor "alledaags"
const NL_TOTAAL = 263017508;
const env = (n, d) => (process.env[n] !== undefined ? Number(process.env[n]) : d);
const MIN_ZIPF = env('MIN_ZIPF', 2.0);
const ALLEDAAGS_ZIPF = env('ALLEDAAGS_ZIPF', 3.3);
const MIN_VERSCHIL = env('MIN_VERSCHIL', 0.7);

const regels = readFileSync(join(bron, `${taal}.kand.tsv`), 'utf8').split('\n').filter(Boolean);
const [, totaalTekst, wfSoort] = regels[0].startsWith('#totaal') ? regels[0].split('\t') : ['', String(NL_TOTAAL), 'groot'];
const totaal = Number(totaalTekst);
const KLEIN_KORPUS = totaal < 20e6;                                                        // lv, lt, ca: weinig ondertitels, dus lage ondergrenzen
const MIN_AANTAL = env('MIN_AANTAL', Math.max(KLEIN_KORPUS ? 2 : 5, Math.round((20 * totaal) / NL_TOTAAL)));
const ALLEDAAGS_AANTAL = env('ALLEDAAGS_AANTAL', Math.max(KLEIN_KORPUS ? 3 : 40, Math.round((250 * totaal) / NL_TOTAAL)));
const zFW = (n) => Math.log10(n / totaal) + 9;                  // zoals wordfreq: 3 = 1 per miljoen woorden

const blok = new Set(lijstTokens(join(map, 'blokkeerlijst.txt')));
const ruw = new Set(lijstTokens(join(map, 'ruw.txt')));
const rar = new Set(lijstTokens(join(map, 'rar.txt')));
const toegestaan = new Set(lijstTokens(join(map, 'toegestaan.txt')));
const engelsMaarLokaal = new Set(lijstTokens(join(map, 'engels-maar-lokaal.txt')));

// ----- Woorden samenvoegen: "é" en "e" worden hetzelfde woord -----
const perWoord = new Map();
for (const l of regels) {
  if (l.startsWith('#')) continue;
  const [w, nk, nh, zl, ze, gk, gh] = l.split('\t');
  // Het aantal: het woord in kleine letters; bij het Duits (zelfstandige naamwoorden met hoofdletter) ook met hoofdletter, als alleen dat in het woordenboek staat
  const n = gk === '1' ? Number(nk) : Number(nk) + Number(nh);
  const sleutel = vouw(w, taal);
  if (!isAlfabet(sleutel, taal) || sleutel.length < 3 || sleutel.length > 7) continue;
  const r = perWoord.get(sleutel) || { aantal: 0, zl: 0, ze: 0, beste: 0, bron: w, hoofd: false };
  r.aantal += Number(n); r.zl = Math.max(r.zl, Number(zl)); r.ze = Math.max(r.ze, Number(ze));
  if (n >= r.beste) { r.beste = n; r.bron = w; r.hoofd = gk !== '1'; }          // het meest voorkomende geschreven woord (met accenten), voor de beoordelaar
  perWoord.set(sleutel, r);
}
for (const w of toegestaan) if (!perWoord.has(w)) perWoord.set(w, { aantal: 0, zl: 0, ze: 0, beste: 0, bron: w, hoofd: false });

// Hoe gewoon is het woord in deze taal? Met een grote wordfreq-lijst: die (de lijsten zijn daar compleet tot 1 per 100 miljoen woorden).
// Met een kleine of geen wordfreq-lijst: ook de ondertitels, want wordfreq kent dan alleen woorden vanaf 1 per miljoen.
const ZL = (r) => (wfSoort === 'groot' ? r.zl : Math.max(r.zl, zFW(r.aantal)));
const klinkers = new Set([...t.klinkers, ...(t.klinkerachtig || ''), ...(t.schrift === 'latijn' ? 'y' : '')]);          // ook "gym", "typ" en "hymne" hebben een klinker
const heeftKlinker = (w) => [...w].some((c) => klinkers.has(c));

const woorden = [], engelsAfgewezen = [];
const teller = { zeldzaam: 0, geblokkeerd: 0, engels: 0, zonderKlinker: 0 };
for (const [w, r] of perWoord) {
  if (toegestaan.has(w)) { woorden.push(w); continue; }
  const zlw = ZL(r);
  if (r.aantal < MIN_AANTAL || (wfSoort === 'groot' && zlw < MIN_ZIPF)) { teller.zeldzaam++; continue; }
  if (blok.has(w)) { teller.geblokkeerd++; continue; }
  if (r.ze - zlw >= MIN_VERSCHIL && !engelsMaarLokaal.has(w)) { teller.engels++; engelsAfgewezen.push(w); continue; }
  if (!heeftKlinker(w)) { teller.zonderKlinker++; continue; }
  woorden.push(w);
}
woorden.sort();
const alledaags = (w) => {
  if (ruw.has(w) || rar.has(w)) return false;
  if (toegestaan.has(w)) return true;
  const r = perWoord.get(w), zlw = ZL(r);
  return r.aantal >= ALLEDAAGS_AANTAL && zlw >= (wfSoort === 'geen' ? 3.0 : ALLEDAAGS_ZIPF) && r.ze - zlw < 0.5;
};
const gewoon = woorden.filter(alledaags);

// ----- Letters voor het bord: zoals in de alledaagse woorden, zonder zeldzame letters -----
const gewicht = {};
for (const w of gewoon) for (const c of new Set(w)) gewicht[c] = (gewicht[c] || 0) + 1;       // in hoeveel woorden komt de letter voor
const som = Object.values(gewicht).reduce((a, b) => a + b, 0);
const zak = {};
for (const c of [...t.alfabet]) {
  const aandeel = (gewicht[c] || 0) / som;
  if (aandeel < 0.006) continue;                                                              // minder dan 0,6%: te zeldzaam voor een bord
  zak[c] = Math.max(1, Math.round(aandeel * 100));
}

const uit = `// Woordenlijst voor Woordtuin in het ${t.english}: ${woorden.length} woorden van 3 tot 7 letters, ${gewoon.length} daarvan alledaags.
// GEGENEREERD door tools/woordenlijst/bouw.mjs, niet met de hand aanpassen: zet een woord op tools/woordtuin/${taal}/blokkeerlijst.txt,
// ruw.txt, toegestaan.txt of engels-maar-lokaal.txt en draai het script opnieuw (zie tools/woordenlijst/bronnen.md voor de bronnen en licenties).
// Woorden zijn gevouwen (zie js/shared/talen.js): geen accenten, "ß" is "ss". Een woord met een + ervoor is alledaags (de computer speelt alleen die).

const LIJST = '${woorden.map((w) => (alledaags(w) ? '+' : '') + w).join(' ')}'.split(' ');

export const WOORDEN = LIJST.map((w) => (w[0] === '+' ? w.slice(1) : w));
export const ALLEDAAGS = new Set(LIJST.filter((w) => w[0] === '+').map((w) => w.slice(1)));
// Hoe vaak elke letter in de zak voor het bord zit (afgeleid van de alledaagse woorden)
export const ZAK = ${JSON.stringify(zak)};
`;
if (!process.env.DRY) { mkdirSync(uitDir, { recursive: true }); writeFileSync(join(uitDir, `${taal}.js`), uit); }
console.log(JSON.stringify({ taal, woorden: woorden.length, alledaags: gewoon.length, ...teller, MIN_AANTAL, ALLEDAAGS_AANTAL, wfSoort, totaal }));
if (process.env.REVIEW) {
  const dir = process.env.REVIEW; mkdirSync(dir, { recursive: true });
  const toon = (w) => { const r = perWoord.get(w); const b = r.hoofd ? r.bron[0].toUpperCase() + r.bron.slice(1) : r.bron; return b === w ? w : `${w}=${b}`; };
  const rijen = (lijst, per = 14) => { const o = []; for (let i = 0; i < lijst.length; i += per) o.push(lijst.slice(i, i + per).join(' ')); return o.join('\n') + '\n'; };
  const opAantal = (a, b) => perWoord.get(b).aantal - perWoord.get(a).aantal;
  writeFileSync(join(dir, `${taal}-A-alledaags.txt`), rijen(gewoon.slice().sort(opAantal).map(toon)));
  writeFileSync(join(dir, `${taal}-B-overig.txt`), rijen(woorden.filter((w) => !alledaags(w)).sort(opAantal).map(toon)));
  writeFileSync(join(dir, `${taal}-C-engels-geweigerd.txt`), rijen(engelsAfgewezen.sort(opAantal).map((w) => `${toon(w)}(${perWoord.get(w).zl.toFixed(1)}/${perWoord.get(w).ze.toFixed(1)})`), 10));
  const ong = join(bron, `${taal}.kand.ongeldig.tsv`);
  if (existsSync(ong)) {
    const rest = [];
    for (const l of readFileSync(ong, 'utf8').split('\n').filter(Boolean)) {
      const [w, nk, nh] = l.split('\t'); const sl = vouw(w, taal);
      if (!isAlfabet(sl, taal) || sl.length < 3 || sl.length > 7 || perWoord.has(sl) || blok.has(sl)) continue;
      rest.push(`${sl === w ? w : `${sl}=${w}`}(${nk}/${nh})`);
      if (rest.length >= 1500) break;
    }
    writeFileSync(join(dir, `${taal}-D-ontbreekt.txt`), rijen(rest, 10));
  }
}
if (process.env.DUMP) writeFileSync(process.env.DUMP, woorden.map((w) => { const r = perWoord.get(w); return `${alledaags(w) ? '+' : ' '}${w}\t${r.aantal}\t${r.zl}\t${r.ze}`; }).join('\n') + '\n');
