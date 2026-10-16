// Letterhof: de spelregels. Eén module voor de app (en later de server): het bord, de zak met stenen, zetten controleren en tellen, wisselen, passen
// en het einde van het spel. Geen scherm en geen woordenlijst hier: een zet wordt getoetst aan een `Woordenboek` (woordenboek.js) dat je meegeeft.
//
// Het spel in het kort: je legt stenen met letters in één rij of kolom en maakt daarmee woorden. Je eerste zet komt over het midden, elke volgende
// zet sluit aan op wat er ligt. Elk nieuw woord (ook de woorden die je kruist) levert de waarden van de letters op; de gekleurde vakjes verdubbelen of
// verdrievoudigen een letter of een heel woord. Leg je alle zeven stenen in één keer, dan krijg je een bonus.

import { LETTERS } from './letters.js';

export const N = 15, MIDDEN = 7, REK = 7, BINGO = 40, ZESNUL = 6;

// ----- Het bord: eigen indeling, in een bloemvorm om het midden. De vakjes staan hier voor één hoek en worden gespiegeld en gedraaid (8 keer). -----
const BANEN = {
  W3: [[0, 4]],                                 // woord x3: op de rand, naast het midden van elke zijde
  W2: [[1, 1], [3, 3], [5, 5], [2, 7]],         // woord x2: de diagonalen en de armen van het kruis
  L3: [[1, 5], [4, 7]],                         // letter x3
  L2: [[0, 0], [0, 7], [2, 5], [4, 6]],         // letter x2
};
const spiegelingen = ([r, c]) => [[r, c], [c, r], [N - 1 - r, c], [r, N - 1 - c], [N - 1 - r, N - 1 - c], [c, N - 1 - r], [N - 1 - c, r], [N - 1 - c, N - 1 - r]];
/** PREMIE[r * 15 + c]: '' (gewoon vakje), 'L2', 'L3', 'W2' of 'W3'. Het midden is een W2. */
export const PREMIE = (() => {
  const p = new Array(N * N).fill('');
  for (const [soort, lijst] of Object.entries(BANEN)) for (const o of lijst) for (const [r, c] of spiegelingen(o)) p[r * N + c] = soort;
  p[MIDDEN * N + MIDDEN] = 'W2';
  return p;
})();

// ----- De letters -----
export const isLeeg = (ch) => ch === '?';                                  // een lege steen in het rek
export const isJoker = (ch) => ch !== ch.toLowerCase();                   // een gelegde lege steen staat in hoofdletters op het bord
export const waarde = (taal, ch) => (isLeeg(ch) || isJoker(ch) ? 0 : (LETTERS[taal].letters[ch]?.[1] ?? 0));
export const rekWaarde = (taal, rek) => rek.reduce((s, c) => s + waarde(taal, c), 0);

