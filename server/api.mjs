// De hele server-logica, los van HTTP: een functie die een verzoek krijgt en een antwoord teruggeeft.
// Zo is alles direct te testen, en maakt het niet uit welke server er omheen staat.
//
// Wat erin zit: accounts (aanmelden, inloggen, herstellen), vrienden (met een vriendencode),
// synchronisatie van je voortgang tussen apparaten, en een algemene laag voor spellen met beurten.

import { hashSecret, verifySecret, DUMMY, newToken, sha, newId, newFriendCode, newRecoveryCode, cleanCode, formatCode } from './crypto.mjs';
import { createLimiter } from './ratelimit.mjs';
import { ApiError, fail, cleanName, cleanEmail, cleanPassword, isObject } from './validate.mjs';

const DAY = 86400000;
const SESSION_DAYS = 90;
const MAX_FRIENDS = 200, MAX_PENDING = 25, MAX_MATCHES = 50;

export class RuleError extends Error {}                 // een spelregel is overtreden (bijv. "dat woord bestaat niet")

export function createApi({ db, games = {}, now = Date.now, limiter = createLimiter(now), version = '0.1.0' }) {
  const D = db.data;
  const day = (t) => new Date(t).toISOString().slice(0, 10);

  // ----- Hulpjes -----
  const userById = (id) => D.users[id] || null;
  const selfView = (u) => ({ id: u.id, name: u.name, email: u.email, code: formatCode(u.code), createdAt: u.createdAt });
  // Wat anderen van je zien: alleen je naam en een datum (geen tijdstip, dat is privacy-vriendelijker)
  const otherView = (u) => (u ? { id: u.id, name: u.name, lastSeen: day(u.lastSeen) } : { id: null, name: 'Verwijderd account', lastSeen: null });
  const fkey = (a, b) => [a, b].sort().join('|');

  function newSession(userId) {
    const token = newToken();
    D.sessions[sha(token)] = { userId, created: now(), used: now() };
    return token;
  }

  function auth(req) {
    if (!req.token) fail(401, 'sessie', 'Je bent niet ingelogd. Log in om verder te gaan.');
    const key = sha(req.token);
    const s = D.sessions[key];
    if (!s || now() - s.used > SESSION_DAYS * DAY) { if (s) { delete D.sessions[key]; db.save(); } fail(401, 'sessie', 'Je bent uitgelogd. Log opnieuw in.'); }
    const user = userById(s.userId);
    if (!user) { delete D.sessions[key]; fail(401, 'sessie', 'Dit account bestaat niet meer.'); }
    if (now() - s.used > 3600_000) { s.used = now(); db.save(); }
    return { user, key };
  }

  function revokeSessions(userId, exceptKey = null) {
    for (const [k, s] of Object.entries(D.sessions)) if (s.userId === userId && k !== exceptKey) delete D.sessions[k];
  }

  function uniqueCode() {
    for (let i = 0; i < 20; i++) { const c = cleanCode(newFriendCode()); if (!D.codes[c]) return c; }
    throw new Error('geen vrije vriendencode');
  }

  function limit(req, name, max, windowMs, message = 'Dit gaat te snel. Wacht een paar minuten en probeer het dan nog eens.') {
    if (!limiter.hit(`${name}:${req.ip}`, max, windowMs)) fail(429, 'te-snel', message);
  }

  // ----- Accounts -----
  async function signup(req) {
    limit(req, 'signup', 10, 3600_000);
    const b = req.body;
    const name = cleanName(b.name), email = cleanEmail(b.email), password = cleanPassword(b.password);
    if (D.emails[email]) fail(409, 'email', 'Op dit e-mailadres bestaat al een account. Wil je inloggen?');
    const recoveryCode = newRecoveryCode();
    const [pass, rec] = await Promise.all([hashSecret(password), hashSecret(cleanCode(recoveryCode))]);
    if (D.emails[email]) fail(409, 'email', 'Op dit e-mailadres bestaat al een account. Wil je inloggen?');   // iemand anders was net sneller
    const id = newId(), code = uniqueCode();
    D.users[id] = { id, name, email, pass, recovery: rec, code, createdAt: now(), lastSeen: now(), sync: null };
    D.emails[email] = id; D.codes[code] = id;
    const token = newSession(id);
    db.save();
    return { status: 201, body: { token, user: selfView(D.users[id]), recoveryCode } };
  }

  async function login(req) {
    limit(req, 'login-ip', 30, 15 * 60_000);
    const email = String(req.body.email ?? '').trim().toLowerCase();
    if (!limiter.hit(`login-mail:${email}`, 8, 15 * 60_000)) fail(429, 'te-snel', 'Er is te vaak geprobeerd in te loggen. Wacht een kwartier en probeer het dan nog eens.');
    const user = userById(D.emails[email]);
    const ok = await verifySecret(String(req.body.password ?? ''), user ? user.pass : DUMMY);
    if (!user || !ok) fail(401, 'inloggen', 'Het e-mailadres of het wachtwoord klopt niet.');
    limiter.reset(`login-mail:${email}`);
    user.lastSeen = now();
    const token = newSession(user.id);
    db.save();
    return { body: { token, user: selfView(user) } };
  }

  async function recover(req) {
    limit(req, 'recover-ip', 10, 3600_000);
    const email = String(req.body.email ?? '').trim().toLowerCase();
    if (!limiter.hit(`recover-mail:${email}`, 5, 3600_000)) fail(429, 'te-snel', 'Er is te vaak geprobeerd. Wacht een uur en probeer het dan nog eens.');
    const password = cleanPassword(req.body.password);
    const user = userById(D.emails[email]);
    const ok = await verifySecret(cleanCode(req.body.recoveryCode), user ? user.recovery : DUMMY);
    if (!user || !ok) fail(401, 'herstel', 'Het e-mailadres of de herstelcode klopt niet.');
    const recoveryCode = newRecoveryCode();
    user.pass = await hashSecret(password);
    user.recovery = await hashSecret(cleanCode(recoveryCode));
    revokeSessions(user.id);                                        // iedereen die nog was ingelogd, moet opnieuw
    const token = newSession(user.id);
    db.save();
    return { body: { token, user: selfView(user), recoveryCode } };
  }

  function me(req) {
    const { user } = auth(req);
    user.lastSeen = now(); db.save();
    return { body: { user: selfView(user), counts: counts(user.id) } };
  }

  function counts(userId) {
    let incoming = 0, yourTurn = 0;
    for (const f of Object.values(D.friendships)) if (f.status === 'pending' && f.from !== userId && (f.a === userId || f.b === userId)) incoming++;
    for (const m of Object.values(D.matches)) if (m.status === 'active' && m.turn === userId) yourTurn++;
    return { incoming, yourTurn };
  }

  function rename(req) {
    const { user } = auth(req);
    user.name = cleanName(req.body.name);
    db.save();
    return { body: { user: selfView(user) } };
  }

  async function changePassword(req) {
    const { user, key } = auth(req);
    limit(req, 'pw', 10, 3600_000);
    if (!(await verifySecret(String(req.body.password ?? ''), user.pass))) fail(401, 'wachtwoord', 'Je huidige wachtwoord klopt niet.');
    user.pass = await hashSecret(cleanPassword(req.body.newPassword, 'nieuw'));
    revokeSessions(user.id, key);
    db.save();
    return { body: { ok: true } };
  }

  async function newRecovery(req) {                                // als je de herstelcode kwijt bent: een nieuwe, na je wachtwoord
    const { user } = auth(req);
    limit(req, 'recovery-new', 10, 3600_000);
    if (!(await verifySecret(String(req.body.password ?? ''), user.pass))) fail(401, 'wachtwoord', 'Je wachtwoord klopt niet.');
    const recoveryCode = newRecoveryCode();
    user.recovery = await hashSecret(cleanCode(recoveryCode));
    db.save();
    return { body: { recoveryCode } };
  }

  function newFriendCodeFor(req) {
    const { user } = auth(req);
    delete D.codes[user.code];
    user.code = uniqueCode(); D.codes[user.code] = user.id;
    db.save();
    return { body: { user: selfView(user) } };
  }

  async function deleteAccount(req) {
    const { user } = auth(req);
    limit(req, 'delete', 5, 3600_000);
    if (!(await verifySecret(String(req.body.password ?? ''), user.pass))) fail(401, 'wachtwoord', 'Je wachtwoord klopt niet.');
    revokeSessions(user.id);
    delete D.emails[user.email]; delete D.codes[user.code]; delete D.users[user.id];
    for (const [k, f] of Object.entries(D.friendships)) if (f.a === user.id || f.b === user.id) delete D.friendships[k];
    for (const [mid, m] of Object.entries(D.matches)) {
      if (!m.players.includes(user.id)) continue;
      if (m.status === 'active') { m.status = 'done'; m.result = { abandoned: true }; m.turn = null; m.version++; m.updatedAt = now(); }
      m.players = m.players.map((p) => (p === user.id ? 'verwijderd' : p));            // het account is weg, de ander houdt zijn geschiedenis
      if (m.players.every((p) => p === 'verwijderd')) delete D.matches[mid];
    }
    db.save();
    return { body: { ok: true } };
  }

  // ----- Vrienden -----
  function codeLookup(req) {
    const { user } = auth(req);
    if (!limiter.hit(`lookup:${user.id}`, 30, 3600_000)) fail(429, 'te-snel', 'Je hebt veel codes geprobeerd. Probeer het later nog eens.');
    const found = userById(D.codes[cleanCode(req.params.code)]);
    if (!found) fail(404, 'code', 'Deze vriendencode kennen we niet. Controleer of je alles goed hebt overgetypt.');
    return { body: { name: found.name, self: found.id === user.id } };
  }

  function listFriends(req) {
    const { user } = auth(req);
    const out = { friends: [], incoming: [], outgoing: [] };
    for (const f of Object.values(D.friendships)) {
      if (f.a !== user.id && f.b !== user.id) continue;
      const other = userById(f.a === user.id ? f.b : f.a);
      const row = { ...otherView(other), since: day(f.acceptedAt || f.at), requested: day(f.at) };
      if (f.status === 'accepted') out.friends.push(row);
      else if (f.from === user.id) out.outgoing.push(row);
      else out.incoming.push(row);
    }
    const byName = (x, y) => x.name.localeCompare(y.name, 'nl');
    out.friends.sort(byName); out.incoming.sort(byName); out.outgoing.sort(byName);
    return { body: out };
  }

  const friendCount = (id) => Object.values(D.friendships).filter((f) => f.status === 'accepted' && (f.a === id || f.b === id)).length;

  function friendRequest(req) {
    const { user } = auth(req);
    limit(req, 'friend-req', 60, 3600_000);
    const target = userById(D.codes[cleanCode(req.body.code)]);
    if (!target) fail(404, 'code', 'Deze vriendencode kennen we niet. Controleer of je alles goed hebt overgetypt.');
    if (target.id === user.id) fail(400, 'zelf', 'Dit is je eigen vriendencode. Geef hem aan een vriend of vriendin.');
    const key = fkey(user.id, target.id);
    const existing = D.friendships[key];
    if (existing?.status === 'accepted') fail(409, 'al-vrienden', `Jij en ${target.name} zijn al vrienden.`);
    if (existing && existing.from === user.id) fail(409, 'al-gevraagd', `Je hebt ${target.name} al een verzoek gestuurd. Even geduld.`);
    if (existing) {                                                 // die ander vroeg jou al: dan is het meteen gelukt
      existing.status = 'accepted'; existing.acceptedAt = now();
      db.save();
      return { body: { status: 'accepted', friend: otherView(target) } };
    }
    const pending = Object.values(D.friendships).filter((f) => f.status === 'pending' && f.from === user.id).length;
    if (pending >= MAX_PENDING) fail(429, 'te-veel', 'Je hebt al veel verzoeken openstaan. Wacht tot sommige zijn beantwoord.');
    if (friendCount(user.id) >= MAX_FRIENDS) fail(400, 'te-veel', 'Je hebt het maximale aantal vrienden bereikt.');
    const [a, b] = [user.id, target.id].sort();
    D.friendships[key] = { a, b, status: 'pending', from: user.id, at: now() };
    db.save();
    return { status: 201, body: { status: 'pending', friend: otherView(target) } };
  }

  function answerFriend(req, accept) {
    const { user } = auth(req);
    const key = fkey(user.id, req.params.id);
    const f = D.friendships[key];
    if (!f || f.status !== 'pending' || f.from === user.id) fail(404, 'verzoek', 'Dit verzoek bestaat niet meer.');
    if (accept) {
      if (friendCount(user.id) >= MAX_FRIENDS) fail(400, 'te-veel', 'Je hebt het maximale aantal vrienden bereikt.');
      f.status = 'accepted'; f.acceptedAt = now();
    } else delete D.friendships[key];
    db.save();
    return { body: { ok: true } };
  }

  function removeFriend(req) {                                      // een vriend verwijderen, of je eigen verzoek intrekken
    const { user } = auth(req);
    const key = fkey(user.id, req.params.id);
    if (!D.friendships[key]) fail(404, 'vriend', 'Deze vriend bestaat niet meer in je lijst.');
    delete D.friendships[key];
    for (const m of Object.values(D.matches)) if (m.status === 'active' && m.players.includes(user.id) && m.players.includes(req.params.id)) { m.status = 'done'; m.result = { abandoned: true }; m.turn = null; m.version++; m.updatedAt = now(); }
    db.save();
    return { body: { ok: true } };
  }

  // ----- Voortgang tussen apparaten -----
  function getSync(req) {
    const { user } = auth(req);
    return { body: { version: user.sync?.version ?? 0, data: user.sync?.data ?? null } };
  }

  function putSync(req) {
    const { user } = auth(req);
    const { baseVersion, data } = req.body;
    if (!isObject(data) || !isObject(data.games)) fail(400, 'sync', 'Dit lijkt geen geldige voortgang.');
    const current = user.sync?.version ?? 0;
    if (baseVersion !== current) return { status: 409, body: { error: { code: 'versie', message: 'Er is intussen iets veranderd op een ander apparaat.' }, version: current, data: user.sync?.data ?? null } };
    user.sync = { version: current + 1, data, at: now() };
    db.save();
    return { body: { version: user.sync.version } };
  }

  // ----- Spellen met beurten (algemeen) -----
  // De regels van een spel staan in `games[id]`:
  //   create({ players, config }) -> { pub, secret, turn }      pub: wat beide spelers zien, secret: alleen de server
  //   apply({ pub, secret, move, player, config }) -> { pub, secret, turn, result? }   turn = null als het spel is afgelopen
  // De server bepaalt wie aan de beurt is en controleert elke zet. Een client kan dus niet vals spelen.
  const matchView = (m, userId) => ({
    id: m.id, game: m.game, status: m.status, version: m.version, config: m.config, pub: m.pub, result: m.result ?? null,
    turn: m.turn, yourTurn: m.status === 'active' && m.turn === userId,
    players: m.players.map((id) => ({ id, ...otherView(userById(id)) })), createdAt: m.createdAt, updatedAt: m.updatedAt,
  });

  function myMatch(req) {
    const { user } = auth(req);
    const m = D.matches[req.params.id];
    if (!m || !m.players.includes(user.id)) fail(404, 'partij', 'Deze partij bestaat niet (meer).');
    return { user, m };
  }

  function createMatch(req) {
    const { user } = auth(req);
    const rules = games[req.body.game];
    if (!rules) fail(400, 'spel', 'Dit spel kan nog niet tegen een vriend worden gespeeld.');
    const other = userById(req.body.with);
    const f = other && D.friendships[fkey(user.id, other.id)];
    if (!f || f.status !== 'accepted') fail(403, 'vriend', 'Je kunt alleen spelen met vrienden.');
    const active = Object.values(D.matches).filter((m) => m.status === 'active' && m.players.includes(user.id)).length;
    if (active >= MAX_MATCHES) fail(429, 'te-veel', 'Je hebt veel partijen lopen. Maak er eerst een paar af.');
    const players = [user.id, other.id];
    let config = isObject(req.body.config) ? req.body.config : {};
    if (rules.config) config = rules.config(config);
    let made;
    try { made = rules.create({ players, config }); } catch (e) { if (e instanceof RuleError) fail(400, 'regel', e.message); throw e; }
    const id = newId();
    D.matches[id] = { id, game: req.body.game, players, config, pub: made.pub, secret: made.secret ?? null, turn: made.turn ?? players[0], status: 'active', version: 1, createdAt: now(), updatedAt: now() };
    db.save();
    return { status: 201, body: { match: matchView(D.matches[id], user.id) } };
  }

  function listMatches(req) {
    const { user } = auth(req);
    const list = Object.values(D.matches).filter((m) => m.players.includes(user.id))
      .sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 100)
      .map((m) => { const v = matchView(m, user.id); v.summary = games[m.game]?.summary?.({ pub: m.pub }) ?? null; delete v.pub; return v; });
    return { body: { matches: list } };
  }

  function getMatch(req) {
    const { user, m } = myMatch(req);
    if (Number(req.query.since) === m.version) return { body: { unchanged: true, version: m.version } };
    return { body: { match: matchView(m, user.id) } };
  }

  function move(req) {
    const { user, m } = myMatch(req);
    if (m.status !== 'active') fail(409, 'klaar', 'Deze partij is al afgelopen.');
    if (m.turn !== user.id) fail(409, 'beurt', 'Je bent nog niet aan de beurt.');
    if (req.body.version !== m.version) fail(409, 'versie', 'De stand is intussen veranderd. Ververs en probeer het opnieuw.');
    let out;
    try { out = games[m.game].apply({ pub: m.pub, secret: m.secret, move: req.body.move, player: user.id, config: m.config }); }
    catch (e) { if (e instanceof RuleError) fail(400, 'regel', e.message); throw e; }
    m.pub = out.pub; m.secret = out.secret ?? m.secret; m.turn = out.turn ?? null; m.version++; m.updatedAt = now();
    if (out.turn == null) { m.status = 'done'; m.result = out.result ?? null; }
    db.save();
    return { body: { match: matchView(m, user.id) } };
  }

  function resign(req) {
    const { user, m } = myMatch(req);
    if (m.status !== 'active') fail(409, 'klaar', 'Deze partij is al afgelopen.');
    m.status = 'done'; m.turn = null; m.result = { resigned: user.id }; m.version++; m.updatedAt = now();
    db.save();
    return { body: { match: matchView(m, user.id) } };
  }

  // ----- Routes -----
  const routes = [
    ['GET', '/api/ping', () => ({ body: { ok: true, app: 'puzzelplaats', version, accounts: true } })],
    ['POST', '/api/signup', signup], ['POST', '/api/login', login], ['POST', '/api/recover', recover],
    ['POST', '/api/logout', (req) => { const { key } = auth(req); delete D.sessions[key]; db.save(); return { body: { ok: true } }; }],
    ['GET', '/api/me', me], ['PATCH', '/api/me', rename], ['DELETE', '/api/me', deleteAccount],
    ['POST', '/api/me/password', changePassword], ['POST', '/api/me/code', newFriendCodeFor], ['POST', '/api/me/recovery', newRecovery],
    ['GET', '/api/users/by-code/:code', codeLookup],
    ['GET', '/api/friends', listFriends], ['POST', '/api/friends/request', friendRequest],
    ['POST', '/api/friends/:id/accept', (r) => answerFriend(r, true)], ['POST', '/api/friends/:id/decline', (r) => answerFriend(r, false)],
    ['DELETE', '/api/friends/:id', removeFriend],
    ['GET', '/api/sync', getSync], ['PUT', '/api/sync', putSync],
    ['POST', '/api/matches', createMatch], ['GET', '/api/matches', listMatches],
    ['GET', '/api/matches/:id', getMatch], ['POST', '/api/matches/:id/move', move], ['POST', '/api/matches/:id/resign', resign],
  ].map(([method, pattern, fn]) => ({ method, fn, names: [...pattern.matchAll(/:(\w+)/g)].map((m) => m[1]), re: new RegExp(`^${pattern.replace(/:\w+/g, '([^/]+)')}$`) }));

  async function handle(req) {
    try {
      req.body = isObject(req.body) ? req.body : {};
      let known = false;
      for (const r of routes) {
        const m = req.path.match(r.re);
        if (!m) continue;
        known = true;
        if (r.method !== req.method) continue;
        req.params = Object.fromEntries(r.names.map((n, i) => [n, decodeURIComponent(m[i + 1])]));
        const res = await r.fn(req);
        return { status: res.status ?? 200, body: res.body };
      }
      return { status: known ? 405 : 404, body: { error: { code: known ? 'methode' : 'onbekend', message: 'Dit bestaat niet.' } } };
    } catch (e) {
      if (e instanceof ApiError) return { status: e.status, body: { error: { code: e.code, message: e.message } } };
      console.error('Onverwachte fout:', e);
      return { status: 500, body: { error: { code: 'server', message: 'Er ging iets mis aan onze kant. Probeer het later nog eens.' } } };
    }
  }

  return { handle, limiter };
}
