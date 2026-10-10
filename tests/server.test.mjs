import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/index.mjs';
import { RuleError } from '../server/api.mjs';

// Een klein testspel voor twee spelers: wie als eerste 3 punten heeft wint. De zet is { add: 1..2 }.
const GAMES = {
  race: {
    create: ({ players }) => ({ pub: { score: { [players[0]]: 0, [players[1]]: 0 } }, secret: { rng: 1 }, turn: players[0] }),
    apply: ({ pub, secret, move, player }) => {
      if (![1, 2].includes(move?.add)) throw new RuleError('Je mag 1 of 2 punten pakken.');
      const score = { ...pub.score, [player]: pub.score[player] + move.add };
      const other = Object.keys(score).find((p) => p !== player);
      if (score[player] >= 3) return { pub: { score }, secret, turn: null, result: { winner: player } };
      return { pub: { score }, secret, turn: other };
    },
  },
};

let ipCounter = 0;
const open = new Set();
after(() => { for (const s of open) { s.close(); s.closeAllConnections?.(); } });   // ook als een test halverwege faalt
async function start(opts = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'pp-'));
  const file = join(dir, 'db.json');
  const app = createApp({ dataFile: file, trustProxy: true, games: GAMES, ...opts });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  open.add(app.server);
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const ip = `10.0.0.${++ipCounter}`;
  const call = async (method, path, body, token, extra = {}) => {
    const res = await fetch(base + path, {
      method, headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': extra.ip || ip, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(extra.headers || {}) },
      body: extra.raw ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch { /* geen json */ }
    return { status: res.status, json, text, headers: res.headers };
  };
  const close = () => new Promise((r) => { app.server.close(() => { rmSync(dir, { recursive: true, force: true }); r(); }); app.server.closeAllConnections?.(); });
  return { ...app, base, call, close, file, dir };
}

async function signup(s, name, email, password = 'rozen-molen-zomer') {
  const r = await s.call('POST', '/api/signup', { name, email, password });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return { token: r.json.token, user: r.json.user, recovery: r.json.recoveryCode, password, email };
}

async function befriend(s, a, b) {
  assert.equal((await s.call('POST', '/api/friends/request', { code: b.user.code }, a.token)).status, 201);
  assert.equal((await s.call('POST', `/api/friends/${a.user.id}/accept`, {}, b.token)).status, 200);
}

test('ping meldt dat er accounts zijn', async () => {
  const s = await start();
  const r = await s.call('GET', '/api/ping');
  assert.equal(r.status, 200); assert.equal(r.json.accounts, true);
  await s.close();
});

test('aanmelden: duidelijke fouten in gewoon Nederlands', async () => {
  const s = await start();
  const bad = async (body, code) => { const r = await s.call('POST', '/api/signup', body); assert.equal(r.status, 400); assert.equal(r.json.error.code, code); assert.ok(r.json.error.message.length > 10); };
  await bad({ name: 'A', email: 'a@b.nl', password: 'rozen-molen-zomer' }, 'naam');
  await bad({ name: 'Anna', email: 'geen-email', password: 'rozen-molen-zomer' }, 'email');
  await bad({ name: 'Anna', email: 'a@b.nl', password: 'kort' }, 'wachtwoord');
  await bad({ name: 'An<script>', email: 'a@b.nl', password: 'rozen-molen-zomer' }, 'naam');
  await bad({ name: 'Anna‮x', email: 'a@b.nl', password: 'rozen-molen-zomer' }, 'naam');
  await signup(s, 'Anna', 'anna@voorbeeld.nl');
  const dup = await s.call('POST', '/api/signup', { name: 'Anna 2', email: 'ANNA@voorbeeld.NL', password: 'rozen-molen-zomer' });
  assert.equal(dup.status, 409);
  await s.close();
});

test('inloggen, uitloggen en sessies', async () => {
  const s = await start();
  const a = await signup(s, 'Anna', 'anna@voorbeeld.nl');
  const wrong = await s.call('POST', '/api/login', { email: 'anna@voorbeeld.nl', password: 'fout-wachtwoord' });
  assert.equal(wrong.status, 401);
  const unknown = await s.call('POST', '/api/login', { email: 'niemand@voorbeeld.nl', password: 'fout-wachtwoord' });
  assert.equal(unknown.status, 401);
  assert.equal(wrong.json.error.message, unknown.json.error.message, 'zelfde melding, zodat je niet kunt zien welke adressen bestaan');
  const ok = await s.call('POST', '/api/login', { email: ' Anna@Voorbeeld.nl ', password: a.password });
  assert.equal(ok.status, 200);
  const me = await s.call('GET', '/api/me', undefined, ok.json.token);
  assert.equal(me.json.user.name, 'Anna');
  assert.equal((await s.call('POST', '/api/logout', {}, ok.json.token)).status, 200);
  assert.equal((await s.call('GET', '/api/me', undefined, ok.json.token)).status, 401, 'uitgelogde sessie werkt niet meer');
  assert.equal((await s.call('GET', '/api/me', undefined, a.token)).status, 200, 'de andere sessie wel');
  assert.equal((await s.call('GET', '/api/me')).status, 401);
  assert.equal((await s.call('GET', '/api/me', undefined, 'verzonnen')).status, 401);
  await s.close();
});

test('te vaak inloggen wordt even geblokkeerd', async () => {
  const s = await start();
  await signup(s, 'Anna', 'anna@voorbeeld.nl');
  let last;
  for (let i = 0; i < 9; i++) last = await s.call('POST', '/api/login', { email: 'anna@voorbeeld.nl', password: 'verkeerd-wachtwoord' });
  assert.equal(last.status, 429);
  const good = await s.call('POST', '/api/login', { email: 'anna@voorbeeld.nl', password: 'rozen-molen-zomer' });
  assert.equal(good.status, 429, 'ook het goede wachtwoord moet even wachten');
  await s.close();
});

test('wachtwoord vergeten: herstelcode werkt één keer en wisselt', async () => {
  const s = await start();
  const a = await signup(s, 'Anna', 'anna@voorbeeld.nl');
  const bad = await s.call('POST', '/api/recover', { email: 'anna@voorbeeld.nl', recoveryCode: 'AAAA-BBBB-CCCC', password: 'nieuw-wachtwoord-1' });
  assert.equal(bad.status, 401);
  const r = await s.call('POST', '/api/recover', { email: 'anna@voorbeeld.nl', recoveryCode: a.recovery.toLowerCase().replace(/-/g, ' '), password: 'nieuw-wachtwoord-1' });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.notEqual(r.json.recoveryCode, a.recovery, 'er komt een nieuwe herstelcode');
  assert.equal((await s.call('GET', '/api/me', undefined, a.token)).status, 401, 'oude sessies zijn ingetrokken');
  assert.equal((await s.call('POST', '/api/login', { email: 'anna@voorbeeld.nl', password: a.password })).status, 401, 'oud wachtwoord werkt niet meer');
  assert.equal((await s.call('POST', '/api/login', { email: 'anna@voorbeeld.nl', password: 'nieuw-wachtwoord-1' })).status, 200);
  const again = await s.call('POST', '/api/recover', { email: 'anna@voorbeeld.nl', recoveryCode: a.recovery, password: 'weer-een-ander-1' });
  assert.equal(again.status, 401, 'de oude herstelcode is nu waardeloos');
  await s.close();
});

test('naam, wachtwoord en vriendencode wijzigen', async () => {
  const s = await start();
  const a = await signup(s, 'Anna', 'anna@voorbeeld.nl');
  const second = await s.call('POST', '/api/login', { email: 'anna@voorbeeld.nl', password: a.password });
  assert.equal((await s.call('PATCH', '/api/me', { name: 'Anna de Vries' }, a.token)).json.user.name, 'Anna de Vries');
  assert.equal((await s.call('PATCH', '/api/me', { name: 'x' }, a.token)).status, 400);
  assert.equal((await s.call('POST', '/api/me/password', { password: 'fout', newPassword: 'nieuw-wachtwoord-1' }, a.token)).status, 401);
  assert.equal((await s.call('POST', '/api/me/password', { password: a.password, newPassword: 'nieuw-wachtwoord-1' }, a.token)).status, 200);
  assert.equal((await s.call('GET', '/api/me', undefined, second.json.token)).status, 401, 'andere apparaten moeten opnieuw inloggen');
  assert.equal((await s.call('GET', '/api/me', undefined, a.token)).status, 200, 'dit apparaat blijft ingelogd');
  const code = (await s.call('GET', '/api/me', undefined, a.token)).json.user.code;
  const fresh = (await s.call('POST', '/api/me/code', {}, a.token)).json.user.code;
  assert.notEqual(code, fresh);
  const b = await signup(s, 'Bram', 'bram@voorbeeld.nl');
  assert.equal((await s.call('POST', '/api/friends/request', { code }, b.token)).status, 404, 'de oude code werkt niet meer');
  assert.equal((await s.call('POST', '/api/friends/request', { code: fresh }, b.token)).status, 201);
  await s.close();
});

test('een nieuwe herstelcode maken kan alleen met je wachtwoord, en de oude werkt dan niet meer', async () => {
  const s = await start();
  const a = await signup(s, 'Anna', 'anna@voorbeeld.nl');
  assert.equal((await s.call('POST', '/api/me/recovery', { password: 'fout-wachtwoord' }, a.token)).status, 401);
  assert.equal((await s.call('POST', '/api/me/recovery', { password: a.password })).status, 401, 'ook ingelogd zijn is nodig');
  const r = await s.call('POST', '/api/me/recovery', { password: a.password }, a.token);
  assert.equal(r.status, 200);
  assert.match(r.json.recoveryCode, /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  assert.equal((await s.call('POST', '/api/recover', { email: 'anna@voorbeeld.nl', recoveryCode: a.recovery, password: 'nieuw-wachtwoord-1' })).status, 401);
  assert.equal((await s.call('POST', '/api/recover', { email: 'anna@voorbeeld.nl', recoveryCode: r.json.recoveryCode, password: 'nieuw-wachtwoord-1' })).status, 200);
  await s.close();
});

test('vrienden: verzoek, accepteren, weigeren, intrekken, verwijderen', async () => {
  const s = await start();
  const a = await signup(s, 'Anna', 'anna@voorbeeld.nl'), b = await signup(s, 'Bram', 'bram@voorbeeld.nl'), c = await signup(s, 'Cor', 'cor@voorbeeld.nl');
  // de code mag je met kleine letters, spaties en zonder streepje intypen
  const typed = b.user.code.toLowerCase().replace('-', '  ');
  const req = await s.call('POST', '/api/friends/request', { code: typed }, a.token);
  assert.equal(req.status, 201); assert.equal(req.json.status, 'pending');
  assert.equal((await s.call('POST', '/api/friends/request', { code: b.user.code }, a.token)).status, 409, 'niet twee keer');
  assert.equal((await s.call('POST', '/api/friends/request', { code: a.user.code }, a.token)).status, 400, 'niet met jezelf');
  assert.equal((await s.call('POST', '/api/friends/request', { code: 'ZZZZ-ZZZZ' }, a.token)).status, 404);
  assert.equal((await s.call('POST', '/api/friends/request', { code: b.user.code })).status, 401);

  let lb = (await s.call('GET', '/api/friends', undefined, b.token)).json;
  assert.deepEqual(lb.incoming.map((x) => x.name), ['Anna']);
  assert.equal((await s.call('GET', '/api/me', undefined, b.token)).json.counts.incoming, 1);
  let la = (await s.call('GET', '/api/friends', undefined, a.token)).json;
  assert.deepEqual(la.outgoing.map((x) => x.name), ['Bram']);
  assert.equal((await s.call('POST', `/api/friends/${b.user.id}/accept`, {}, a.token)).status, 404, 'je kunt je eigen verzoek niet accepteren');

  assert.equal((await s.call('POST', `/api/friends/${a.user.id}/accept`, {}, b.token)).status, 200);
  la = (await s.call('GET', '/api/friends', undefined, a.token)).json; lb = (await s.call('GET', '/api/friends', undefined, b.token)).json;
  assert.deepEqual(la.friends.map((x) => x.name), ['Bram']); assert.deepEqual(lb.friends.map((x) => x.name), ['Anna']);
  assert.equal(la.outgoing.length + lb.incoming.length, 0);
  assert.equal((await s.call('POST', '/api/friends/request', { code: b.user.code }, a.token)).status, 409, 'al vrienden');

  // beiden vragen elkaar tegelijk: dan is het meteen gelukt
  await s.call('POST', '/api/friends/request', { code: c.user.code }, a.token);
  const mutual = await s.call('POST', '/api/friends/request', { code: a.user.code }, c.token);
  assert.equal(mutual.json.status, 'accepted');

  // weigeren en intrekken
  const d = await signup(s, 'Dirk', 'dirk@voorbeeld.nl');
  await s.call('POST', '/api/friends/request', { code: d.user.code }, a.token);
  assert.equal((await s.call('POST', `/api/friends/${a.user.id}/decline`, {}, d.token)).status, 200);
  assert.equal((await s.call('GET', '/api/friends', undefined, a.token)).json.outgoing.length, 0);
  await s.call('POST', '/api/friends/request', { code: d.user.code }, a.token);
  assert.equal((await s.call('DELETE', `/api/friends/${d.user.id}`, undefined, a.token)).status, 200, 'eigen verzoek intrekken');
  assert.equal((await s.call('GET', '/api/friends', undefined, d.token)).json.incoming.length, 0);

  // een vriend verwijderen verdwijnt aan beide kanten
  assert.equal((await s.call('DELETE', `/api/friends/${b.user.id}`, undefined, a.token)).status, 200);
  assert.deepEqual((await s.call('GET', '/api/friends', undefined, b.token)).json.friends, []);
  await s.close();
});

test('privacy: anderen zien alleen je naam en een datum, nooit je e-mail of codes', async () => {
  const s = await start();
  const a = await signup(s, 'Anna', 'anna@voorbeeld.nl'), b = await signup(s, 'Bram', 'bram@voorbeeld.nl');
  await befriend(s, a, b);
  const list = await s.call('GET', '/api/friends', undefined, a.token);
  const text = list.text;
  for (const secret of ['bram@voorbeeld.nl', 'anna@voorbeeld.nl', b.user.code, a.user.code, 'pass', 'hash', 'salt']) assert.ok(!text.includes(secret), `lekt ${secret}`);
  assert.match(list.json.friends[0].lastSeen, /^\d{4}-\d{2}-\d{2}$/, 'alleen een dag, geen tijdstip');
  const lookup = await s.call('GET', `/api/users/by-code/${b.user.code}`, undefined, a.token);
  assert.deepEqual(Object.keys(lookup.json).sort(), ['name', 'self']);
  assert.equal((await s.call('GET', `/api/users/by-code/${b.user.code}`)).status, 401, 'zonder account zoek je niemand op');
  assert.equal((await s.call('GET', '/api/users/by-code/NIETBESTAAND', undefined, a.token)).status, 404);
  // de database bevat geen wachtwoorden, herstelcodes of sessiesleutels in leesbare vorm
  s.db.flush();
  const raw = readFileSync(s.file, 'utf8');
  for (const secret of [a.password, a.recovery, a.recovery.replace(/-/g, ''), a.token]) assert.ok(!raw.includes(secret), 'staat leesbaar in de database');
  await s.close();
});

test('voortgang synchroniseren met versiecontrole', async () => {
  const s = await start();
  const a = await signup(s, 'Anna', 'anna@voorbeeld.nl');
  const first = await s.call('GET', '/api/sync', undefined, a.token);
  assert.deepEqual(first.json, { version: 0, data: null });
  const data = { games: { sudoku: { completed: 2 } }, profile: { name: 'Anna' } };
  assert.equal((await s.call('PUT', '/api/sync', { baseVersion: 0, data }, a.token)).json.version, 1);
  const conflict = await s.call('PUT', '/api/sync', { baseVersion: 0, data: { games: {} } }, a.token);
  assert.equal(conflict.status, 409); assert.equal(conflict.json.version, 1); assert.deepEqual(conflict.json.data, data);
  assert.equal((await s.call('PUT', '/api/sync', { baseVersion: 1, data: { games: { sudoku: { completed: 3 } } } }, a.token)).json.version, 2);
  assert.equal((await s.call('PUT', '/api/sync', { baseVersion: 2, data: 'rommel' }, a.token)).status, 400);
  assert.equal((await s.call('PUT', '/api/sync', { baseVersion: 2, data: { games: [] } }, a.token)).status, 400);
  const b = await signup(s, 'Bram', 'bram@voorbeeld.nl');
  assert.deepEqual((await s.call('GET', '/api/sync', undefined, b.token)).json, { version: 0, data: null }, 'ieders eigen voortgang');
  await s.close();
});

test('account verwijderen haalt alles weg', async () => {
  const s = await start();
  const a = await signup(s, 'Anna', 'anna@voorbeeld.nl'), b = await signup(s, 'Bram', 'bram@voorbeeld.nl');
  await befriend(s, a, b);
  const m = await s.call('POST', '/api/matches', { with: b.user.id, game: 'race' }, a.token);
  assert.equal(m.status, 201);
  assert.equal((await s.call('DELETE', '/api/me', { password: 'fout-wachtwoord' }, a.token)).status, 401);
  assert.equal((await s.call('DELETE', '/api/me', { password: a.password }, a.token)).status, 200);
  assert.equal((await s.call('GET', '/api/me', undefined, a.token)).status, 401);
  assert.equal((await s.call('POST', '/api/login', { email: 'anna@voorbeeld.nl', password: a.password })).status, 401);
  assert.deepEqual((await s.call('GET', '/api/friends', undefined, b.token)).json.friends, []);
  const list = (await s.call('GET', '/api/matches', undefined, b.token)).json.matches;
  assert.equal(list[0].status, 'done', 'lopende partij wordt beëindigd');
  assert.equal(list[0].players.find((p) => p.id !== b.user.id).name, 'Verwijderd account');
  s.db.flush();
  const raw = readFileSync(s.file, 'utf8');
  for (const left of ['anna@voorbeeld.nl', '"name":"Anna"', a.user.code.replace('-', '')]) assert.ok(!raw.includes(left), `restant van het account: ${left}`);
  assert.equal((await s.call('POST', '/api/signup', { name: 'Anna', email: 'anna@voorbeeld.nl', password: 'rozen-molen-zomer' })).status, 201, 'het adres is weer vrij');
  await s.close();
});

test('partijen met beurten: alleen vrienden, alleen jouw beurt, regels worden op de server gecontroleerd', async () => {
  const s = await start();
  const a = await signup(s, 'Anna', 'anna@voorbeeld.nl'), b = await signup(s, 'Bram', 'bram@voorbeeld.nl'), c = await signup(s, 'Cor', 'cor@voorbeeld.nl');
  assert.equal((await s.call('POST', '/api/matches', { with: b.user.id, game: 'race' }, a.token)).status, 403, 'nog geen vrienden');
  await befriend(s, a, b);
  assert.equal((await s.call('POST', '/api/matches', { with: b.user.id, game: 'bestaat-niet' }, a.token)).status, 400);
  const made = await s.call('POST', '/api/matches', { with: b.user.id, game: 'race' }, a.token);
  assert.equal(made.status, 201);
  const id = made.json.match.id;
  assert.equal(made.json.match.yourTurn, true); assert.ok(!('secret' in made.json.match), 'het geheim blijft op de server');
  assert.ok(!made.text.includes('"rng"'));

  assert.equal((await s.call('GET', `/api/matches/${id}`, undefined, c.token)).status, 404, 'buitenstaanders zien niets');
  assert.equal((await s.call('POST', `/api/matches/${id}/move`, { move: { add: 1 }, version: 1 }, b.token)).status, 409, 'Bram is niet aan de beurt');
  assert.equal((await s.call('POST', `/api/matches/${id}/move`, { move: { add: 5 }, version: 1 }, a.token)).status, 400, 'ongeldige zet');
  assert.equal((await s.call('POST', `/api/matches/${id}/move`, { move: { add: 1 }, version: 99 }, a.token)).status, 409, 'oude versie');
  const m1 = await s.call('POST', `/api/matches/${id}/move`, { move: { add: 2 }, version: 1 }, a.token);
  assert.equal(m1.json.match.version, 2); assert.equal(m1.json.match.yourTurn, false);
  assert.equal((await s.call('GET', '/api/me', undefined, b.token)).json.counts.yourTurn, 1);
  assert.deepEqual((await s.call('GET', `/api/matches/${id}?since=2`, undefined, b.token)).json, { unchanged: true, version: 2 });
  const m2 = await s.call('POST', `/api/matches/${id}/move`, { move: { add: 1 }, version: 2 }, b.token);
  assert.equal(m2.json.match.yourTurn, false);
  const m3 = await s.call('POST', `/api/matches/${id}/move`, { move: { add: 1 }, version: 3 }, a.token);
  assert.equal(m3.json.match.status, 'done'); assert.equal(m3.json.match.result.winner, a.user.id);
  assert.equal((await s.call('POST', `/api/matches/${id}/move`, { move: { add: 1 }, version: 4 }, b.token)).status, 409, 'afgelopen');

  // opgeven en vriend verwijderen beëindigen een partij
  const second = (await s.call('POST', '/api/matches', { with: a.user.id, game: 'race' }, b.token)).json.match.id;
  assert.equal((await s.call('POST', `/api/matches/${second}/resign`, {}, a.token)).json.match.result.resigned, a.user.id);
  const third = (await s.call('POST', '/api/matches', { with: b.user.id, game: 'race' }, a.token)).json.match.id;
  await s.call('DELETE', `/api/friends/${b.user.id}`, undefined, a.token);
  assert.equal((await s.call('GET', `/api/matches/${third}`, undefined, a.token)).json.match.status, 'done');
  const list = (await s.call('GET', '/api/matches', undefined, a.token)).json.matches;
  assert.equal(list.length, 3); assert.ok(list.every((m) => !('pub' in m)));
  await s.close();
});

test('sessies verlopen na 90 dagen zonder gebruik', async () => {
  let t = Date.now();
  const s = await start({ api: { now: () => t } });
  const a = await signup(s, 'Anna', 'anna@voorbeeld.nl');
  t += 89 * 86400000;
  assert.equal((await s.call('GET', '/api/me', undefined, a.token)).status, 200, 'telt weer als gebruikt');
  t += 89 * 86400000;
  assert.equal((await s.call('GET', '/api/me', undefined, a.token)).status, 200);
  t += 91 * 86400000;
  assert.equal((await s.call('GET', '/api/me', undefined, a.token)).status, 401);
  await s.close();
});

test('de server: bestanden veilig serveren en slechte verzoeken afvangen', async () => {
  const s = await start();
  const home = await s.call('GET', '/');
  assert.equal(home.status, 200); assert.match(home.text, /Puzzelplaats/);
  assert.match(home.headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal(home.headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await s.call('GET', '/js/app.js')).status, 200);
  assert.equal((await s.call('GET', '/js/app.js')).headers.get('content-type'), 'text/javascript; charset=utf-8');
  for (const bad of ['/../package.json', '/%2e%2e/package.json', '/js/../../package.json', '/server/api.mjs', '/server/data/db.json', '/tests/server.test.mjs', '/.git/config', '/node_modules/esbuild/package.json', '/package.json', '/%00', '/js/%2e%2e/%2e%2e/etc/passwd', '/..%2fpackage.json', '/js\\..\\package.json']) {
    const r = await s.call('GET', bad);
    assert.ok([400, 404].includes(r.status), `${bad} gaf ${r.status}`);
    assert.ok(!/"name": "puzzelplaats"|root:|createApi/.test(r.text), `${bad} lekt een bestand`);
  }
  assert.equal((await s.call('POST', '/js/app.js', {})).status, 405);
  // slechte API-verzoeken
  const junk = await s.call('POST', '/api/login', undefined, undefined, { raw: '{niet json', headers: {} });
  assert.equal(junk.status, 400);
  const big = await s.call('POST', '/api/signup', undefined, undefined, { raw: JSON.stringify({ name: 'x'.repeat(100_000) }) });
  assert.equal(big.status, 413);
  assert.equal((await s.call('GET', '/api/bestaat-niet')).status, 404);
  assert.equal((await s.call('DELETE', '/api/ping')).status, 405);
  const arr = await s.call('POST', '/api/login', undefined, undefined, { raw: '[1,2,3]' });
  assert.equal(arr.status, 401, 'een lijst in plaats van een object geeft gewoon een nette fout');
  const proto = await s.call('POST', '/api/signup', undefined, undefined, { raw: '{"__proto__":{"admin":true},"name":"Anna","email":"p@p.nl","password":"rozen-molen-zomer"}' });
  assert.equal(proto.status, 201);
  assert.equal({}.admin, undefined, 'geen prototype-vervuiling');
  await s.close();
});

test('CORS: alleen het ingestelde adres mag, en alleen als dat is ingesteld', async () => {
  const none = await start();
  const r1 = await none.call('GET', '/api/ping', undefined, undefined, { headers: { Origin: 'https://boosaardig.example' } });
  assert.equal(r1.headers.get('access-control-allow-origin'), null);
  await none.close();
  const s = await start({ allowOrigin: 'https://mijnapp.nl' });
  const ok = await s.call('OPTIONS', '/api/me', undefined, undefined, { headers: { Origin: 'https://mijnapp.nl' } });
  assert.equal(ok.status, 204); assert.equal(ok.headers.get('access-control-allow-origin'), 'https://mijnapp.nl');
  const evil = await s.call('GET', '/api/ping', undefined, undefined, { headers: { Origin: 'https://boosaardig.example' } });
  assert.equal(evil.headers.get('access-control-allow-origin'), null);
  await s.close();
});

test('gegevens blijven bewaard na een herstart', async () => {
  const s = await start();
  const a = await signup(s, 'Anna', 'anna@voorbeeld.nl');
  s.db.flush();
  const again = createApp({ dataFile: s.file, games: GAMES });
  await new Promise((r) => again.server.listen(0, '127.0.0.1', r));
  const res = await fetch(`http://127.0.0.1:${again.server.address().port}/api/me`, { headers: { Authorization: `Bearer ${a.token}` } });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).user.name, 'Anna');
  await new Promise((r) => { again.server.close(r); again.server.closeAllConnections?.(); });
  await s.close();
});
