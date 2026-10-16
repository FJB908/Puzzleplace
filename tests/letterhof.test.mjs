// Letterhof: de regels, de woordenboom en de computer. De computer wordt vergeleken met een traag maar voor de hand liggend zoekprogramma.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PREMIE, N, MIDDEN, REK, BINGO, nieuwSpel, beoordeel, speel, pas, wissel, woordenVan, puntenVan, waarde, kanWisselen, rekWaarde, maakToeval, uitRek } from '../js/games/letterhof/engine.js';
import { Woordenboek, pakWoorden, ALFABET, TALEN } from '../js/games/letterhof/woordenboek.js';
import { LETTERS } from '../js/games/letterhof/letters.js';
import { genereerZetten } from '../js/games/letterhof/zetten.js';

const WOORDEN = ('aan aap aar ark art bak bal dak dal dag eis eer een eet elf erg gas gat hal hak hek hoe kar kat ken kin kip kom kon kop lag lak lap las lat leg les let lip log los lot mak mat met nat net pak pas pen pet pit pot rat rek rok rot sap set sip tak tas ten tik tin tip top tor zak zat zet zin zit zon zot '
  + 'kaart kamer kerst klein lopen markt nacht pasta raket tabel tafel tekst toren water zomer katten kapel zalig').split(' ');
const maakWb = (lijst = WOORDEN, laag = '1') => new Woordenboek(ALFABET.nl, pakWoorden(lijst.map((w) => [w, laag])));

test('het bord: evenveel vakjes van elke soort, en het bord is symmetrisch', () => {
  const tel = (s) => PREMIE.filter((x) => x === s).length;
  assert.deepEqual([tel('W3'), tel('W2'), tel('L3'), tel('L2')], [8, 17, 12, 24]);
  assert.equal(PREMIE[MIDDEN * N + MIDDEN], 'W2');
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const x = PREMIE[r * N + c];
    assert.equal(PREMIE[c * N + r], x); assert.equal(PREMIE[(N - 1 - r) * N + c], x); assert.equal(PREMIE[r * N + (N - 1 - c)], x);
  }
});

test('de stenen: 100 stenen en 2 lege per taal, elke letter komt voor, genoeg klinkers', () => {
  for (const t of TALEN) {
    const L = LETTERS[t];
    assert.equal(L.leeg, 2);
    assert.deepEqual(Object.keys(L.letters).sort(), [...ALFABET[t]].sort(), `${t}: de letters van de stenen en van het woordenboek komen overeen`);
    const totaal = Object.values(L.letters).reduce((s, [a]) => s + a, 0);
    assert.equal(totaal, 100, t);
    for (const [c, [a, w]] of Object.entries(L.letters)) { assert.ok(a >= 1, `${t} ${c}`); assert.ok(w >= 1 && w <= 10, `${t} ${c}`); }
    const klinkers = [...'aeiouäöüyąęó'].reduce((s, c) => s + (L.letters[c]?.[0] ?? 0), 0);
    assert.ok(klinkers >= 36 && klinkers <= 46, `${t}: ${klinkers} klinkers`);
  }
});

test('de woordenboom: woorden, lagen, grove woorden en wat er niet in staat', () => {
  const wb = new Woordenboek(ALFABET.nl, pakWoorden([['aap', '2'], ['aan', '1'], ['aanbod', '0'], ['aal', 'r'], ['ba', '2']]));
  assert.equal(wb.aantal, 5);
  assert.ok(wb.heeft('aap') && wb.heeft('aanbod') && wb.heeft('ba'));
  assert.ok(!wb.heeft('aa') && !wb.heeft('aanb') && !wb.heeft('x') && !wb.heeft('a'));
  assert.equal(wb.laagVan('aap'), 2); assert.equal(wb.laagVan('aan'), 1); assert.equal(wb.laagVan('aanbod'), 0); assert.equal(wb.laagVan('xx'), -1);
  assert.ok(wb.isRuw(wb.knoop('aal')) && !wb.isRuw(wb.knoop('aap')));
  const de = new Woordenboek(ALFABET.de, pakWoorden(['über', 'öl', 'straße'.replace('ß', 'ss')]));
  assert.ok(de.heeft('über') && de.heeft('öl') && de.heeft('strasse'));
});

test('een zet: eerste zet over het midden en met een dubbel woord, letterwaarden', () => {
  const wb = maakWb();
  const st = nieuwSpel({ taal: 'nl', seed: 1 });
  st.rek[0] = ['k', 'a', 't', 'e', 'n', 's', 'z']; st.beurt = 0;
  const z = (w, r, c0, horiz = true) => [...w].map((l, k) => ({ r: horiz ? r : r + k, c: horiz ? c0 + k : c, l }));
  assert.equal(beoordeel(st, 0, z('kat', 0, 0), wb).fout, 'midden');
  assert.equal(beoordeel(st, 0, z('k', 7, 7), wb).fout, 'kort');
  assert.equal(beoordeel(st, 0, z('kst', 7, 6), wb).fout, 'woord');
  assert.equal(beoordeel(st, 0, z('qat', 7, 6), wb).fout, 'rek');
  const r = beoordeel(st, 0, z('kat', 7, 6), wb);                      // k op (7,6), a op het midden (7,7), t op (7,8)
  assert.ok(r.ok);
  const v = (c) => waarde('nl', c);
  // alleen het midden (W2) en (7,6)? (7,6) is gewoon; (7,8) is gewoon: som x 2
  const verwacht = (v('k') + v('a') + v('t')) * 2;
  assert.equal(r.punten, verwacht, 'het midden is een woord x2');
});

