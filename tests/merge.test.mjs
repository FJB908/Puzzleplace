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

test('een afgerond spel (geen slot meer) wist het lopende spel van het andere apparaat niet zomaar', () => {
  // lokaal is net uitgespeeld (slot weg, completed omhoog), op de server staat nog de oude stand
  const local = { profile: {}, games: { sudoku: { completed: 1, slots: { normal: null } } }, lastGame: null };
  const remote = { profile: {}, games: { sudoku: { completed: 0, slots: { normal: slot(100) } } }, lastGame: null };
  const m = mergeSnapshots(local, remote);
  assert.equal(m.games.sudoku.completed, 1);
  assert.equal(m.games.sudoku.slots.normal.updatedAt, 100, 'liever een oud spel te veel dan voortgang kwijt');
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
