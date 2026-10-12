// Mahjong (tegels paren): alle regels, zonder scherm. Het spel is altijd te winnen: een bord wordt "achterstevoren" gemaakt
// (steeds twee vrije plekken vullen met een passend paar), dus er bestaat altijd een volgorde waarin alle tegels weg kunnen.
// Ook na Husselen is dat zo: de tegels die nog liggen worden opnieuw op dezelfde manier verdeeld.
//
// Een tegel: { x, y, z } in halve tegelmaten (een tegel is 2 bij 2). Vrij is een tegel als er niets bovenop ligt en links of rechts
// geen tegel direct naast hem ligt. Twee vrije tegels passen als ze hetzelfde plaatje hebben, of allebei een bloem of allebei een seizoen zijn.

import { plekken } from './layouts.js';

// De plaatjes: 0-8 stippen 1-9, 9-17 bamboe 1-9, 18-26 getallen 1-9, 27-30 winden (N, O, Z, W), 31-33 draken (rood, groen, wit),
// 34-37 bloemen, 38-41 seizoenen
export const AANTAL_PLAATJES = 42;
export const BLOEMEN = [34, 35, 36, 37], SEIZOENEN = [38, 39, 40, 41];
export const isBloem = (f) => f >= 34 && f <= 37;
export const isSeizoen = (f) => f >= 38 && f <= 41;
const groepVan = (f) => (isBloem(f) ? 'bloem' : isSeizoen(f) ? 'seizoen' : f);
export const passen = (f, g) => groepVan(f) === groepVan(g);

