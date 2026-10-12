import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import { createPush, leesServiceAccount } from '../server/push.mjs';
import { pushTekst, PUSH_TALEN } from '../server/pushteksten.mjs';
import { createApp } from '../server/index.mjs';

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });

// Een nagebouwde Google: de token-server en FCM zelf
function nepGoogle({ ongeldigeTokens = [] } = {}) {
  const log = { tokens: 0, berichten: [], jwt: null };
  const server = http.createServer((req, res) => {
    let body = ''; req.on('data', (d) => { body += d; });
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      if (req.url === '/token') {
        log.tokens++; const assertion = new URLSearchParams(body).get('assertion'); const [k, c, s] = assertion.split('.');
        const ok = createVerify('RSA-SHA256').update(`${k}.${c}`).verify(publicKey, s, 'base64url');
        log.jwt = { ok, claims: JSON.parse(Buffer.from(c, 'base64url')) };
        return res.end(JSON.stringify(ok ? { access_token: 'toegang-1', expires_in: 3600 } : { error: 'bad' }));
      }
      const m = JSON.parse(body).message; log.berichten.push({ auth: req.headers.authorization, url: req.url, m });
      if (ongeldigeTokens.includes(m.token)) { res.statusCode = 404; return res.end(JSON.stringify({ error: { status: 'NOT_FOUND', message: 'weg' } })); }
      res.end(JSON.stringify({ name: 'ok' }));
    });
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r({ server, log, url: `http://127.0.0.1:${server.address().port}` })));
}

test('FCM: een melding gaat met een geldige JWT en de juiste inhoud naar Google; de toegangssleutel wordt hergebruikt', async () => {
  const g = await nepGoogle();
  const sa = { project_id: 'mijn-project', client_email: 'x@mijn-project.iam.gserviceaccount.com', private_key: privateKey, token_uri: `${g.url}/token` };
  const push = createPush({ serviceAccount: sa, fcmUrl: g.url });
  assert.deepEqual(await push.send('T'.repeat(30), { title: 'Jij bent aan de beurt', body: 'Anna speelde ROOS.', data: { matchId: 'm1', n: 5 } }), { ok: true });
  await push.send('U'.repeat(30), { title: 'x', body: 'y' });
  g.server.close();
  assert.equal(g.log.tokens, 1, 'één keer inloggen bij Google'); assert.equal(g.log.jwt.ok, true);
  assert.equal(g.log.jwt.claims.iss, sa.client_email); assert.match(g.log.jwt.claims.scope, /firebase\.messaging/);
  const b = g.log.berichten[0];
  assert.equal(b.url, '/v1/projects/mijn-project/messages:send'); assert.equal(b.auth, 'Bearer toegang-1');
  assert.equal(b.m.token, 'T'.repeat(30)); assert.equal(b.m.notification.title, 'Jij bent aan de beurt'); assert.deepEqual(b.m.data, { matchId: 'm1', n: '5' });
});

test('FCM: een apparaat dat niet meer bestaat wordt als ongeldig gemeld; een tijdelijke fout gooit', async () => {
  const g = await nepGoogle({ ongeldigeTokens: ['D'.repeat(30)] });
  const sa = { project_id: 'p', client_email: 'x@p', private_key: privateKey, token_uri: `${g.url}/token` };
  const push = createPush({ serviceAccount: sa, fcmUrl: g.url });
  assert.deepEqual(await push.send('D'.repeat(30), { title: 'a', body: 'b' }), { ok: false, ongeldig: true });
  const stuk = createPush({ serviceAccount: sa, fcmUrl: 'http://127.0.0.1:1' });
  await assert.rejects(() => stuk.send('E'.repeat(30), { title: 'a', body: 'b' }));
  g.server.close();
});

