// Woordtuin: de spelregels, zonder scherm. Dezelfde code draait in de app (tegen de computer) en op de server
// (tegen een vriend), dus er is maar één waarheid over wat mag.
//
// Het spel in het kort: een bord van 6 bij 6 letters. Om beurten maak je een woord van 3 tot 7 letters over
// aangrenzende vakjes (ook schuin). De vakjes van je woord worden van jou, behalve vakjes die "beschermd" zijn:
// vakjes waarvan alle buren (links, rechts, boven, onder) dezelfde kleur hebben. Elk woord moet minstens één open
// vakje kleuren, en elk woord kan maar één keer gespeeld worden. Zijn alle vakjes gekleurd, dan wint wie de meeste heeft.
//
// Toestand (JSON, dus zo op te slaan):
//   { size, letters, owner[], played[], turn, over, passed, last }
//   letters  string van size*size kleine letters, rij na rij
//   owner    per vakje 0 (open), 1 of 2 (speler 1 of 2)
//   last     { player, word, path, took, fresh } de laatste zet, om te laten zien wat er gebeurde

import { WOORDEN, AFGELEID } from './woorden.js';

export const SIZE = 6;
export const MIN_LEN = 3;
export const MAX_LEN = 7;

// Foutmeldingen komen letterlijk bij de speler terecht: gewoon Nederlands, nooit een verwijt.
export class MoveError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

// ---------- Willekeur (zelfde zaad = zelfde bord) ----------

