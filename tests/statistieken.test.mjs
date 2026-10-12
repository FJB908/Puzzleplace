import test from 'node:test';
import assert from 'node:assert/strict';
import * as store from '../js/store.js';

test('beste tijd, gemiddelde en gespeeld per niveau', () => {
  store.resetAll();
  store.countStart('sudoku', 'makkelijk'); store.countStart('sudoku', 'makkelijk'); store.countStart('sudoku', 'makkelijk');
  const a = store.recordWin('sudoku', { difficulty: 'makkelijk', time: 300 });
  assert.deepEqual({ r: a.record, p: a.previous, b: a.best, w: a.won, g: a.average }, { r: true, p: null, b: 300, w: 1, g: 300 });
  const b = store.recordWin('sudoku', { difficulty: 'makkelijk', time: 400 });
  assert.deepEqual({ r: b.record, p: b.previous, b: b.best, g: b.average }, { r: false, p: 300, b: 300, g: 350 });
  const c = store.recordWin('sudoku', { difficulty: 'makkelijk', time: 250 });
  assert.deepEqual({ r: c.record, p: c.previous, b: c.best }, { r: true, p: 300, b: 250 });
  const s = store.getStats('sudoku').makkelijk;
  assert.deepEqual(s, { started: 3, won: 3, best: 250, total: 950 });
  assert.equal(store.getStats('sudoku').moeilijk, undefined, 'andere niveaus blijven leeg');
});

test('een dagpuzzel komt in het archief; nog eens spelen telt niet dubbel, een snellere tijd wordt bewaard', () => {
  store.resetAll();
  const a = store.recordWin('sudoku', { difficulty: 'gemiddeld', time: 500, day: '2026-10-10' });
  assert.equal(a.repeat, false);
  assert.deepEqual(store.getDaily('sudoku'), { '2026-10-10': { difficulty: 'gemiddeld', time: 500 } });
  const b = store.recordWin('sudoku', { difficulty: 'gemiddeld', time: 450, day: '2026-10-10' });
  assert.equal(b.repeat, true);
  assert.equal(store.getDaily('sudoku')['2026-10-10'].time, 450);
  assert.equal(store.getStats('sudoku').gemiddeld.won, 1, 'niet nog eens geteld');
  store.recordWin('sudoku', { difficulty: 'gemiddeld', time: 900, day: '2026-10-10' });
  assert.equal(store.getDaily('sudoku')['2026-10-10'].time, 450, 'een tragere tijd vervangt niets');
});

test('plekken van de puzzel van de dag', () => {
  assert.equal(store.dailySlot('2026-10-10'), 'daily:2026-10-10');
  assert.ok(store.isDailySlot('daily') && store.isDailySlot('daily:2026-10-10') && !store.isDailySlot('normal'));
  assert.equal(store.slotDay('daily:2026-10-10', null), '2026-10-10');
  assert.equal(store.slotDay('daily', { day: '2026-10-09' }), '2026-10-09');
});