/** Een klein toevalsgetal dat bij een zaadje hoort (zo is een spel te herhalen). */
export function maakToeval(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ----- Een nieuw spel -----
/** De zak: alle stenen van de taal, door elkaar. */
export function volleZak(taal, toeval) {
  const zak = [];
  for (const [c, [aantal]] of Object.entries(LETTERS[taal].letters)) for (let i = 0; i < aantal; i++) zak.push(c);
  for (let i = 0; i < LETTERS[taal].leeg; i++) zak.push('?');
  for (let i = zak.length - 1; i > 0; i--) { const j = Math.floor(toeval() * (i + 1)); [zak[i], zak[j]] = [zak[j], zak[i]]; }
  return zak;
}

/** state: { v, taal, seed, niveau, bord[225] (null of een letter), zak[], rek: [[..], [..]], score: [a, b], beurt (0 = jij, 1 = computer),
 *           zetten[], nul (beurten achter elkaar zonder punten), eind (null of {reden, bonus, winnaar}) } */
export function nieuwSpel({ taal, seed, niveau = 'gemiddeld' }) {
  const st = { v: 1, taal, seed, niveau, bord: new Array(N * N).fill(null), zak: volleZak(taal, maakToeval(seed)), rek: [[], []], score: [0, 0], beurt: seed % 2, zetten: [], nul: 0, eind: null };
  aanvullen(st, 0); aanvullen(st, 1);
  return st;
}
export function aanvullen(st, sp) {
  while (st.rek[sp].length < REK && st.zak.length) st.rek[sp].push(st.zak.pop());
}
export const bordLeeg = (st) => st.bord.every((x) => x === null);

// ----- Woorden die door een zet ontstaan -----
/** De woorden die ontstaan als `plaatsingen` ([{r, c, l}]; l is de letter, een lege steen in hoofdletter) op het bord komen, zonder te kijken of ze in de
 *  woordenlijst staan. Geeft {fout} (een code) of {woorden: [{cellen, letters, tekst}], nieuw: Set van cellen}. */
export function woordenVan(st, plaatsingen) {
  if (!plaatsingen.length) return { fout: 'leeg' };
  const nieuw = new Map();
  for (const p of plaatsingen) {
    if (p.r < 0 || p.r >= N || p.c < 0 || p.c >= N) return { fout: 'buiten' };
    const i = p.r * N + p.c;
    if (st.bord[i] !== null || nieuw.has(i)) return { fout: 'bezet' };
    nieuw.set(i, p.l);
  }
  const rij = plaatsingen.every((p) => p.r === plaatsingen[0].r), kol = plaatsingen.every((p) => p.c === plaatsingen[0].c);
  if (!rij && !kol) return { fout: 'lijn' };
  const letter = (i) => nieuw.get(i) ?? st.bord[i];
  // het woord langs een lijn door (r, c): dr en dc zijn de richting
  const lijn = (r, c, dr, dc) => {
    let r0 = r, c0 = c;
    while (r0 - dr >= 0 && c0 - dc >= 0 && letter((r0 - dr) * N + (c0 - dc)) !== null) { r0 -= dr; c0 -= dc; }
    const cellen = [];
    for (let rr = r0, cc = c0; rr < N && cc < N && letter(rr * N + cc) !== null; rr += dr, cc += dc) cellen.push(rr * N + cc);
    return cellen;
  };
  const woord = (cellen) => { const letters = cellen.map(letter); return { cellen, letters, tekst: letters.join('').toLowerCase() }; };
  const woorden = [];
  if (plaatsingen.length > 1) {
    const dr = rij ? 0 : 1, dc = rij ? 1 : 0;
    const hoofd = lijn(plaatsingen[0].r, plaatsingen[0].c, dr, dc);
    for (const i of nieuw.keys()) if (!hoofd.includes(i)) return { fout: 'gat' };      // een leeg vakje tussen de nieuwe stenen
    woorden.push(woord(hoofd));
    for (const p of plaatsingen) { const k = lijn(p.r, p.c, dc, dr); if (k.length > 1) woorden.push(woord(k)); }
  } else {
    const p = plaatsingen[0];
    const h = lijn(p.r, p.c, 0, 1), v = lijn(p.r, p.c, 1, 0);
    if (h.length > 1) woorden.push(woord(h));
    if (v.length > 1) woorden.push(woord(v));
  }
  return { woorden, nieuw: new Set(nieuw.keys()) };
}

/** De punten van een rij woorden; alleen de nieuwe stenen krijgen hun vakje (letter x2, x3, woord x2, x3). */
export function puntenVan(taal, woorden, nieuw) {
  let totaal = 0;
  const per = [];
  for (const w of woorden) {
    let som = 0, keer = 1;
    w.cellen.forEach((i, k) => {
      let v = waarde(taal, w.letters[k]);
      if (nieuw.has(i)) {
        const pm = PREMIE[i];
        if (pm === 'L2') v *= 2; else if (pm === 'L3') v *= 3; else if (pm === 'W2') keer *= 2; else if (pm === 'W3') keer *= 3;
      }
      som += v;
    });
    per.push({ tekst: w.tekst, punten: som * keer });
    totaal += som * keer;
  }
  return { totaal, per };
}

/** Haalt de gebruikte stenen uit een rek. Geeft het nieuwe rek of null als je ze niet hebt. */
export function uitRek(rek, plaatsingen) {
  const rest = [...rek];
  for (const p of plaatsingen) {
    const i = rest.indexOf(isJoker(p.l) ? '?' : p.l);
    if (i < 0) return null;
    rest.splice(i, 1);
  }
  return rest;
}

/** Mag deze zet en wat levert hij op? Geeft {ok: true, punten, woorden: [{tekst, punten}], bingo} of {ok: false, fout, ongeldig?}.
 *  Foutcodes: leeg, buiten, bezet, lijn, gat (de vorm van de zet), rek (je hebt die stenen niet), midden (de eerste zet moet over het midden),
 *  kort (de eerste zet heeft minstens twee stenen), los (sluit niet aan), woord (staat niet in de lijst: `ongeldig` zijn de woorden). */
export function beoordeel(st, sp, plaatsingen, wb) {
  const w = woordenVan(st, plaatsingen);
  if (w.fout) return { ok: false, fout: w.fout };
  if (!uitRek(st.rek[sp], plaatsingen)) return { ok: false, fout: 'rek' };
  if (bordLeeg(st)) {
    if (plaatsingen.length < 2) return { ok: false, fout: 'kort' };
    if (!w.nieuw.has(MIDDEN * N + MIDDEN)) return { ok: false, fout: 'midden' };
  } else if (!w.woorden.some((x) => x.cellen.some((i) => !w.nieuw.has(i)))) return { ok: false, fout: 'los' };
  if (!w.woorden.length) return { ok: false, fout: 'los' };
  const ongeldig = w.woorden.filter((x) => !wb.heeft(x.tekst)).map((x) => x.tekst);
  if (ongeldig.length) return { ok: false, fout: 'woord', ongeldig };
  const { totaal, per } = puntenVan(st.taal, w.woorden, w.nieuw);
  const bingo = plaatsingen.length === REK;
  return { ok: true, punten: totaal + (bingo ? BINGO : 0), woorden: per, bingo };
}

// ----- Een zet spelen -----
function volgende(st, sp, puntenGemaakt) {
  st.nul = puntenGemaakt ? 0 : st.nul + 1;
  const leeg = st.zak.length === 0 && st.rek[sp].length === 0;
  if (leeg || st.nul >= ZESNUL) { eindig(st, sp, leeg ? 'leeg' : 'nul'); return; }
  st.beurt = 1 - sp;
}

/** Speelt een (geldige) zet. Geeft het resultaat van `beoordeel` en past `st` aan. */
export function speel(st, sp, plaatsingen, wb) {
  const r = beoordeel(st, sp, plaatsingen, wb);
  if (!r.ok) return r;
  for (const p of plaatsingen) st.bord[p.r * N + p.c] = p.l;
  st.rek[sp] = uitRek(st.rek[sp], plaatsingen);
  st.score[sp] += r.punten;
  st.zetten.push({ sp, soort: 'leg', plaatsingen: plaatsingen.map((p) => ({ r: p.r, c: p.c, l: p.l })), punten: r.punten, woorden: r.woorden, bingo: r.bingo });
  aanvullen(st, sp);
  volgende(st, sp, true);
  return r;
}

export function pas(st, sp) {
  st.zetten.push({ sp, soort: 'pas', punten: 0 });
  volgende(st, sp, false);
}

/** Stenen wisselen mag zolang er minstens zeven stenen in de zak zitten. `tegels` zijn de stenen uit je rek (met '?' voor een lege steen). */
export function kanWisselen(st) { return st.zak.length >= REK; }
export function wissel(st, sp, tegels) {
  if (!kanWisselen(st) || !tegels.length) return false;
  const rek = [...st.rek[sp]];
  for (const t of tegels) { const i = rek.indexOf(t); if (i < 0) return false; rek.splice(i, 1); }
  const toeval = maakToeval(st.seed + 7919 * (st.zetten.length + 1));
  const nieuw = st.zak.splice(st.zak.length - tegels.length, tegels.length);        // eerst nieuwe stenen pakken, dan de oude terug
  st.zak.push(...tegels);
  for (let i = st.zak.length - 1; i > 0; i--) { const j = Math.floor(toeval() * (i + 1)); [st.zak[i], st.zak[j]] = [st.zak[j], st.zak[i]]; }
  st.rek[sp] = [...rek, ...nieuw];
  st.zetten.push({ sp, soort: 'wissel', aantal: tegels.length, punten: 0 });
  volgende(st, sp, false);
  return true;
}

/** Het einde: wie zijn rek leeg heeft gespeeld, krijgt de stenen die de ander nog heeft; elk houdt de stenen af die hij zelf overhoudt. */
function eindig(st, sp, reden) {
  const bonus = [0, 0];
  const over = [rekWaarde(st.taal, st.rek[0]), rekWaarde(st.taal, st.rek[1])];
  for (let i = 0; i < 2; i++) bonus[i] -= over[i];
  if (reden === 'leeg') bonus[sp] += over[1 - sp];
  st.score[0] += bonus[0]; st.score[1] += bonus[1];
  st.eind = { reden, bonus, over, winnaar: st.score[0] === st.score[1] ? -1 : st.score[0] > st.score[1] ? 0 : 1 };
}