export function makeRng(seed) {
  let h = 1779033703 ^ String(seed).length;
  for (let i = 0; i < String(seed).length; i++) { h = Math.imul(h ^ String(seed).charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = (h ^= h >>> 16) >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Woordenlijst ----------

let trie = null;
function buildTrie() {
  trie = { kids: new Map(), end: false };
  for (const w of WOORDEN) {
    let node = trie;
    for (const ch of w) { let next = node.kids.get(ch); if (!next) node.kids.set(ch, (next = { kids: new Map(), end: false })); node = next; }
    node.end = true;
  }
}
const root = () => { if (!trie) buildTrie(); return trie; };
const WOORDSET = new Set(WOORDEN);
export const isWord = (w) => WOORDSET.has(w);

// ---------- Bord ----------

// Letterverdeling: veel klinkers en gewone medeklinkers, geen q, x of y, zodat er genoeg woorden in zitten.
const VERDELING = { a: 7, b: 2, c: 1, d: 5, e: 17, f: 1, g: 3, h: 3, i: 4, j: 1, k: 3, l: 4, m: 3, n: 9, o: 6, p: 2, r: 5, s: 4, t: 5, u: 2, v: 2, w: 2, z: 2 };
const ZAK = Object.entries(VERDELING).flatMap(([c, n]) => Array(n).fill(c));

export function neighbors(i, size = SIZE) {
  const r = Math.floor(i / size), c = i % size, out = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const a = r + dr, b = c + dc;
    if (a >= 0 && b >= 0 && a < size && b < size) out.push(a * size + b);
  }
  return out;
}
const NEIGH = new Map();
const nb = (i, size) => { const k = size * 100 + i; let v = NEIGH.get(k); if (!v) NEIGH.set(k, (v = neighbors(i, size))); return v; };

// Alle woorden die op een bord te maken zijn, met de vakjes die ze gebruiken. onlyOpen: alleen woorden met een open vakje.
function scan(letters, size, accept) {
  const found = [], used = new Array(letters.length).fill(false), path = [];
  const seen = new Set();
  function dfs(i, node) {
    const next = node.kids.get(letters[i]); if (!next) return;
    used[i] = true; path.push(i);
    if (next.end && path.length >= MIN_LEN) {
      const word = path.map((k) => letters[k]).join('');
      const key = word + ':' + [...path].sort((a, b) => a - b).join(',');
      if (!seen.has(key) && (!accept || accept(word, path))) { seen.add(key); found.push({ word, path: [...path] }); }
    }
    if (path.length < MAX_LEN) for (const j of nb(i, size)) if (!used[j]) dfs(j, next);
    used[i] = false; path.pop();
  }
  for (let i = 0; i < letters.length; i++) dfs(i, root());
  return found;
}

// Is het een goed bord? Genoeg woorden, bijna elk vakje komt in een woord voor en er zijn een paar mooie lange woorden.
function boardQuality(letters, size) {
  const words = scan(letters, size);
  const covered = new Set(); for (const m of words) for (const i of m.path) covered.add(i);
  const long = new Set(words.filter((m) => m.word.length >= 6).map((m) => m.word)).size;
  return { count: words.length, coverage: covered.size / letters.length, long };
}
const GOED = (size) => ({ count: Math.round(size * size * 3), coverage: 0.92, long: 3 });
// Een bord moet er ook natuurlijk uitzien: genoeg klinkers en niet te veel van dezelfde letter
function ziet_er_goed_uit(letters) {
  const n = letters.length, klinkers = [...letters].filter((c) => 'aeiou'.includes(c)).length;
  if (klinkers < n * 0.3 || klinkers > n * 0.5) return false;
  const per = {}; for (const c of letters) per[c] = (per[c] || 0) + 1;
  return Math.max(...Object.values(per)) <= Math.ceil(n * 0.2);
}

export function makeBoard(seed, size = SIZE) {
  const rng = makeRng(`bord|${seed}|${size}`);
  const need = GOED(size);
  let best = null, bestScore = -1;
  for (let attempt = 0; attempt < 400; attempt++) {
    let letters = '';
    for (let i = 0; i < size * size; i++) letters += ZAK[Math.floor(rng() * ZAK.length)];
    if (!ziet_er_goed_uit(letters)) continue;
    const q = boardQuality(letters, size);
    if (q.count >= need.count && q.coverage >= need.coverage && q.long >= need.long) return letters;
    const score = Math.min(q.count / need.count, 1) + q.coverage + Math.min(q.long / need.long, 1);
    if (score > bestScore) { bestScore = score; best = letters; }
  }
  return best;      // nooit bereikt met de gewone lijst, maar liever een speelbaar bord dan een fout
}

// ---------- Spel ----------

export function newGame(seed, { size = SIZE, first = 1 } = {}) {
  const letters = makeBoard(seed, size);
  return { size, letters, owner: new Array(size * size).fill(0), played: [], turn: first, over: false, passed: false, last: null };
}

export const other = (p) => 3 - p;

// Een vakje is beschermd als het gekleurd is en al zijn buren boven, onder, links en rechts dezelfde kleur hebben.
export function isProtected(owner, i, size = SIZE) {
  const o = owner[i]; if (!o) return false;
  const r = Math.floor(i / size), c = i % size;
  if (r > 0 && owner[i - size] !== o) return false;
  if (r < size - 1 && owner[i + size] !== o) return false;
  if (c > 0 && owner[i - 1] !== o) return false;
  if (c < size - 1 && owner[i + 1] !== o) return false;
  return true;
}
export const protectedSet = (state) => new Set(state.owner.map((_, i) => i).filter((i) => isProtected(state.owner, i, state.size)));

export function counts(state) {
  const n = { 0: 0, 1: 0, 2: 0 };
  for (const o of state.owner) n[o]++;
  return n;
}

const GEEN_MEERVOUD = 'In Woordtuin telt alleen de gewone vorm van een woord, dus geen meervoud, verleden tijd of verkleinwoord.';
export function explainUnknown(word) {
  const stam = AFGELEID[word];
  if (stam) return `"${word}" is een andere vorm van "${stam}". In Woordtuin telt alleen de gewone vorm: probeer "${stam}".`;
  if (/(en|s|te|de|t|je)$/.test(word)) return `Dit woord kennen we niet. ${GEEN_MEERVOUD}`;
  return 'Dit woord kennen we niet. Probeer een ander woord.';
}

// Controleert een zet en vertelt wat er zou gebeuren. Gooit een MoveError met een gewone zin als het niet mag.
export function checkMove(state, player, path) {
  const { size, letters, owner } = state;
  if (state.over) throw new MoveError('klaar', 'Deze partij is afgelopen.');
  if (state.turn !== player) throw new MoveError('beurt', 'Je bent nog niet aan de beurt.');
  if (!Array.isArray(path) || path.some((i) => !Number.isInteger(i) || i < 0 || i >= size * size)) throw new MoveError('pad', 'Dit pad klopt niet.');
  if (path.length < MIN_LEN) throw new MoveError('lengte', `Een woord heeft minstens ${MIN_LEN} letters.`);
  if (path.length > MAX_LEN) throw new MoveError('lengte', `Een woord heeft hoogstens ${MAX_LEN} letters.`);
  if (new Set(path).size !== path.length) throw new MoveError('pad', 'Je kunt een letter maar één keer gebruiken.');
  for (let k = 1; k < path.length; k++) if (!nb(path[k - 1], size).includes(path[k])) throw new MoveError('pad', 'De letters van een woord moeten aan elkaar grenzen.');
  const word = path.map((i) => letters[i]).join('');
  if (!isWord(word)) throw new MoveError('onbekend', explainUnknown(word));
  if (state.played.includes(word)) throw new MoveError('gespeeld', `"${word}" is in deze partij al gespeeld. Kies een ander woord.`);
  const fresh = path.filter((i) => owner[i] === 0);
  if (!fresh.length) throw new MoveError('open', 'Elk woord moet minstens één open vakje kleuren. Zoek een woord met een wit vakje.');
  const took = path.filter((i) => owner[i] === other(player) && !isProtected(owner, i, size));
  const kept = path.filter((i) => owner[i] === other(player) && isProtected(owner, i, size));
  return { word, fresh, took, kept };
}

export const hasMove = (state, player) => legalMoves(state, player, true).length > 0;

// Alle toegestane zetten van een speler (met 'first' stopt het bij de eerste: handig om te weten of er nog iets kan).
export function legalMoves(state, player, first = false) {
  const { size, letters, owner } = state;
  const out = [];
  const played = new Set(state.played);
  let stop = false;
  const used = new Array(letters.length).fill(false), path = [];
  const seen = new Set();
  function dfs(i, node) {
    if (stop) return;
    const next = node.kids.get(letters[i]); if (!next) return;
    used[i] = true; path.push(i);
    if (next.end && path.length >= MIN_LEN) {
      const word = path.map((k) => letters[k]).join('');
      if (!played.has(word) && path.some((k) => owner[k] === 0)) {
        const key = word + ':' + [...path].sort((a, b) => a - b).join(',');
        if (!seen.has(key)) { seen.add(key); out.push({ word, path: [...path] }); if (first) stop = true; }
      }
    }
    if (!stop && path.length < MAX_LEN) for (const j of nb(i, size)) if (!used[j]) dfs(j, next);
    used[i] = false; path.pop();
  }
  for (let i = 0; i < letters.length && !stop; i++) dfs(i, root());
  return out;
}

// Voer een zet uit; geeft een nieuwe toestand terug (de oude blijft ongemoeid).
export function applyMove(state, player, path) {
  const { word, fresh, took } = checkMove(state, player, path);
  const owner = state.owner.slice();
  for (const i of [...fresh, ...took]) owner[i] = player;
  const next = {
    ...state, owner, played: [...state.played, word], passed: false,
    last: { player, word, path: [...path], took, fresh },
  };
  settle(next, player);
  return next;
}

// Wie is er nu aan de beurt? Is het afgelopen? (Kan de ander niets meer, dan slaat die over.)
function settle(state, player) {
  const open = state.owner.includes(0);
  if (!open) { state.over = true; state.turn = null; return; }
  const them = other(player);
  if (hasMove(state, them)) { state.turn = them; return; }
  if (hasMove(state, player)) { state.turn = player; state.passed = true; return; }
  state.over = true; state.turn = null;
}

// Uitslag: de meeste vakjes; bij gelijk de meeste beschermde vakjes; daarna gelijkspel (winner 0).
export function result(state) {
  const n = counts(state);
  let winner = n[1] > n[2] ? 1 : n[2] > n[1] ? 2 : 0;
  let tiebreak = false;
  if (!winner) {
    const prot = { 1: 0, 2: 0 };
    state.owner.forEach((o, i) => { if (o && isProtected(state.owner, i, state.size)) prot[o]++; });
    if (prot[1] !== prot[2]) { winner = prot[1] > prot[2] ? 1 : 2; tiebreak = true; }
  }
  return { winner, scores: { 1: n[1], 2: n[2] }, open: n[0], tiebreak };
}

// ---------- Zoeken: voor typen, tips en de computer ----------

// Alle plekken op het bord waar een getypt woord te leggen is (en mag), de beste eerst.
export function pathsFor(state, player, word) {
  const { size, letters } = state;
  const out = [];
  const used = new Array(letters.length).fill(false), path = [];
  function dfs(i, k) {
    if (letters[i] !== word[k]) return;
    used[i] = true; path.push(i);
    if (k === word.length - 1) out.push([...path]);
    else for (const j of nb(i, size)) if (!used[j]) dfs(j, k + 1);
    used[i] = false; path.pop();
  }
  if (word.length >= MIN_LEN && word.length <= MAX_LEN) for (let i = 0; i < letters.length; i++) dfs(i, 0);
  const score = (p) => { try { const c = checkMove({ ...state, turn: player }, player, p); return c.fresh.length + c.took.length * 2; } catch { return -1; } };
  return out.map((p) => [score(p), p]).filter(([s]) => s >= 0).sort((a, b) => b[0] - a[0]).map(([, p]) => p);
}

const verschil = (state, p) => { const n = counts(state); return n[p] - n[other(p)]; };

// De computer. De sterkte zit in hoeveel woorden hij ziet en of hij vooruitkijkt (zo gemeten in tools/proto/).
export const NIVEAUS = {
  makkelijk: { ziet: 0.12, vooruit: 0 },
  gemiddeld: { ziet: 0.3, vooruit: 0 },
  moeilijk: { ziet: 0.6, vooruit: 6 },
  extreem: { ziet: 1, vooruit: 10 },
};

export function botMove(state, player, niveau = 'gemiddeld', rng = Math.random) {
  const cfg = NIVEAUS[niveau] || NIVEAUS.gemiddeld;
  const all = legalMoves(state, player);
  if (!all.length) return null;
  let pool = cfg.ziet < 1 ? all.filter(() => rng() < cfg.ziet) : all;
  if (!pool.length) pool = [all[Math.floor(rng() * all.length)]];
  const after = (m) => applyMove({ ...state, turn: player }, player, m.path);
  const scored = pool.map((m) => ({ m, s: after(m) })).map((x) => ({ ...x, v: verschil(x.s, player) }));
  scored.sort((a, b) => b.v - a.v);
  if (!cfg.vooruit) return scored[0].m;
  let best = scored[0], bestV = -Infinity;
  for (const x of scored.slice(0, cfg.vooruit)) {
    let v = x.v;
    if (!x.s.over && x.s.turn === other(player)) {
      let worst = 0;
      for (const r of legalMoves(x.s, other(player))) { const t = applyMove(x.s, other(player), r.path); worst = Math.max(worst, verschil(t, other(player))); }
      v = -worst;
    }
    if (v > bestV) { bestV = v; best = x; }
  }
  return best.m;
}

// Een tip: een woord dat kan, met het beginvakje en het aantal letters ("zoek een woord van 5 letters vanaf hier").
export function tip(state, player, rng = Math.random) {
  const all = legalMoves(state, player);
  if (!all.length) return null;
  // Liefst een woord dat echt iets oplevert, maar niet het allerbeste: het blijft aan de speler
  const rated = all.map((m) => { const s = applyMove({ ...state, turn: player }, player, m.path); return { m, v: verschil(s, player) }; }).sort((a, b) => b.v - a.v);
  const pick = rated[Math.min(Math.floor(rated.length * 0.15), rated.length - 1) + Math.floor(rng() * Math.min(3, rated.length))] || rated[0];
  return { start: pick.m.path[0], length: pick.m.path.length };
}
