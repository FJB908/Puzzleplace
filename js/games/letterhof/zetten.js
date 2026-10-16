// Letterhof: alle zetten die een rek kan doen (voor de computer en voor de tip). Het bekende werkwijze van Appel en Jacobson: voor elk vakje naast een
// steen bouw je woorden vanuit de boom, links van het vakje en dan naar rechts, en alleen met letters die ook het kruiswoord goed maken. Dat doen we voor
// de rijen en daarna voor de kolommen (het bord gedraaid).

import { N, MIDDEN, REK, BINGO, PREMIE, bordLeeg, waarde } from './engine.js';

/**
 * @param st   spelstand  @param sp wiens rek  @param wb Woordenboek
 * @param opties { minLaag: kleinste laag van de woorden (0 zeldzaam, 1 gangbaar, 2 kern), zonderRuw: grove woorden overslaan }
 * @returns [{ plaatsingen: [{r, c, l}], punten, hoofd: tekst van het hoofdwoord }]
 */
export function genereerZetten(st, sp, wb, { minLaag = 0, zonderRuw = true } = {}) {
  const n = wb.n, alfa = wb.alfabet, taal = st.taal;
  const rek = new Int32Array(n + 1);
  let leeg = 0;
  for (const c of st.rek[sp]) { if (c === '?') leeg++; else rek[wb.index.get(c)]++; }
  const waardeVan = new Int32Array(n + 1);
  for (let l = 1; l <= n; l++) waardeVan[l] = waarde(taal, alfa[l - 1]);
  const alleBits = n >= 32 ? 0xFFFFFFFF : (1 << n) - 1;
  const eindOk = (k) => wb.isEind(k) && wb.laag(k) >= minLaag && !(zonderRuw && wb.isRuw(k));
  const eersteZet = bordLeeg(st);
  const uit = new Map();

  for (const gedraaid of [false, true]) {
    // het bord als letternummers (0 = leeg); gedraaid is het bord omgeklapt (rijen en kolommen verwisseld)
    const veld = new Int32Array(N * N), joker = new Uint8Array(N * N);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const x = st.bord[r * N + c];
      if (x === null) continue;
      const i = gedraaid ? c * N + r : r * N + c;
      veld[i] = wb.index.get(x.toLowerCase());
      joker[i] = x !== x.toLowerCase() ? 1 : 0;
    }
    const wrd = (i) => (joker[i] ? 0 : waardeVan[veld[i]]);
    // kruiscontrole: welke letters mogen op een leeg vakje zodat het kruiswoord (boven en onder) klopt, en wat de buren waard zijn
    const masker = new Uint32Array(N * N), kruisSom = new Int32Array(N * N), kruis = new Uint8Array(N * N), anker = new Uint8Array(N * N);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const i = r * N + c;
      if (veld[i]) continue;
      let boven = r; while (boven > 0 && veld[(boven - 1) * N + c]) boven--;
      let onder = r; while (onder < N - 1 && veld[(onder + 1) * N + c]) onder++;
      const heeftBuur = boven < r || onder > r;
      anker[i] = heeftBuur || (c > 0 && veld[i - 1]) || (c < N - 1 && veld[i + 1]) ? 1 : 0;
      if (!heeftBuur) { masker[i] = alleBits; continue; }
      kruis[i] = 1;
      let som = 0, node = 0;
      for (let rr = boven; rr < r; rr++) { som += wrd(rr * N + c); if (node >= 0) node = wb.kind(node, veld[rr * N + c]); }
      for (let rr = r + 1; rr <= onder; rr++) som += wrd(rr * N + c);
      kruisSom[i] = som;
      let m = 0;
      if (node >= 0) {
        for (let l = 1; l <= n; l++) {
          let k = wb.kind(node, l);
          for (let rr = r + 1; rr <= onder && k >= 0; rr++) k = wb.kind(k, veld[rr * N + c]);
          if (k >= 0 && eindOk(k)) m |= 1 << (l - 1);
        }
      }
      masker[i] = m >>> 0;
    }
    if (eersteZet) { anker.fill(0); anker[MIDDEN * N + MIDDEN] = 1; }

    const geplaatst = [];                                          // [{c, l, j}] de nieuwe stenen van de zet die we aan het opbouwen zijn
    const leg = (r, eindKol, startKol) => {
      // punten: het hoofdwoord loopt van startKol t/m eindKol
      let som = 0, keer = 1, kruisTotaal = 0, gebruikt = 0;
      for (let c = startKol; c <= eindKol; c++) {
        const i = r * N + c;
        if (veld[i]) { som += wrd(i); continue; }
        const p = geplaatst.find((x) => x.c === c);
        const v = p.j ? 0 : waardeVan[p.l];
        const pm = PREMIE[i];
        let lv = v, wk = 1;
        if (pm === 'L2') lv = v * 2; else if (pm === 'L3') lv = v * 3; else if (pm === 'W2') wk = 2; else if (pm === 'W3') wk = 3;
        som += lv; keer *= wk; gebruikt++;
        if (kruis[i]) kruisTotaal += (kruisSom[i] + lv) * wk;
      }
      let punten = som * keer + kruisTotaal;
      if (gebruikt === REK) punten += BINGO;
      const plaatsingen = geplaatst.map((p) => {
        const l = alfa[p.l - 1];
        const x = p.j ? l.toUpperCase() : l;
        return gedraaid ? { r: p.c, c: r, l: x } : { r, c: p.c, l: x };
      }).sort((a, b) => a.r - b.r || a.c - b.c);
      const sleutel = plaatsingen.map((p) => `${p.r},${p.c},${p.l}`).join(';');
      if (!uit.has(sleutel)) {
        let hoofd = '';
        for (let c = startKol; c <= eindKol; c++) { const i = r * N + c; hoofd += veld[i] ? alfa[veld[i] - 1] : alfa[geplaatst.find((x) => x.c === c).l - 1]; }
        uit.set(sleutel, { plaatsingen, punten, hoofd });
      }
    };

    const rechts = (r, c, node, anc, startKol) => {
      const i = r * N + c;
      if (c >= N || !veld[i]) {
        if (c > anc && eindOk(node)) leg(r, c - 1, startKol);
        if (c >= N) return;
        const m = masker[i];
        for (let l = 1; l <= n; l++) {
          if (((m >>> (l - 1)) & 1) === 0) continue;
          const k = wb.kind(node, l);
          if (k < 0) continue;
          if (rek[l] > 0) { rek[l]--; geplaatst.push({ c, l, j: 0 }); rechts(r, c + 1, k, anc, startKol); geplaatst.pop(); rek[l]++; }
          else if (leeg > 0) { leeg--; geplaatst.push({ c, l, j: 1 }); rechts(r, c + 1, k, anc, startKol); geplaatst.pop(); leeg++; }
        }
      } else {
        const k = wb.kind(node, veld[i]);
        if (k >= 0) rechts(r, c + 1, k, anc, startKol);
      }
    };
    // het linkerdeel: de stenen links van het ankervakje, van links naar rechts opgebouwd (de plek is pas bekend als de lengte vaststaat)
    const links = (r, anc, node, limiet, voorvoegsel) => {
      const L = voorvoegsel.length;
      voorvoegsel.forEach((x, idx) => geplaatst.push({ c: anc - L + idx, l: x.l, j: x.j }));
      rechts(r, anc, node, anc, anc - L);
      for (let idx = 0; idx < L; idx++) geplaatst.pop();
      if (limiet <= 0) return;
      for (let l = 1; l <= n; l++) {
        const k = wb.kind(node, l);
        if (k < 0) continue;
        if (rek[l] > 0) { rek[l]--; voorvoegsel.push({ l, j: 0 }); links(r, anc, k, limiet - 1, voorvoegsel); voorvoegsel.pop(); rek[l]++; }
        else if (leeg > 0) { leeg--; voorvoegsel.push({ l, j: 1 }); links(r, anc, k, limiet - 1, voorvoegsel); voorvoegsel.pop(); leeg++; }
      }
    };

    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const i = r * N + c;
        if (!anker[i]) continue;
        if (c > 0 && veld[i - 1]) {
          // de stenen links van het ankervakje liggen al: dat is het begin van het woord
          let k = c - 1; while (k > 0 && veld[r * N + k - 1]) k--;
          let node = 0;
          for (let j = k; j < c && node >= 0; j++) node = wb.kind(node, veld[r * N + j]);
          if (node >= 0) rechts(r, c, node, c, k);
        } else {
          let limiet = 0;
          for (let j = c - 1; j >= 0 && !veld[r * N + j] && !anker[r * N + j]; j--) limiet++;
          links(r, c, 0, Math.min(limiet, REK - 1), []);
        }
      }
    }
  }
  return [...uit.values()];
}