// ----- Toeval met een vaste seed (zelfde seed = zelfde bord) -----
export function makeRng(seed) {
  let h = 1779033703 ^ String(seed).length;
  for (let i = 0; i < String(seed).length; i++) { h = Math.imul(h ^ String(seed).charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const schud = (lijst, rng) => { const a = [...lijst]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ----- Het bord: wie ligt waar op wie -----
const cache = new Map();
export function bord(niveau) {
  if (cache.has(niveau)) return cache.get(niveau);
  const t = plekken(niveau);
  const overlap = (a, b) => Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2;
  const boven = t.map((a) => t.flatMap((b, j) => (b.z === a.z + 1 && overlap(a, b) ? [j] : [])));
  const links = t.map((a) => t.flatMap((b, j) => (b.z === a.z && b.x === a.x - 2 && Math.abs(b.y - a.y) < 2 ? [j] : [])));
  const rechts = t.map((a) => t.flatMap((b, j) => (b.z === a.z && b.x === a.x + 2 && Math.abs(b.y - a.y) < 2 ? [j] : [])));
  const onder = t.map((a, i) => t.flatMap((b, j) => (boven[j].includes(i) ? [j] : [])));
  const r = { tegels: t, boven, onder, links, rechts, n: t.length, breed: Math.max(...t.map((a) => a.x)) + 2, hoog: Math.max(...t.map((a) => a.y)) + 2, lagen: Math.max(...t.map((a) => a.z)) + 1 };
  cache.set(niveau, r);
  return r;
}

// Is tegel i vrij, als de tegels in `weg` (een Set of een lijst met true/false per tegel) al weg zijn?
const vrijBij = (b, i, isWeg) => b.boven[i].every(isWeg) && (b.links[i].every(isWeg) || b.rechts[i].every(isWeg));

// ----- Een bord vullen: achterstevoren, dus altijd op te lossen -----
// plaatjes: de tegels die er liggen (een rij getallen); plekIndexen: de plekken die gevuld worden; de andere plekken tellen als leeg.
// Geeft { faces (per plek), volgorde: [[a, b], ...] (een volgorde waarin alles weg kan) } of null als het deze keer niet lukte.
function maakParen(plaatjes, rng) {
  const perGroep = new Map();
  for (const f of plaatjes) { const g = groepVan(f); if (!perGroep.has(g)) perGroep.set(g, []); perGroep.get(g).push(f); }
  const paren = [];
  for (const lijst of perGroep.values()) {
    if (lijst.length % 2) return null;
    const m = schud(lijst, rng);
    // gelijke plaatjes bij elkaar zetten kan niet nodig zijn: passen = zelfde groep, dus elke twee uit de groep vormen een paar
    for (let i = 0; i < m.length; i += 2) paren.push([m[i], m[i + 1]]);
  }
  return schud(paren, rng);
}

function vul(b, plekIndexen, plaatjes, rng) {
  const paren = maakParen(plaatjes, rng);
  if (!paren || paren.length * 2 !== plekIndexen.length) return null;
  const over = new Set(plekIndexen);
  const isWeg = (j) => !over.has(j);
  const faces = new Array(b.n).fill(-1), volgorde = [];
  for (const [f, g] of paren) {
    const vrij = [...over].filter((i) => vrijBij(b, i, isWeg));
    if (vrij.length < 2) return null;
    const kies = schud(vrij, rng);
    const [p, q] = rng() < 0.5 ? [kies[0], kies[1]] : [kies[1], kies[0]];
    faces[p] = f; faces[q] = g; over.delete(p); over.delete(q); volgorde.push([p, q]);
  }
  return { faces, volgorde };
}

// De tegels van een bord met n plekken: groepen van 4 gelijke plaatjes (de soorten wisselen per bord), en bij een rest bloemen en seizoenen
const SOORTEN = [[0, 9], [9, 18], [18, 27], [27, 31], [31, 34]];
export function tegelSet(n, rng) {
  const k = Math.min(34, Math.floor(n / 4)), rest = n - 4 * k;
  if (rest % 2 || rest > 8) throw new Error(`Een bord met ${n} tegels kan niet`);
  // soorten om beurten uit elke familie (stippen, bamboe, getallen, winden, draken): zo staan er altijd verschillende soorten op een klein bord
  const families = SOORTEN.map(([a, b]) => schud(Array.from({ length: b - a }, (_, i) => a + i), rng));
  const types = [];
  for (let i = 0; types.length < k; i = (i + 1) % families.length) if (families[i].length) types.push(families[i].shift());
  const set = types.flatMap((tp) => [tp, tp, tp, tp]);
  const bl = schud(BLOEMEN, rng), se = schud(SEIZOENEN, rng);
  for (let i = 0; i < rest; i++) set.push(i % 4 < 2 ? bl.shift() : se.shift());       // eerst een paar bloemen, dan een paar seizoenen
  return set;
}

// De volgorde waarin het bord gemaakt is (een bewezen oplossing); alleen voor tests
export function bouwVolgorde(seed, niveau = 'makkelijk') {
  const b = bord(niveau), alle = Array.from({ length: b.n }, (_, i) => i);
  for (let poging = 0; poging < 60; poging++) {
    const rng = makeRng(`${seed}|${niveau}|${poging}`);
    const r = vul(b, alle, tegelSet(b.n, rng), rng);
    if (r) return r;
  }
  return null;
}

export function newGame(seed, niveau = 'makkelijk') {
  const b = bord(niveau);
  const alle = Array.from({ length: b.n }, (_, i) => i);
  for (let poging = 0; poging < 60; poging++) {
    const rng = makeRng(`${seed}|${niveau}|${poging}`);
    const r = vul(b, alle, tegelSet(b.n, rng), rng);
    if (r) return { v: 1, niveau, seed: String(seed), faces: r.faces, plan: r.volgorde, history: [], shuffles: 0 };
  }
  throw new Error('Geen bord gelukt');          // gebeurt in de praktijk niet; de tests proberen veel seeds
}

// ----- De stand van het spel -----
export const wegSet = (state) => { const s = new Set(); for (const h of state.history) if (h.t === 'p') { s.add(h.a); s.add(h.b); } return s; };
export const tegelsOver = (state) => bord(state.niveau).n - wegSet(state).size;
export const klaar = (state) => tegelsOver(state) === 0;
export const progress = (state) => { const n = bord(state.niveau).n; return (n - tegelsOver(state)) / n; };

export function isVrij(state, i, weg = wegSet(state)) {
  return !weg.has(i) && vrijBij(bord(state.niveau), i, (j) => weg.has(j));
}
export const vrijeTegels = (state, weg = wegSet(state)) => bord(state.niveau).tegels.map((_, i) => i).filter((i) => isVrij(state, i, weg));

// Alle zetten (paren van vrije tegels die passen)
export function zetten(state) {
  const weg = wegSet(state), vrij = vrijeTegels(state, weg), uit = [];
  for (let i = 0; i < vrij.length; i++) for (let j = i + 1; j < vrij.length; j++) if (passen(state.faces[vrij[i]], state.faces[vrij[j]])) uit.push([vrij[i], vrij[j]]);
  return uit;
}
export const vastgelopen = (state) => !klaar(state) && zetten(state).length === 0;

export class ZetFout extends Error { constructor(code) { super(code); this.code = code; } }

// Een paar wegnemen; geeft een nieuwe stand (de oude blijft ongemoeid)
export function neemWeg(state, a, b) {
  if (a === b) throw new ZetFout('zelfde');
  const weg = wegSet(state);
  if (!isVrij(state, a, weg) || !isVrij(state, b, weg)) throw new ZetFout('vast');
  if (!passen(state.faces[a], state.faces[b])) throw new ZetFout('past-niet');
  return { ...state, history: [...state.history, { t: 'p', a, b, fa: state.faces[a], fb: state.faces[b] }] };
}

// Zet terug (een paar terugleggen, of een husselbeurt ongedaan maken); onbeperkt
export function zetTerug(state) {
  const h = state.history.at(-1);
  if (!h) throw new ZetFout('niets');
  const history = state.history.slice(0, -1);
  if (h.t === 's') return { ...state, history, faces: h.voor, plan: h.plan, shuffles: state.shuffles };
  return { ...state, history };
}

// Husselen: de tegels die nog liggen krijgen een nieuwe plek, zo dat het weer op te lossen is
export function hussel(state, rngSeed = `${state.seed}|h${state.shuffles}|${state.history.length}`) {
  const b = bord(state.niveau), weg = wegSet(state);
  const over = b.tegels.map((_, i) => i).filter((i) => !weg.has(i));
  if (!over.length) throw new ZetFout('klaar');
  const plaatjes = over.map((i) => state.faces[i]);
  for (let poging = 0; poging < 200; poging++) {
    const rng = makeRng(`${rngSeed}|${poging}`);
    const r = vul(b, over, plaatjes, rng);
    if (r) {
      const faces = [...state.faces];
      for (const i of over) faces[i] = r.faces[i];
      return { ...state, faces, plan: r.volgorde, history: [...state.history, { t: 's', voor: state.faces, plan: state.plan }], shuffles: state.shuffles + 1 };
    }
  }
  throw new ZetFout('hussel-mislukt');
}

// ----- Een oplossing zoeken (voor de tip): zo wijst de tip nooit een zet aan die vastloopt, als er een weg is -----
// Diepte-eerst, met de zetten die de meeste tegels vrijmaken eerst, een geheugen van stand die al mislukt zijn, en een paar nieuwe pogingen met
// een beetje afwisseling als het te lang duurt. Geeft een lijst zetten of null (binnen de tijd niets gevonden; dat zegt niet dat het onmogelijk is).
export function zoekOplossing(state, budget = 60000, pogingen = 6) {
  const b = bord(state.niveau), faces = state.faces, begin = wegSet(state);
  for (let poging = 0; poging < pogingen; poging++) {
    const ruis = poging ? makeRng(`${state.seed}|zoek|${state.history.length}|${poging}`) : () => 0;
    const weg = Array.from({ length: b.n }, (_, i) => begin.has(i));
    const lijst = [], mislukt = new Set();
    let teller = 0;
    const vrij = (i) => !weg[i] && vrijBij(b, i, (j) => weg[j]);
    const diep = (over) => {
      if (over === 0) return true;
      if (++teller > budget / pogingen) return false;
      const vr = []; for (let i = 0; i < b.n; i++) if (vrij(i)) vr.push(i);
      const opties = [];
      for (let i = 0; i < vr.length; i++) for (let j = i + 1; j < vr.length; j++) if (passen(faces[vr[i]], faces[vr[j]])) opties.push([vr[i], vr[j]]);
      // eerst de zetten die de meeste tegels vrijmaken, en liefst hoge tegels
      const score = ([a, c]) => {
        const kand = [...new Set([...b.links[a], ...b.rechts[a], ...b.onder[a], ...b.links[c], ...b.rechts[c], ...b.onder[c]])].filter((x) => x !== a && x !== c && !weg[x] && !vrij(x));
        weg[a] = weg[c] = true;
        const vrijer = kand.filter((x) => vrij(x)).length;
        weg[a] = weg[c] = false;
        return vrijer + (b.tegels[a].z + b.tegels[c].z) * 0.1 + ruis() * 1.5;
      };
      const gescoord = opties.map((o) => [o, score(o)]).sort((p, q) => q[1] - p[1]);
      for (const [[a, c]] of gescoord) {
        weg[a] = weg[c] = true; lijst.push([a, c]);
        const sleutel = weg.map((x) => (x ? 1 : 0)).join('');
        if (!mislukt.has(sleutel)) {
          if (diep(over - 2)) return true;
          if (teller <= budget / pogingen) mislukt.add(sleutel);        // dezelfde stand (via een andere volgorde) hoeft niet nog eens
        }
        lijst.pop(); weg[a] = weg[c] = false;
        if (teller > budget / pogingen) return false;
      }
      return false;
    };
    if (diep(b.n - begin.size)) return lijst;
  }
  return null;
}

// Het bouwplan van het bord (de volgorde waarin het gemaakt is) is een oplossing zolang de speler er niet van afwijkt.
// Is wat er nog ligt nog precies door dat plan op te ruimen, dan is de eerste zet daarvan een veilige tip.
function planZet(state) {
  if (!Array.isArray(state.plan)) return null;
  const b = bord(state.niveau), weg = wegSet(state);
  const rest = state.plan.filter(([a, c]) => !weg.has(a) && !weg.has(c));
  if (!rest.length || rest.length * 2 !== b.n - weg.size) return null;
  const w = new Set(weg);
  for (const [a, c] of rest) {
    if (!vrijBij(b, a, (j) => w.has(j)) || !vrijBij(b, c, (j) => w.has(j)) || !passen(state.faces[a], state.faces[c])) return null;
    w.add(a); w.add(c);
  }
  return rest[0];
}

// De tip: een zet die tot een oplossing hoort (eerst het bouwplan, dan zoeken); lukt dat niet binnen de tijd, dan een gewone zet
export function tip(state) {
  if (klaar(state)) return null;
  const plan = planZet(state);
  if (plan) return plan;
  const op = zoekOplossing(state);
  if (op?.length) return op[0];
  return zetten(state)[0] || null;
}
