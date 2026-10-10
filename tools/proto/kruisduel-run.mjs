import { play } from './kruisduel-sim.mjs';
const N = 400;
function stats(label, level, A, B) {
  let w0 = 0, w1 = 0, d = 0, turns = 0, diff = 0, flips = 0, bonus = 0, tot = 0, bingo = 0, cells = 0, first0 = 0, firstN = 0;
  for (let i = 0; i < N; i++) {
    const first = i % 2;                          // eerlijk afwisselen wie begint
    const r = play('s' + i, level, [{ ...A }, { ...B }], first);
    const [a, b] = r.scores; if (a > b) w0++; else if (b > a) w1++; else d++;
    turns += r.turns / 2; diff += Math.abs(a - b); bonus += r.bonusPts; tot += a + b; bingo += r.bingo; cells += r.cells;
    // wie begon, won die?
    if (a !== b) { firstN++; if ((a > b) === (first === 0)) first0++; }
    // voorsprong gewisseld in de tweede helft
    const L = r.lead.slice(Math.floor(r.lead.length / 2)); let sign = Math.sign(L[0]), f = 0; for (const x of L) { if (Math.sign(x) && sign && Math.sign(x) !== sign) f++; if (Math.sign(x)) sign = Math.sign(x); } flips += f;
  }
  console.log(`${label.padEnd(34)} ${level.padEnd(9)} A:${(w0/N*100).toFixed(0)}% B:${(w1/N*100).toFixed(0)}% gelijk:${(d/N*100).toFixed(0)}% | beurten/speler ${(turns/N).toFixed(1)} | vakjes ${(cells/N).toFixed(0)} | scoreverschil ${(diff/N).toFixed(1)} | bonus-aandeel ${(bonus/tot*100).toFixed(0)}% | volle-bloei/partij ${(bingo/N).toFixed(2)} | voorsprong wisselt (2e helft) ${(flips/N).toFixed(2)} | beginner wint ${(first0/firstN*100).toFixed(0)}%`);
}
for (const level of ['makkelijk', 'gemiddeld', 'moeilijk']) {
  stats('gelijk (p .6) greedy v greedy', level, { p: .6, policy: 'greedy' }, { p: .6, policy: 'greedy' });
  stats('slim v greedy, gelijke kennis .6', level, { p: .6, policy: 'smart' }, { p: .6, policy: 'greedy' });
  stats('kennis .75 v .55 (beide greedy)', level, { p: .75, policy: 'greedy' }, { p: .55, policy: 'greedy' });
  stats('kennis .55 slim v .75 greedy', level, { p: .55, policy: 'smart' }, { p: .75, policy: 'greedy' });
}
