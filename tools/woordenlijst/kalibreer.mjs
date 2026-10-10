// Meet per taal hoe Woordtuin zich gedraagt met de woordenlijst van die taal, en stelt de sterkte van de computer in.
//
//   node tools/woordenlijst/kalibreer.mjs               meten en js/games/woordtuin/schaal.js schrijven
//   node tools/woordenlijst/kalibreer.mjs --meet        alleen meten (schrijft niets)
//
// Een taal met veel woordvormen (Pools, Tsjechisch, Fins, ...) heeft op elk bord veel meer woorden dan het Nederlands. De computer "ziet" een
// vast deel van de woorden (NIVEAUS in engine.js); zonder correctie zou Makkelijk in zo'n taal veel sterker zijn. SCHAAL[taal] is daarom het aantal
// alledaagse zetten op een gemiddeld Nederlands bord gedeeld door dat op een gemiddeld bord van de taal: zo ziet de computer in elke taal evenveel zetten.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TAAL_IDS } from '../../js/shared/talen.js';
import { laadWoordenboek } from '../../js/games/woordtuin/woordenboek.js';
import { newGame, legalMoves, boardQuality, GOED, SIZE } from '../../js/games/woordtuin/engine.js';
import { existsSync } from 'node:fs';

const N = 40;
const meet = async (taal) => {
  await laadWoordenboek(taal);
  let zetten = 0, ok = 0, ms = 0, woorden = 0, maxMs = 0;
  for (let i = 0; i < N; i++) {
    const t0 = performance.now();
    const g = newGame(`kal${i}`, { lang: taal });
    const dt = performance.now() - t0; ms += dt; maxMs = Math.max(maxMs, dt);
    const alle = legalMoves(g, 1, false, true);
    zetten += alle.length; woorden += new Set(alle.map((m) => m.word)).size;
    const q = boardQuality(g.letters, SIZE, taal), eis = GOED(SIZE);
    if (q.count >= eis.count && q.coverage >= eis.coverage && q.long >= eis.long) ok++;
  }
  return { taal, zetten: zetten / N, woorden: woorden / N, slaagt: ok / N, ms: ms / N, maxMs };
};

const talen = TAAL_IDS.filter((t) => existsSync(fileURLToPath(new URL(`../../js/games/woordtuin/talen/${t}.js`, import.meta.url))));
const rijen = [];
for (const t of talen) rijen.push(await meet(t));
const nl = rijen.find((r) => r.taal === 'nl');
const schaal = {};
for (const r of rijen) schaal[r.taal] = r.taal === 'nl' ? 1 : Math.round(Math.min(4, Math.max(0.15, nl.zetten / r.zetten)) * 100) / 100;
console.log('taal  zetten/bord  woorden/bord  bord goed  ms/bord (max)  schaal');
for (const r of rijen) console.log(`${r.taal.padEnd(4)}  ${r.zetten.toFixed(0).padStart(10)}  ${r.woorden.toFixed(0).padStart(12)}  ${(r.slaagt * 100).toFixed(0).padStart(7)}%  ${r.ms.toFixed(0).padStart(7)} (${r.maxMs.toFixed(0)})  ${String(schaal[r.taal]).padStart(6)}`);
if (!process.argv.includes('--meet')) {
  const uit = `// Hoeveel woorden de computer ziet, uitgedrukt tegenover het Nederlands (1 = zoveel als in het Nederlands). Talen met veel woordvormen hebben\n// per bord veel meer alledaagse woorden; zonder deze factor zou Makkelijk daar veel te sterk zijn.\n// GEGENEREERD door tools/woordenlijst/kalibreer.mjs.\nexport const SCHAAL = ${JSON.stringify(schaal)};\n`;
  writeFileSync(fileURLToPath(new URL('../../js/games/woordtuin/schaal.js', import.meta.url)), uit);
  console.log('js/games/woordtuin/schaal.js geschreven');
}
