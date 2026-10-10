// Woordzoeker-engine: puzzels maken en woorden herkennen. Geen scherm, alleen logica.
//
// Een puzzel: { theme, size, grid (array van rijstrings), words: [{ word, r, c, dr, dc }] }
// Zelfde seed + niveau = precies dezelfde puzzel.

import { themas } from './themas.js';

const ALL = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];

// Hoe moeilijker, hoe groter het rooster, hoe meer woorden en hoe meer richtingen
// (ook achterstevoren en schuin omhoog).
export const LEVELS = {
  makkelijk: { size: 8,  count: 6,  minLen: 3, maxLen: 6,  dirs: [[0, 1], [1, 0]] },
  gemiddeld: { size: 10, count: 8,  minLen: 4, maxLen: 8,  dirs: [[0, 1], [1, 0], [1, 1]] },
  moeilijk:  { size: 12, count: 11, minLen: 4, maxLen: 10, dirs: ALL },
  extreem:   { size: 13, count: 15, minLen: 5, maxLen: 11, dirs: ALL },
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

const reverse = (s) => [...s].reverse().join('');

// Twee woorden mogen niet in elkaar zitten (ook niet achterstevoren), anders is "gevonden" dubbelzinnig.
const clash = (a, b) => a.includes(b) || b.includes(a) || a.includes(reverse(b)) || b.includes(reverse(a));

// Opvulletters zoals in echte tekst van de taal (de letterfrequentie staat in frequentie.js)
function randomLetter(rng, freq) {
  const letters = Object.keys(freq);
  let x = rng() * letters.reduce((som, l) => som + freq[l], 0);
  for (const l of letters) { x -= freq[l]; if (x <= 0) return l; }
  return letters[0];
}

// Past dit woord hier? Telt hoeveel letters al goed staan (overlap), of -1 als het niet kan.
function fit(cells, size, word, r, c, dr, dc) {
  const er = r + dr * (word.length - 1), ec = c + dc * (word.length - 1);
  if (r < 0 || c < 0 || er < 0 || ec < 0 || r >= size || c >= size || er >= size || ec >= size) return -1;
  let overlap = 0;
  for (let i = 0; i < word.length; i++) {
    const cur = cells[(r + dr * i) * size + (c + dc * i)];
    if (cur && cur !== word[i]) return -1;
    if (cur) overlap++;
  }
  return overlap === word.length ? -1 : overlap;        // niet helemaal over een ander woord heen
}

export function generate(seed, level = 'makkelijk', taal = 'nl') {
  const { THEMES, FREQ } = themas(taal);               // het woordenboek van de taal moet al geladen zijn (laadThemas)
  const spec = LEVELS[level] || LEVELS.makkelijk;
  const rng = makeRng(`${seed}|${level}`);
  const { size } = spec;

  for (let attempt = 0; attempt < 40; attempt++) {
    const theme = THEMES[Math.floor(rng() * THEMES.length)];
    const pool = shuffle(theme.words.filter((w) => w.length >= spec.minLen && w.length <= Math.min(spec.maxLen, size)), rng);
    const chosen = [];
    for (const w of pool) {
      if (chosen.length >= spec.count) break;
      if (!chosen.some((x) => clash(x, w))) chosen.push(w);
    }
    if (chosen.length < spec.count) continue;            // thema te klein voor dit niveau: ander thema

    chosen.sort((a, b) => b.length - a.length);          // lange woorden eerst plaatsen
    const cells = new Array(size * size).fill('');
    const placed = [];
    let ok = true;
    for (const word of chosen) {
      let best = null, bestScore = -1;
      for (let t = 0; t < 140; t++) {
        const [dr, dc] = spec.dirs[Math.floor(rng() * spec.dirs.length)];
        const r = Math.floor(rng() * size), c = Math.floor(rng() * size);
        const overlap = fit(cells, size, word, r, c, dr, dc);
        if (overlap < 0) continue;
        const score = overlap * 2 + rng();                // liever kruisen, maar wel met toeval
        if (score > bestScore) { bestScore = score; best = { word, r, c, dr, dc }; }
      }
      if (!best) { ok = false; break; }
      for (let i = 0; i < word.length; i++) cells[(best.r + best.dr * i) * size + (best.c + best.dc * i)] = word[i];
      placed.push(best);
    }
    if (!ok) continue;

    for (let i = 0; i < cells.length; i++) if (!cells[i]) cells[i] = randomLetter(rng, FREQ);
    const grid = Array.from({ length: size }, (_, r) => cells.slice(r * size, (r + 1) * size).join(''));
    placed.sort((a, b) => (a.word < b.word ? -1 : a.word > b.word ? 1 : 0));
    return { theme: theme.title, themeId: theme.id, size, grid, words: placed };
  }
  throw new Error(`Kon geen woordzoeker maken (${taal}, ${level})`);
}

// ----- Hulpfuncties voor het spel -----

export const letterAt = (puzzle, r, c) => puzzle.grid[r][c];

// Alle vakjes van (r1,c1) tot (r2,c2) als dat een rechte lijn is (horizontaal, verticaal of schuin), anders null
export function line(r1, c1, r2, c2) {
  const dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1);
  const lr = Math.abs(r2 - r1), lc = Math.abs(c2 - c1);
  if (lr !== 0 && lc !== 0 && lr !== lc) return null;
  const n = Math.max(lr, lc);
  return Array.from({ length: n + 1 }, (_, i) => [r1 + dr * i, c1 + dc * i]);
}

// De dichtstbijzijnde rechte lijn vanaf (r1,c1) richting (r2,c2): zo hoeft de tweede tik niet precies te zijn.
export function snap(size, r1, c1, r2, c2) {
  const dy = r2 - r1, dx = c2 - c1;
  if (dy === 0 && dx === 0) return [[r1, c1]];
  const angle = Math.atan2(dy, dx);
  const step = Math.round(angle / (Math.PI / 4));                  // 8 richtingen
  const dr = Math.round(Math.sin(step * Math.PI / 4)), dc = Math.round(Math.cos(step * Math.PI / 4));
  const len = Math.max(1, Math.round((dy * dr + dx * dc) / (dr !== 0 && dc !== 0 ? 2 : 1)) );   // afstand langs die richting
  const out = [];
  for (let i = 0; i <= len; i++) {
    const r = r1 + dr * i, c = c1 + dc * i;
    if (r < 0 || c < 0 || r >= size || c >= size) break;
    out.push([r, c]);
  }
  return out;
}

// Welk (nog niet gevonden) woord staat op deze lijn? Voorwaarts of achterwaarts.
export function matchWord(puzzle, cells, found) {
  const s = cells.map(([r, c]) => puzzle.grid[r][c]).join('');
  for (const w of puzzle.words) {
    if (found.has(w.word)) continue;
    if (w.word === s || w.word === reverse(s)) return w.word;
  }
  return null;
}

// Vakjes van een geplaatst woord
export const wordCells = (w) => Array.from({ length: w.word.length }, (_, i) => [w.r + w.dr * i, w.c + w.dc * i]);
