import test from 'node:test';
import assert from 'node:assert/strict';
import { geldigeDag, verschuif, dagMoeilijkheid, speelbaar, reeks, langsteReeks, maandRooster, tijdTekst, BEGIN } from '../js/shared/dagelijks.js';

test('datums: geldig, verschuiven over maand- en jaargrenzen', () => {
  assert.ok(geldigeDag('2026-10-12')); assert.ok(!geldigeDag('2026-02-30')); assert.ok(!geldigeDag('12-10-2026')); assert.ok(!geldigeDag(null));
  assert.equal(verschuif('2026-03-01', -1), '2026-02-28');
  assert.equal(verschuif('2024-03-01', -1), '2024-02-29');
  assert.equal(verschuif('2026-12-31', 1), '2027-01-01');
});

test('elke weekdag een vast niveau, voor iedereen hetzelfde', () => {
  assert.equal(dagMoeilijkheid('2026-10-12'), 'makkelijk');      // maandag
  assert.equal(dagMoeilijkheid('2026-10-14'), 'gemiddeld');      // woensdag
  assert.equal(dagMoeilijkheid('2026-10-17'), 'moeilijk');       // zaterdag
  assert.equal(dagMoeilijkheid('2026-10-18'), 'moeilijk');       // zondag
  for (let k = 0; k < 400; k++) assert.ok(['makkelijk', 'gemiddeld', 'moeilijk'].includes(dagMoeilijkheid(verschuif('2025-01-01', k))));
});

test('speelbaar: niet in de toekomst, niet voor het begin van het archief', () => {
  assert.ok(speelbaar('2026-10-12', '2026-10-12')); assert.ok(speelbaar(BEGIN, '2026-10-12'));
  assert.ok(!speelbaar('2026-10-13', '2026-10-12')); assert.ok(!speelbaar('2024-12-31', '2026-10-12')); assert.ok(!speelbaar('nu', '2026-10-12'));
});

test('de reeks: vandaag of gisteren telt, een gat breekt hem', () => {
  const g = { '2026-10-12': {}, '2026-10-11': {}, '2026-10-10': {}, '2026-10-07': {} };
  assert.equal(reeks(g, '2026-10-12'), 3);
  assert.equal(reeks(g, '2026-10-13'), 3, 'vandaag nog niet gedaan: de reeks van gisteren blijft staan');
  assert.equal(reeks(g, '2026-10-14'), 0, 'gisteren gemist: de reeks is weg');
  assert.equal(reeks({}, '2026-10-12'), 0);
  assert.equal(reeks(new Set(['2026-10-12']), '2026-10-12'), 1);
  assert.equal(langsteReeks({ ...g, '2026-10-06': {}, '2026-10-05': {}, '2026-10-08': {} }), 4);   // 5, 6, 7 en 8 oktober
  assert.equal(langsteReeks({}), 0);
});

test('maandrooster: maandag eerst, alle dagen er precies één keer', () => {
  const r = maandRooster(2026, 9);                                // oktober 2026 begint op een donderdag
  assert.ok(r.every((w) => w.length === 7));
  assert.deepEqual(r[0].slice(0, 4), [null, null, null, '2026-10-01']);
  const dagen = r.flat().filter(Boolean);
  assert.equal(dagen.length, 31); assert.equal(new Set(dagen).size, 31);
  assert.equal(maandRooster(2026, 1).flat().filter(Boolean).length, 28);
  assert.equal(maandRooster(2024, 1).flat().filter(Boolean).length, 29);
});

test('tijd als tekst', () => {
  assert.equal(tijdTekst(0), '00:00'); assert.equal(tijdTekst(65), '01:05'); assert.equal(tijdTekst(3725), '1:02:05'); assert.equal(tijdTekst(-3), '00:00');
});
