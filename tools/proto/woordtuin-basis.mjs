// Letterregen: prototype van de regels, om te meten of het spel diepgang heeft
import { readFileSync } from 'node:fs';
import { makeRng } from '../../js/games/kruiswoord/engine.js';

const WL = process.env.WORDLIST || 'wordlist.txt';   // OpenTaal: https://github.com/OpenTaal/opentaal-wordlist (BSD / CC BY 3.0)
// ---- trie ----
export let cap = 1_200_000, kids = new Int32Array(cap * 26), isW = new Uint8Array(cap), n = 1;
function grow() { const k2 = new Int32Array(cap * 2 * 26); k2.set(kids); kids = k2; const w2 = new Uint8Array(cap * 2); w2.set(isW); isW = w2; cap *= 2; }
let count = 0;
for (const w of readFileSync(WL, 'utf8').split('\n')) {
  if (!/^[a-z]{3,12}$/.test(w)) continue;
  let node = 0;
  for (let i = 0; i < w.length; i++) { const c = w.charCodeAt(i) - 97; if (!kids[node * 26 + c]) { if (n >= cap) grow(); kids[node * 26 + c] = n++; } node = kids[node * 26 + c]; }
  isW[node] = 1; count++;
}
export const WORDS = count;

const DIST = { a: 7, b: 2, c: 2, d: 5, e: 18, f: 2, g: 3, h: 2, i: 4, j: 2, k: 3, l: 3, m: 3, n: 10, o: 6, p: 2, r: 5, s: 5, t: 5, u: 3, v: 2, w: 2, y: 1, z: 2 };
const VAL = { a: 1, b: 3, c: 5, d: 2, e: 1, f: 4, g: 3, h: 3, i: 1, j: 4, k: 3, l: 3, m: 3, n: 1, o: 1, p: 3, r: 2, s: 2, t: 2, u: 4, v: 4, w: 5, y: 8, z: 4 };
export const CFG = { maxLen: 12, bonus: [0,0,0,0,2,5,9,14,20,27,35,44,54], mult: false, refill: false, rounds: 99, bloomP: 0.03 };
const POOL = Object.entries(DIST).flatMap(([c, k]) => Array(k).fill(c));

export function newBoard(rng, N, blooms = 3) {
  const g = Array.from({ length: N }, () => Array.from({ length: N }, () => ({ ch: POOL[Math.floor(rng() * POOL.length)], bloom: false })));
  for (let i = 0; i < blooms; i++) g[Math.floor(rng() * N)][Math.floor(rng() * N)].bloom = true;
  return g;
}
const D8 = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
export function allMoves(g, minLen = 3) {
  const N = g.length, out = [], seen = new Set();
  const used = Array.from({ length: N }, () => Array(N).fill(false));
  const path = [];
  function dfs(r, c, node, word) {
    const cell = g[r][c]; if (!cell) return;
    const nx = kids[node * 26 + cell.ch.charCodeAt(0) - 97]; if (!nx) return;
    used[r][c] = true; path.push([r, c]); word += cell.ch;
    if (isW[nx] && word.length >= minLen && word.length <= CFG.maxLen) {
      const key = word + '|' + path.map(([a, b]) => a * N + b).sort((x, y) => x - y).join(',');
      if (!seen.has(key)) {
        seen.add(key);
        let base = 0, bloom = false; for (const [a, b] of path) { base += VAL[g[a][b].ch]; if (g[a][b].bloom) bloom = true; }
        out.push({ word, path: path.map((p) => p.slice()), score: Math.round((base + CFG.bonus[word.length]) * (bloom ? 2 : 1)) });
      }
    }
    if (word.length < CFG.maxLen) for (const [dr, dc] of D8) { const a = r + dr, b = c + dc; if (a >= 0 && b >= 0 && a < N && b < N && !used[a][b]) dfs(a, b, nx, word); }
    used[r][c] = false; path.pop();
  }
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) dfs(r, c, 0, '');
  return out;
}
export function after(g, move) {
  const N = g.length, h = g.map((row) => row.map((x) => x && { ...x }));
  for (const [r, c] of move.path) h[r][c] = null;
  for (let c = 0; c < N; c++) { const col = []; for (let r = N - 1; r >= 0; r--) if (h[r][c]) col.push(h[r][c]); for (let r = N - 1, i = 0; r >= 0; r--, i++) h[r][c] = col[i] || null; }
  if (CFG.refill) for (let c = 0; c < N; c++) for (let r = 0; r < N; r++) if (!h[r][c]) h[r][c] = { ch: POOL[Math.floor(refillRng() * POOL.length)], bloom: refillRng() < CFG.bloomP };
  return h;
}
let refillRng = Math.random;
const left = (g) => g.flat().filter(Boolean).length;
const best = (ms) => ms.reduce((a, m) => (m.score > a ? m.score : a), 0);

function pick(moves, bot, g, rng) {
  if (!moves.length) return null;
  let pool = bot.sees < 1 ? moves.filter(() => rng() < bot.sees) : moves;
  if (!pool.length) pool = [moves[Math.floor(rng() * moves.length)]];
  if (bot.look) {                                           // kijk één zet vooruit: mijn punten min het beste antwoord
    const top = [...pool].sort((a, b) => b.score - a.score).slice(0, bot.look);
    let bv = -1e9, bm = top[0];
    for (const m of top) { const v = m.score - bot.w * best(allMoves(after(g, m))); if (v > bv) { bv = v; bm = m; } }
    return bm;
  }
  return pool.reduce((a, m) => (m.score > a.score ? m : a), pool[0]);
}
export function play(seed, N, bots, first) {
  const rng = makeRng('lr' + seed); refillRng = makeRng('rf' + seed);
  let g = newBoard(rng, N); let moves = allMoves(g), tries = 0;
  while (moves.length < 40 && tries++ < 20) { g = newBoard(rng, N); moves = allMoves(g); }
  const startMoves = moves.length, startBest = best(moves);
  const sc = [0, 0], lead = []; let p = first, turns = 0, bigs = 0;
  while (true) {
    if (turns) moves = allMoves(g);
    const m = pick(moves, bots[p], g, rng);
    if (!m) break;
    sc[p] += m.score; if (m.word.length >= 6) bigs++;
    g = after(g, m); lead.push(sc[0] - sc[1]); p = 1 - p; turns++;
    if (turns >= CFG.rounds * 2 || turns > 80) break;
  }
  return { sc, turns, startMoves, startBest, left: left(g), lead, bigs };
}