test('FCM-instellingen: JSON, base64 of een bestand; zonder sleutel gaat de melding naar de outbox', async () => {
  const sa = { project_id: 'p', client_email: 'x@p', private_key: 'k' };
  assert.equal(leesServiceAccount({}), null);
  assert.equal(leesServiceAccount({ FCM_SERVICE_ACCOUNT: JSON.stringify(sa) }).project_id, 'p');
  assert.equal(leesServiceAccount({ FCM_SERVICE_ACCOUNT: Buffer.from(JSON.stringify(sa)).toString('base64') }).client_email, 'x@p');
  assert.throws(() => leesServiceAccount({ FCM_SERVICE_ACCOUNT: '{"project_id":"p"}' }), /mist/);
  const push = createPush({ log: () => {} });
  await push.send('T'.repeat(30), { title: 'a', body: 'b', data: { x: 1 } });
  assert.equal(push.outbox.length, 1); assert.equal(push.echt, false);
});

test('de pushteksten bestaan in elke taal voor elke soort melding, zonder open plaatshouders', () => {
  for (const taal of PUSH_TALEN) for (const soort of ['beurt', 'beurtPas', 'nieuwePartij', 'afgelopen', 'gestopt', 'verzoek', 'vriend']) {
    const { title, body } = pushTekst(soort, taal, { name: 'Anna', word: 'ROOS' });
    assert.ok(title.length > 3 && body.length > 5, `${taal} ${soort}`); assert.ok(!/\{\w+\}/.test(title + body), `${taal} ${soort}`);
  }
  assert.deepEqual([...PUSH_TALEN].sort(), ['de', 'en', 'es', 'fr', 'it', 'nl', 'pl', 'pt']);
  assert.match(pushTekst('beurt', 'nl', { name: 'Anna', word: 'ROOS' }).body, /Anna speelde ROOS/);
  assert.equal(pushTekst('beurt', 'xx', { name: 'A', word: 'B' }).title, 'Your turn');
});

