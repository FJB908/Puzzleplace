import test from 'node:test';
import assert from 'node:assert/strict';
import { generate, countSolutions, solvableBySingles, findConflicts, LEVELS } from '../js/games/sudoku/engine.js';

const valid = (grid) => {
  for (let n = 0; n < 9; n++) {
    const row = new Set(), col = new Set(), box = new Set();
    for (let k = 0; k < 9; k++) {
      row.add(grid[n * 9 + k]); col.add(grid[k * 9 + n]);
      box.add(grid[(Math.floor(n / 3) * 3 + Math.floor(k / 3)) * 9 + (n % 3) * 3 + (k % 3)]);
    }
    if (row.size !== 9 || col.size !== 9 || box.size !== 9) return false;
  }
  return true;
};

for (const level of Object.keys(LEVELS)) {
  test(`${level}: geldige oplossing, precies één oplossing, juiste moeilijkheid`, () => {
    for (let n = 0; n < 15; n++) {
      const { puzzle, solution } = generate(`test-${n}`, level);
      assert.ok(valid(solution), 'oplossing is geldig');
      puzzle.forEach((v, i) => v && assert.equal(v, solution[i]));
      assert.equal(countSolutions(puzzle), 1, 'unieke oplossing');
      if (LEVELS[level].singles) assert.ok(solvableBySingles(puzzle), 'oplosbaar zonder gokken');
      const clues = puzzle.filter(Boolean).length;
      assert.ok(clues <= LEVELS[level].clues + 2, `aantal gegeven cijfers (${clues})`);
    }
  });
}

test('zelfde seed geeft dezelfde puzzel', () => {
  assert.deepEqual(generate('2026-10-10', 'gemiddeld'), generate('2026-10-10', 'gemiddeld'));
  assert.notDeepEqual(generate('a', 'gemiddeld').puzzle, generate('b', 'gemiddeld').puzzle);
});

test('moeilijker niveau heeft minder gegeven cijfers', () => {
  const avg = (lvl) => [...Array(10).keys()].reduce((s, n) => s + generate(`avg-${n}`, lvl).puzzle.filter(Boolean).length, 0) / 10;
  assert.ok(avg('makkelijk') > avg('gemiddeld') && avg('gemiddeld') > avg('moeilijk'));
});

test('puzzels maken is snel genoeg voor een telefoon', () => {
  const t = performance.now();
  for (let n = 0; n < 10; n++) generate(`speed-${n}`, 'moeilijk');
  const per = (performance.now() - t) / 10;
  assert.ok(per < 400, `gemiddeld ${per.toFixed(0)} ms per moeilijke puzzel`);
});

test('botsingen worden gevonden', () => {
  const v = new Array(81).fill(0);
  v[0] = 5; v[8] = 5; v[40] = 5;
  assert.deepEqual([...findConflicts(v)].sort((a, b) => a - b), [0, 8]);
});
