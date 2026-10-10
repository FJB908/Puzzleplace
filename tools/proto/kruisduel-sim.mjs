import { generate, cellsOf, makeRng } from '../../js/games/kruiswoord/engine.js';

const RACK = 7, BLOOM_P = 0.1, BINGO = 15;

function newGame(seed, level) {
  const pz = generate(seed, level);
  const rng = makeRng('g' + seed);
  const cells = new Map();                 // "r,c" -> { ch, words:[idx], bloom }
  pz.entries.forEach((e, i) => cellsOf(e).forEach(([r, c], k) => {
    const key = r + ',' + c;
    if (!cells.has(key)) cells.set(key, { key, ch: e.answer[k], words: [], bloom: rng() < BLOOM_P });
    cells.get(key).words.push(i);
  }));
  const words = pz.entries.map((e) => ({ len: e.answer.length, cells: cellsOf(e).map(([r, c]) => r + ',' + c) }));
  const bag = [...cells.values()].map((c) => c.ch);
  for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
  return { pz, cells, words, bag, filled: new Set(), racks: [[], []], scores: [0, 0], rng };
}
function refill(g, p) { while (g.racks[p].length < RACK && g.bag.length) g.racks[p].push(g.bag.pop()); }

function wordsDoneAfter(g, placed) {            // welke woorden raken vol door deze zet
  const done = [];
  const seen = new Set();
  for (const key of placed) for (const wi of g.cells.get(key).words) {
    if (seen.has(wi)) continue; seen.add(wi);
    if (g.words[wi].cells.every((k) => g.filled.has(k) || placed.includes(k))) done.push(wi);
  }
  return done;
}
function scoreMove(g, placed) {
  let s = placed.reduce((a, k) => a + (g.cells.get(k).bloom ? 2 : 1), 0);
  const done = wordsDoneAfter(g, placed);
  s += done.reduce((a, wi) => a + g.words[wi].len, 0);
  if (placed.length === RACK) s += BINGO;
  return { s, done };
}
function apply(g, p, placed, hint = false) {
  const { s, done } = hint ? { s: 1, done: [] } : scoreMove(g, placed);
  for (const key of placed) { g.filled.add(key); const i = g.racks[p].indexOf(g.cells.get(key).ch); g.racks[p].splice(i, 1); }
  g.scores[p] += s; refill(g, p); return { s, done };
}
function known(g, K) { const set = new Set(); K.forEach((wi) => g.words[wi].cells.forEach((k) => set.add(k))); return set; }

// mogelijke tegels: per letter in rek, de open vakjes (die de bot kent) met die letter
function options(g, p, kn) {
  const out = []; const used = new Set();
  const rack = [...g.racks[p]];
  for (const ch of rack) {
    const cand = [...kn].filter((k) => !g.filled.has(k) && g.cells.get(k).ch === ch && !used.has(k));
    if (cand.length) { out.push(cand); }
  }
  return out;
}
function subsets(g, p, kn) {
  // kies voor elke rek-tegel (die een plek weet) één plek; geef alle deelverzamelingen
  const rack = [...g.racks[p]]; const picks = [];
  const taken = new Set();
  for (const ch of rack) {
    const cand = [...kn].filter((k) => !g.filled.has(k) && g.cells.get(k).ch === ch && !taken.has(k));
    if (!cand.length) continue;
    // voorkeur: vakje dat een woord afmaakt, dan bloesem
    cand.sort((a, b) => g.cells.get(b).bloom - g.cells.get(a).bloom);
    picks.push(cand[0]); taken.add(cand[0]);
  }
  const res = [];
  const n = picks.length;
  for (let m = 1; m < (1 << n); m++) res.push(picks.filter((_, i) => m & (1 << i)));
  return res;
}
function unseenPool(g, p) { // letters die de tegenstander kan hebben: zak + rek van de ander
  return [...g.bag, ...g.racks[1 - p]];
}
function probOppFinishes(g, p, wi, pk) {
  const need = g.words[wi].cells.filter((k) => !g.filled.has(k)).map((k) => g.cells.get(k).ch);
  if (!need.length || need.length > RACK) return 0;
  const pool = unseenPool(g, p), U = pool.length; if (!U) return 0;
  const opp = g.racks[1 - p].length;
  let prob = 1; const cnt = {};
  need.forEach((c) => cnt[c] = (cnt[c] || 0) + 1);
  for (const [c, n] of Object.entries(cnt)) {
    const have = pool.filter((x) => x === c).length;
    if (have < n) return 0;
    prob *= Math.min(1, (have / U) * opp * (n === 1 ? 1 : 0.6 ** (n - 1)) );
  }
  return prob * pk;
}

function chooseMove(g, p, bot, other) {
  const kn = known(g, bot.K);
  const subs = subsets(g, p, kn);
  if (!subs.length) return null;
  let best = null, bestV = -Infinity;
  for (const sub of subs) {
    const { s, done } = scoreMove(g, sub);
    let v = s;
    if (bot.policy === 'smart') {
      // na de zet: wat laat ik liggen voor de ander?
      for (const k of sub) g.filled.add(k);
      let risk = 0;
      const touched = new Set(); for (const k of [...g.cells.keys()]) { /* alle woorden */ }
      g.words.forEach((w, wi) => {
        const rem = w.cells.filter((k) => !g.filled.has(k)).length;
        if (rem > 0 && rem <= 3) risk += probOppFinishes(g, p, wi, other.pk) * w.len;
      });
      for (const k of sub) g.filled.delete(k);
      v = s - 1.2 * risk;
    }
    if (v > bestV) { bestV = v; best = sub; }
  }
  // slim: liever niets doen dan een woord cadeau geven? nee: altijd spelen, wel de beste deelverzameling
  return best;
}
function hintMove(g, p) {
  const rack = g.racks[p]; if (!rack.length) return null;
  const ch = rack[Math.floor(g.rng() * rack.length)];
  const cand = [...g.cells.values()].filter((c) => !g.filled.has(c.key) && c.ch === ch);
  return cand.length ? [cand[Math.floor(g.rng() * cand.length)].key] : null;
}

export function play(seed, level, bots, first = 0) {
  const g = newGame(seed, level);
  bots.forEach((b, i) => { b.K = new Set(); g.words.forEach((_, wi) => { if (g.rng() < b.p) b.K.add(wi); }); b.pk = b.p; });
  refill(g, 0); refill(g, 1);
  let p = first, turns = 0, log = { bingo: 0, bonusPts: 0, tilePts: 0, lead: [] };
  const total = g.cells.size;
  while (g.filled.size < total && turns < 400) {
    const move = chooseMove(g, p, bots[p], bots[1 - p]);
    if (move) {
      const r = apply(g, p, move);
      log.bonusPts += r.done.reduce((a, wi) => a + g.words[wi].len, 0) + (move.length === RACK ? BINGO : 0);
      if (move.length === RACK) log.bingo++;
    } else {
      const h = hintMove(g, p); if (h) apply(g, p, h, true);
    }
    log.lead.push(g.scores[0] - g.scores[1]);
    p = 1 - p; turns++;
  }
  return { scores: g.scores, turns, cells: total, ...log, g };
}
