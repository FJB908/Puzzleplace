import test from 'node:test';
import assert from 'node:assert/strict';
import { LAYOUTS, plekken } from '../js/games/mahjong/layouts.js';
import { bord, newGame, bouwVolgorde, neemWeg, zetTerug, hussel, zetten, tip, zoekOplossing, isVrij, vrijeTegels, wegSet, klaar, tegelsOver, vastgelopen, passen, tegelSet, makeRng, progress, ZetFout, AANTAL_PLAATJES } from '../js/games/mahjong/engine.js';

const NIVEAUS = Object.keys(LAYOUTS);

test('de borden: 36, 60, 100 en 144 tegels; geen overlap, niets zweeft, en hooguit 9 tegels breed', () => {
  assert.deepEqual(NIVEAUS.map((n) => plekken(n).length), [36, 60, 100, 144]);
  for (const n of NIVEAUS) {
    const p = plekken(n);
    for (const [i, t] of p.entries()) {
      assert.ok(!p.some((o, j) => j < i && o.z === t.z && Math.abs(o.x - t.x) < 2 && Math.abs(o.y - t.y) < 2), `${n}: twee tegels op dezelfde plek`);
      if (t.z > 0) assert.ok(p.some((o) => o.z === t.z - 1 && Math.abs(o.x - t.x) < 2 && Math.abs(o.y - t.y) < 2), `${n}: tegel ${i} zweeft`);
    }
    assert.ok(bord(n).breed <= 18, `${n} is te breed voor een telefoon`);
  }
});

test('vrij: niets erop en links of rechts open (op een klein stapeltje nagerekend)', () => {
  // niveau 'makkelijk': 6 breed, 4 hoog. Op laag 0 zijn alleen de uiteinden van elke rij vrij (zonder wat erop ligt)
  const s = newGame('vrij-test', 'makkelijk');
  const b = bord('makkelijk');
  const vrij = vrijeTegels(s);
  for (const i of vrij) {
    assert.equal(b.boven[i].length, 0, 'er ligt niets bovenop een vrije tegel');
    assert.ok(b.links[i].length === 0 || b.rechts[i].length === 0, 'links of rechts is open');
  }
  const bovenop = b.tegels.map((_, i) => i).filter((i) => b.tegels[i].z === 2);
  assert.ok(bovenop.every((i) => vrij.includes(i) === (b.links[i].length === 0 || b.rechts[i].length === 0)), 'de tegels op de top zijn vrij als een kant open is');
  assert.ok(b.tegels.map((_, i) => i).filter((i) => b.tegels[i].z === 0 && b.boven[i].length).every((i) => !vrij.includes(i)), 'een tegel met iets erop is nooit vrij');
  // alleen de tegels op een uiteinde van een rij of een vrije top zijn vrij: een tegel midden in een rij niet
  const midden = b.tegels.findIndex((t) => t.z === 0 && t.y === 0 && t.x === 4);
  assert.equal(vrij.includes(midden), false);
});

test('passen: gelijke plaatjes, een bloem met een bloem, een seizoen met een seizoen; verder niet', () => {
  assert.ok(passen(0, 0)); assert.ok(passen(34, 37)); assert.ok(passen(38, 41)); assert.ok(passen(5, 5));
  assert.equal(passen(0, 1), false); assert.equal(passen(34, 38), false); assert.equal(passen(33, 27), false); assert.equal(passen(0, 9), false);
});

test('de tegels van een bord: 4 van elke soort, bij 138 en 144 ook bloemen en seizoenen; altijd paren', () => {
  for (const [n, bloem, seizoen] of [[36, 0, 0], [60, 0, 0], [100, 0, 0], [138, 2, 0], [144, 4, 4]]) {
    const set = tegelSet(n, makeRng(`set${n}`));
    assert.equal(set.length, n);
    const tel = new Map(); for (const f of set) tel.set(f, (tel.get(f) || 0) + 1);
    assert.equal(set.filter((f) => f >= 34 && f <= 37).length, bloem); assert.equal(set.filter((f) => f >= 38).length, seizoen);
    for (const [f, k] of tel) if (f < 34) assert.equal(k, 4, `plaatje ${f}`); else assert.equal(k, 1, 'elke bloem en elk seizoen is er één keer');
    assert.ok(set.every((f) => f >= 0 && f < AANTAL_PLAATJES));
  }
  assert.equal(new Set(tegelSet(36, makeRng('klein'))).size, 9, 'op het kleinste bord liggen 9 soorten');
});

