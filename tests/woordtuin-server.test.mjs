import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/index.mjs';
import { makeRng, botMove, legalMoves, isWord, neighbors, result as uitslag } from '../js/games/woordtuin/engine.js';

// Een hele partij Woordtuin tussen twee echte accounts, via de echte server en de echte spelregels.

const open = new Set();
after(() => { for (const s of open) { s.close(); s.closeAllConnections?.(); } });
async function start() {
  const app = createApp({ dataFile: null, trustProxy: true });          // standaard spellen: Woordtuin zit er al in
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r)); open.add(app.server);
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const call = async (method, path, body, token) => {
    const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.9.9.9', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch { /* geen json */ }
    return { status: res.status, json };
  };
  return { call, app };
}
const meld = async (s, name) => { const r = await s.call('POST', '/api/signup', { name, email: `${name.toLowerCase()}@x.nl`, password: 'rozen-molen-zomer' }); assert.equal(r.status, 201); return { token: r.json.token, ...r.json.user }; };

test('Woordtuin tegen een vriend: een hele partij via de server', async () => {
  const s = await start();
  const [a, b] = [await meld(s, 'Anna'), await meld(s, 'Bram')];
  assert.equal((await s.call('POST', '/api/friends/request', { code: b.code }, a.token)).status, 201);
  assert.equal((await s.call('POST', `/api/friends/${a.id}/accept`, {}, b.token)).status, 200);

  const made = await s.call('POST', '/api/matches', { with: b.id, game: 'woordtuin', config: { tips: 7, onzin: true } }, a.token);
  assert.equal(made.status, 201, JSON.stringify(made.json));
  const m0 = made.json.match;
  assert.deepEqual(m0.config, { tips: 0, lang: 'nl' }, 'alleen toegestane instellingen blijven over; een partij zonder taal is Nederlands');
  assert.equal(m0.pub.lang, 'nl');
  assert.equal(m0.pub.letters.length, 36);
  assert.equal(m0.pub.over, false);
  assert.ok([a.id, b.id].includes(m0.turn));
  assert.equal(m0.pub.secret, undefined);
  const onbekend = await s.call('POST', '/api/matches', { with: b.id, game: 'woordtuin', config: { lang: 'xx' } }, a.token);
  assert.equal(onbekend.status, 400); assert.equal(onbekend.json.error.key, 'lang.unknown');
  const vriendelijk = (await s.call('POST', '/api/matches', { with: b.id, game: 'woordtuin', config: { tips: 3 } }, a.token)).json.match;
  assert.equal(vriendelijk.config.tips, 3);

  const id = m0.id, token = { [a.id]: a.token, [b.id]: b.token };
  let match = m0, n = 0, rng = makeRng('server');
  const eerste = match.turn, tweede = eerste === a.id ? b.id : a.id;

  // Fouten: verkeerde speler, geen woord, niet aaneengesloten, oude versie
  assert.equal((await s.call('POST', `/api/matches/${id}/move`, { version: 1, move: { path: [0, 1, 2] } }, token[tweede])).status, 409);
  // Een pad dat aansluit maar geen woord is
  const letters = m0.pub.letters;
  let geenWoord = null;
  for (let i = 0; i < 36 && !geenWoord; i++) for (const j of neighbors(i)) for (const k of neighbors(j)) if (k !== i && !isWord(letters[i] + letters[j] + letters[k])) { geenWoord = [i, j, k]; break; }
  const slecht = await s.call('POST', `/api/matches/${id}/move`, { version: 1, move: { path: geenWoord } }, token[eerste]);
  assert.ok([400].includes(slecht.status) && slecht.json.error.message.length > 10, JSON.stringify(slecht.json));
  assert.equal((await s.call('POST', `/api/matches/${id}/move`, { version: 1, move: { path: [0, 20, 35] } }, token[eerste])).status, 400);
  assert.equal((await s.call('POST', `/api/matches/${id}/move`, { version: 1, move: {} }, token[eerste])).status, 400);
  assert.equal((await s.call('POST', `/api/matches/${id}/move`, { version: 5, move: { path: [0, 1, 2] } }, token[eerste])).status, 409);

  // Spelen tot het einde: de beurtwissel komt van de server
  while (match.status === 'active') {
    assert.ok(n++ < 80);
    const speler = match.turn;
    const state = { ...match.pub, turn: match.pub.players.indexOf(speler) + 1 };
    // De computer speelt alleen alledaagse woorden; een mens kan ook zeldzame woorden spelen: hier nemen we dan het eerste woord dat mag
    const zet = botMove(state, state.turn, n % 2 ? 'extreem' : 'gemiddeld', rng) || legalMoves(state, state.turn)[0];
    assert.ok(zet, 'wie aan de beurt is kan altijd iets');
    const r = await s.call('POST', `/api/matches/${id}/move`, { version: match.version, move: { path: zet.path } }, token[speler]);
    assert.equal(r.status, 200, JSON.stringify(r.json));
    match = r.json.match;
    if (match.status === 'active') {
      // De tegenspeler ziet de laatste zet en de samenvatting klopt met het bord
      const lijst = (await s.call('GET', '/api/matches', undefined, token[match.turn])).json.matches.find((x) => x.id === id);
      assert.equal(lijst.yourTurn, true); assert.equal(lijst.summary.last.word, zet.word); assert.equal(lijst.pub, undefined);
    }
  }
  assert.equal(match.status, 'done'); assert.equal(match.turn, null);
  const eind = uitslag({ ...match.pub, turn: null });
  const winnaar = eind.winner ? match.pub.players[eind.winner - 1] : null;
  assert.equal(match.result.winner, winnaar);
  assert.equal(match.result.scores[match.pub.players[0]], eind.scores[1]);
  assert.equal((await s.call('POST', `/api/matches/${id}/move`, { version: match.version, move: { path: [0, 1, 2] } }, token[a.id])).status, 409, 'afgelopen');
  assert.equal(legalMoves({ ...match.pub, turn: 1 }, 1).length >= 0, true);
  await new Promise((r) => { s.app.server.close(r); s.app.server.closeAllConnections?.(); });
});