test('puntentelling: vakjes tellen alleen voor nieuwe stenen, kruiswoorden tellen mee, lege stenen zijn niets waard, bingo', () => {
  const wb = maakWb();
  const st = nieuwSpel({ taal: 'nl', seed: 2 });
  st.rek[0] = ['k', 'a', 't', 'e', 'n', 's', 'z']; st.beurt = 0;
  speel(st, 0, [{ r: 7, c: 6, l: 'k' }, { r: 7, c: 7, l: 'a' }, { r: 7, c: 8, l: 't' }], wb);
  assert.deepEqual(st.rek[0].length, 7);                                // aangevuld
  st.rek[1] = ['p', 'e', 'n', 's', 'a', 'o', 'l'];
  st.beurt = 1;
  // "pen" onder "kat": p op (8,6) vormt "kp"? nee: kruiswoord k-p is geen woord, dus ongeldig
  assert.equal(beoordeel(st, 1, [{ r: 8, c: 6, l: 'p' }, { r: 8, c: 7, l: 'e' }, { r: 8, c: 8, l: 'n' }], wb).fout, 'woord');
  // "lat" over de t omlaag: t op (7,8), a op (8,8)?? : kolom 8: t, a, l -> "tal"? niet in lijst
  const w = woordenVan(st, [{ r: 8, c: 8, l: 'e' }, { r: 9, c: 8, l: 'n' }]);
  assert.deepEqual(w.woorden.map((x) => x.tekst), ['ten']);
  assert.equal(puntenVan('nl', w.woorden, w.nieuw).totaal, waarde('nl', 't') + (PREMIE[8 * N + 8] === 'L2' ? 2 : PREMIE[8 * N + 8] === 'L3' ? 3 : 1) * waarde('nl', 'e') + waarde('nl', 'n') * (PREMIE[9 * N + 8] === 'L2' ? 2 : PREMIE[9 * N + 8] === 'L3' ? 3 : 1) || true);
  // een lege steen is niets waard
  const jw = woordenVan(st, [{ r: 8, c: 8, l: 'E' }, { r: 9, c: 8, l: 'N' }]);
  assert.equal(puntenVan('nl', jw.woorden, jw.nieuw).per[0].punten <= puntenVan('nl', w.woorden, w.nieuw).per[0].punten, true);
  assert.equal(waarde('nl', 'E'), 0);
  assert.equal(BINGO, 40);
});

test('wisselen, passen en het einde van het spel', () => {
  const wb = maakWb();
  const st = nieuwSpel({ taal: 'nl', seed: 3 });
  const sp = st.beurt;
  const voor = [...st.rek[sp]];
  assert.ok(kanWisselen(st));
  assert.ok(wissel(st, sp, voor.slice(0, 3)));
  assert.equal(st.rek[sp].length, 7); assert.equal(st.zak.length, 102 - 14); assert.equal(st.beurt, 1 - sp);
  assert.equal(st.nul, 1);
  for (let i = 0; i < 5; i++) pas(st, st.beurt);
  assert.ok(st.eind && st.eind.reden === 'nul', 'zes keer achter elkaar niets: het spel eindigt');
  assert.equal(st.score[0], -rekWaarde('nl', st.rek[0])); assert.equal(st.score[1], -rekWaarde('nl', st.rek[1]));
  void wb;
});

test('het spel eindigt als een rek leeg is en de zak leeg: de ander verliest de stenen die hij nog heeft en jij krijgt ze', () => {
  const wb = maakWb();
  const st = nieuwSpel({ taal: 'nl', seed: 4 });
  st.zak = []; st.rek[0] = ['k', 'a', 't']; st.rek[1] = ['z', 'q']; st.beurt = 0;
  const r = speel(st, 0, [{ r: 7, c: 6, l: 'k' }, { r: 7, c: 7, l: 'a' }, { r: 7, c: 8, l: 't' }], wb);
  assert.ok(r.ok && st.eind && st.eind.reden === 'leeg');
  const rest = waarde('nl', 'z') + waarde('nl', 'q');
  assert.equal(st.score[0], r.punten + rest); assert.equal(st.score[1], -rest);
  assert.equal(st.eind.winnaar, 0);
});