test('de oplosser (voor de tip) vindt op elk niveau een oplossing, op het grootste bord bijna altijd; en die oplossing is echt', () => {
  for (const niveau of NIVEAUS) {
    const aantal = niveau === 'makkelijk' ? 40 : niveau === 'extreem' ? 30 : 15;
    let gevonden = 0;
    for (let k = 0; k < aantal; k++) {
      let s = newGame(`los-${k}`, niveau);
      assert.equal(s.faces.length, bord(niveau).n); assert.ok(s.faces.every((f) => f >= 0), 'elke plek heeft een plaatje');
      const op = zoekOplossing(s, 100000);
      if (!op) continue;
      gevonden++;
      for (const [a, c] of op) s = neemWeg(s, a, c);                       // gooit als een zet niet mag
      assert.ok(klaar(s)); assert.equal(tegelsOver(s), 0); assert.equal(progress(s), 1);
    }
    // elk bord is wel op te lossen (zie de bouwvolgorde hieronder); de oplosser is een zoekprogramma met een tijdslimiet
    assert.ok(gevonden >= aantal * (niveau === 'extreem' ? 0.85 : 1), `${niveau}: oplosser vond ${gevonden} van ${aantal}`);
  }
});

test('de bouwvolgorde is een bewezen oplossing: elke zet mag, op elk niveau, voor veel seeds', () => {
  for (const niveau of NIVEAUS) for (let k = 0; k < (niveau === 'extreem' ? 40 : 100); k++) {
    let s = newGame(`bouw-${k}`, niveau);
    const { volgorde, faces } = bouwVolgorde(`bouw-${k}`, niveau);
    assert.deepEqual(faces, s.faces, 'newGame gebruikt dezelfde bouw');
    for (const [a, c] of volgorde) s = neemWeg(s, a, c);
    assert.ok(klaar(s), `${niveau} seed ${k}`);
  }
});

test('hetzelfde seed geeft hetzelfde bord, een ander seed een ander bord', () => {
  const a = newGame('s1', 'gemiddeld'), b = newGame('s1', 'gemiddeld'), c = newGame('s2', 'gemiddeld');
  assert.deepEqual(a.faces, b.faces); assert.notDeepEqual(a.faces, c.faces);
  assert.notDeepEqual(newGame('s1', 'moeilijk').faces.slice(0, 60), a.faces);
});

test('een zet: vast, past niet, zelfde tegel; en de oude stand blijft ongemoeid', () => {
  const s = newGame('zet', 'makkelijk');
  const z = zetten(s)[0];
  assert.ok(z, 'er is een zet');
  const vast = bord('makkelijk').tegels.map((_, i) => i).find((i) => !isVrij(s, i));
  assert.throws(() => neemWeg(s, vast, z[0]), (e) => e instanceof ZetFout && e.code === 'vast');
  assert.throws(() => neemWeg(s, z[0], z[0]), (e) => e.code === 'zelfde');
  const vr = vrijeTegels(s); let gevonden = null;
  for (const i of vr) for (const j of vr) if (i < j && !passen(s.faces[i], s.faces[j])) gevonden = [i, j];
  if (gevonden) assert.throws(() => neemWeg(s, ...gevonden), (e) => e.code === 'past-niet');
  const n = neemWeg(s, z[0], z[1]);
  assert.equal(tegelsOver(n), 34); assert.equal(tegelsOver(s), 36); assert.equal(s.history.length, 0);
  assert.ok(wegSet(n).has(z[0]) && wegSet(n).has(z[1]));
  // na het wegnemen is het paar niet meer vrij of beschikbaar
  assert.throws(() => neemWeg(n, z[0], z[1]));
});

test('zet terug: onbeperkt, tot het begin; en een husselbeurt is ook terug te draaien', () => {
  let s = newGame('terug', 'gemiddeld');
  const begin = JSON.stringify(s);
  for (let k = 0; k < 5; k++) { const z = tip(s); s = neemWeg(s, z[0], z[1]); }
  assert.equal(tegelsOver(s), 50);
  const gehusseld = hussel(s);
  assert.equal(gehusseld.shuffles, 1); assert.equal(tegelsOver(gehusseld), 50);
  const terug = zetTerug(gehusseld);
  assert.deepEqual(terug.faces, s.faces, 'de oude verdeling is terug');
  let t = terug;
  for (let k = 0; k < 5; k++) t = zetTerug(t);
  assert.equal(JSON.stringify({ ...t, shuffles: 0 }), JSON.stringify({ ...JSON.parse(begin), shuffles: 0 }));
  assert.throws(() => zetTerug(t), (e) => e.code === 'niets');
});

