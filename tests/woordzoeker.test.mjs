import test from 'node:test';
import assert from 'node:assert/strict';
import { generate, LEVELS, line, snap, matchWord, wordCells } from '../js/games/woordzoeker/engine.js';
import { THEMES } from '../js/games/woordzoeker/woorden.js';

test('woordenlijsten: alleen A-Z, geen dubbele woorden, genoeg per thema', () => {
  for (const t of THEMES) {
    assert.ok(t.words.length >= 18, `${t.id}: genoeg woorden`);
    assert.equal(new Set(t.words).size, t.words.length, `${t.id}: dubbel woord`);
    for (const w of t.words) assert.match(w, /^[A-Z]{3,12}$/, `${t.id}: ${w}`);
  }
});

for (const level of Object.keys(LEVELS)) {
  test(`${level}: elk woord staat precies waar het hoort, juiste richtingen en afmetingen`, () => {
    const spec = LEVELS[level];
    for (let n = 0; n < 40; n++) {
      const p = generate(`ws-${n}`, level);
      assert.equal(p.size, spec.size);
      assert.equal(p.grid.length, spec.size);
      p.grid.forEach((row) => assert.match(row, new RegExp(`^[A-Z]{${spec.size}}$`)));
      assert.equal(p.words.length, spec.count);
      assert.equal(new Set(p.words.map((w) => w.word)).size, spec.count, 'geen dubbele woorden');
      for (const w of p.words) {
        assert.ok(spec.dirs.some(([dr, dc]) => dr === w.dr && dc === w.dc), `${w.word}: richting toegestaan`);
        const letters = wordCells(w).map(([r, c]) => p.grid[r][c]).join('');
        assert.equal(letters, w.word, `${w.word} staat op zijn plek`);
        // en het is vindbaar met dezelfde functie die het spel gebruikt, ook achterstevoren
        const cells = wordCells(w);
        assert.equal(matchWord(p, cells, new Set()), w.word);
        assert.equal(matchWord(p, [...cells].reverse(), new Set()), w.word);
        assert.equal(matchWord(p, cells, new Set([w.word])), null, 'al gevonden telt niet nog eens');
      }
    }
  });
}

test('zelfde seed geeft dezelfde puzzel, andere seed een andere', () => {
  assert.deepEqual(generate('2026-10-10', 'gemiddeld'), generate('2026-10-10', 'gemiddeld'));
  assert.notDeepEqual(generate('a', 'gemiddeld').grid, generate('b', 'gemiddeld').grid);
});

test('puzzels maken is snel', () => {
  const t = performance.now();
  for (let n = 0; n < 20; n++) generate(`speed-${n}`, 'extreem');
  assert.ok((performance.now() - t) / 20 < 60);
});

test('lijnen en snappen', () => {
  assert.equal(line(0, 0, 0, 4).length, 5);
  assert.equal(line(0, 0, 3, 3).length, 4);
  assert.equal(line(0, 0, 1, 3), null, 'geen rechte lijn');
  // een tik die niet precies op de lijn ligt wordt naar de dichtstbijzijnde richting gebracht
  const s = snap(10, 2, 2, 2, 6);
  assert.deepEqual(s[s.length - 1], [2, 6]);
  const d = snap(10, 2, 2, 5, 6);                            // bijna schuin: dr=3, dc=4 -> schuin of horizontaal
  assert.ok(d.length >= 4);
  const clipped = snap(5, 0, 0, 0, 20);
  assert.equal(clipped.length, 5, 'blijft binnen het rooster');
});
