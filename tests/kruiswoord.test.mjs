import test from 'node:test';
import assert from 'node:assert/strict';
import { generate, validate, LEVELS, cellsOf } from '../js/games/kruiswoord/engine.js';
import { laadWoorden } from '../js/games/kruiswoord/woorden.js';

// Dit bestand test de puzzel met de Nederlandse woorden (de standaardtaal van de generator); de andere talen staan in talen-puzzels.test.mjs
const ENTRIES = await laadWoorden('nl');

test('woordenlijst: alleen A-Z, geen IJ, geen dubbele antwoorden, antwoord niet in de omschrijving', () => {
  const seen = new Set();
  for (const e of ENTRIES) {
    assert.match(e.answer, /^[A-Z]{3,12}$/, e.answer);
    assert.ok(!e.answer.includes('IJ'), `${e.answer}: IJ beslaat twee vakjes`);
    assert.ok(!seen.has(e.answer), `dubbel: ${e.answer}`); seen.add(e.answer);
    assert.ok([1, 2, 3].includes(e.level) && e.clue.length > 5, e.answer);
    assert.ok(!e.clue.toUpperCase().split(/[^A-Z]+/).includes(e.answer), `${e.answer} staat in zijn eigen omschrijving`);
  }
  assert.ok(ENTRIES.length >= 300);
});

for (const level of Object.keys(LEVELS)) {
  test(`${level}: rooster klopt, alles hangt aan elkaar, past binnen de afmetingen`, () => {
    const spec = LEVELS[level];
    let totalWords = 0;
    for (let n = 0; n < 40; n++) {
      const p = generate(`kw-${n}`, level);
      assert.equal(validate(p), null);
      assert.ok(p.rows <= spec.max && p.cols <= spec.max, `${p.rows}x${p.cols}`);
      assert.ok(p.entries.length >= Math.ceil(spec.words * .8), `${level}: ${p.entries.length} woorden`);
      totalWords += p.entries.length;
      // de letters van elk woord staan echt in het rooster en alle antwoorden zijn verschillend
      for (const e of p.entries) assert.equal(cellsOf(e).map(([r, c]) => p.grid[r][c]).join(''), e.answer);
      assert.equal(new Set(p.entries.map((e) => e.answer)).size, p.entries.length);
      // nummers: oplopend, en een kruising deelt zijn nummer met het woord dat daar begint
      const byStart = new Map();
      for (const e of p.entries) { const k = `${e.r},${e.c}`; if (byStart.has(k)) assert.equal(byStart.get(k), e.n); byStart.set(k, e.n); }
    }
    assert.ok(totalWords / 40 >= spec.words * .92, `${level}: gemiddeld ${(totalWords / 40).toFixed(1)} van ${spec.words} woorden`);
  });
}

test('zelfde seed geeft dezelfde puzzel', () => {
  assert.deepEqual(generate('2026-10-10', 'gemiddeld'), generate('2026-10-10', 'gemiddeld'));
  assert.notDeepEqual(generate('a', 'gemiddeld').grid, generate('b', 'gemiddeld').grid);
});

test('puzzels maken is snel genoeg', () => {
  for (const level of ['gemiddeld', 'extreem']) {
    const t = performance.now();
    for (let n = 0; n < 8; n++) generate(`speed-${n}`, level);
    assert.ok((performance.now() - t) / 8 < 600, `${level}: ${((performance.now() - t) / 8).toFixed(0)} ms`);
  }
});

test('validate ziet fouten', () => {
  const p = generate('x', 'makkelijk');
  const bad = { ...p, grid: p.grid.map((row, i) => (i === 0 ? row.replace(/[A-Z]/, 'Q') : row)) };
  assert.notEqual(validate(bad), null);
});

test('de puzzel hangt niet van de klok af: op een trage of drukke telefoon is de puzzel van de dag dezelfde', () => {
  const echt = Date.now;
  try {
    for (const level of Object.keys(LEVELS)) {
      const normaal = JSON.stringify(generate(`klok-${level}`, level));
      let t = 0; Date.now = () => (t += 500);                                  // een klok die razendsnel verspringt
      const traag = JSON.stringify(generate(`klok-${level}`, level));
      Date.now = echt;
      assert.equal(traag, normaal, `${level}: andere puzzel bij een andere klok`);
    }
  } finally { Date.now = echt; }
});
