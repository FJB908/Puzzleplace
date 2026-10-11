import test from 'node:test';
import assert from 'node:assert/strict';
import { friendRows, meestGespeeld, stand, MAX_VRIENDEN } from '../js/shared/startvrienden.js';

const me = 'ik';
const vriend = (id, lastSeen = '2026-10-01') => ({ id, name: id.toUpperCase(), lastSeen });
const partij = (id, met, { yourTurn = false, updatedAt = 1, status = 'active', scores = null } = {}) => ({
  id, status, yourTurn, updatedAt, players: [{ id: me, name: 'Ik' }, { id: met, name: met }], summary: scores ? { scores } : null,
});
const data = (friends, incoming = []) => ({ friends: friends.map((f) => vriend(f)), incoming: incoming.map((f) => vriend(f)), outgoing: [] });
const kinds = (r) => r.rows.map((x) => `${x.kind}:${x.friend.id}`);

test('wie op jou wacht staat bovenaan, de langst wachtende eerst', () => {
  const r = friendRows(me, data(['a', 'b', 'c', 'd']), [
    partij('1', 'b', { updatedAt: 50 }), partij('2', 'c', { yourTurn: true, updatedAt: 30 }), partij('3', 'd', { yourTurn: true, updatedAt: 10 })]);
  assert.deepEqual(kinds(r), ['beurt:d', 'beurt:c', 'wacht:b', 'vrij:a']);
});

test('volgorde: aan de beurt, verzoeken, wachten, rest', () => {
  const r = friendRows(me, data(['a', 'b', 'c'], ['x']), [partij('1', 'b'), partij('2', 'c', { yourTurn: true })]);
  assert.deepEqual(kinds(r), ['beurt:c', 'verzoek:x', 'wacht:b', 'vrij:a']);
});

test('nooit meer dan vijf rijen, en je ziet hoeveel er nog zijn', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const r = friendRows(me, data(ids), [partij('1', 'h', { yourTurn: true })]);
  assert.equal(r.rows.length, MAX_VRIENDEN);
  assert.equal(r.rows[0].friend.id, 'h', 'wie op jou wacht valt nooit buiten beeld');
  assert.equal(r.meer, 3); assert.equal(r.totaal, 8);
});

test('één rij per vriend, ook met meer partijen; afgelopen partijen tellen niet', () => {
  const r = friendRows(me, data(['a']), [partij('1', 'a', { updatedAt: 5 }), partij('2', 'a', { yourTurn: true, updatedAt: 9 }), partij('3', 'a', { status: 'done' })]);
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].kind, 'beurt'); assert.equal(r.rows[0].aantal, 2); assert.equal(r.rows[0].match.id, '2');
  assert.equal(friendRows(me, data(['a']), [partij('3', 'a', { status: 'done' })]).rows[0].kind, 'vrij');
});

test('een partij met iemand die geen vriend meer is, telt niet mee', () => {
  assert.equal(friendRows(me, data(['a']), [partij('1', 'weg', { yourTurn: true })]).rows[0].kind, 'vrij');
});

test('zonder vrienden is er niets', () => {
  const r = friendRows(me, data([]), []);
  assert.deepEqual(r, { rows: [], meer: 0, totaal: 0 });
});

test('de stand staat er pas als er gespeeld is', () => {
  assert.equal(stand(partij('1', 'a', { scores: { ik: 0, a: 0 } }), me), '');
  assert.equal(stand(partij('1', 'a', { scores: { ik: 12, a: 10 } }), me), '12–10');
  assert.equal(stand(partij('1', 'a'), me), '');
});

test('meestGespeeld: de vriend met de meeste partijen (ook afgelopen) staat bovenaan, een lopende partij staat erbij', () => {
  const vrienden = [{ id: 'a', name: 'Anna', lastSeen: '2026-01-01' }, { id: 'b', name: 'Bram', lastSeen: '2026-03-01' }, { id: 'c', name: 'Cor', lastSeen: '2026-02-01' }];
  const m = (id, tegen, status, updatedAt = 1, game = 'woordtuin') => ({ id, game, status, updatedAt, players: [{ id: 'ik' }, { id: tegen }] });
  const partijen = [m('1', 'a', 'done'), m('2', 'a', 'done'), m('3', 'a', 'active', 5), m('4', 'c', 'done'), m('5', 'b', 'done', 1, 'sudoku')];
  const r = meestGespeeld('ik', vrienden, partijen);
  assert.deepEqual(r.map((x) => x.friend.id), ['a', 'b', 'c'].sort((x, y) => ({ a: 0, b: 2, c: 1 })[x] - ({ a: 0, b: 2, c: 1 })[y]).map((x) => x), 'Anna (3), dan Cor (1), dan Bram (0)');
  assert.deepEqual(r.map((x) => x.aantal), [3, 1, 0]);
  assert.equal(r[0].lopend.id, '3'); assert.equal(r[1].lopend, null);
  assert.deepEqual(meestGespeeld('ik', [], partijen), []);
});
