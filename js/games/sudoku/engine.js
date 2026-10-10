// Sudoku-engine: puzzels maken, controleren en oplossen. Geen scherm, alleen logica.
//
// Een rooster is een array van 81 getallen (rij voor rij), 0 = leeg.
// Elke puzzel heeft precies één oplossing. Makkelijk en gemiddeld zijn altijd
// op te lossen met alleen "enige mogelijkheid"-logica, dus zonder gokken.

// ----- Vaste tabellen -----
const ROW = (i) => Math.floor(i / 9);
const COL = (i) => i % 9;
const BOX = (i) => Math.floor(ROW(i) / 3) * 3 + Math.floor(COL(i) / 3);

const UNITS = [];
for (let n = 0; n < 9; n++) {
  UNITS.push(Array.from({ length: 9 }, (_, k) => n * 9 + k));            // rijen
  UNITS.push(Array.from({ length: 9 }, (_, k) => k * 9 + n));            // kolommen
  UNITS.push(Array.from({ length: 9 }, (_, k) => (Math.floor(n / 3) * 3 + Math.floor(k / 3)) * 9 + (n % 3) * 3 + (k % 3))); // blokjes
}

export const PEERS = Array.from({ length: 81 }, (_, i) => {
  const set = new Set();
  for (const unit of UNITS) if (unit.includes(i)) unit.forEach((j) => j !== i && set.add(j));
  return [...set];
});

const popcount = (m) => { let n = 0; while (m) { m &= m - 1; n++; } return n; };

// ----- Willekeur met een seed (zelfde seed = zelfde puzzel) -----
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
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// ----- Zoeken met terugkeren (backtracking) -----
// Telt oplossingen tot `limit`. Met `rng` worden cijfers in willekeurige volgorde geprobeerd;
// `out.solution` krijgt de eerste gevonden oplossing.
function search(cells, limit, rng, out) {
  const g = Int8Array.from(cells);
  const rows = new Int16Array(9), cols = new Int16Array(9), boxes = new Int16Array(9);
  for (let i = 0; i < 81; i++) {
    if (!g[i]) continue;
    const bit = 1 << (g[i] - 1);
    if ((rows[ROW(i)] | cols[COL(i)] | boxes[BOX(i)]) & bit) return 0; // botsing in de startsituatie
    rows[ROW(i)] |= bit; cols[COL(i)] |= bit; boxes[BOX(i)] |= bit;
  }
  let count = 0;

  (function rec() {
    let best = -1, bestMask = 0, bestN = 10;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const mask = ~(rows[ROW(i)] | cols[COL(i)] | boxes[BOX(i)]) & 0x1ff;
      const n = popcount(mask);
      if (n === 0) return;
      if (n < bestN) { best = i; bestMask = mask; bestN = n; if (n === 1) break; }
    }
    if (best < 0) {
      count++;
      if (out && !out.solution) out.solution = Array.from(g);
      return;
    }
    const digits = [];
    for (let d = 1; d <= 9; d++) if (bestMask & (1 << (d - 1))) digits.push(d);
    if (rng) shuffle(digits, rng);
    for (const d of digits) {
      const bit = 1 << (d - 1), r = ROW(best), c = COL(best), b = BOX(best);
      g[best] = d; rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
      rec();
      g[best] = 0; rows[r] &= ~bit; cols[c] &= ~bit; boxes[b] &= ~bit;
      if (count >= limit) return;
    }
  })();
  return count;
}

export const countSolutions = (cells, limit = 2) => search(cells, limit);

export function solve(cells) {
  const out = {};
  return search(cells, 1, null, out) ? out.solution : null;
}

// Kan de puzzel alleen met "enige mogelijkheid" (naked/hidden single) worden opgelost?
export function solvableBySingles(cells) {
  const g = Int8Array.from(cells);
  const cand = (i) => {
    let used = 0;
    for (const j of PEERS[i]) if (g[j]) used |= 1 << (g[j] - 1);
    return ~used & 0x1ff;
  };
  for (let progress = true; progress;) {
    progress = false;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const m = cand(i);
      if (popcount(m) === 1) { g[i] = Math.log2(m) + 1; progress = true; }
    }
    for (const unit of UNITS) {
      for (let d = 1; d <= 9; d++) {
        const bit = 1 << (d - 1);
        if (unit.some((i) => g[i] === d)) continue;
        const spots = unit.filter((i) => !g[i] && (cand(i) & bit));
        if (spots.length === 1) { g[spots[0]] = d; progress = true; }
      }
    }
  }
  return g.every(Boolean);
}

// ----- Puzzels maken -----
export const LEVELS = {
  makkelijk: { clues: 38, singles: true },
  gemiddeld: { clues: 31, singles: true },
  moeilijk: { clues: 26, singles: false },
};

export function generate(seed, level = 'makkelijk') {
  const spec = LEVELS[level] || LEVELS.makkelijk;
  const rng = makeRng(`${seed}|${level}`);

  const out = {};
  search(new Array(81).fill(0), 1, rng, out);
  const solution = out.solution;

  // Haal vakjes weg, steeds twee tegenover elkaar (puzzel ziet er daardoor netjes uit).
  const puzzle = Array.from(solution);
  let clues = 81;
  for (const i of shuffle(Array.from({ length: 81 }, (_, k) => k), rng)) {
    if (clues <= spec.clues) break;
    const j = 80 - i;
    if (!puzzle[i]) continue;
    const saved = [puzzle[i], puzzle[j]];
    puzzle[i] = 0; puzzle[j] = 0;
    const ok = countSolutions(puzzle) === 1 && (!spec.singles || solvableBySingles(puzzle));
    if (ok) clues -= i === j ? 1 : 2;
    else { puzzle[i] = saved[0]; puzzle[j] = saved[1]; }
  }
  return { puzzle, solution };
}

// ----- Hulpfuncties voor het spel -----

// Vakjes waarvan het cijfer botst met een ander cijfer in dezelfde rij, kolom of blokje.
export function findConflicts(values) {
  const bad = new Set();
  for (let i = 0; i < 81; i++) {
    if (!values[i]) continue;
    for (const j of PEERS[i]) if (values[j] === values[i]) { bad.add(i); bad.add(j); }
  }
  return bad;
}

// Cijfers die in dit vakje nog kunnen (op basis van wat er nu staat), als bitmasker.
export function candidateMask(values, i) {
  let used = 0;
  for (const j of PEERS[i]) if (values[j]) used |= 1 << (values[j] - 1);
  return ~used & 0x1ff;
}

export const bitCount = popcount;
