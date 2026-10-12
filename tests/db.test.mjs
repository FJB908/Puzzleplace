import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { SqliteDb, Db, dagelijkseBackup } from '../server/db.mjs';
import { createApp } from '../server/index.mjs';

const tijdelijk = () => mkdtempSync(join(tmpdir(), 'pp-db-'));

test('SQLite: wat je bewaart is er na opnieuw openen, wijzigingen en verwijderingen ook', () => {
  const dir = tijdelijk(), f = join(dir, 'db.sqlite');
  const a = new SqliteDb(f);
  a.data.users.u1 = { id: 'u1', name: 'Anna', lijst: [1, 2, 3], diep: { x: 'é ß 日本' } };
  a.data.users.u2 = { id: 'u2', name: 'Bram' };
  a.data.emails['anna@x.nl'] = 'u1';
  a.flush();
  a.data.users.u1.name = 'Anna de Vries';
  delete a.data.users.u2;
  a.data.devices.d1 = { userId: 'u1', token: 'T' };
  a.close();
  const b = new SqliteDb(f);
  assert.equal(b.data.users.u1.name, 'Anna de Vries'); assert.deepEqual(b.data.users.u1.lijst, [1, 2, 3]); assert.equal(b.data.users.u1.diep.x, 'é ß 日本');
  assert.equal(b.data.users.u2, undefined); assert.equal(b.data.emails['anna@x.nl'], 'u1'); assert.equal(b.data.devices.d1.token, 'T');
  assert.equal(b.data.v, 1);
  b.close();
});

test('SQLite: alleen wat veranderd is wordt geschreven, en een mislukte schrijfactie laat niets half achter', () => {
  const dir = tijdelijk(), f = join(dir, 'db.sqlite');
  const a = new SqliteDb(f);
  a.data.users.u1 = { id: 'u1' }; a.flush();
  const sleutel = 'users\0u1';
  assert.ok(a.bewaard.has(sleutel));
  a.data.users.u2 = { id: 'u2', kringverwijzing: null }; a.data.users.u2.kringverwijzing = a.data.users.u2;   // JSON.stringify faalt
  assert.throws(() => a.flush());
  const open = new DatabaseSync(f);
  assert.equal(open.prepare('SELECT COUNT(*) AS n FROM docs').get().n, 1, 'de transactie is teruggedraaid');
  open.close();
  delete a.data.users.u2; a.flush(); a.close();
});

test('SQLite: een bestaand JSON-bestand wordt eenmalig overgenomen', () => {
  const dir = tijdelijk(), json = join(dir, 'db.json'), f = join(dir, 'db.sqlite');
  const oud = new Db(json); oud.data.users.u1 = { id: 'u1', name: 'Oud' }; oud.data.emails['o@x.nl'] = 'u1'; oud.flush();
  const a = new SqliteDb(f, { migrateFrom: json });
  assert.equal(a.data.users.u1.name, 'Oud'); a.data.users.u1.name = 'Nieuw'; a.close();
  writeFileSync(json, JSON.stringify({ v: 1, users: { u9: { id: 'u9' } } }));                // het JSON-bestand verandert: dat telt niet meer
  const b = new SqliteDb(f, { migrateFrom: json });
  assert.equal(b.data.users.u1.name, 'Nieuw'); assert.equal(b.data.users.u9, undefined); b.close();
});

test('back-up: een leesbare kopie, één per dag, de oudste worden opgeruimd', () => {
  const dir = tijdelijk(), f = join(dir, 'db.sqlite'), map = join(dir, 'backups');
  const a = new SqliteDb(f); a.data.users.u1 = { id: 'u1', name: 'Anna' };
  for (let dag = 1; dag <= 9; dag++) dagelijkseBackup(a, map, 7, () => new Date(`2026-03-0${dag}T10:00:00Z`));
  assert.equal(dagelijkseBackup(a, map, 7, () => new Date('2026-03-09T23:00:00Z')), 'db-2026-03-09.sqlite', 'dezelfde dag: geen tweede kopie');
  const files = readdirSync(map).sort();
  assert.equal(files.length, 7); assert.equal(files[0], 'db-2026-03-03.sqlite');
  const kopie = new SqliteDb(join(map, files[6]));
  assert.equal(kopie.data.users.u1.name, 'Anna'); kopie.close(); a.close();
});

test('de server met SQLite: accounts blijven bestaan na een herstart', async () => {
  const dir = tijdelijk(), f = join(dir, 'db.sqlite');
  const start = async () => { const app = createApp({ dataFile: f, trustProxy: true }); await new Promise((r) => app.server.listen(0, '127.0.0.1', r)); return app; };
  const call = (app, method, path, body, token) => fetch(`http://127.0.0.1:${app.server.address().port}${path}`, { method, headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.9.9.9', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));
  let app = await start();
  const r = await call(app, 'POST', '/api/signup', { name: 'Anna', email: 'anna@x.nl', password: 'rozen-molen-zomer' });
  assert.equal(r.status, 201);
  await new Promise((res) => { app.server.close(res); app.server.closeAllConnections?.(); });
  app = await start();
  assert.equal((await call(app, 'POST', '/api/login', { email: 'anna@x.nl', password: 'rozen-molen-zomer' })).status, 200);
  assert.equal((await call(app, 'GET', '/api/me', undefined, r.json.token)).json.user.name, 'Anna', 'ook de sessie van voor de herstart werkt');
  await new Promise((res) => { app.server.close(res); app.server.closeAllConnections?.(); });
  assert.ok(existsSync(f));
});
