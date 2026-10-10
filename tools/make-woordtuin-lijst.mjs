// Maakt de woordenlijst voor Woordtuin: gewoon Nederlands, zoals het in het woordenboek en in het dagelijks leven voorkomt.
//
//   node tools/make-woordtuin-lijst.mjs  <map met de bronbestanden>
//
// Bronbestanden (los te downloaden, niet in de repo):
//   wordlist.txt    OpenTaal  wordlist.txt   (Stichting OpenTaal, BSD of CC BY 3.0): alle officiële Nederlandse woorden, ook
//                   meervouden, werkwoordsvormen, enz.
//   frequentie.txt  een frequentielijst "woord aantal" (OpenSubtitles via hermitdave/FrequencyWords, nl_full.txt)
//   zipf.tsv        hoe gewoon elk woord is in het Nederlands en het Engels, gemaakt met tools/make-woordtuin-zipf.py (wordfreq)
//
// Hoe de lijst ontstaat:
//   1. woorden van 3 tot 7 letters (a-z) uit de OpenTaal-lijst: de officiële spelling, dus alleen echte woorden;
//   2. alleen woorden die in het echt voorkomen (zie MIN_FREQ en MIN_ZIPF): zo vallen vormen als "naoogde" af die niemand ooit gebruikt;
//      en geen woorden die vooral Engels zijn (ondertitels zitten vol Engels): "airport", "choice", "device". Echt Nederlandse
//      woorden die toch vaak Engels voorkomen ("game", "bad", "box") staan op tools/woordtuin/engels-maar-nederlands.txt;
//   3. tools/woordtuin/blokkeerlijst.txt valt af: namen, Engelse en andere vreemde woorden, afkortingen en scheldwoorden die
//      groepen mensen kwetsen. Die lijst is met de hand beoordeeld en bevat GEEN gewone Nederlandse woorden;
//   4. tools/woordtuin/toegestaan.txt komt er altijd bij (gewone woorden die OpenTaal mist, zoals "smit").
//
// Twee soorten woorden in de uitvoer:
//   - alles wat meetelt als een speler het speelt (ruim: zodat een gewoon Nederlands woord nooit wordt geweigerd);
//   - "alledaags": woorden die vaak voorkomen en niet grof zijn (zie ALLEDAAGS en tools/woordtuin/ruw.txt). Alleen die speelt de computer,
//     geeft een tip en telt mee om te zien of een bord een goed bord is.
//
// Een woord toevoegen of weigeren? Zet het op toegestaan.txt, blokkeerlijst.txt of ruw.txt en draai dit script opnieuw.
//
// Uitvoer:  js/games/woordtuin/woorden.js

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = process.argv[2] || '.';
const here = fileURLToPath(new URL('./woordtuin/', import.meta.url));
const out = fileURLToPath(new URL('../js/games/woordtuin/woorden.js', import.meta.url));
const tokens = (f) => readFileSync(f, 'utf8').split('\n').flatMap((l) => l.replace(/#.*/, '').trim().split(/\s+/)).filter(Boolean);

const lijst = readFileSync(join(dir, 'wordlist.txt'), 'utf8').split('\n');
const freq = new Map();
for (const l of readFileSync(join(dir, 'frequentie.txt'), 'utf8').split('\n')) { const [w, n] = l.split(' '); if (n) freq.set(w, +n); }
const F = (w) => freq.get(w) || 0;

export const MIN_FREQ = Number(process.env.MIN_FREQ || 20);          // zo vaak moet een woord in ondertitels voorkomen om mee te tellen
export const ALLEDAAGS = Number(process.env.ALLEDAAGS || 250);       // en zo vaak om door de computer gespeeld te worden
export const MIN_ZIPF = Number(process.env.MIN_ZIPF || 2.0);             // zo gewoon (wordfreq: 3 = 1 per miljoen) moet het in het Nederlands zijn
export const MIN_VERSCHIL = Number(process.env.MIN_VERSCHIL || 0.7);     // is het Engels zoveel gewoner dan Nederlands, dan is het een Engels woord
export const ALLEDAAGS_ZIPF = Number(process.env.ALLEDAAGS_ZIPF || 3.3);
const zipf = new Map(readFileSync(join(dir, 'zipf.tsv'), 'utf8').split('\n').filter(Boolean).map((l) => { const [w, nl, en] = l.split('\t'); return [w, [Number(nl), Number(en)]]; }));
const ZN = (w) => zipf.get(w)?.[0] ?? 0, ZE = (w) => zipf.get(w)?.[1] ?? 0;
const engelsMaarNederlands = new Set(tokens(join(here, 'engels-maar-nederlands.txt')));
const blok = new Set(tokens(join(here, 'blokkeerlijst.txt')));
const ruw = new Set(tokens(join(here, 'ruw.txt')));
const toegestaan = new Set(tokens(join(here, 'toegestaan.txt')));

const woorden = [];
let zeldzaam = 0, geblokkeerd = 0, engels = 0;
for (const w of new Set([...lijst, ...toegestaan])) {
  if (!/^[a-z]{3,7}$/.test(w)) continue;
  if (toegestaan.has(w)) { woorden.push(w); continue; }
  if (F(w) < MIN_FREQ || ZN(w) < MIN_ZIPF) { zeldzaam++; continue; }
  if (blok.has(w)) { geblokkeerd++; continue; }
  if (ZE(w) - ZN(w) >= MIN_VERSCHIL && !engelsMaarNederlands.has(w)) { engels++; continue; }
  woorden.push(w);
}
woorden.sort();
const alledaags = (w) => !ruw.has(w) && (toegestaan.has(w) || (F(w) >= ALLEDAAGS && ZN(w) >= ALLEDAAGS_ZIPF && ZE(w) - ZN(w) < 0.5));
const aantalAlledaags = woorden.filter(alledaags).length;

const body = `// Woordenlijst voor Woordtuin: ${woorden.length} woorden van 3 tot 7 letters, ${aantalAlledaags} daarvan alledaags.
// GEGENEREERD door tools/make-woordtuin-lijst.mjs, niet met de hand aanpassen:
// zet een woord op tools/woordtuin/blokkeerlijst.txt, ruw.txt of toegestaan.txt en draai het script opnieuw.
//
// Bron: OpenTaal-woordenlijst (Stichting OpenTaal, https://www.opentaal.org), BSD of CC BY 3.0.
// Onwaarschijnlijke woorden zijn weggelaten met behulp van de frequentie van woorden in ondertitels (OpenSubtitles).
// Een woord met een + ervoor is alledaags (de computer speelt alleen die).

const LIJST = '${woorden.map((w) => (alledaags(w) ? '+' : '') + w).join(' ')}'.split(' ');

export const WOORDEN = LIJST.map((w) => (w[0] === '+' ? w.slice(1) : w));
export const ALLEDAAGS = new Set(LIJST.filter((w) => w[0] === '+').map((w) => w.slice(1)));
`;
if (!process.env.DRY) writeFileSync(out, body);
console.log(JSON.stringify({ woorden: woorden.length, alledaags: aantalAlledaags, zeldzaam, geblokkeerd, engels }));
if (process.env.DUMP) writeFileSync(process.env.DUMP, woorden.map((w) => `${alledaags(w) ? '+' : ' '}${w}\t${F(w)}`).join('\n') + '\n');
