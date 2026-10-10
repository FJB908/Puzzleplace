// Maakt de woordenlijst voor Woordtuin: alleen gewone stamwoorden die bijna iedereen kent.
//
//   node tools/make-woordtuin-lijst.mjs  <map met de bronbestanden>
//
// Bronbestanden (los te downloaden, niet in de repo):
//   basis.txt       OpenTaal  elements/basiswoorden-gekeurd.txt   (BSD of CC BY 3.0, Stichting OpenTaal)
//   frequentie.txt  een frequentielijst "woord aantal" (OpenSubtitles via hermitdave/FrequencyWords, nl_full.txt)
//
// Hoe de lijst ontstaat:
//   1. woorden van 3 tot 7 letters (a-z) uit de OpenTaal-basislijst;
//   2. alleen woorden die voldoende voorkomen (zeldzame woorden vallen af, zie MIN_FREQ);
//   3. alles op tools/woordtuin/blokkeerlijst.txt valt af. Die lijst is MET DE HAND gemaakt: alle woorden die stap 2 overhield
//      zijn één voor één beoordeeld. Eruit: meervouden, verleden tijd, deelwoorden, verkleinwoorden, buigingen met -e,
//      namen, scheldwoorden, afkortingen, Engelse en andere vreemde woorden, en alles wat een gemiddelde volwassene niet kent.
//   4. tools/woordtuin/toegestaan.txt: woorden die altijd mogen (voor als een filter er een weghaalt).
//
// Een woord toevoegen of weigeren? Zet het op toegestaan.txt of blokkeerlijst.txt en draai dit script opnieuw.
//
// Uitvoer:  js/games/woordtuin/woorden.js

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = process.argv[2] || '.';
const here = fileURLToPath(new URL('./woordtuin/', import.meta.url));
const out = fileURLToPath(new URL('../js/games/woordtuin/woorden.js', import.meta.url));
const tokens = (f) => readFileSync(f, 'utf8').split('\n').flatMap((l) => l.replace(/#.*/, '').trim().split(/\s+/)).filter(Boolean);

const basis = new Set(readFileSync(join(dir, 'basis.txt'), 'utf8').split('\n'));
const freq = new Map();
for (const l of readFileSync(join(dir, 'frequentie.txt'), 'utf8').split('\n')) { const [w, n] = l.split(' '); if (n) freq.set(w, +n); }

export const MIN_FREQ = Number(process.env.MIN_FREQ || 400);
const blok = new Map(tokens(join(here, 'blokkeerlijst.txt')).map((t) => t.split('>')));     // woord -> grondwoord (of undefined)
const toegestaan = new Set(tokens(join(here, 'toegestaan.txt')));

const woorden = [];
let zeldzaam = 0, geblokkeerd = 0;
for (const w of [...basis].filter((x) => /^[a-z]{3,7}$/.test(x)).sort()) {
  if (toegestaan.has(w)) { woorden.push(w); continue; }
  if ((freq.get(w) || 0) < MIN_FREQ) { zeldzaam++; continue; }
  if (blok.has(w)) { geblokkeerd++; continue; }
  woorden.push(w);
}
const ok = new Set(woorden);

// Vormen die spelers waarschijnlijk proberen ("katten"): met hun grondwoord, voor een vriendelijke melding.
const hints = [...blok].filter(([w, b]) => b && ok.has(b)).map(([w, b]) => `${w}:${b}`).sort();

const body = `// Woordenlijst voor Woordtuin: ${woorden.length} gewone stamwoorden van 3 tot 7 letters.
// GEGENEREERD door tools/make-woordtuin-lijst.mjs, niet met de hand aanpassen:
// zet een woord op tools/woordtuin/blokkeerlijst.txt of toegestaan.txt en draai het script opnieuw.
//
// Bron: OpenTaal-woordenlijst (Stichting OpenTaal, https://www.opentaal.org), BSD of CC BY 3.0.
// Zeldzame woorden zijn weggelaten met behulp van de frequentie van woorden in ondertitels (OpenSubtitles).

export const WOORDEN = '${woorden.join(' ')}'.split(' ');

// Vormen die niet meetellen, met hun grondwoord ("katten:kat"), voor een vriendelijke melding.
export const AFGELEID = Object.fromEntries('${hints.join(' ')}'.split(' ').map((p) => p.split(':')));
`;
if (!process.env.DRY) writeFileSync(out, body);
console.log(JSON.stringify({ woorden: woorden.length, zeldzaam, geblokkeerd, hints: hints.length }));
if (process.env.DUMP) writeFileSync(process.env.DUMP, woorden.join('\n') + '\n');
