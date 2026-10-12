import test from 'node:test';
import assert from 'node:assert/strict';
import { NIVEAUS, deling, nieuwSpel, stand, speel, zetten, zoek, tip, klaar, kanAfmaken, afmaakZetten, bestemmingen, zetVoor, opFundamenten, makeRng, ZetFout } from '../js/games/solitaire/engine.js';

const alle = (g) => [...g.tab.flatMap((c) => c.k), ...g.stock, ...g.waste, ...[0, 1, 2, 3].flatMap((s) => Array.from({ length: g.found[s] }, (_, i) => s * 13 + i))].sort((a, b) => a - b);
const heel = Array.from({ length: 52 }, (_, i) => i);

test('de deling heeft 52 verschillende kaarten, 7 stapels en een voorraad van 24', () => {
  for (const n of Object.keys(NIVEAUS)) {
    const g = deling(n, `t-${n}`);
    assert.deepEqual(alle(g), heel);
    assert.deepEqual(g.tab.map((c) => c.k.length), [1, 2, 3, 4, 5, 6, 7]);
    assert.ok(g.tab.every((c) => c.u === 1));
    assert.equal(g.stock.length, 24);
    assert.equal(g.trek, NIVEAUS[n].trek);
  }
});

test('dezelfde seed geeft dezelfde deling', () => {
  assert.deepEqual(deling('gemiddeld', 'abc'), deling('gemiddeld', 'abc'));
  assert.notDeepEqual(deling('gemiddeld', 'abc').stock, deling('gemiddeld', 'abd').stock);
});

test('trekken: 1 of 3 kaarten, de aflegstapel groeit, terug op de voorraad na het einde', () => {
  let g = deling('gemiddeld', 'trek');
  const eerste = g.stock[g.stock.length - 1];
  g = speel(g, ['d']);
  assert.equal(g.waste.at(-1), eerste); assert.equal(g.stock.length, 23); assert.equal(g.wv, 1);
  let h = deling('extreem', 'trek');
  h = speel(h, ['d']);
  assert.equal(h.waste.length, 3); assert.equal(h.wv, 3); assert.equal(h.stock.length, 21);
  while (h.stock.length) h = speel(h, ['d']);
  assert.throws(() => speel(h, ['d']), ZetFout);
  h = speel(h, ['r']);
  assert.equal(h.waste.length, 0); assert.equal(h.stock.length, 24);
  assert.deepEqual(alle(h), heel);
});

test('elke zet die de engine noemt is geldig en houdt de 52 kaarten heel', () => {
  const rng = makeRng('wandeling');
  for (const n of Object.keys(NIVEAUS)) {
    let g = deling(n, 'w1');
    for (let i = 0; i < 300 && !klaar(g); i++) {
      const lijst = zetten(g, { terugNaarStapel: true });
      assert.ok(lijst.length > 0);
      const z = lijst[Math.floor(rng() * lijst.length)];
      g = speel(g, z);
      assert.deepEqual(alle(g), heel);
      g.tab.forEach((c) => { assert.ok(c.u <= c.k.length); assert.ok(c.k.length === 0 || c.u >= 1); });
    }
  }
});

test('een ongeldige zet wordt geweigerd', () => {
  const g = deling('makkelijk', 'ongeldig');
  assert.throws(() => speel(g, ['tt', 0, 1, 0]), ZetFout);
  assert.throws(() => speel(g, ['tt', 0, 5, 1]), ZetFout);
  assert.throws(() => speel(g, ['wf']), ZetFout);
  assert.throws(() => speel(g, ['r']), ZetFout);
});

test('een kaart onthullen: de bovenste verborgen kaart gaat open', () => {
  // stapel 0 = [aas hartens], stapel 1 = [?, 2 schoppen]: aas hartens ligt niet op 2 schoppen; maak een eigen stand
  const g = { trek: 1, tab: [{ k: [26 + 5], u: 1 }, { k: [3, 13 + 6], u: 1 }, ...Array.from({ length: 5 }, () => ({ k: [], u: 0 }))], stock: [], waste: [], wv: 0, found: [0, 0, 0, 0] };
  // 6 van ruiten (26+5) op 7 van harten (13+6): rang 5 op rang 6, beide rood -> mag niet
  assert.throws(() => speel(g, ['tt', 0, 1, 1]), ZetFout);
  const h = { ...g, tab: [{ k: [39 + 5], u: 1 }, g.tab[1], { k: [7], u: 1 }, ...g.tab.slice(3)] };            // 6 van klaver op 7 van harten; een 8 van schoppen ernaast
  const n = speel(h, ['tt', 0, 1, 1]);
  assert.deepEqual(n.tab[1].k, [3, 19, 44]); assert.equal(n.tab[1].u, 2);
  const m = speel(n, ['tt', 1, 2, 2]);
  assert.deepEqual(m.tab[1].k, [3]); assert.equal(m.tab[1].u, 1);                  // de 4 van schoppen gaat open
  assert.deepEqual(m.tab[2].k, [7, 19, 44]); assert.equal(m.tab[2].u, 3);
});

