// Letterhof: de computer als tegenstander en de tip. De niveaus verschillen in welke woorden hij kent (alleen gewone woorden, of ook zeldzame) en hoe
// vaak hij de beste zet kiest; een grof woord speelt hij nooit.

import { genereerZetten } from './zetten.js';
import { kanWisselen, rekWaarde, waarde, REK } from './engine.js';

// minLaag: kleinste laag woorden die hij gebruikt (2 kern, 1 gangbaar, 0 ook zeldzame); venster: welk deel van de zetten, van hoge naar lage punten, hij kiest
export const NIVEAUS = {
  makkelijk: { minLaag: 2, venster: [0.45, 0.95] },
  gemiddeld: { minLaag: 1, venster: [0.2, 0.6] },
  moeilijk: { minLaag: 0, top: 3 },
  extreem: { minLaag: 0, beste: true },
};

const KLINKERS = /[aeiouyäöüąęó]/;
/** Hoe goed is wat je overhoudt? (een lege steen is goud; dubbele letters en alleen klinkers of alleen medeklinkers zijn lastig) */
function restWaarde(st, rest) {
  let w = 0;
  const tel = new Map();
  let kl = 0;
  for (const c of rest) {
    if (c === '?') { w += 25; continue; }
    tel.set(c, (tel.get(c) ?? 0) + 1);
    if (KLINKERS.test(c)) kl++;
    w -= waarde(st.taal, c) > 6 ? 3 : 0;
  }
  for (const n of tel.values()) w -= (n - 1) * 3;
  const mk = rest.filter((c) => c !== '?').length - kl;
  w -= Math.max(0, Math.abs(kl - mk) - 2) * 2;
  return w;
}

/** Wat de computer doet: {soort: 'leg', zet} | {soort: 'wissel', tegels} | {soort: 'pas'} */
export function kiesActie(st, sp, wb, toeval) {
  const n = NIVEAUS[st.niveau] ?? NIVEAUS.gemiddeld;
  const zetten = genereerZetten(st, sp, wb, { minLaag: n.minLaag, zonderRuw: true });
  if (!zetten.length) {
    if (kanWisselen(st)) {
      // houd de lege stenen en de gewone letters, geef de rest terug
      const geef = [...st.rek[sp]].filter((c) => c !== '?').sort((a, b) => waarde(st.taal, b) - waarde(st.taal, a)).slice(0, 5);
      if (geef.length) return { soort: 'wissel', tegels: geef };
    }
    return { soort: 'pas' };
  }
  zetten.sort((a, b) => b.punten - a.punten);
  if (n.beste) {
    const rek0 = st.rek[sp];
    let beste = null, bw = -Infinity;
    for (const z of zetten.slice(0, 40)) {
      const rest = [...rek0];
      for (const p of z.plaatsingen) rest.splice(rest.indexOf(p.l === p.l.toLowerCase() ? p.l : '?'), 1);
      const w = z.punten + restWaarde(st, rest) * (st.zak.length >= REK ? 1 : 0);
      if (w > bw) { bw = w; beste = z; }
    }
    return { soort: 'leg', zet: beste };
  }
  let kans;
  if (n.top) kans = zetten.slice(0, n.top);
  else {
    const a = Math.floor(zetten.length * n.venster[0]), b = Math.max(a + 1, Math.ceil(zetten.length * n.venster[1]));
    kans = zetten.slice(a, b);
  }
  return { soort: 'leg', zet: kans[Math.floor(toeval() * kans.length)] };
}

/** De tip voor de speler: een goede zet met gewone woorden (niet altijd de beste). */
export function tipZet(st, sp, wb, toeval) {
  const zetten = genereerZetten(st, sp, wb, { minLaag: 1, zonderRuw: true });
  if (!zetten.length) return null;
  zetten.sort((a, b) => b.punten - a.punten);
  const top = zetten.slice(0, 3);
  return top[Math.floor(toeval() * top.length)];
}

export { rekWaarde };