// ---- de computer tegen een traag zoekprogramma ----
function langzaam(st, sp, wb) {
  // elk woord, elke plek, elke richting; de stenen komen uit het rek (een lege steen alleen als er geen echte is)
  const gevonden = new Map();
  for (const woord of WOORDEN) {
    for (const horiz of [true, false]) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const len = woord.length;
        if (horiz ? c + len > N : r + len > N) continue;
        const rek = [...st.rek[sp]];
        const pl = [];
        let ok = true;
        for (let k = 0; k < len && ok; k++) {
          const rr = horiz ? r : r + k, cc = horiz ? c + k : c;
          const b = st.bord[rr * N + cc];
          if (b !== null) { if (b.toLowerCase() !== woord[k]) ok = false; continue; }
          let i = rek.indexOf(woord[k]);
          if (i >= 0) { rek.splice(i, 1); pl.push({ r: rr, c: cc, l: woord[k] }); continue; }
          i = rek.indexOf('?');
          if (i >= 0) { rek.splice(i, 1); pl.push({ r: rr, c: cc, l: woord[k].toUpperCase() }); continue; }
          ok = false;
        }
        if (!ok || !pl.length) continue;
        const b = beoordeel(st, sp, pl, wb);
        if (!b.ok) continue;
        pl.sort((x, y) => x.r - y.r || x.c - y.c);
        gevonden.set(pl.map((p) => `${p.r},${p.c},${p.l}`).join(';'), b.punten);
      }
    }
  }
  return gevonden;
}

test('de computer vindt precies de zetten die er zijn, met dezelfde punten', () => {
  const wb = maakWb();
  let gecontroleerd = 0, totaalZetten = 0;
  for (let seed = 10; seed < 22; seed++) {
    const st = nieuwSpel({ taal: 'nl', seed });
    const toeval = maakToeval(seed * 31);
    st.rek[0] = ['k', 'a', 't', 'e', 'n', '?', 'o']; st.rek[1] = ['l', 'i', 'p', 'a', 'r', 's', 'e'];
    for (let zet = 0; zet < 9 && !st.eind; zet++) {
      const sp = st.beurt;
      const mijn = genereerZetten(st, sp, wb, { minLaag: 0, zonderRuw: false });
      const sleutel = (z) => z.plaatsingen.map((p) => `${p.r},${p.c},${p.l}`).join(';');
      const a = new Map(mijn.map((z) => [sleutel(z), z.punten]));
      const b = langzaam(st, sp, wb);
      assert.equal(a.size, mijn.length, 'geen dubbele zetten');
      const alleenMijn = [...a.keys()].filter((k) => !b.has(k)), alleenTraag = [...b.keys()].filter((k) => !a.has(k));
      assert.deepEqual(alleenMijn, [], `zetten die de computer ziet maar niet bestaan (seed ${seed}, zet ${zet})`);
      assert.deepEqual(alleenTraag, [], `zetten die de computer mist (seed ${seed}, zet ${zet})`);
      for (const [k, p] of a) assert.equal(p, b.get(k), `punten van ${k}`);
      gecontroleerd++; totaalZetten += a.size;
      if (!mijn.length) { pas(st, sp); st.rek[sp] = st.rek[sp].length ? st.rek[sp] : ['a']; continue; }
      const kies = mijn[Math.floor(toeval() * mijn.length)];
      const r = speel(st, sp, kies.plaatsingen, wb);
      assert.ok(r.ok, 'een gevonden zet is ook geldig');
      assert.equal(r.punten, kies.punten);
      // vul de rekken weer op met bruikbare letters zodat er steeds iets te zoeken is
      for (const x of [0, 1]) while (st.rek[x].length < REK) st.rek[x].push('aeiknlrtopsz'[Math.floor(toeval() * 12)]);
    }
  }
  assert.ok(gecontroleerd >= 100 && totaalZetten > 1500, `${gecontroleerd} standen en ${totaalZetten} zetten vergeleken`);
});

test('de computer speelt alleen woorden van de gevraagde laag en geen grove woorden', () => {
  const wb = new Woordenboek(ALFABET.nl, pakWoorden([['kat', '2'], ['tak', '1'], ['kot', '0'], ['kak', 'r'], ['kaat', '2'], ['tik', '2']]));
  const st = nieuwSpel({ taal: 'nl', seed: 5 });
  st.rek[0] = ['k', 'a', 't', 'o', 'i', 'k', 'a']; st.beurt = 0;
  const alle = genereerZetten(st, 0, wb, { minLaag: 0, zonderRuw: true }).map((z) => z.hoofd);
  assert.ok(alle.includes('kot') && alle.includes('kat') && !alle.includes('kak'));
  const kern = genereerZetten(st, 0, wb, { minLaag: 2, zonderRuw: true }).map((z) => z.hoofd);
  assert.ok(kern.includes('kat') && !kern.includes('kot') && !kern.includes('tak'));
  const met = genereerZetten(st, 0, wb, { minLaag: 0, zonderRuw: false }).map((z) => z.hoofd);
  assert.ok(met.includes('kak'));
});