test('alleen een heer op een lege stapel; fundament per kleur van aas omhoog', () => {
  const g = { trek: 1, tab: [{ k: [12], u: 1 }, { k: [], u: 0 }, { k: [], u: 0 }, { k: [], u: 0 }, { k: [], u: 0 }, { k: [], u: 0 }, { k: [5], u: 1 }], stock: [], waste: [], wv: 0, found: [0, 0, 0, 0] };
  assert.throws(() => speel(g, ['tt', 6, 1, 1]), ZetFout);                          // 6 op lege stapel mag niet
  assert.deepEqual(bestemmingen(g, { soort: 'tab', van: 6, n: 1 }), { fundament: false, stapels: [] });
  assert.deepEqual(bestemmingen(g, { soort: 'tab', van: 0, n: 1 }).stapels, []);    // een heer die al onderaan staat
  const h = { ...g, tab: [{ k: [3, 12], u: 1 }, ...g.tab.slice(1)] };
  assert.deepEqual(bestemmingen(h, { soort: 'tab', van: 0, n: 1 }).stapels, [1, 2, 3, 4, 5]);
  const a = { ...g, tab: [{ k: [0], u: 1 }, ...g.tab.slice(1)] };
  assert.equal(bestemmingen(a, { soort: 'tab', van: 0, n: 1 }).fundament, true);
  const b = speel(a, ['tf', 0]);
  assert.equal(b.found[0], 1); assert.equal(b.tab[0].k.length, 0);
});

test('een bewaard spel: de stand volgt uit de zetten, ongedaan maken is een zet minder', () => {
  const s = nieuwSpel('gemiddeld', 'bewaard');
  let g = stand(s);
  for (let i = 0; i < 12; i++) { const z = zetten(g)[0]; s.zetten.push(z); g = speel(g, z); }
  assert.deepEqual(stand(s), g);
  const vorige = stand(s, 11);
  s.zetten.pop();
  assert.deepEqual(stand(s), vorige);
  assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
});

test('makkelijk en moeilijk zijn te winnen: de zoeker vindt een weg en die klopt', () => {
  for (const n of ['makkelijk', 'moeilijk']) {
    for (let i = 0; i < 4; i++) {
      const g = deling(n, `win-${n}-${i}`);
      const r = zoek(g, 60000);
      assert.ok(r.gevonden, `${n} ${i} niet opgelost`);
      let h = g; for (const z of r.pad) h = speel(h, z);
      assert.ok(klaar(h));
    }
  }
});

test('een tip is een geldige zet die verder helpt, en leidt uiteindelijk naar de winst', () => {
  let g = deling('makkelijk', 'tips'), plan = null;
  for (let i = 0; i < 1500 && !klaar(g); i++) {
    const t = tip(g, plan);
    assert.ok(t && t.zet, 'tip ontbreekt');
    plan = t.plan;
    g = speel(g, t.zet);
  }
  assert.ok(klaar(g));
});

test('afmaken: als alles open ligt, gaan de kaarten vanzelf naar de fundamenten', () => {
  let g = deling('makkelijk', 'afmaken');
  const r = zoek(g, 60000);
  for (const z of r.pad) { g = speel(g, z); if (kanAfmaken(g)) break; }
  assert.ok(kanAfmaken(g) || klaar(g));
  if (!klaar(g)) { for (const z of afmaakZetten(g)) g = speel(g, z); }
  assert.ok(klaar(g)); assert.equal(opFundamenten(g), 52);
});

test('zetVoor maakt bij een bron en bestemming de goede zet', () => {
  assert.deepEqual(zetVoor({ soort: 'waste' }, { soort: 'fundament' }), ['wf']);
  assert.deepEqual(zetVoor({ soort: 'tab', van: 2, n: 3 }, { soort: 'stapel', naar: 5 }), ['tt', 2, 3, 5]);
  assert.deepEqual(zetVoor({ soort: 'found', s: 1 }, { soort: 'stapel', naar: 0 }), ['ft', 1, 0]);
});

test('delen gaat snel, ook als er geprobeerd moet worden', () => {
  const t0 = Date.now();
  for (let i = 0; i < 10; i++) { deling('makkelijk', `snel${i}`); deling('moeilijk', `snel${i}`); }
  const ms = Date.now() - t0;
  assert.ok(ms < 20000, `${ms} ms`);
  console.log(`# 20 oplosbare delingen in ${ms} ms`);
});
