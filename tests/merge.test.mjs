import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeSnapshots, sameSnapshot } from '../js/shared/merge.js';

const slot = (updatedAt, extra = {}) => ({ seed: 's', difficulty: 'gemiddeld', state: { n: updatedAt }, updatedAt, ...extra });

test('hoogste aantal opgelost wint, dagpuzzel: nieuwste datum', () => {
  const m = mergeSnapshots(
    { profile: { name: 'Anna' }, games: { sudoku: { completed: 3, dailyDone: '2026-10-08', slots: {} } }, lastGame: null },
    { profile: { name: 'Anna' }, games: { sudoku: { completed: 5, dailyDone: '2026-10-10', slots: {} } }, lastGame: null });
  assert.equal(m.games.sudoku.completed, 5);
  assert.equal(m.games.sudoku.dailyDone, '2026-10-10');
});

test('een lopend spel: het laatst gespeelde wint, per spel en per plek', () => {
  const local = { profile: {}, games: { sudoku: { slots: { normal: slot(100), daily: slot(500) } }, kruiswoord: { slots: { normal: slot(900) } } }, lastGame: { id: 'kruiswoord', slot: 'normal' } };
  const remote = { profile: {}, games: { sudoku: { slots: { normal: slot(300), daily: slot(200) } }, woordzoeker: { slots: { normal: slot(50) } } }, lastGame: { id: 'sudoku', slot: 'normal' } };
  const m = mergeSnapshots(local, remote);
  assert.equal(m.games.sudoku.slots.normal.updatedAt, 300);
  assert.equal(m.games.sudoku.slots.daily.updatedAt, 500);
  assert.equal(m.games.kruiswoord.slots.normal.updatedAt, 900, 'alleen lokaal: blijft');
  assert.equal(m.games.woordzoeker.slots.normal.updatedAt, 50, 'alleen op de server: komt erbij');
  assert.deepEqual(m.lastGame, { id: 'kruiswoord', slot: 'normal' }, 'het nieuwste spel is het laatst gespeelde');
});

test('een afgerond spel komt niet terug vanaf een apparaat met de oude stand', () => {
  // lokaal is net uitgespeeld (wismarkering, completed omhoog), op de server staat nog de oude stand
  const local = { profile: {}, games: { sudoku: { completed: 1, slots: { normal: { cleared: true, updatedAt: 200 } } } }, lastGame: null };
  const remote = { profile: {}, games: { sudoku: { completed: 0, slots: { normal: slot(100) } } }, lastGame: null };
  for (const m of [mergeSnapshots(local, remote), mergeSnapshots(remote, local)]) {
    assert.equal(m.games.sudoku.completed, 1);
    assert.equal(m.games.sudoku.slots.normal.cleared, true, 'het afgeronde spel blijft weg');
  }
});

test('een nieuwer spel wint van een oude wismarkering, en een wismarkering van een ouder spel', () => {
  const wis = { cleared: true, updatedAt: 200 };
  const a = { profile: {}, games: { sudoku: { slots: { normal: wis } } }, lastGame: null };
  const nieuwer = { profile: {}, games: { sudoku: { slots: { normal: slot(300) } } }, lastGame: null };
  assert.equal(mergeSnapshots(a, nieuwer).games.sudoku.slots.normal.updatedAt, 300);
  assert.ok(sameSnapshot(mergeSnapshots(a, nieuwer), mergeSnapshots(nieuwer, a)));
});

test('een oud spel zonder wismarkering (null) verliest nog steeds niet', () => {
  const a = { profile: {}, games: { sudoku: { slots: { normal: null } } }, lastGame: null };
  const b = { profile: {}, games: { sudoku: { slots: { normal: slot(100) } } }, lastGame: null };
  assert.equal(mergeSnapshots(a, b).games.sudoku.slots.normal.updatedAt, 100);
});

test('merge verandert niets aan de invoer, en is stabiel', () => {
  const a = { profile: { name: 'A' }, games: { sudoku: { completed: 1, slots: { normal: slot(1) } } }, lastGame: null };
  const b = { profile: { name: 'B' }, games: { sudoku: { completed: 2, slots: { normal: slot(2) } } }, lastGame: null };
  const copyA = JSON.stringify(a), copyB = JSON.stringify(b);
  const m1 = mergeSnapshots(a, b), m2 = mergeSnapshots(b, a);
  assert.equal(JSON.stringify(a), copyA); assert.equal(JSON.stringify(b), copyB);
  assert.deepEqual(m1.games, m2.games, 'volgorde maakt niet uit');
  assert.ok(sameSnapshot(mergeSnapshots(m1, m1), m1), 'nog eens samenvoegen verandert niets');
});

test('zonder voortgang op de server blijft alles lokaal', () => {
  const a = { profile: { name: 'A' }, games: {}, lastGame: null };
  assert.equal(mergeSnapshots(a, null), a);
});

test('statistieken en archief van de puzzel van de dag worden samengevoegd', () => {
  const a = { profile: {}, games: { sudoku: { stats: { makkelijk: { started: 5, won: 3, best: 300, total: 1200 } }, daily: { '2026-10-10': { time: 400, difficulty: 'moeilijk' } }, slots: {} } }, lastGame: null };
  const b = { profile: {}, games: { sudoku: { stats: { makkelijk: { started: 4, won: 4, best: 280, total: 1500 }, gemiddeld: { started: 1, won: 0, best: null, total: 0 } }, daily: { '2026-10-10': { time: 350, difficulty: 'moeilijk' }, '2026-10-11': { time: 500, difficulty: 'moeilijk' } }, slots: {} } }, lastGame: null };
  const m = mergeSnapshots(a, b), n = mergeSnapshots(b, a);
  assert.deepEqual(m.games.sudoku.daily, { '2026-10-10': { time: 350, difficulty: 'moeilijk' }, '2026-10-11': { time: 500, difficulty: 'moeilijk' } });
  assert.deepEqual(m.games.sudoku.stats.makkelijk, { started: 5, won: 4, best: 280, total: 1500 });
  assert.equal(m.games.sudoku.stats.gemiddeld.started, 1);
  assert.deepEqual(m.games, n.games, 'volgorde maakt niet uit');
  assert.ok(sameSnapshot(mergeSnapshots(m, m), m));
});
