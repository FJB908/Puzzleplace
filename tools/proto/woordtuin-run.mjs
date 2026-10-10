import { play, setK, setNeed } from './woordtuin-sim.mjs';
const N = +process.argv[2] || 5, G = +process.argv[3] || 100, ML = +process.argv[4] || 7, KK = +process.argv[5] || 99, RR = +process.argv[6] || 99; setK(KK); setNeed(process.argv[7] === '1');
function stats(label, A, B) {
  let hold = 0, holdN = 0, w0 = 0, w1 = 0, d = 0, turns = 0, diff = 0, flips = 0, f0 = 0, fN = 0, sm = 0, t0 = Date.now(), last = 0;
  for (let i = 0; i < G; i++) {
    const first = i % 2, r = play('s' + i, N, [A, B], first, ML, RR);
    // A is altijd speler index 0 -> kleur 1; wissel startspeler
    if (r.a > r.b) w0++; else if (r.b > r.a) w1++; else d++;
    turns += r.turns / 2; diff += Math.abs(r.a - r.b); sm += r.startMoves;
    { const L = r.lead, k = Math.floor(L.length * 0.67), s = Math.sign(L[k] || 0), fin = Math.sign(r.a - r.b); if (s && fin) { holdN++; if (s === fin) hold++; } }
    if (r.a !== r.b) { fN++; if ((r.a > r.b) === (first === 0)) f0++; }
    const L = r.lead; let s = 0, f = 0; for (const x of L.slice(Math.floor(L.length / 3))) { if (x && s && Math.sign(x) !== s) f++; if (x) s = Math.sign(x); } flips += f;
  }
  console.log(`${label.padEnd(26)} A:${(w0/G*100).toFixed(0)}% B:${(w1/G*100).toFixed(0)}% =${(d/G*100).toFixed(0)}% | zetten/speler ${(turns/G).toFixed(1)} | startwoorden ${(sm/G).toFixed(0)} | eindverschil ${(diff/G).toFixed(1)} | leider wisselt ${(flips/G).toFixed(2)} | beginner wint ${(f0/fN*100).toFixed(0)}% | wie na 2/3 voorstaat wint nog ${(hold/holdN*100).toFixed(0)}% | ${((Date.now()-t0)/1000).toFixed(0)}s`);
}
const G1 = { sees: 1 };
console.log(`bord ${N}x${N}, woorden 3-${ML} letters, vakje verandert max ${KK}x, max ronden ${RR}, nieuw vakje verplicht ${process.argv[7] === '1'}`);
stats('gretig v gretig', G1, G1);
stats('vooruitkijken v gretig', { sees: 1, look: 8 }, G1);
stats('ziet 30% v 15%', { sees: .3 }, { sees: .15 });
stats('ziet 30% v 30%', { sees: .3 }, { sees: .3 });
stats('vooruit(30%) v gretig(30%)', { sees: .3, look: 8 }, { sees: .3 });
