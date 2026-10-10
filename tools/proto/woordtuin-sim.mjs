// Veroveren met woorden: vaste letters, woorden via aangrenzende letters, gebieden kleuren
import { kids, isW, newBoard, CFG } from './woordtuin-basis.mjs';
import { makeRng } from '../../js/games/kruiswoord/engine.js';
const D8 = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]], D4 = [[-1,0],[1,0],[0,-1],[0,1]];

export function paths(g, minLen, maxLen) {
  const N = g.length, out = [], seen = new Set(), used = Array.from({ length: N }, () => Array(N).fill(false)), path = [];
  function dfs(r, c, node, word) {
    const nx = kids[node * 26 + g[r][c].ch.charCodeAt(0) - 97]; if (!nx) return;
    used[r][c] = true; path.push(r * N + c); word += g[r][c].ch;
    if (isW[nx] && word.length >= minLen) { const key = word + '|' + [...path].sort((a, b) => a - b).join(','); if (!seen.has(key)) { seen.add(key); out.push({ word, cells: [...path] }); } }
    if (word.length < maxLen) for (const [dr, dc] of D8) { const a = r + dr, b = c + dc; if (a >= 0 && b >= 0 && a < N && b < N && !used[a][b]) dfs(a, b, nx, word); }
    used[r][c] = false; path.pop();
  }
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) dfs(r, c, 0, '');
  return out;
}
let K = 99, NEED = false;
export const setNeed = (v) => { NEED = v; };
export const setK = (k) => { K = k; };
const prot = (own, N, i) => { if (!own[i]) return false; if (own.fl && own.fl[i] >= K) return true; const r = Math.floor(i / N), c = i % N; for (const [dr, dc] of D4) { const a = r + dr, b = c + dc; if (a >= 0 && b >= 0 && a < N && b < N && own[a * N + b] !== own[i]) return false; } return true; };
export function applyMove(own, N, cells, p) {                  // geeft nieuwe eigendom of null als er niets verandert
  const o = own.slice(); o.fl = own.fl ? own.fl.slice() : Array(N * N).fill(0); let changed = 0;
  for (const i of cells) if (o[i] !== p && !prot(own, N, i)) { o[i] = p; o.fl[i]++; changed++; }
  return changed ? o : null;
}
const diff = (own, p) => own.reduce((a, x) => a + (x === p ? 1 : x ? -1 : 0), 0);

function legal(moves, own, N, p, played) {
  const res = [];
  for (const m of moves) { if (played.has(m.word)) continue; if (NEED && !m.cells.some((i) => !own[i])) continue; const o = applyMove(own, N, m.cells, p); if (o) res.push({ m, o }); }
  return res;
}
export function play(seed, N, bots, first, maxLen = 7, rounds = 99) {
  const rng = makeRng('t' + seed); CFG.bloomP = 0;
  let g = newBoard(rng, N, 0), moves = paths(g, 3, maxLen), tries = 0;
  while (moves.length < 60 && tries++ < 30) { g = newBoard(rng, N, 0); moves = paths(g, 3, maxLen); }
  let own = Array(N * N).fill(0), p = first, played = new Set(), turns = 0, passes = 0; const lead = [];
  const neutral = () => own.filter((x) => !x).length;
  while (turns < Math.min(120, rounds * 2)) {
    const L = legal(moves, own, N, p + 1, played);
    if (!L.length) { passes++; if (passes >= 2) break; p = 1 - p; turns++; continue; }
    passes = 0;
    const bot = bots[p];
    let pool = bot.sees < 1 ? L.filter(() => rng() < bot.sees) : L; if (!pool.length) pool = [L[Math.floor(rng() * L.length)]];
    const score = (x) => diff(x.o, p + 1);
    let choice;
    if (bot.look) {
      const top = [...pool].sort((a, b) => score(b) - score(a)).slice(0, bot.look);
      let bv = -1e9;
      for (const x of top) {
        const pl2 = new Set(played); pl2.add(x.m.word);
        const R = legal(moves, x.o, N, 2 - p, pl2);          // tegenstander (kleur 2-p)
        let worst = 0; for (const y of R) worst = Math.max(worst, diff(y.o, 2 - p));
        const v = R.length ? -worst : diff(x.o, p + 1);
        if (v > bv) { bv = v; choice = x; }
      }
    } else choice = pool.reduce((a, x) => (score(x) > score(a) ? x : a), pool[0]);
    own = choice.o; played.add(choice.m.word); lead.push(diff(own, 1)); p = 1 - p; turns++;
    if (!neutral()) break;
  }
  const a = own.filter((x) => x === 1).length, b = own.filter((x) => x === 2).length;
  return { a, b, turns, lead, startMoves: moves.length, neutralLeft: neutral() };
}