test('husselen: dezelfde tegels (alleen anders verdeeld), en daarna is het weer op te lossen, ook midden in een spel', () => {
  for (const niveau of NIVEAUS) {
    let s = newGame(`hussel-${niveau}`, niveau);
    for (let k = 0; k < 6; k++) { const z = tip(s); s = neemWeg(s, z[0], z[1]); }
    const over = [...bord(niveau).tegels.keys()].filter((i) => !wegSet(s).has(i));
    const voor = over.map((i) => s.faces[i]).sort((x, y) => x - y);
    const h = hussel(s);
    assert.deepEqual(over.map((i) => h.faces[i]).sort((x, y) => x - y), voor, 'dezelfde tegels');
    assert.notDeepEqual(over.map((i) => h.faces[i]), over.map((i) => s.faces[i]), 'anders verdeeld');
    let x = h; const op = zoekOplossing(x, 200000);
    assert.ok(op, `${niveau}: na husselen is er een oplossing`);
    for (const [a, c] of op) x = neemWeg(x, a, c);
    assert.ok(klaar(x));
  }
});

test('vastgelopen: een stand zonder passende vrije tegels wordt herkend, husselen helpt', () => {
  // zoek een stand waarin je door domme zetten vastloopt
  let gevonden = null;
  for (let k = 0; k < 200 && !gevonden; k++) {
    let s = newGame(`vast-${k}`, 'gemiddeld'); const rng = makeRng(`dom${k}`);
    for (let stap = 0; stap < 40 && !vastgelopen(s) && !klaar(s); stap++) { const z = zetten(s); const [a, c] = z[Math.floor(rng() * z.length)]; s = neemWeg(s, a, c); }
    if (vastgelopen(s)) gevonden = s;
  }
  assert.ok(gevonden, 'met willekeurige zetten loop je soms vast');
  assert.equal(zetten(gevonden).length, 0); assert.equal(tip(gevonden), null);
  const h = hussel(gevonden);
  assert.ok(zetten(h).length > 0, 'na husselen kan er weer iets');
});

test('de tip wijst een geldige zet aan die tot een oplossing hoort; volg je alle tips, dan win je altijd', () => {
  for (const niveau of NIVEAUS) {
    let s = newGame('tips', niveau), stappen = 0;
    while (!klaar(s)) { const z = tip(s); assert.ok(z, `${niveau}: tip ontbreekt bij ${tegelsOver(s)} over`); s = neemWeg(s, z[0], z[1]); stappen++; assert.ok(stappen <= 80); }
    assert.equal(stappen * 2, bord(niveau).n);
  }
});

test('het bouwplan is een veilige tip: tot de speler afwijkt, en na husselen weer; wijkt hij af, dan zoekt de tip verder', () => {
  let s = newGame('plan', 'extreem');
  assert.deepEqual(tip(s), s.plan[0], 'aan het begin is de tip de eerste zet van het plan');
  // een zet die niet in het plan staat: het plan klopt niet meer, maar de tip is nog steeds een geldige zet
  const afwijk = zetten(s).find(([a, c]) => !s.plan.some(([p, q]) => (p === a && q === c) || (p === c && q === a)));
  if (afwijk) { const n = neemWeg(s, ...afwijk); const z = tip(n); assert.ok(z && zetten(n).some(([a, c]) => (a === z[0] && c === z[1]) || (a === z[1] && c === z[0]))); }
  const h = hussel(s);
  assert.deepEqual(tip(h), h.plan[0], 'na husselen hoort er een nieuw plan bij');
  assert.deepEqual(zetTerug(h).plan, s.plan, 'en terugdraaien brengt het oude plan terug');
});

test('de stand is gewoon JSON en blijft hetzelfde na bewaren en laden', () => {
  let s = newGame('json', 'moeilijk');
  for (let k = 0; k < 4; k++) { const z = tip(s); s = neemWeg(s, z[0], z[1]); }
  s = hussel(s);
  const terug = JSON.parse(JSON.stringify(s));
  assert.deepEqual(terug, s); assert.equal(tegelsOver(terug), tegelsOver(s)); assert.deepEqual(zetten(terug), zetten(s));
});