// ----- De server: apparaten aanmelden en meldingen bij een zet, vriendverzoek en einde -----
test('de server stuurt meldingen: vriendverzoek, nieuwe partij, jouw beurt, pas, einde en stoppen; ongeldige apparaten verdwijnen', async () => {
  const push = createPush({ log: () => {} });
  const app = createApp({ dataFile: null, trustProxy: true, api: { push } });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  let ip = 0;
  const call = async (method, path, body, token) => { const r = await fetch(`http://127.0.0.1:${app.server.address().port}${path}`, { method, headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `10.5.${Math.floor(ip / 250)}.${ip++ % 250}`, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, json: await r.json().catch(() => null) }; };
  const meld = async (name) => { const r = await call('POST', '/api/signup', { name, email: `${name.toLowerCase()}@x.nl`, password: 'rozen-molen-zomer' }); return { token: r.json.token, ...r.json.user }; };
  const [a, b] = [await meld('Anna'), await meld('Bram')];
  const wacht = () => new Promise((r) => setTimeout(r, 30));
  const TB = 'B'.repeat(40), TA = 'A'.repeat(40);
  assert.equal((await call('POST', '/api/me/devices', { token: 'kort' }, b.token)).status, 400);
  assert.equal((await call('POST', '/api/me/devices', { token: TB, platform: 'android', taal: 'nl' })).status, 401, 'alleen ingelogd');
  assert.equal((await call('POST', '/api/me/devices', { token: TB, platform: 'android', taal: 'nl' }, b.token)).status, 200);
  assert.equal((await call('POST', '/api/me/devices', { token: TA, platform: 'ios', taal: 'xx' }, a.token)).status, 200);
  // vriendverzoek van Anna aan Bram
  await call('POST', '/api/friends/request', { code: b.code }, a.token); await wacht();
  assert.equal(push.outbox.length, 1); assert.equal(push.outbox[0].token, TB); assert.match(push.outbox[0].body, /Anna wil je vriend worden/);
  await call('POST', `/api/friends/${a.id}/accept`, {}, b.token); await wacht();
  assert.equal(push.outbox.at(-1).token, TA); assert.match(push.outbox.at(-1).body, /Bram accepted your request/, 'onbekende taal valt terug op Engels');
  // een partij Woordtuin
  const made = await call('POST', '/api/matches', { with: b.id, game: 'woordtuin', config: { tips: 0, lang: 'nl' } }, a.token); await wacht();
  assert.equal(push.outbox.at(-1).token, TB); assert.equal(push.outbox.at(-1).data.soort, 'nieuwePartij'); assert.equal(push.outbox.at(-1).data.matchId, made.json.match.id);
  const id = made.json.match.id;
  const kant = { [a.id]: a.token, [b.id]: b.token };
  let m = (await call('GET', `/api/matches/${id}`, undefined, kant[made.json.match.turn])).json.match;
  const voor = push.outbox.length;
  // de speler die aan de beurt is past: de ander krijgt "jouw beurt" met "heeft gepast"
  const passer = m.turn, ander = passer === a.id ? b.id : a.id;
  const r = await call('POST', `/api/matches/${id}/move`, { version: m.version, move: { pass: true } }, kant[passer]); await wacht();
  assert.equal(r.status, 200); assert.equal(push.outbox.length, voor + 1);
  assert.equal(push.outbox.at(-1).token, ander === a.id ? TA : TB); assert.equal(push.outbox.at(-1).data.soort, 'beurtPas');
  // de ander past ook: het spel is afgelopen, de eerste krijgt "afgelopen"
  const r2 = await call('POST', `/api/matches/${id}/move`, { version: r.json.match.version, move: { pass: true } }, kant[ander]); await wacht();
  assert.equal(r2.json.match.status, 'done'); assert.equal(push.outbox.at(-1).data.soort, 'afgelopen'); assert.equal(push.outbox.at(-1).token, passer === a.id ? TA : TB);
  // een nieuwe partij en stoppen
  const m2 = await call('POST', '/api/matches', { with: b.id, game: 'woordtuin', config: { tips: 0, lang: 'nl' } }, a.token);
  await call('POST', `/api/matches/${m2.json.match.id}/resign`, {}, b.token); await wacht();
  assert.equal(push.outbox.at(-1).data.soort, 'gestopt'); assert.equal(push.outbox.at(-1).token, TA);
  // afmelden en verwijderen
  assert.equal((await call('DELETE', '/api/me/devices', { token: TB }, b.token)).status, 200);
  const n = push.outbox.length; await call('POST', '/api/matches', { with: b.id, game: 'woordtuin', config: { tips: 0, lang: 'nl' } }, a.token); await wacht();
  assert.equal(push.outbox.length, n, 'afgemeld apparaat krijgt niets');
  await new Promise((res) => { app.server.close(res); app.server.closeAllConnections?.(); });
});

test('een ongeldig apparaat wordt opgeruimd na een melding', async () => {
  const g = await nepGoogle({ ongeldigeTokens: ['Z'.repeat(40)] });
  const sa = { project_id: 'p', client_email: 'x@p', private_key: privateKey, token_uri: `${g.url}/token` };
  const app = createApp({ dataFile: null, trustProxy: true, api: { push: createPush({ serviceAccount: sa, fcmUrl: g.url }) } });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  let ip = 100;
  const call = async (method, path, body, token) => { const r = await fetch(`http://127.0.0.1:${app.server.address().port}${path}`, { method, headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `10.6.0.${ip++}`, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, json: await r.json().catch(() => null) }; };
  const meld = async (name) => { const r = await call('POST', '/api/signup', { name, email: `${name.toLowerCase()}@x.nl`, password: 'rozen-molen-zomer' }); return { token: r.json.token, ...r.json.user }; };
  const [a, b] = [await meld('Anna'), await meld('Bram')];
  await call('POST', '/api/me/devices', { token: 'Z'.repeat(40), taal: 'nl' }, b.token);
  assert.equal(Object.keys(app.db.data.devices).length, 1);
  await call('POST', '/api/friends/request', { code: b.code }, a.token);
  await new Promise((r) => setTimeout(r, 150));
  assert.equal(Object.keys(app.db.data.devices).length, 0, 'het token dat Google niet meer kent is weg');
  await new Promise((res) => { app.server.close(res); app.server.closeAllConnections?.(); g.server.close(); });
});
