// Kruiswoord-engine: een rooster bouwen uit woorden en omschrijvingen. Geen scherm, alleen logica.
//
// Een puzzel: { rows, cols, grid (array van rijstrings, '.' = geen vakje), entries }
//   entry: { n (nummer), dir ('across' | 'down'), r, c, answer, clue }
// Zelfde seed + niveau = precies dezelfde puzzel.
//
// Het rooster is "vrij" (zoals in veel puzzelboekjes): woorden kruisen elkaar, er zijn geen zwarte
// vakken nodig. Bij het plaatsen geldt: een woord raakt een ander woord alleen door te kruisen, zodat
// elke reeks van twee of meer letters in het rooster precies een woord uit de lijst is.

import { woorden } from './woorden.js';

export const LEVELS = {
  makkelijk: { words: 8,  max: 9,  maxLevel: 1, minLen: 3, maxLen: 7 },
  gemiddeld: { words: 12, max: 11, maxLevel: 2, minLen: 3, maxLen: 8 },
  moeilijk:  { words: 16, max: 13, maxLevel: 3, minLen: 3, maxLen: 10 },
  extreem:   { words: 22, max: 13, maxLevel: 3, minLen: 3, maxLen: 12 },
};

export function makeRng(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = (Math.imul(h ^ (h >>> 16), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, rng) {
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list;
}

// ----- Het bouwveld tijdens het plaatsen -----
const key = (r, c) => `${r},${c}`;

function newField() {
  return { letters: new Map(), used: [new Set(), new Set()], placed: [], minR: 0, maxR: 0, minC: 0, maxC: 0, cross: 0 };
}

// 0 = horizontaal (across), 1 = verticaal (down)
// Geeft het aantal kruisingen, of -1 als het woord hier niet mag.
function check(f, word, r, c, dir, max) {
  const dr = dir, dc = 1 - dir, L = word.length;
  const at = (rr, cc) => f.letters.get(key(rr, cc));
  if (at(r - dr, c - dc) || at(r + dr * L, c + dc * L)) return -1;      // vóór en ná het woord moet leeg zijn
  let cross = 0;
  for (let i = 0; i < L; i++) {
    const rr = r + dr * i, cc = c + dc * i, ex = at(rr, cc);
    if (ex) {
      if (ex !== word[i] || f.used[dir].has(key(rr, cc))) return -1;     // andere letter, of al een woord in dezelfde richting
      cross++;
    } else if (at(rr + dc, cc + dr) || at(rr - dc, cc - dr)) return -1;  // geen woorden naast elkaar leggen
  }
  if (f.placed.length && cross === 0) return -1;                          // moet aansluiten
  if (cross === L) return -1;
  const minR = Math.min(f.minR, r), maxR = Math.max(f.maxR, r + dr * (L - 1));
  const minC = Math.min(f.minC, c), maxC = Math.max(f.maxC, c + dc * (L - 1));
  if (maxR - minR + 1 > max || maxC - minC + 1 > max) return -1;
  return cross;
}

function put(f, entry, r, c, dir) {
  const dr = dir, dc = 1 - dir;
  for (let i = 0; i < entry.answer.length; i++) {
    const k = key(r + dr * i, c + dc * i);
    if (f.letters.has(k)) f.cross++;
    f.letters.set(k, entry.answer[i]);
    f.used[dir].add(k);
  }
  f.placed.push({ entry, r, c, dir });
  if (f.placed.length === 1) { f.minR = r; f.maxR = r + dr * (entry.answer.length - 1); f.minC = c; f.maxC = c + dc * (entry.answer.length - 1); }
  else {
    f.minR = Math.min(f.minR, r); f.maxR = Math.max(f.maxR, r + dr * (entry.answer.length - 1));
    f.minC = Math.min(f.minC, c); f.maxC = Math.max(f.maxC, c + dc * (entry.answer.length - 1));
  }
}

// Eén poging: begin met een lang woord en voeg steeds het woord toe dat het beste past.
function attempt(pool, spec, rng) {
  const f = newField();
  const candidates = shuffle([...pool], rng).slice(0, 110);
  const first = candidates.filter((e) => e.answer.length >= 5).sort((a, b) => b.answer.length - a.answer.length)[Math.floor(rng() * 6)] || candidates[0];
  put(f, first, 0, 0, 0);
  const left = new Set(candidates.filter((e) => e !== first));

  while (f.placed.length < spec.words && left.size) {
    // alle plekken waar een woord een bestaande letter kruist
    const byLetter = new Map();
    for (const [k, ch] of f.letters) { if (!byLetter.has(ch)) byLetter.set(ch, []); byLetter.get(ch).push(k); }
    let best = null, bestScore = -Infinity;
    for (const e of left) {
      for (let i = 0; i < e.answer.length; i++) {
        const spots = byLetter.get(e.answer[i]);
        if (!spots) continue;
        for (const k of spots) {
          const [kr, kc] = k.split(',').map(Number);
          for (const dir of [0, 1]) {
            const r = kr - dir * i, c = kc - (1 - dir) * i;
            const x = check(f, e.answer, r, c, dir, spec.max);
            if (x < 0) continue;
            const grow = (Math.max(f.maxR, r + dir * (e.answer.length - 1)) - Math.min(f.minR, r) + 1)
                       * (Math.max(f.maxC, c + (1 - dir) * (e.answer.length - 1)) - Math.min(f.minC, c) + 1);
            const score = x * 10 - grow * .35 + e.answer.length * .4 + rng() * 4;
            if (score > bestScore) { bestScore = score; best = { e, r, c, dir }; }
          }
        }
      }
    }
    if (!best) break;
    put(f, best.e, best.r, best.c, best.dir);
    left.delete(best.e);
  }
  return f;
}

function finish(f) {
  const rows = f.maxR - f.minR + 1, cols = f.maxC - f.minC + 1;
  const grid = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => f.letters.get(key(r + f.minR, c + f.minC)) || '.').join(''));
  const raw = f.placed.map((p) => ({ answer: p.entry.answer, clue: p.entry.clue, r: p.r - f.minR, c: p.c - f.minC, dir: p.dir ? 'down' : 'across' }));
  // nummering: van links naar rechts, van boven naar onder, een nummer per beginvakje
  const numbers = new Map();
  let n = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (grid[r][c] === '.') continue;
    if (raw.some((e) => e.r === r && e.c === c)) numbers.set(key(r, c), ++n);
  }
  const entries = raw.map((e) => ({ ...e, n: numbers.get(key(e.r, e.c)) }))
    .sort((a, b) => a.n - b.n || (a.dir === 'across' ? -1 : 1));
  return { rows, cols, grid, entries };
}

