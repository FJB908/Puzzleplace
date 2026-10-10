// Hoe vaak komt elke letter voor in echte tekst van een taal? Voor de opvulletters van Woordzoeker (zodat een rooster eruitziet als tekst
// in die taal). Uit de ondertitelfrequenties (<taal>_full.txt, zie haal-bronnen.sh).
//
//   node tools/woordenlijst/letterfrequentie.mjs <bronmap>        maakt js/games/woordzoeker/frequentie.js

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TALEN, vouw, isAlfabet } from '../../js/shared/talen.js';

const bron = process.argv[2] || '.';
const uit = {};
for (const taal of Object.keys(TALEN)) {
  const f = join(bron, `${taal}_full.txt`);
  if (!existsSync(f)) { console.error(`${taal}: geen frequentielijst`); continue; }
  const som = {};
  let totaal = 0;
  for (const regel of readFileSync(f, 'utf8').split('\n')) {
    const p = regel.lastIndexOf(' ');
    if (p < 0) continue;
    const woord = regel.slice(0, p), n = Number(regel.slice(p + 1));
    if (!/^[\p{L}]+$/u.test(woord)) continue;
    const w = vouw(woord, taal);
    if (!isAlfabet(w, taal)) continue;
    for (const c of w) { som[c] = (som[c] || 0) + n; totaal += n; }
  }
  const procent = {};
  for (const c of [...TALEN[taal].alfabet]) {
    const p = ((som[c] || 0) / totaal) * 100;
    if (p >= 0.05) procent[c.toUpperCase()] = Math.round(p * 10) / 10;       // zeldzamere letters (q, x, ...) laten we weg
  }
  uit[taal] = procent;
}
const tekst = `// Letterfrequentie (in procenten) van elke taal, voor de opvulletters van Woordzoeker. GEGENEREERD door tools/woordenlijst/letterfrequentie.mjs.
export const FREQ = {
${Object.entries(uit).map(([t, f]) => `  ${t}: ${JSON.stringify(f).replace(/"/g, '')},`).join('\n')}
};
`;
writeFileSync(fileURLToPath(new URL('../../js/games/woordzoeker/frequentie.js', import.meta.url)), tekst);
console.log(tekst.split('\n').slice(0, 6).join('\n'));
