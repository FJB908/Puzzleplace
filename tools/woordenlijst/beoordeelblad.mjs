// Maakt van de lijsten die bouw.mjs met REVIEW=<map> schrijft de bladen voor de beoordelaars (zie BEOORDELEN.md).
//
//   node tools/woordenlijst/beoordeelblad.mjs <taal> <map met A/B/C/D-lijsten> <uitvoermap>
//
// Per taal: <taal>-1.txt (A alledaags + C als Engels geweigerd + D onbekend bij het woordenboek) en <taal>-2.txt (B: de meest voorkomende overige woorden).
// Een groot blad wordt in tweeën gedeeld (-1a, -1b) zodat het in één keer te lezen is.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { TALEN } from '../../js/shared/talen.js';

const [taal, bron, uit] = process.argv.slice(2);
if (!TALEN[taal] || !bron || !uit) { console.error('Gebruik: node tools/woordenlijst/beoordeelblad.mjs <taal> <map> <uitvoermap>'); process.exit(1); }
mkdirSync(uit, { recursive: true });
const lees = (k) => { const f = join(bron, `${taal}-${k}.txt`); return existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter(Boolean) : []; };
const A = lees('A-alledaags'), B = lees('B-overig'), C = lees('C-engels-geweigerd'), D = lees('D-ontbreekt');
const latijn = TALEN[taal].schrift === 'latijn';
const MAX_A = latijn ? 230_000 : 110_000;            // bytes per blad
const TOP_B = 8000;                                    // aantal woorden van B dat we laten lezen

const kop = (naam) => `# ${TALEN[taal].english} (${taal}), review sheet ${naam}. Read tools/woordenlijst/BEOORDELEN.md first.\n# word=Source: left of "=" is the folded form you write in your lists, right of it the original spelling. Format of C: word=Source(zipf-local/zipf-english). Format of D: word(count-lowercase/count-capital).\n`;
const deel = (lijst, per) => { const o = []; let cur = [], n = 0; for (const l of lijst) { cur.push(l); n += Buffer.byteLength(l) + 1; if (n >= per) { o.push(cur); cur = []; n = 0; } } if (cur.length) { if (o.length && n < per * 0.4) o[o.length - 1].push(...cur); else o.push(cur); } return o; };

const uitleg = {
  A: '#### A: EVERYDAY words (the computer plays these and hints point at them: this set must be spotless). 14 per line, most frequent first.',
  B: '#### B: other accepted words (a part: the most frequent first). 14 per line.',
  C: '#### C: words that were rejected automatically as "English" (rescue the ordinary words of this language with ## eng).',
  D: '#### D: frequent in subtitles but unknown to the dictionary (pick real standard words with ## toe; most are names and noises).',
};
const aDelen = deel(A, MAX_A);
const bladen = [];
aDelen.forEach((a, i) => {
  const naam = aDelen.length > 1 ? `1${'abcdefgh'[i]}` : '1';
  bladen.push([naam, `${kop(naam)}${uitleg.A}\n${a.join('\n')}\n${i === 0 && C.length ? `${uitleg.C}\n${C.join('\n')}\n` : ''}${i === 0 && D.length ? `${uitleg.D}\n${D.join('\n')}\n` : ''}`]);
});
const bTop = []; let n = 0;
for (const l of B) { bTop.push(l); n += l.split(' ').length; if (n >= TOP_B) break; }
bladen.push(['2', `${kop('2')}${uitleg.B}\n${bTop.join('\n')}\n`]);
for (const [naam, tekst] of bladen) writeFileSync(join(uit, `${taal}-${naam}.txt`), tekst);
console.log(`${taal}: ${bladen.map(([naam, t]) => `${naam}=${Math.round(Buffer.byteLength(t) / 1000)}k`).join(' ')}`);
