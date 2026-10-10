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

import { woordenboek } from './woordenboek.js';
import { TALEN } from '../../shared/talen.js';
import { zoek, invullen } from '../../shared/opmaak.js';
import EN from '../../i18n/talen/en.js';
import { SCHAAL } from './schaal.js';

export const SIZE = 6;
export const MIN_LEN = 3;
export const MAX_LEN = 7;

// Een zet die niet mag. `code` zegt wat er mis is, `key` (+ `params`) verwijst naar de tekst in het taalpakket (err.<key>), zodat de app hem in
// de taal van de speler laat zien; `message` is dezelfde tekst in het Engels. Nooit een verwijt.
export class MoveError extends Error {
  constructor(code, key, params = {}) { super(invullen(zoek(EN, `err.${key}`, params, 'en') ?? key, params)); this.code = code; this.key = key; this.params = params; }
}

// In welke taal wordt deze partij gespeeld? Partijen van voor de meertaligheid zijn Nederlands.
export const taalVan = (state) => state.lang || 'nl';

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
// (de woorden staan per taal in woordenboek.js)

export const isWord = (w, taal = 'nl') => woordenboek(taal).set.has(w);
const root = (taal) => woordenboek(taal).trie;

// ---------- Bord ----------

// De letters van het bord komen uit de zak van de taal: zo vaak als ze voorkomen in de alledaagse woorden, zonder zeldzame letters (q, x, ...).

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

// Alle woorden die op een bord te maken zijn, met de vakjes die ze gebruiken. alledaags: alleen gewone, alledaagse woorden.
function scan(letters, size, alledaags = false, taal = 'nl') {
  const found = [], used = new Array(letters.length).fill(false), path = [];
  const seen = new Set();
  function dfs(i, node) {
    const next = node.kids.get(letters[i]); if (!next) return;
    used[i] = true; path.push(i);
    if (next.end && (!alledaags || next.com) && path.length >= MIN_LEN) {
      const word = path.map((k) => letters[k]).join('');
      const key = word + ':' + [...path].sort((a, b) => a - b).join(',');
      if (!seen.has(key)) { seen.add(key); found.push({ word, path: [...path] }); }
    }
    if (path.length < MAX_LEN) for (const j of nb(i, size)) if (!used[j]) dfs(j, next);
    used[i] = false; path.pop();
  }
  for (let i = 0; i < letters.length; i++) dfs(i, root(taal));
  return found;
}

// Is het een goed bord? Genoeg woorden, bijna elk vakje komt in een woord voor en er zijn een paar mooie lange woorden.
function boardQuality(letters, size, taal) {
  const words = scan(letters, size, true, taal);          // een goed bord heeft genoeg ALLEDAAGSE woorden: die zoekt iedereen
  const covered = new Set(); for (const m of words) for (const i of m.path) covered.add(i);
  const long = new Set(words.filter((m) => m.word.length >= 6).map((m) => m.word)).size;
  return { count: words.length, coverage: covered.size / letters.length, long };
}
const GOED = (size) => ({ count: Math.round(size * size * 3), coverage: 0.92, long: 3 });
// Een bord moet er ook natuurlijk uitzien: een gewoon aandeel klinkers (zoals de taal dat heeft) en niet te veel van dezelfde letter
function zietErGoedUit(letters, taal, zak) {
  const n = letters.length, klinkers = TALEN[taal].klinkers;
  const aandeel = zak.filter((c) => klinkers.includes(c)).length / zak.length;
  const aantal = [...letters].filter((c) => klinkers.includes(c)).length;
  if (aantal < n * Math.max(0.2, aandeel - 0.1) || aantal > n * Math.min(0.65, aandeel + 0.1)) return false;
  const per = {}; for (const c of letters) per[c] = (per[c] || 0) + 1;
  return Math.max(...Object.values(per)) <= Math.ceil(n * 0.2);
}

export function makeBoard(seed, size = SIZE, taal = 'nl') {
  const rng = makeRng(`bord|${seed}|${size}`);
  const need = GOED(size);
  const ZAK = woordenboek(taal).zak;
  let best = null, bestScore = -1;
  for (let attempt = 0; attempt < 400; attempt++) {
    let letters = '';
    for (let i = 0; i < size * size; i++) letters += ZAK[Math.floor(rng() * ZAK.length)];
    if (!zietErGoedUit(letters, taal, ZAK)) continue;
    const q = boardQuality(letters, size, taal);
    if (q.count >= need.count && q.coverage >= need.coverage && q.long >= need.long) return letters;
    const score = Math.min(q.count / need.count, 1) + q.coverage + Math.min(q.long / need.long, 1);
    if (score > bestScore) { bestScore = score; best = letters; }
  }
  return best;      // nooit bereikt met de gewone lijst, maar liever een speelbaar bord dan een fout
}

// ---------- Spel ----------