// Een vast aantal pogingen, geen klok: dezelfde puzzel op elk apparaat en bij elke belasting (de puzzel van de dag is voor iedereen hetzelfde).
export const POGINGEN = 14;
export function generate(seed, level = 'makkelijk', taal = 'nl', pogingen = POGINGEN) {
  const ENTRIES = woorden(taal);                       // de woorden van de taal moeten al geladen zijn (laadWoorden)
  const spec = LEVELS[level] || LEVELS.makkelijk;
  const rng = makeRng(`${seed}|${level}`);
  const pool = ENTRIES.filter((e) => e.level <= spec.maxLevel && e.answer.length >= spec.minLen && e.answer.length <= Math.min(spec.maxLen, spec.max));

  let best = null, bestScore = -Infinity;
  for (let i = 0; i < pogingen; i++) {
    const f = attempt(pool, spec, rng);
    const area = (f.maxR - f.minR + 1) * (f.maxC - f.minC + 1);
    const score = f.placed.length * 100 + f.cross * 18 - area;
    if (score > bestScore) { bestScore = score; best = f; }
    if (f.placed.length >= spec.words && i >= 5) break;          // genoeg woorden en een paar pogingen om de beste te kiezen
  }
  const puzzle = finish(best);
  const problem = validate(puzzle);
  if (problem) throw new Error(`Ongeldig kruiswoord (${taal}, ${level}): ${problem}`);
  return puzzle;
}

// ----- Controle en hulpfuncties -----

// Klopt het rooster? Elke reeks van twee of meer letters is precies een woord uit de lijst, alle
// woorden hangen aan elkaar en de nummers kloppen. Geeft een tekst met het probleem, of null.
export function validate(p) {
  const runs = [];
  for (let r = 0; r < p.rows; r++) {
    let c = 0;
    while (c < p.cols) {
      if (p.grid[r][c] === '.') { c++; continue; }
      let e = c; while (e < p.cols && p.grid[r][e] !== '.') e++;
      if (e - c >= 2) runs.push({ dir: 'across', r, c, word: p.grid[r].slice(c, e) });
      c = e;
    }
  }
  for (let c = 0; c < p.cols; c++) {
    let r = 0;
    while (r < p.rows) {
      if (p.grid[r][c] === '.') { r++; continue; }
      let e = r; while (e < p.rows && p.grid[e][c] !== '.') e++;
      if (e - r >= 2) runs.push({ dir: 'down', r, c, word: Array.from({ length: e - r }, (_, i) => p.grid[r + i][c]).join('') });
      r = e;
    }
  }
  if (runs.length !== p.entries.length) return `${runs.length} reeksen in het rooster maar ${p.entries.length} woorden`;
  for (const run of runs) {
    const e = p.entries.find((x) => x.dir === run.dir && x.r === run.r && x.c === run.c);
    if (!e || e.answer !== run.word) return `reeks ${run.word} op ${run.r},${run.c} is geen woord uit de lijst`;
  }
  // samenhang: alle woorden hangen via kruisingen aan elkaar
  const cellsOf = (e) => Array.from({ length: e.answer.length }, (_, i) => key(e.r + (e.dir === 'down' ? i : 0), e.c + (e.dir === 'across' ? i : 0)));
  const sets = p.entries.map((e) => new Set(cellsOf(e)));
  const seen = new Set([0]), todo = [0];
  while (todo.length) {
    const i = todo.pop();
    sets.forEach((s, j) => { if (!seen.has(j) && [...sets[i]].some((k) => s.has(k))) { seen.add(j); todo.push(j); } });
  }
  if (seen.size !== sets.length) return 'niet alle woorden hangen aan elkaar';
  const nums = p.entries.map((e) => e.n);
  if (nums.some((n) => !(n >= 1)) ) return 'ontbrekend nummer';
  return null;
}

export const cellsOf = (e) => Array.from({ length: e.answer.length }, (_, i) => [e.r + (e.dir === 'down' ? i : 0), e.c + (e.dir === 'across' ? i : 0)]);
