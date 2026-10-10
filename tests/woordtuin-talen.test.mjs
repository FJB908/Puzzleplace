import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TALEN, TAAL_IDS, typInvoer, vouw } from '../js/shared/talen.js';
import { laadWoordenboek } from '../js/games/woordtuin/woordenboek.js';
import { newGame, legalMoves, applyMove, botMove, result, counts, pathsFor, makeRng, checkMove, MoveError, SIZE } from '../js/games/woordtuin/engine.js';
import { SCHAAL } from '../js/games/woordtuin/schaal.js';
import { createApp } from '../server/index.mjs';

// Woordtuin in elke taal: de woordenlijst is schoon en compleet genoeg, borden zijn speelbaar, een hele partij verloopt, en de server doet mee.

const pad = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const talen = TAAL_IDS.filter((t) => existsSync(pad(`js/games/woordtuin/talen/${t}.js`)));
const lijst = (taal, naam) => { const f = pad(`tools/woordtuin/${taal}/${naam}`); return existsSync(f) ? new Set(readFileSync(f, 'utf8').split('\n').flatMap((l) => l.replace(/#.*/, '').trim().split(/\s+/)).filter(Boolean)) : new Set(); };

for (const taal of talen) {
  const t = TALEN[taal];

  test(`${taal}: de woordenlijst bestaat uit gewone woorden van 3 tot 7 letters van het alfabet`, async () => {
    const { WOORDEN, ALLEDAAGS, zak } = await laadWoordenboek(taal);
    const re = new RegExp(`^[${t.alfabet}]{3,7}$`, 'u');
    for (const w of WOORDEN) assert.match(w, re, w);
    assert.equal(new Set(WOORDEN).size, WOORDEN.length, 'dubbele woorden');
    assert.ok(WOORDEN.length >= 8000, `${WOORDEN.length} woorden is te weinig`);
    assert.ok(ALLEDAAGS.size >= 4000 && ALLEDAAGS.size < WOORDEN.length, `alledaags: ${ALLEDAAGS.size}`);
    for (const w of ALLEDAAGS) assert.ok(WOORDEN.includes(w) || false, `${w} is alledaags maar telt niet mee`);
    // elk woord heeft een klinker (of een klinkerachtige letter), anders is het geen woord
    const klinkers = new Set([...t.klinkers, ...(t.klinkerachtig || ''), ...(t.schrift === 'latijn' ? 'y' : '')]);
    for (const w of WOORDEN) assert.ok([...w].some((c) => klinkers.has(c)), `${w} heeft geen klinker`);
    // de zak voor het bord: alleen letters van het alfabet, redelijk veel klinkers
    assert.ok(zak.length >= 60 && zak.every((c) => t.alfabet.includes(c)), 'zak');
    const aandeel = zak.filter((c) => t.klinkers.includes(c)).length / zak.length;
    assert.ok(aandeel > 0.25 && aandeel < 0.65, `aandeel klinkers in de zak: ${aandeel.toFixed(2)}`);
  });

  test(`${taal}: wat beoordeeld is blijft eruit: blokkeerlijst weg, grove woorden nooit voor de computer`, async () => {
    const { WOORDEN, ALLEDAAGS } = await laadWoordenboek(taal);
    const set = new Set(WOORDEN);
    const toegestaan = lijst(taal, 'toegestaan.txt');
    for (const w of lijst(taal, 'blokkeerlijst.txt')) if (!toegestaan.has(w)) assert.ok(!set.has(w), `${w} staat op de blokkeerlijst maar telt mee`);
    for (const w of lijst(taal, 'ruw.txt')) assert.ok(!ALLEDAAGS.has(w), `${w} is grof maar de computer mag het spelen`);
    for (const w of lijst(taal, 'rar.txt')) assert.ok(!ALLEDAAGS.has(w), `${w} is niet alledaags maar de computer mag het spelen`);
  });

  test(`${taal}: borden zijn speelbaar en een hele partij tegen de computer verloopt`, async () => {
    await laadWoordenboek(taal);
    for (let i = 0; i < 4; i++) {
      const g = newGame(`talen-${taal}-${i}`, { lang: taal });
      assert.equal(g.lang, taal);
      assert.equal(g.letters.length, SIZE * SIZE);
      assert.ok([...g.letters].every((c) => t.alfabet.includes(c)), `letters buiten het alfabet: ${g.letters}`);
      assert.ok(legalMoves(g, 1, false, true).length >= 100, 'te weinig alledaagse woorden op het bord');
      const klinkers = [...g.letters].filter((c) => t.klinkers.includes(c)).length;
      assert.ok(klinkers >= 5 && klinkers <= 24, `klinkers ${klinkers}`);
    }
    for (const [seed, a, b] of [['p1', 'makkelijk', 'extreem'], ['p2', 'gemiddeld', 'moeilijk']]) {
      let s = newGame(`talen-${taal}-${seed}`, { first: 1, lang: taal }); const rng = makeRng(`${taal}${seed}`); let n = 0;
      while (!s.over) {
        assert.ok(n++ < 80, 'partij duurt te lang');
        const m = botMove(s, s.turn, s.turn === 1 ? a : b, rng) || legalMoves(s, s.turn)[0];
        assert.ok(m, 'wie aan de beurt is heeft een zet');
        s = applyMove(s, s.turn, m.path);
      }
      const c = counts(s), r = result(s);
      assert.equal(c[0] + c[1] + c[2], 36);
      assert.equal(r.scores[1] + r.scores[2] + r.open, 36);
      assert.equal(new Set(s.played).size, s.played.length, 'geen woord twee keer');
    }
  });

  test(`${taal}: een woord typen met accenten en hoofdletters vindt dezelfde plek als het gevouwen woord`, async () => {
    await laadWoordenboek(taal);
    const g = newGame(`typen-${taal}`, { lang: taal, first: 1 });
    const zet = legalMoves(g, 1, false, true).find((m) => m.word.length >= 4);
    // het woord zoals het getypt wordt: hoofdletters, en wat een toetsenbord van die taal zou geven
    const getypt = zet.word.toUpperCase();
    assert.equal(typInvoer(getypt, taal), zet.word);
    assert.equal(vouw(getypt, taal), zet.word);
    const plekken = pathsFor(g, 1, typInvoer(getypt, taal));
    assert.ok(plekken.some((p) => p.join() === zet.path.join()), 'de plek van het woord wordt gevonden');
    assert.doesNotThrow(() => checkMove(g, 1, zet.path));
    const slecht = [...zet.word].reverse().join('') === zet.word ? zet.word + 'x' : [...zet.word].reverse().join('');
    // een gespiegeld woord is zelden een woord; zo niet, dan is het gewoon ook goed
    try { checkMove(g, 1, [...zet.path].reverse()); } catch (e) { assert.ok(e instanceof MoveError); assert.ok(e.key, 'elke fout heeft een sleutel voor de vertaling'); }
    void slecht;
  });
}

test('de computer wordt in elke taal ongeveer even sterk (de schaal is er voor elke taal met een woordenlijst)', () => {
  for (const taal of talen) assert.ok(SCHAAL[taal] > 0 && SCHAAL[taal] <= 4, `schaal voor ${taal}: ${SCHAAL[taal]} (draai tools/woordenlijst/kalibreer.mjs)`);
});

// ----- De server: een partij in elke taal -----
const open = new Set();
after(() => { for (const s of open) { s.close(); s.closeAllConnections?.(); } });

test('de server speelt Woordtuin in elke taal: partij maken en een zet doen', async () => {
  const app = createApp({ dataFile: null, trustProxy: true });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r)); open.add(app.server);
  const base = `http://127.0.0.1:${app.server.address().port}`;
  let ip = 0;
  const call = async (method, path, body, token) => {
    const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `10.7.${Math.floor(ip / 250)}.${ip++ % 250}`, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch { /* geen json */ }
    return { status: res.status, json };
  };
  const meld = async (name) => { const r = await call('POST', '/api/signup', { name, email: `${name.toLowerCase()}@x.nl`, password: 'rozen-molen-zomer' }); assert.equal(r.status, 201, JSON.stringify(r.json)); return { token: r.json.token, ...r.json.user }; };
  const [a, b] = [await meld('Anna'), await meld('Bram')];
  assert.equal((await call('POST', '/api/friends/request', { code: b.code }, a.token)).status, 201);
  assert.equal((await call('POST', `/api/friends/${a.id}/accept`, {}, b.token)).status, 200);
  const token = { [a.id]: a.token, [b.id]: b.token };
  for (const taal of talen) {
    // een partij per taal; eerdere partijen blijven lopen (de server staat er veel toe), dus ruim genoeg
    const made = await call('POST', '/api/matches', { with: b.id, game: 'woordtuin', config: { tips: 0, lang: taal } }, a.token);
    assert.equal(made.status, 201, `${taal}: ${JSON.stringify(made.json)}`);
    const m = made.json.match;
    assert.equal(m.config.lang, taal); assert.equal(m.pub.lang, taal);
    assert.ok([...m.pub.letters].every((c) => TALEN[taal].alfabet.includes(c)), `${taal}: letters buiten het alfabet`);
    const wie = m.turn, slot = m.pub.players.indexOf(wie) + 1;
    const zet = legalMoves(m.pub, slot, true)[0];
    assert.ok(zet, `${taal}: geen zet op het bord`);
    const r = await call('POST', `/api/matches/${m.id}/move`, { version: m.version, move: { path: zet.path } }, token[wie]);
    assert.equal(r.status, 200, `${taal}: ${JSON.stringify(r.json)}`);
    assert.equal(r.json.match.pub.played[0], zet.word);
    // een woord dat niet bestaat geeft een fout met een sleutel, zodat de app hem in de taal van de speler kan tonen
    const volgende = r.json.match, wie2 = volgende.turn, slot2 = volgende.pub.players.indexOf(wie2) + 1;
    const stuk = await call('POST', `/api/matches/${m.id}/move`, { version: volgende.version, move: { path: [0, 1] } }, token[wie2]);
    assert.equal(stuk.status, 400); assert.equal(stuk.json.error.key, 'move.minLength'); assert.ok(stuk.json.error.message.length > 5);
    void slot2;
  }
});