export function newGame(seed, { size = SIZE, first = 1, lang = 'nl' } = {}) {
  const letters = makeBoard(seed, size, lang);
  return { lang, size, letters, owner: new Array(size * size).fill(0), played: [], turn: first, over: false, passed: false, last: null };
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

// Controleert een zet en vertelt wat er zou gebeuren. Gooit een MoveError met een gewone zin als het niet mag.
export function checkMove(state, player, path) {
  const { size, letters, owner } = state;
  if (state.over) throw new MoveError('klaar', 'move.over');
  if (state.turn !== player) throw new MoveError('beurt', 'notYourTurn');
  if (!Array.isArray(path) || path.some((i) => !Number.isInteger(i) || i < 0 || i >= size * size)) throw new MoveError('pad', 'move.path');
  if (path.length < MIN_LEN) throw new MoveError('lengte', 'move.minLength', { n: MIN_LEN });
  if (path.length > MAX_LEN) throw new MoveError('lengte', 'move.maxLength', { n: MAX_LEN });
  if (new Set(path).size !== path.length) throw new MoveError('pad', 'move.reuse');
  for (let k = 1; k < path.length; k++) if (!nb(path[k - 1], size).includes(path[k])) throw new MoveError('pad', 'move.adjacent');
  const word = path.map((i) => letters[i]).join('');
  if (!isWord(word, taalVan(state))) throw new MoveError('onbekend', 'move.unknown');
  if (state.played.includes(word)) throw new MoveError('gespeeld', 'move.played', { word });
  const fresh = path.filter((i) => owner[i] === 0);
  if (!fresh.length) throw new MoveError('open', 'move.noFresh');
  const took = path.filter((i) => owner[i] === other(player) && !isProtected(owner, i, size));
  const kept = path.filter((i) => owner[i] === other(player) && isProtected(owner, i, size));
  return { word, fresh, took, kept };
}

export const hasMove = (state, player) => legalMoves(state, player, true).length > 0;

// Alle toegestane zetten van een speler (met 'first' stopt het bij de eerste: handig om te weten of er nog iets kan;
// met 'alledaags' alleen gewone, niet-grove woorden: die kiest de computer en die gebruiken de tips).
export function legalMoves(state, player, first = false, alledaags = false) {
  const { size, letters, owner } = state;
  const taal = taalVan(state);
  const out = [];
  const played = new Set(state.played);
  let stop = false;
  const used = new Array(letters.length).fill(false), path = [];
  const seen = new Set();
  function dfs(i, node) {
    if (stop) return;
    const next = node.kids.get(letters[i]); if (!next) return;
    used[i] = true; path.push(i);
    if (next.end && (!alledaags || next.com) && path.length >= MIN_LEN) {
      const word = path.map((k) => letters[k]).join('');
      if (!played.has(word) && path.some((k) => owner[k] === 0)) {
        const key = word + ':' + [...path].sort((a, b) => a - b).join(',');
        if (!seen.has(key)) { seen.add(key); out.push({ word, path: [...path] }); if (first) stop = true; }
      }
    }
    if (!stop && path.length < MAX_LEN) for (const j of nb(i, size)) if (!used[j]) dfs(j, next);
    used[i] = false; path.pop();
  }
  for (let i = 0; i < letters.length && !stop; i++) dfs(i, root(taal));
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

// De computer. De sterkte zit in hoeveel woorden hij ziet, hoe vaak hij gewoon een woord pakt in plaats van het beste
// ("slordig") en of hij vooruitkijkt (zo gemeten, zie docs/NIEUW-SPEL-VOOR-TWEE.md).
export const NIVEAUS = {
  makkelijk: { ziet: 0.02, slordig: 0.75, vooruit: 0 },
  gemiddeld: { ziet: 0.05, slordig: 0.45, vooruit: 0 },
  moeilijk: { ziet: 0.2, slordig: 0.1, vooruit: 0 },
  extreem: { ziet: 1, slordig: 0, vooruit: 10 },
};

export function botMove(state, player, niveau = 'gemiddeld', rng = Math.random) {
  const cfg = NIVEAUS[niveau] || NIVEAUS.gemiddeld;
  const all = legalMoves(state, player, false, true);        // de computer speelt alleen alledaagse woorden
  if (!all.length) return null;
  // Hoeveel woorden de computer ziet hangt af van het aantal woorden dat de taal heeft (SCHAAL): zo is Makkelijk in elke taal even makkelijk
  const ziet = cfg.ziet < 1 ? Math.min(1, cfg.ziet * (SCHAAL[taalVan(state)] ?? 1)) : 1;
  let pool = ziet < 1 ? all.filter(() => rng() < ziet) : all;
  if (!pool.length) pool = [all[Math.floor(rng() * all.length)]];
  if (cfg.slordig && rng() < cfg.slordig) return pool[Math.floor(rng() * pool.length)];
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
  const all = legalMoves(state, player, false, true);
  if (!all.length) return null;
  // Liefst een woord dat echt iets oplevert, maar niet het allerbeste: het blijft aan de speler
  const rated = all.map((m) => { const s = applyMove({ ...state, turn: player }, player, m.path); return { m, v: verschil(s, player) }; }).sort((a, b) => b.v - a.v);
  const pick = rated[Math.min(Math.floor(rated.length * 0.15), rated.length - 1) + Math.floor(rng() * Math.min(3, rated.length))] || rated[0];
  return { start: pick.m.path[0], length: pick.m.path.length };
}

// De computer heeft geen alledaags woord meer maar het spel is nog niet afgelopen (alleen hij zit vast): hij slaat over.
export function geefDoor(state, player) {
  const next = { ...state, passed: true, last: state.last };
  const them = other(player);
  if (hasMove(next, them)) next.turn = them; else { next.over = true; next.turn = null; }
  return next;
}
